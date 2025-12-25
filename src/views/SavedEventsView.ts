import { ItemView, WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import SavedEvents from "../components/SavedEvents.svelte";
import type NostrPlugin from "../../main";

export const VIEW_TYPE_SAVED_EVENTS = "nostr-saved-events-view";

export class SavedEventsView extends ItemView {
  component: any;
  plugin: NostrPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: NostrPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_SAVED_EVENTS;
  }

  getDisplayText() {
    return "Saved Nostr Events";
  }

  getIcon() {
    return "bookmark"; // or search, star, etc.
  }

  async onOpen() {
    this.component = mount(SavedEvents, {
      target: this.contentEl,
      props: {
        loadEvents: async () => {
            return await this.plugin.getSavedEvents();
        },
        deleteEvent: async (filename: string) => {
            // filename includes .json
            const eventId = filename.replace('.json', '');
            return !!(await this.plugin.deleteEvent(eventId));
        },
        saveEvent: async (event: any, relay: string, id: string) => {
            return !!(await this.plugin.saveEvent(event, relay, id));
        }
      },
    });
  }

  async onClose() {
    if (this.component) {
      unmount(this.component);
    }
  }
}
