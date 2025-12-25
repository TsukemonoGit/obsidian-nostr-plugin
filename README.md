# Obsidian Nostr Event Viewer

Obsidian ノート内の Nostr イベント識別子を自動検出し、リレーから内容を取得・表示・保存するプラグイン。

## 機能

- `nevent1...`, `note1...`, `nprofile1...`, `npub1...` の自動検出
- nevent 内のリレー情報を優先使用、フォールバックでデフォルトリレー使用
- イベント内容のリッチ表示（URL、Nostr 識別子、ハッシュタグのハイライト）
- 手動保存機能（自動保存なし）
- Svelte 5 + rx-nostr による高速レンダリング

## インストール

### 開発環境セットアップ

```bash
# 依存関係インストール
npm install

# 開発ビルド（ウォッチモード）
npm run dev

# プロダクションビルド
npm run build
```

### Obsidian へのインストール

1. ビルド後の `main.js`, `manifest.json`, `styles.css` を `.obsidian/plugins/nostr-event-viewer/` にコピー
2. Obsidian の設定 → Community plugins → Nostr Event Viewer を有効化

## 使い方

### イベント表示

ノート内に以下の形式で Nostr 識別子を記述:

```
nostr:nevent1qqsxyz...
[[nostr:nevent1qqsxyz...]]
https://njump.me/nevent1qqsxyz...
```

プラグインが自動検出し、埋め込みブロックとして表示されます。

### Saved Events View

保存したイベントの一覧は、専用のビューで確認・管理できます。

**アクセス方法:**
- 左側のリボンにある「ブックマークアイコン」をクリック
- または、コマンドパレットから `Nostr: Open Saved Events View` を実行

**機能:**
- 保存済みイベントの一覧表示
- 直接削除（Deleteボタン）
- リフレッシュ機能

### イベント保存・削除

表示されたイベントブロックには、状態に応じてボタンが表示されます。

- **未保存の場合**: 「保存」ボタンが表示されます。クリックすると、標準的な Nostr イベント形式（Raw JSON）で保存されます。
- **保存済みの場合**: 「削除」ボタン（赤色）が表示されます。クリックすると保存されたファイルが削除されます。

**保存フォーマット:**

```json
{
  "id": "...",
  "pubkey": "...",
  "created_at": 1234567890,
  "kind": 1,
  "tags": [...],
  "content": "...",
  "sig": "..."
}
```

保存先: `nostr/events/{event_id}.json`（設定で変更可能）

## 設定

Settings → Nostr Event Viewer で以下を設定可能:

- **Save folder**: イベント保存先フォルダ
- **Overwrite existing files**: 既存ファイルの上書き設定
- **Render Nostr links**: コンテンツ内の Nostr 識別子をリンク化
- **Default Relays**: デフォルトリレー一覧（追加・削除・順序変更・有効/無効）

## リレー優先順位

1. nevent 内に含まれるリレー情報（存在する場合）
2. 上記が失敗またはリレー情報がない場合、設定のデフォルトリレーを順次試行

## 技術スタック

- **UI**: Svelte 5（Runes API）
- **Nostr 通信**: rx-nostr
- **パース**: @konemono/nostr-content-parser
- **ビルド**: esbuild + esbuild-svelte

## 対応環境

- Obsidian デスクトップ版のみ（Windows / macOS / Linux）
- モバイル版非対応

## ライセンス

MIT

## 開発

### ディレクトリ構造

```
.
├── main.ts                  # プラグインメイン
├── settings.ts              # 設定画面
├── components/
│   ├── NostrEventBlock.svelte
│   ├── EventContent.svelte
│   └── SaveButton.svelte
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── styles.css
```

### デバッグ

1. `npm run dev` でウォッチモード起動
2. Obsidian Developer Console (Ctrl+Shift+I) でログ確認
3. プラグインの再読み込み: Ctrl+R

## トラブルシューティング

### イベントが取得できない

- リレー設定を確認
- ネットワーク接続を確認
- Developer Console でエラーログを確認

### 保存できない

- Save folder 設定を確認
- フォルダの書き込み権限を確認
- Vault 外への保存は不可

## 今後の拡張予定

- `naddr` (パラメータ化された置換可能イベント) 対応
- NIP-04/44 暗号化メッセージ対応
- 画像等の添付ファイル表示
- イベント検索機能
