import { Plugin, Notice, type MarkdownPostProcessorContext, WorkspaceLeaf } from "obsidian";
import { mount } from "svelte";
import { NIP19SubType, parseContent } from "@konemono/nostr-content-parser";
import { nip19 } from "nostr-tools";
import { createRxNostr, createRxForwardReq, uniq } from "rx-nostr";
import { verifier } from "rx-nostr-crypto";
import type { NostrEvent } from "nostr-tools";
import NostrEventBlock from "./src/components/NostrEventBlock.svelte";
import { NostrSettingTab } from "./settings";
import { SavedEventsView, VIEW_TYPE_SAVED_EVENTS } from "./src/views/SavedEventsView";

interface RelayConfig {
  url: string;
  enabled: boolean;
}

interface NostrPluginSettings {
  saveFolder: string;
  relays: RelayConfig[];
  overwriteExisting: boolean;
  renderNostrLinks: boolean;
}

interface SavedEventData {
  event: NostrEvent;
  metadata: {
    saved_at: string;
    relay: string;
    original_ref: string;
  };
}

const DEFAULT_SETTINGS: NostrPluginSettings = {
  saveFolder: "nostr/events",
  relays: [
    { url: "wss://nfrelay.app", enabled: true },
    { url: "wss://nos.lol", enabled: true },
    { url: "wss://x.kojira.io", enabled: true },
  ],
  overwriteExisting: false,
  renderNostrLinks: true,
};

export default class NostrPlugin extends Plugin {
  settings: NostrPluginSettings;
  rxNostr: any;

  // キャッシュ: eventId -> NostrEvent
  private eventCache: Map<string, NostrEvent> = new Map();

  // 処理済みテキストノードのキャッシュ: nodeのテキスト内容 -> 処理済みフラグ
  private processedNodes: WeakSet<Node> = new WeakSet();

  async onload() {
    await this.loadSettings();

    // rx-nostr初期化
    this.rxNostr = createRxNostr({ verifier });
    this.updateDefaultRelays();

    // View登録
    this.registerView(
      VIEW_TYPE_SAVED_EVENTS,
      (leaf) => new SavedEventsView(leaf, this)
    );

    // Ribbon Icon
    this.addRibbonIcon("bookmark", "Saved Nostr Events", () => {
      this.activateView();
    });

    // Markdown post processor登録
    this.registerMarkdownPostProcessor(this.processNostrRefs.bind(this));

    // コマンド登録
    this.addCommand({
      id: "open-saved-events-view",
      name: "Open Saved Events View",
      callback: () => {
        this.activateView();
      },
    });

    this.addCommand({
      id: "reload-current-event",
      name: "Reload current event",
      callback: () => {
        new Notice("Reload functionality not yet implemented");
      },
    });

    this.addCommand({
      id: "save-current-event",
      name: "Save current event",
      callback: () => {
        new Notice("Save functionality not yet implemented");
      },
    });

    // 設定タブ追加
    this.addSettingTab(new NostrSettingTab(this.app, this));
  }

