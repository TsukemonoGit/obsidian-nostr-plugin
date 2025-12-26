<script lang="ts">
  import { parseContent, TokenType } from "@konemono/nostr-content-parser";

  interface Props {
    content: string;
    tags?: string[][];
  }

  let { content, tags = [] }: Props = $props();

  let tokens = $derived(parseContent(content, tags));

  function isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }
</script>

<div class="nostr-event-content">
  {#each tokens as token}
    {#if token.type === "text"}
      <span>{token.content}</span>
    {:else if token.type === "url"}
      {#if isImageUrl(token.content)}
        <div class="nostr-media-container">
          <img
            src={token.content}
            alt="Content media"
            class="nostr-event-image"
            loading="lazy"
          />
        </div>
      {:else}
        <a
          href={token.content}
          class="nostr-event-content-link external-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {token.content}
        </a>
      {/if}
    {:else if token.type === TokenType.NIP19}
      <span class="nostr-event-content-nostr">
        nostr:{token.content}
      </span>
    {:else if token.type === "hashtag"}
      <span class="nostr-event-content-hashtag">
        #{token.content}
      </span>
    {:else if token.type === TokenType.CUSTOM_EMOJI}
      <img
        src={token.metadata!.url as string}
        alt={token.content}
        title={token.content}
        class="nostr-custom-emoji"
        loading="lazy"
      />
    {:else}
      {token.content || ""}
    {/if}
  {/each}
</div>

<style>
  .nostr-event-content {
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.4;
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

  .nostr-media-container {
    margin: 8px 0;
  }

  .nostr-event-image {
    max-width: 100%;
    max-height: 500px;
    border-radius: 8px;
    display: block;
  }

  .nostr-custom-emoji {
    height: 1.6em;
    width: auto;
    vertical-align: middle;
    margin: 0;
    display: inline-block;
  }
</style>
