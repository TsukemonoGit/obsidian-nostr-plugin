<script lang="ts">
  import type { NostrEvent } from 'nostr-tools';
  import { nip19 } from 'nostr-tools';
  import EventContent from './EventContent.svelte';
  import SaveButton from './SaveButton.svelte';
  
  interface Props {
    event: NostrEvent;
    relay: string;
    onSave: () => Promise<void>;
  }
  
  let { event, relay, onSave }: Props = $props();
  
  let npub = $derived(nip19.npubEncode(event.pubkey));
  let shortPubkey = $derived(`${npub.slice(0, 12)}...${npub.slice(-8)}`);
  let timestamp = $derived(new Date(event.created_at * 1000).toISOString().replace('T', ' ').slice(0, 19));
  let relayShort = $derived(relay.replace('wss://', '').replace('ws://', ''));
</script>

<div class="nostr-event-block">
  <EventContent content={event.content} />
  
  <div class="nostr-event-meta">
    <span class="meta-item" title={npub}>{shortPubkey}</span>
    <span class="meta-item">{timestamp}</span>
    <span class="meta-item">kind: {event.kind}</span>
    <span class="meta-item" title={relay}>{relayShort}</span>
  </div>
  
  <SaveButton {onSave} />
</div>

<style>
  .nostr-event-block {
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
    background-color: var(--background-primary);
  }
  
  .nostr-event-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 0.85em;
    color: var(--text-muted);
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--background-modifier-border);
  }
  
  .meta-item {
    white-space: nowrap;
  }
</style>