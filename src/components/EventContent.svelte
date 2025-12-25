<script lang="ts">
  import { parseContent, TokenType } from "@konemono/nostr-content-parser";

  interface Props {
    content: string;
  }

  let { content }: Props = $props();

  let tokens = $derived(parseContent(content));
</script>

<div class="nostr-event-content">
  {#each tokens as token}
    {#if token.type === "text"}
      <span>{token.content}</span>
    {:else if token.type === "url"}
      <a
        href={token.content}
        class="nostr-event-content-link external-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {token.content}
      </a>
    {:else if token.type === TokenType.NIP19}
      <span class="nostr-event-content-nostr">
        nostr:{token.content}
      </span>
    {:else if token.type === "hashtag"}
      <span class="nostr-event-content-hashtag">
        #{token.content}
      </span>
    {:else}
      <span>{token.content || ""}</span>
    {/if}
  {/each}
</div>

<style>
  .nostr-event-content {
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.6;
    margin-bottom: 8px;
  }

  .nostr-event-content-link {
    color: var(--link-color);
    text-decoration: underline;
  }

  .nostr-event-content-link:hover {
    color: var(--link-color-hover);
  }

  .nostr-event-content-nostr {
    color: var(--text-accent);
    font-family: var(--font-monospace);
    font-size: 0.9em;
    background-color: var(--background-secondary);
    padding: 2px 4px;
    border-radius: 3px;
  }

  .nostr-event-content-hashtag {
    color: var(--text-accent);
    font-weight: 500;
  }
</style>
