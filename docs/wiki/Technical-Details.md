# 技術的詳細

このページでは、Chrome拡張機能「Slack メッセージ非表示」の技術的な詳細について説明します。

## アーキテクチャ

この拡張機能は、Chrome拡張機能のManifest V3に準拠しており、以下のコンポーネントで構成されています：

1. **Manifest** (`manifest.json`): 拡張機能の設定と権限を定義
2. **バックグラウンドスクリプト** (`background.js`): 拡張機能の状態管理とイベント処理
3. **コンテンツスクリプト** (`content_scripts.js`): Slack UIのDOM操作
4. **アイコン** (`images/`): 拡張機能のアイコン画像

### コンポーネント間の関係

```mermaid
graph TD
    subgraph "Chrome Browser"
        A[Extension Icon] -->|Click| B[background.js]
        B -->|State Management| C[chrome.storage.session]
        C -->|Read State| B
        B -->|Send Message| D[content_scripts.js]
        D -->|DOM Manipulation| E[Slack UI]
        E -->|DOM Events| D
    end
    
    style A fill:#f9d77e,stroke:#f9bc02
    style B fill:#a8d1ff,stroke:#1a73e8
    style C fill:#c9e1a5,stroke:#61b15a
    style D fill:#ffb8b8,stroke:#e53935
    style E fill:#e1bee7,stroke:#8e24aa
```

### コンポーネントの役割

```mermaid
flowchart LR
    subgraph "background.js"
        BG1[状態管理] --> BG2[イベント処理]
        BG2 --> BG3[メッセージ送信]
    end
    
    subgraph "content_scripts.js"
        CS1[メッセージ受信] --> CS2[メッセージ表示制御]
        CS2 --> CS3[DOM監視]
    end
    
    subgraph "Slack UI"
        SU1[メッセージ表示] --> SU2[リアクション表示]
    end
    
    BG3 -->|chrome.tabs.sendMessage| CS1
    CS2 -->|DOM操作| SU1
    SU2 -->|MutationObserver| CS3
    
    style BG1 fill:#a8d1ff,stroke:#1a73e8
    style BG2 fill:#a8d1ff,stroke:#1a73e8
    style BG3 fill:#a8d1ff,stroke:#1a73e8
    style CS1 fill:#ffb8b8,stroke:#e53935
    style CS2 fill:#ffb8b8,stroke:#e53935
    style CS3 fill:#ffb8b8,stroke:#e53935
    style SU1 fill:#e1bee7,stroke:#8e24aa
    style SU2 fill:#e1bee7,stroke:#8e24aa
```

## ファイル構造

```
chrome_ext_disappear_slack_messages/
├── .gitignore
├── LICENSE
├── README.md
├── background.js
├── content_scripts.js
├── images/
│   ├── shikakukei-16.png
│   ├── shikakukei-32.png
│   ├── shikakukei-48.png
│   └── shikakukei-128.png
└── manifest.json
```

## 主要コンポーネントの詳細

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Slack メッセージ非表示",
  "version": "1.0.0",
  "author": "se.ishiguro.tomohiro@gmail.com",
  "description": "Slack ch. で 'done' というリアクションがついたメッセージを非表示にする",
  "permissions": [ "storage" ],
  "host_permissions": [ "https://app.slack.com/client/*" ],
  "background": {
    "service_worker": "background.js",
    "persist": false
  },
  "content_scripts": [
    {
      "matches": [ "https://app.slack.com/client/*" ],
      "js": [ "content_scripts.js" ]
    }
  ],
  "action": {}
}
```

主な設定：
- Manifest V3を使用
- `storage` 権限を要求（拡張機能の状態保存用）
- `https://app.slack.com/client/*` のホスト権限を要求
- バックグラウンドスクリプトとコンテンツスクリプトを定義
- `action` オブジェクトを定義（拡張機能アイコンのクリックイベントをリッスン）

### background.js

バックグラウンドスクリプトは、以下の役割を担っています：

1. **拡張機能の状態管理**：
   - `chrome.storage.session` を使用して表示モード（通常/集中）の状態を管理
   - 初期状態は通常モード（`toggleDisappear: false`）

2. **イベントリスナー**：
   - `chrome.runtime.onInstalled`: 拡張機能インストール時に初期状態を設定
   - `chrome.tabs.onUpdated`: Slackページの読み込み完了時に処理を実行
   - `chrome.action.onClicked`: 拡張機能アイコンのクリック時に表示モードを切り替え

3. **コンテンツスクリプトとの通信**：
   - `chrome.tabs.sendMessage` を使用してコンテンツスクリプトにメッセージを送信
   - メッセージには処理ID（`PROCESS_ID_SWITCH_DISPLAY`）と表示モード（`isDisappear`）を含む

### content_scripts.js

コンテンツスクリプトは、以下の役割を担っています：

1. **対象絵文字の定義**：
   ```javascript
   const TARGET_EMOJIS = [
     ":done:",
     ":done_1:",
     ":done-1:",
     ":done_ja:",
     ":done_en:",
   ];
   ```