  onunload() {
    // クリーンアップ
    this.eventCache.clear();
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_SAVED_EVENTS);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // into the right sidebar
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
          leaf = rightLeaf;
          await leaf.setViewState({ type: VIEW_TYPE_SAVED_EVENTS, active: true });
      }
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    // "Reveal" the leaf in case it is in a collapsed sidebar
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateDefaultRelays();
  }

  updateDefaultRelays() {
    const enabledRelays = this.settings.relays
      .filter((r) => r.enabled)
      .map((r) => r.url);
    this.rxNostr.setDefaultRelays(enabledRelays);
  }

  async processNostrRefs(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);

    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      // 既に処理済みのノードはスキップ
      if (this.processedNodes.has(node)) {
        continue;
      }
      textNodes.push(node as Text);
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      if (!text.trim()) continue;

      const parsed = parseContent(text);

      const nostrRefs = parsed.filter(
        (token) =>
          token.type === "nip19" &&
          token.metadata &&
          (token.metadata.subType === NIP19SubType.NEVENT ||
            token.metadata.subType === NIP19SubType.NOTE)
      );

      if (nostrRefs.length === 0) continue;

      for (const ref of nostrRefs) {
        try {
          const plainNip19 = ref.metadata!.plainNip19 as string;

          // eventIdを抽出
          const decoded = nip19.decode(plainNip19);
          let eventId: string;

          if (decoded.type === "nevent") {
            eventId = decoded.data.id;
          } else if (decoded.type === "note") {
            eventId = decoded.data;
          } else {
            continue;
          }

          // 1. ローカルファイルチェック
          const savedEvent = await this.loadEventFromLocal(eventId);

          let event: NostrEvent;
          let relay: string;

          if (savedEvent) {
            // ローカルに保存済み
            event = savedEvent.event;
            relay = savedEvent.metadata.relay;
          } else {
            // 2. キャッシュチェック
            if (this.eventCache.has(eventId)) {
              event = this.eventCache.get(eventId)!;
              relay = "cache";
            } else {
              // 3. リレーから取得
              const fetchResult = await this.fetchEvent(plainNip19);
              event = fetchResult.event;
              relay = fetchResult.relay;

              // キャッシュに保存
              this.eventCache.set(eventId, event);
            }
          }

          // コンテナ作成
          const container = createDiv();
          textNode.parentNode?.insertBefore(container, textNode);

          // Svelteコンポーネントマウント
          // Svelteコンポーネントマウント
          // Svelteコンポーネントマウント
          const block = mount(NostrEventBlock, {
            target: container,
            props: {
              event,
              relay,
              isSaved: savedEvent !== null,
              onSave: async () => {
                await this.saveEvent(event, relay, eventId);
                // 更新のために再度マウントし直すか、propを更新する
                // Svelte 5のmountは返り値にアクセサがあるかわからないが、
                // 簡易的にUIを更新するためにコンポーネントを再作成する手もあるが
                // ここではreactive propの更新が理想。
                // ただしmount関数が返すインターフェースが不明確なので
                // 一旦、処理完了後にprocessedNodesから削除して再処理させるか、
                // あるいはstate管理が必要。
                // 暫定処置として、処理成功後にテキストノードがあった場所を再処理させるのは難しい。
                // 今回はpropsを直接更新できないので、Noticeを出してリロードを促すか...
                // いや、Svelte 5なら $state で管理された値を外からいじるのは難しい。
                // シンプルにコンポーネント内で完結させるべきだが、
                // ここは isSaved を prop として渡しているので、親側で知る由もない。
                // 
                // 修正: mountの返り値を使ってpropを更新できるならするが、
                // ここではシンプルに、コンポーネントをunmountしてmountしなおすのが確実。
                // しかしunmount APIがimportされていない。
                // 
                // なので、NostrEventBlock内に状態を持たせる形にしたほうがよい。
                // しかし今回は外から isSaved を渡している。
                // NostrEventBlock 内で bind:isSaved にできればいいが...
                //
                // とりあえず、コールバック内で再描画をトリガーする。
                // コンテナの中身をクリアして再マウントする。
                container.innerHTML = '';
                 mount(NostrEventBlock, {
                    target: container,
                    props: {
                        event,
                        relay,
                        isSaved: true,
                         onSave: async () => { await this.saveEvent(event, relay, eventId); refresh(true); },
                         onDelete: async () => { await this.deleteEvent(eventId); refresh(false); }
                    }
                });
              },
               onDelete: async () => {
                await this.deleteEvent(eventId);
                 container.innerHTML = '';
                 mount(NostrEventBlock, {
                    target: container,
                    props: {
                        event,
                        relay,
                        isSaved: false,
                         onSave: async () => { await this.saveEvent(event, relay, eventId); refresh(true); },
                         onDelete: async () => { await this.deleteEvent(eventId); refresh(false); }
                    }
                });
              }
            },
          });

          const refresh = (saved: boolean) => {
             container.innerHTML = '';
             mount(NostrEventBlock, {
                target: container,
                props: {
                    event,
                    relay,
                    isSaved: saved,
                    onSave: async () => { await this.saveEvent(event, relay, eventId); refresh(true); },
                    onDelete: async () => { await this.deleteEvent(eventId); refresh(false); }
                }
            });
          };

          // 処理済みマーク
          this.processedNodes.add(textNode);

          // 元のテキストノード削除
          textNode.remove();
        } catch (error) {
          console.error("Failed to fetch event:", error);
          const errorDiv = createDiv();
          errorDiv.setText(`Failed to fetch event: ${error.message}`);
          errorDiv.addClass("nostr-event-error");
          textNode.parentNode?.insertBefore(errorDiv, textNode);

          // エラーでも処理済みマーク（再試行を防ぐ）
          this.processedNodes.add(textNode);
        }
      }
    }
  }

  /**
   * ローカルに保存されたイベントを読み込む
   */
  async loadEventFromLocal(eventId: string): Promise<SavedEventData | null> {
    const folder = this.settings.saveFolder;
    const filename = `${eventId}.json`;
    const filepath = `${folder}/${filename}`;

    try {
      const fileExists = await this.app.vault.adapter.exists(filepath);
      if (!fileExists) {
        return null;
      }

      const content = await this.app.vault.adapter.read(filepath);
      const savedData: SavedEventData = JSON.parse(content);

      return savedData;
    } catch (error) {
      console.error(`Failed to load event from local: ${eventId}`, error);
      return null;
    }
  }

  async getSavedEvents(): Promise<any[]> {
    const folder = this.settings.saveFolder;
    try {
        const folderExists = await this.app.vault.adapter.exists(folder);
        if (!folderExists) {
            return [];
        }

        const files = await this.app.vault.adapter.list(folder);
        const events = [];

        for (const filepath of files.files) {
            if (!filepath.endsWith('.json')) continue;
            
            try {
                const content = await this.app.vault.adapter.read(filepath);
                const data = JSON.parse(content);
                 
                // Map to SavedEventItem structure
                if (data.event && data.metadata) {
                    events.push({
                        event: data.event,
                        relay: data.metadata.relay || '',
                        saved_at: data.metadata.saved_at,
                        filepath: filepath,
                        filename: filepath.split('/').pop() || ''
                    });
                }
            } catch (e) {
                console.warn(`Failed to parse saved event: ${filepath}`, e);
            }
        }

        return events;
    } catch (error) {
        console.error("Failed to list saved events:", error);
        return [];
    }
  }

  async fetchEvent(
    neventOrNote: string
  ): Promise<{ event: NostrEvent; relay: string }> {
    // デコード
    const decoded = nip19.decode(neventOrNote);
    let eventId: string;
    let preferredRelays: string[] = [];

    if (decoded.type === "nevent") {
      eventId = decoded.data.id;
      preferredRelays = decoded.data.relays || [];
    } else if (decoded.type === "note") {
      eventId = decoded.data;
    } else {
      throw new Error("Invalid nevent or note");
    }

    // リレー優先順位決定
    let relaysToTry: string[] = [];
    if (preferredRelays.length > 0) {
      relaysToTry = [...preferredRelays];
    }

    const defaultRelays = this.settings.relays
      .filter((r) => r.enabled)
      .map((r) => r.url);
    relaysToTry.push(...defaultRelays);

    // 重複削除
    relaysToTry = [...new Set(relaysToTry)];

    // イベント取得試行
    for (const relay of relaysToTry) {
      try {
        const event = await this.fetchFromRelay(eventId, [relay]);
        if (event) {
          return { event, relay };
        }
      } catch (error) {
        console.error(`Failed to fetch from ${relay}:`, error);
        continue;
      }
    }

    throw new Error("Failed to fetch from all relays");
  }

  async fetchFromRelay(
    eventId: string,
    relays: string[]
  ): Promise<NostrEvent | null> {
    return new Promise((resolve, reject) => {
      const rxReq = createRxForwardReq();
      let resolved = false;

      const subscription = this.rxNostr
        .use(rxReq, { relays })
        .pipe(uniq())
        .subscribe({
          next: (packet: any) => {
            if (packet.event.id === eventId && !resolved) {
              resolved = true;
              resolve(packet.event);
              subscription.unsubscribe();
            }
          },
          error: (err: Error) => {
            if (!resolved) {
              resolved = true;
              reject(err);
            }
          },
        });

      // フィルタ発行
      rxReq.emit({ ids: [eventId] });

      // タイムアウト
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          subscription.unsubscribe();
          resolve(null);
        }
      }, 5000);
    });
  }

  async saveEvent(event: NostrEvent, relay: string, eventId: string) {
    const folder = this.settings.saveFolder;
    const filename = `${eventId}.json`;
    const filepath = `${folder}/${filename}`;

    // フォルダ存在チェック・作成
    const folderExists = await this.app.vault.adapter.exists(folder);
    if (!folderExists) {
      await this.app.vault.adapter.mkdir(folder);
    }

    // ファイル存在チェック
    const fileExists = await this.app.vault.adapter.exists(filepath);
    if (fileExists && !this.settings.overwriteExisting) {
      new Notice(`Event already exists: ${eventId.slice(0, 8)}`);
      return;
    }

    // 保存データ作成
    const saveData: SavedEventData = {
      event,
      metadata: {
        saved_at: new Date().toISOString(),
        relay,
        original_ref: eventId,
      },
    };

    try {
      await this.app.vault.adapter.write(
        filepath,
        JSON.stringify(saveData, null, 2)
      );
      new Notice(`Event saved: ${eventId.slice(0, 8)}`);
      return true;
    } catch (error) {
      console.error("Failed to save event:", error);
      new Notice(`Failed to save event: ${error.message}`);
      throw error;
    }
  }

  async deleteEvent(eventId: string) {
    const folder = this.settings.saveFolder;
    const filename = `${eventId}.json`;
    const filepath = `${folder}/${filename}`;

    try {
        const fileExists = await this.app.vault.adapter.exists(filepath);
        if (fileExists) {
             await this.app.vault.adapter.remove(filepath);
             new Notice(`Event deleted: ${eventId.slice(0, 8)}`);
             return true;
        }
    } catch (error) {
        console.error("Failed to delete event:", error);
        new Notice(`Failed to delete event: ${error.message}`);
        throw error;
    }
  }
}
