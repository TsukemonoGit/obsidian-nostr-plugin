import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import { nip19 } from "nostr-tools";
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

    // Web Client URL 設定
    new Setting(containerEl)
      .setName("Web Client URL Template")
      .setDesc("URL template to open events in a web client. Use {id} as a placeholder.")
      .addText((text) =>
        text
          .setPlaceholder("https://njump.me/{id}")
          .setValue(this.plugin.settings.webClientUrlTemplate)
          .onChange(async (value) => {
            this.plugin.settings.webClientUrlTemplate = value || "https://njump.me/{id}";
            await this.plugin.saveSettings();
          })
      );

    // My Pubkey 設定
    new Setting(containerEl)
      .setName("My Pubkey")
      .setDesc("Your pubkey (hex or npub) to fetch contacts/petnames.")
      .addText((text) =>
        text
          .setPlaceholder("npub1...")
          .setValue(this.plugin.settings.myPubkey)
          .onChange(async (value) => {
            this.plugin.settings.myPubkey = value;
            await this.plugin.saveSettings();
          })
      );

    // Contacts Management Section
    containerEl.createEl("h3", { text: "Contacts Management" });
    containerEl.createEl("p", {
      text: "Manage display names for Nostr users. You can import from your follow list (Kind 3) or add them manually.",
      cls: "setting-item-description",
    });

    // Download from Kind 3 Button
    new Setting(containerEl)
      .setName("Import from Kind 3")
      .setDesc("Fetch contacts from your Kind 3 event (requires My Pubkey to be set above)")
      .addButton((button) =>
        button.setButtonText("Import").onClick(async () => {
          button.setDisabled(true);
          button.setButtonText("Importing...");
          await this.plugin.downloadContacts();
          button.setDisabled(false);
          button.setButtonText("Import");
          this.display();
        })
      );

    // Add Manual Contact
    const addContactSetting = new Setting(containerEl)
      .setName("Add Manual Contact")
      .setDesc("Add a specific public key and name mapping");
    
    let newPubkey = "";
    let newName = "";

    addContactSetting.addText((text) =>
      text.setPlaceholder("Pubkey (hex or npub)").onChange((value) => (newPubkey = value))
    );
    addContactSetting.addText((text) =>
      text.setPlaceholder("Name").onChange((value) => (newName = value))
    );
    addContactSetting.addButton((button) =>
      button.setButtonText("Add").setCta().onClick(async () => {
        if (newPubkey && newName) {
           let hex = newPubkey;
           if (newPubkey.startsWith("npub")) {
               try {
                   const decoded = nip19.decode(newPubkey);
                   if (decoded.type === 'npub') {
                       hex = decoded.data as string;
                   }
               } catch (e) {
                   new Notice("Invalid npub");
                   return;
               }
           }
           await this.plugin.addContact(hex, newName);
           this.display();
        } else {
            new Notice("Please enter both pubkey and name");
        }
      })
    );

    // Contacts List
    const contactListDiv = containerEl.createDiv("contact-list");
    this.displayContacts(contactListDiv);

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

  displayContacts(container: HTMLElement): void {
    container.empty();
    if (this.plugin.contactCache.size === 0) {
      container.createEl("p", {
        text: "No contacts added yet.",
        cls: "setting-item-description",
      });
      return;
    }

    // Header for list
    container.createEl("h4", { text: "Existing Contacts" });

    this.plugin.contactCache.forEach((name, pubkey) => {
      new Setting(container)
        .setName(name)
        .setDesc(`${pubkey.slice(0, 10)}...${pubkey.slice(-10)}`)
        .addText((text) =>
          text
            .setValue(name)
            .setPlaceholder("Name")
            .onChange(async (value) => {
              if (value) {
                this.plugin.contactCache.set(pubkey, value);
                await this.plugin.saveContacts();
              }
            })
        )
        .addButton((button) =>
          button
            .setButtonText("Delete")
            .setWarning()
            .onClick(async () => {
              await this.plugin.deleteContact(pubkey);
              this.display();
            })
        );
    });
  }
}
