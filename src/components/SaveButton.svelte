<script lang="ts">
  interface Props {
    onSave: () => Promise<void>;
  }
  
  let { onSave }: Props = $props();
  
  let saving = $state(false);
  let error = $state<string | null>(null);
  
  async function handleSave() {
    saving = true;
    error = null;
    try {
      await onSave();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Save failed';
      console.error('Save error:', err);
    } finally {
      saving = false;
    }
  }
</script>

<div class="save-button-container">
  <button 
    class="nostr-event-save-btn"
    onclick={handleSave}
    disabled={saving}
  >
    {#if saving}
      保存中...
    {:else}
      保存
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