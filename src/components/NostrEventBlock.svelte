<script lang="ts">
  import type { NostrEvent } from "nostr-tools";
  import { nip19 } from "nostr-tools";
  import EventContent from "./EventContent.svelte";
  import SaveButton from "./SaveButton.svelte";

  interface Props {
    event: NostrEvent;
    relay: string;
    onSave: () => Promise<void>;
    onDelete: () => Promise<void>;
    isSaved: boolean;
    webClientUrl?: string;
    authorName?: string;
    onEditName?: () => Promise<void>;
  }

  let {
    event,
    relay,
    onSave,
    onDelete,
    isSaved,
    webClientUrl,
    authorName,
    onEditName,
  }: Props = $props();

  let npub = $derived(nip19.npubEncode(event.pubkey));
  let shortPubkey = $derived(`${npub.slice(0, 12)}...${npub.slice(-8)}`);
  let timestamp = $derived(new Date(event.created_at * 1000).toLocaleString());

  async function handleAction() {
    if (isSaved) {
      await onDelete();
    } else {
      await onSave();
    }
  }
</script>

<div class="nostr-event-block">
  <div class="nostr-header">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="nostr-author" title={npub} onclick={onEditName}>
      {#if authorName}
        <span class="nostr-name">{authorName}</span>
      {:else}
        <span class="nostr-pubkey">{shortPubkey}</span>
      {/if}
    </div>
    <div class="nostr-timestamp">
      {timestamp}
    </div>
  </div>

  <div class="nostr-body">
    <EventContent content={event.content} tags={event.tags} {webClientUrl} />
  </div>

  <div class="nostr-footer">
    <div class="nostr-info">
      <span class="nostr-kind">Kind: {event.kind}</span>
    </div>
    <div class="nostr-actions">
      <!-- svelte-ignore a11y_invalid_attribute -->
      <a
        href={(webClientUrl || "https://njump.me/{id}").replace(
          "{id}",
          event.id,
        )}
        target="_blank"
        rel="noopener noreferrer"
        class="nostr-external-link"
        title="Open in Web Client"
      >
        <!-- Feather Icon: external-link -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><path
            d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
          /><polyline points="15 3 21 3 21 9" /><line
            x1="10"
            y1="14"
            x2="21"
            y2="3"
          /></svg
        >
      </a>

      <SaveButton onSave={handleAction} {isSaved} />
    </div>
  </div>
</div>

<style>
  .nostr-event-block {
    border: 1px solid var(--background-modifier-border);
    border-radius: 12px;
    padding: 12px 16px;
    margin: 12px 0;
    background-color: var(--background-primary);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Header */
  .nostr-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.9em;
  }

  .nostr-author {
    font-weight: bold;
    color: var(--text-normal);
    cursor: pointer;
    padding: 2px 4px;
    margin-left: -4px;
    border-radius: 4px;
    transition: background-color 0.15s ease;
  }

  .nostr-author:hover {
    background-color: var(--background-modifier-hover);
  }

  .nostr-timestamp {
    font-size: 0.85em;
    color: var(--text-muted);
  }

  /* Body */
  .nostr-body {
    font-size: 1em;
    line-height: 1.5;
    color: var(--text-normal);
  }

  /* Footer */
  .nostr-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--background-modifier-border);
  }

  .nostr-kind {
    font-size: 0.8em;
    color: var(--text-muted);
    background-color: var(--background-secondary);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .nostr-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .nostr-external-link {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    transition: color 0.15s ease-in-out;
  }

  .nostr-external-link:hover {
    color: var(--text-accent);
  }

  .nostr-name {
    margin-right: 6px;
  }
</style>
