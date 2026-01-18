<script lang="ts">
  import { parseContent, TokenType } from "@konemono/nostr-content-parser";

  interface Props {
    content: string;
    tags?: string[][];
    webClientUrl: string | undefined;
  }

  let { content, tags = [], webClientUrl }: Props = $props();

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
      {#if token.metadata?.type === "image" || isImageUrl(token.content)}
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
      {@const url = (webClientUrl || "https://njump.me/{id}").replace(
        "{id}",
        token.metadata.plainNip19,
      )}
      <a
        href={url}
        class="nostr-event-content-link external-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        nostr:{token.metadata.plainNip19}
      </a>
    {:else if token.type === "hashtag"}
      <span class="nostr-event-content-hashtag">
        {token.content}
      </span>
    {:else if token.type === TokenType.CUSTOM_EMOJI}
      <!-- 修正: hasMetadataで分岐 -->
      {#if token.metadata.hasMetadata}
        <img
          src={token.metadata.url}
          alt={token.content}
          title={token.content}
          class="nostr-custom-emoji"
          loading="lazy"
        />
      {:else}
        <!-- タグなしの場合はテキストとして表示 -->
        <span title="Unknown emoji">{token.content}</span>
      {/if}
    {:else}
      {token.content || ""}
    {/if}
  {/each}
</div>
