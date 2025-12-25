<script lang="ts">
    import { onMount } from "svelte";
    import type { NostrEvent } from "nostr-tools";
    import NostrEventBlock from "./NostrEventBlock.svelte";
    import { Notice } from "obsidian";

    interface SavedEventItem {
        event: NostrEvent;
        relay: string;
        filepath: string;
        saved_at: string;
        filename: string;
    }

    interface Props {
        loadEvents: () => Promise<SavedEventItem[]>;
        deleteEvent: (filename: string) => Promise<boolean>;
        saveEvent: (
            event: NostrEvent,
            relay: string,
            id: string,
        ) => Promise<boolean>;
    }

    let { loadEvents, deleteEvent, saveEvent }: Props = $props();

    let events = $state<SavedEventItem[]>([]);
    let loading = $state(false);

    async function load() {
        loading = true;
        try {
            events = await loadEvents();
            // Sort by saved_at desc
            events.sort(
                (a, b) =>
                    new Date(b.saved_at).getTime() -
                    new Date(a.saved_at).getTime(),
            );
        } catch (e) {
            console.error(e);
            new Notice("Failed to load saved events");
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        load();
    });

    async function handleDelete(item: SavedEventItem) {
        const success = await deleteEvent(item.filename);
        if (success) {
            events = events.filter((e) => e.filename !== item.filename);
        }
    }

    async function handleSave(item: SavedEventItem) {
        // Re-save? Usually this view is for saved events, so they are already saved.
        // But if we delete and want to undo, or for some reason.
        // For now, the block requires onSave.
        // If we click save on an already saved item, it might overwrite or do nothing.
        // But wait, NostrEventBlock toggles based on isSaved.
        // If we are in this list, isSaved is true. So the button will be Delete.
        // So onSave might not be called unless we implement toggle logic inside the block that requires it.
        // Actually NostrEventBlock calls onSave or onDelete based on isSaved.
        // If isSaved is true, it calls onDelete.
        // If we somehow have isSaved=false (e.g. after deletion if we kept it in UI), then onSave would be called.
        // Let's implement it just in case.
        const success = await saveEvent(item.event, item.relay, item.event.id);
        if (success) {
            // reload logic if needed, or just update state
            load();
        }
    }
</script>

<div class="saved-events-container">
    <div class="saved-events-header">
        <h2>Saved Nostr Events</h2>
        <button class="refresh-btn" onclick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
        </button>
    </div>

    {#if events.length === 0 && !loading}
        <div class="empty-state">No saved events found.</div>
    {/if}

    <div class="events-list">
        {#each events as item (item.event.id)}
            <div class="event-wrapper">
                <NostrEventBlock
                    event={item.event}
                    relay={item.relay}
                    isSaved={true}
                    onDelete={() => handleDelete(item)}
                    onSave={() => handleSave(item)}
                />
            </div>
        {/each}
    </div>
</div>

<style>
    .saved-events-container {
        padding: 10px;
        height: 100%;
        overflow-y: auto;
    }
    .saved-events-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    .saved-events-header h2 {
        margin: 0;
    }
    .refresh-btn {
        padding: 4px 12px;
        cursor: pointer;
    }
    .events-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .empty-state {
        text-align: center;
        color: var(--text-muted);
        margin-top: 40px;
    }
    .event-wrapper {
        border-bottom: 1px solid var(--background-modifier-border);
        padding-bottom: 16px;
    }
</style>
