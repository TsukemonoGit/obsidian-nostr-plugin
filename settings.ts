import { App, PluginSettingTab, Setting } from "obsidian";
import type NostrPlugin from "./main";

export class NostrSettingTab extends PluginSettingTab {
  plugin: NostrPlugin;

  constructor(app: App, plugin: NostrPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 保存フォルダ設定
    new Setting(containerEl)
      .setName("Save folder")
      .setDesc("Folder path for saving Nostr events")
      .addText((text) =>
        text
          .setPlaceholder("nostr/events")
          .setValue(this.plugin.settings.saveFolder)
          .onChange(async (value) => {
            this.plugin.settings.saveFolder = value || "nostr/events";
            await this.plugin.saveSettings();
          })
      );

    // 上書き設定
    new Setting(containerEl)
      .setName("Overwrite existing files")
      .setDesc("Overwrite event files if they already exist")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.overwriteExisting)
          .onChange(async (value) => {
            this.plugin.settings.overwriteExisting = value;
            await this.plugin.saveSettings();
          })
      );

    // Nostrリンク表示設定
    new Setting(containerEl)
      .setName("Render Nostr links")
      .setDesc("Convert Nostr identifiers to clickable links in content")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.renderNostrLinks)
          .onChange(async (value) => {
            this.plugin.settings.renderNostrLinks = value;
            await this.plugin.saveSettings();
          })
      );

    // リレー設定ヘッダー
    containerEl.createEl("h3", { text: "Default Relays" });
    containerEl.createEl("p", {
      text: "These relays are used as fallback when event does not specify relays.",
      cls: "setting-item-description",
    });

    // リレー一覧
    const relayContainer = containerEl.createDiv("relay-list");
    this.displayRelays(relayContainer);

    // リレー追加ボタン
    new Setting(containerEl)
      .setName("Add relay")
      .setDesc("Add a new relay to the list")
      .addButton((button) =>
        button.setButtonText("Add").onClick(() => {
          this.plugin.settings.relays.push({
            url: "wss://relay.example.com",
            enabled: true,
          });
          this.plugin.saveSettings();
          this.display();
        })
      );
  }

  displayRelays(container: HTMLElement): void {
    container.empty();

    this.plugin.settings.relays.forEach((relay, index) => {
      const setting = new Setting(container)
        .addText((text) =>
          text
            .setPlaceholder("wss://relay.example.com")
            .setValue(relay.url)
            .onChange(async (value) => {
              this.plugin.settings.relays[index].url = value;
              await this.plugin.saveSettings();
            })
        )
        .addToggle((toggle) =>
          toggle
            .setValue(relay.enabled)
            .setTooltip("Enable/disable this relay")
            .onChange(async (value) => {
              this.plugin.settings.relays[index].enabled = value;
              await this.plugin.saveSettings();
            })
        )
        .addButton((button) =>
          button
            .setButtonText("Delete")
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.relays.splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
            })
        );

      // 上下移動ボタン
      if (index > 0) {
        setting.addButton((button) =>
          button
            .setIcon("up-chevron-glyph")
            .setTooltip("Move up")
            .onClick(async () => {
              const temp = this.plugin.settings.relays[index];
              this.plugin.settings.relays[index] =
                this.plugin.settings.relays[index - 1];
              this.plugin.settings.relays[index - 1] = temp;
              await this.plugin.saveSettings();
              this.display();
            })
        );
      }

      if (index < this.plugin.settings.relays.length - 1) {
        setting.addButton((button) =>
          button
            .setIcon("down-chevron-glyph")
            .setTooltip("Move down")
            .onClick(async () => {
              const temp = this.plugin.settings.relays[index];
              this.plugin.settings.relays[index] =
                this.plugin.settings.relays[index + 1];
              this.plugin.settings.relays[index + 1] = temp;
              await this.plugin.saveSettings();
              this.display();
            })
        );
      }
    });
  }
}