2. **メッセージの表示制御**：
   - `constolMessagesWithDoneReaction` 関数でメッセージの表示/非表示を制御
   - 通常モード（`isDisappear: false`）: 対象メッセージを半透明（30%の不透明度）で表示
   - 集中モード（`isDisappear: true`）: 対象メッセージを完全に非表示

3. **DOM監視**：
   - `MutationObserver` を使用してSlackチャンネルのスクロールに対応
   - DOMの変更を検知すると、メッセージの表示制御処理を再実行

4. **メッセージ受信**：
   - `chrome.runtime.onMessage` でバックグラウンドスクリプトからのメッセージを受信
   - メッセージに含まれる表示モードに応じて処理を実行

## 処理フロー

1. **初期化**：
   - 拡張機能インストール時に初期状態（通常モード）を設定
   - Slackページ読み込み時に現在の表示モードを適用

2. **表示モード切り替え**：
   - 拡張機能アイコンのクリック時に表示モードを切り替え
   - バックグラウンドスクリプトが新しい状態をセッションストレージに保存
   - コンテンツスクリプトに新しい表示モードを通知

3. **メッセージ処理**：
   - コンテンツスクリプトがSlack UIのDOMを操作
   - 対象の絵文字リアクションを検出し、メッセージの表示スタイルを変更
   - DOMの変更を監視し、新しく表示されるメッセージにも処理を適用

### 実行フロー図

```mermaid
sequenceDiagram
    participant User
    participant Icon as Extension Icon
    participant BG as background.js
    participant Storage as chrome.storage.session
    participant CS as content_scripts.js
    participant Slack as Slack UI
    
    %% 初期化フロー
    Note over User,Slack: 初期化フロー
    User->>+BG: 拡張機能インストール
    BG->>Storage: toggleDisappear: false を設定
    User->>Slack: Slackページを開く
    Slack-->>BG: chrome.tabs.onUpdated イベント
    BG->>+Storage: 状態を取得
    Storage-->>-BG: toggleDisappear の値を返す
    BG->>CS: メッセージを送信
    CS->>Slack: メッセージの表示を制御
    CS->>Slack: MutationObserver を設定
    
    %% 表示モード切り替えフロー
    Note over User,Slack: 表示モード切り替えフロー
    User->>Icon: クリック
    Icon-->>BG: chrome.action.onClicked イベント
    BG->>+Storage: 現在の状態を取得
    Storage-->>-BG: toggleDisappear の値を返す
    BG->>Storage: toggleDisappear の値を反転して保存
    BG->>CS: 新しい表示モードでメッセージを送信
    CS->>Slack: メッセージの表示を更新
    
    %% メッセージ処理フロー
    Note over User,Slack: メッセージ処理フロー
    User->>Slack: スクロールまたはチャンネル切り替え
    Slack-->>CS: DOM変更イベント
    CS->>Slack: 新しいメッセージの表示を制御
```

### データフロー図

```mermaid
flowchart TD
    User([ユーザー]) -->|1. クリック| Icon[拡張機能アイコン]
    Icon -->|2. イベント発火| BG[background.js]
    BG -->|3. 状態取得| Storage[(chrome.storage.session)]
    Storage -->|4. 状態返却| BG
    BG -->|5. 状態更新| Storage
    BG -->|6. メッセージ送信| CS[content_scripts.js]
    CS -->|7. DOM操作| Slack[Slack UI]
    Slack -->|8. DOM変更通知| CS
    
    style User fill:#f9f9f9,stroke:#333
    style Icon fill:#f9d77e,stroke:#f9bc02
    style BG fill:#a8d1ff,stroke:#1a73e8
    style Storage fill:#c9e1a5,stroke:#61b15a
    style CS fill:#ffb8b8,stroke:#e53935
    style Slack fill:#e1bee7,stroke:#8e24aa
```

## 拡張方法

### 対象絵文字の追加

新しい絵文字を対象に追加する場合は、`content_scripts.js`の`TARGET_EMOJIS`配列に追加します：

```javascript
const TARGET_EMOJIS = [
  ":done:",
  ":done_1:",
  ":done-1:",
  ":done_ja:",
  ":done_en:",
  // 新しい絵文字をここに追加
  ":new_emoji:",
];
```

### 表示スタイルの変更

表示スタイルを変更する場合は、`content_scripts.js`の透過率定数を変更します：

```javascript
const TRANSPARENCY_VISIBLE = 1; // 透過率  0%
const TRANSPARENCY_MIDDLE = 0.3; // 透過率 70%
// 新しい透過率を追加または既存の値を変更
```

## パフォーマンスに関する考慮事項

- DOM操作は比較的コストの高い処理であるため、大量のメッセージがある場合はパフォーマンスに影響する可能性があります
- `MutationObserver` はDOMの変更を監視するため、Slackの頻繁な更新がある場合は処理が多く実行される可能性があります
- 現在の実装では、すべてのメッセージを走査して対象の絵文字リアクションを検出しているため、最適化の余地があります
