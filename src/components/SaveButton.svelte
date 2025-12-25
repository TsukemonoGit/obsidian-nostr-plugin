<script lang="ts">
  interface Props {
    onSave: () => Promise<void>;
    isSaved: boolean;
  }

  let { onSave, isSaved }: Props = $props();

  let processing = $state(false);
  let error = $state<string | null>(null);

  async function handleClick() {
    processing = true;
    error = null;
    try {
      await onSave();
    } catch (err) {
      error = err instanceof Error ? err.message : "Operation failed";
      console.error("Operation error:", err);
    } finally {
      processing = false;
    }
  }
</script>

<div class="save-button-container">
  <button
    class="nostr-event-save-btn {isSaved ? 'delete-btn' : ''}"
    onclick={handleClick}
    disabled={processing}
  >
    {#if processing}
      {isSaved ? "削除中..." : "保存中..."}
    {:else}
      {isSaved ? "削除" : "保存"}
    {/if}
  </button>

  {#if error}
    <div class="save-error">{error}</div>
  {/if}
</div>

<style>
  .save-button-container {
    margin-top: 8px;
  }

  .nostr-event-save-btn {
    padding: 6px 16px;
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    transition: background-color 0.2s;
  }

  .nostr-event-save-btn:hover:not(:disabled) {
    background-color: var(--interactive-accent-hover);
  }

  .nostr-event-save-btn.delete-btn {
    background-color: var(--background-modifier-error);
  }

  .nostr-event-save-btn.delete-btn:hover:not(:disabled) {
    background-color: var(--background-modifier-error-hover);
  }

  .nostr-event-save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-error {
    color: var(--text-error);
    font-size: 0.85em;
    margin-top: 4px;
  }
</style>
