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
    subgraph "Chrome ブラウザ"
        A[拡張機能アイコン] -->|クリック| B[background.js]
        B -->|状態管理| C[chrome.storage.session]
        C -->|状態読み取り| B
        B -->|メッセージ送信| D[content_scripts.js]
        D -->|DOM操作| E[Slack UI]
        E -->|DOMイベント| D
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

### 詳細なコンポーネント構造

```mermaid
graph TD
    subgraph "background.js"
        BG_Install[chrome.runtime.onInstalled] -->|初期化| BG_Storage[chrome.storage.session]
        BG_TabUpdate[chrome.tabs.onUpdated] -->|Slack検出| BG_SendMsg[sendMessageToInvokeControlingSlackView]
        BG_Action[chrome.action.onClicked] -->|トグル| BG_Toggle[toggleDisappear切り替え]
        BG_Toggle -->|状態更新| BG_Storage
        BG_Storage -->|状態取得| BG_SendMsg
        BG_SendMsg -->|メッセージ送信| CS_Receive[chrome.runtime.onMessage]
    end
    
    subgraph "content_scripts.js"
        CS_Receive -->|処理ID確認| CS_Control[constolMessagesWithDoneReaction]
        CS_Control -->|DOM操作| CS_Messages[メッセージアイテム]
        CS_Control -->|監視設定| CS_Observer[addObserver]
        CS_Observer -->|DOM変更検知| CS_Control
    end
    
    subgraph "Slack UI"
        SU_Messages[メッセージコンテナ] -->|リアクション検出| CS_Control
        SU_Scroll[スクロールコンテナ] -->|変更通知| CS_Observer
    end
    
    style BG_Install fill:#a8d1ff,stroke:#1a73e8
    style BG_TabUpdate fill:#a8d1ff,stroke:#1a73e8
    style BG_Action fill:#a8d1ff,stroke:#1a73e8
    style BG_Toggle fill:#a8d1ff,stroke:#1a73e8
    style BG_Storage fill:#c9e1a5,stroke:#61b15a
    style BG_SendMsg fill:#a8d1ff,stroke:#1a73e8
    style CS_Receive fill:#ffb8b8,stroke:#e53935
    style CS_Control fill:#ffb8b8,stroke:#e53935
    style CS_Messages fill:#ffb8b8,stroke:#e53935
    style CS_Observer fill:#ffb8b8,stroke:#e53935
    style SU_Messages fill:#e1bee7,stroke:#8e24aa
    style SU_Scroll fill:#e1bee7,stroke:#8e24aa
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
    participant ユーザー as ユーザー
    participant アイコン as 拡張機能アイコン
    participant BG as background.js
    participant ストレージ as chrome.storage.session
    participant CS as content_scripts.js
    participant Slack as Slack UI
    
    %% 初期化フロー
    Note over ユーザー,Slack: 初期化フロー
    ユーザー->>+BG: 拡張機能インストール
    BG->>ストレージ: toggleDisappear: false を設定
    ユーザー->>Slack: Slackページを開く
    Slack-->>BG: chrome.tabs.onUpdated イベント
    BG->>+ストレージ: 状態を取得
    ストレージ-->>-BG: toggleDisappear の値を返す
    BG->>CS: メッセージを送信
    CS->>Slack: メッセージの表示を制御
    CS->>Slack: MutationObserver を設定
    
    %% 表示モード切り替えフロー
    Note over ユーザー,Slack: 表示モード切り替えフロー
    ユーザー->>アイコン: クリック
    アイコン-->>BG: chrome.action.onClicked イベント
    BG->>+ストレージ: 現在の状態を取得
    ストレージ-->>-BG: toggleDisappear の値を返す
    BG->>ストレージ: toggleDisappear の値を反転して保存
    BG->>CS: 新しい表示モードでメッセージを送信
    CS->>Slack: メッセージの表示を更新
    
    %% メッセージ処理フロー
    Note over ユーザー,Slack: メッセージ処理フロー
    ユーザー->>Slack: スクロールまたはチャンネル切り替え
    Slack-->>CS: DOM変更イベント
    CS->>Slack: 新しいメッセージの表示を制御
```

### データフロー図

```mermaid
flowchart TD
    ユーザー([ユーザー]) -->|1. クリック| アイコン[拡張機能アイコン]
    アイコン -->|2. イベント発火| BG[background.js]
    BG -->|3. 状態取得| ストレージ[(chrome.storage.session)]
    ストレージ -->|4. 状態返却| BG
    BG -->|5. 状態更新| ストレージ
    BG -->|6. メッセージ送信| CS[content_scripts.js]
    CS -->|7. DOM操作| Slack[Slack UI]
    Slack -->|8. DOM変更通知| CS
    
    style ユーザー fill:#f9f9f9,stroke:#333
    style アイコン fill:#f9d77e,stroke:#f9bc02
    style BG fill:#a8d1ff,stroke:#1a73e8
    style ストレージ fill:#c9e1a5,stroke:#61b15a
    style CS fill:#ffb8b8,stroke:#e53935
    style Slack fill:#e1bee7,stroke:#8e24aa
```

### 詳細なメッセージ処理フロー

```mermaid
sequenceDiagram
    participant CS as content_scripts.js
    participant DOM as Slack DOM
    participant Msg as メッセージアイテム
    participant React as リアクション要素
    
    CS->>+DOM: メッセージアイテムを取得 (.c-message_kit__gutter__right)
    DOM-->>-CS: メッセージアイテムのリスト
    
    loop 各メッセージアイテムに対して
        CS->>+Msg: スタイルをリセット (visibility: visible, opacity: 1)
        CS->>+Msg: 子要素（molecules）を取得
        Msg-->>-CS: 子要素のリスト
        
        loop 各子要素に対して
            CS->>+React: リアクション要素を探索
            React-->>-CS: リアクション要素のリスト
            
            loop 各リアクション要素に対して
                CS->>+React: 絵文字名を取得 (data-stringify-emoji)
                React-->>-CS: 絵文字名
                
                alt 対象絵文字かつ集中モード
                    CS->>Msg: 非表示に設定 (visibility: hidden)
                else 対象絵文字かつ通常モード
                    CS->>Msg: 半透明に設定 (opacity: 0.3)
                end
            end
        end
    end
    
    CS->>+DOM: スクロールコンテナを取得 (.c-virtual_list__scroll_container)
    DOM-->>-CS: スクロールコンテナ要素
    CS->>DOM: MutationObserver を設定
    
    Note over CS,DOM: DOM変更時
    DOM-->>CS: 変更通知
    CS->>DOM: メッセージ表示制御処理を再実行
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

## 開発者向け情報

### コード構造の詳細解説

#### background.js の主要関数

```mermaid
classDiagram
    class BackgroundJS {
        +PROCESS_ID_SWITCH_DISPLAY: String
        +sendMessageToInvokeControlingSlackView(tab)
        +chrome.runtime.onInstalled.addListener()
        +chrome.tabs.onUpdated.addListener()
        +chrome.action.onClicked.addListener()
    }
    
    class StorageSession {
        +get(key)
        +set(key, value)
    }
    
    BackgroundJS --> StorageSession : 使用
```

`sendMessageToInvokeControlingSlackView` 関数は以下の処理を行います：
1. `chrome.storage.session` から現在の表示モード（`toggleDisappear`）を取得
2. 処理ID（`PROCESS_ID_SWITCH_DISPLAY`）と表示モードを含むメッセージを作成
3. `chrome.tabs.sendMessage` を使用してコンテンツスクリプトにメッセージを送信

#### content_scripts.js の主要関数

```mermaid
classDiagram
    class ContentScriptsJS {
        +PROCESS_ID_SWITCH_DISPLAY: String
        +TARGET_EMOJIS: Array
        +TRANSPARENCY_VISIBLE: Number
        +TRANSPARENCY_MIDDLE: Number
        +constolMessagesWithDoneReaction(isDisappear)
        +addObserver(isDisappear)
        +chrome.runtime.onMessage.addListener()
    }
    
    class SlackDOM {
        +.c-message_kit__gutter__right
        +.c-virtual_list__scroll_container
    }
    
    ContentScriptsJS --> SlackDOM : 操作
```

`constolMessagesWithDoneReaction` 関数は以下の処理を行います：
1. Slack UIからメッセージアイテム（`.c-message_kit__gutter__right`）を取得
2. 各メッセージアイテムに対して：
   - スタイルをリセット（`visibility: visible`, `opacity: TRANSPARENCY_VISIBLE`）
   - 子要素を再帰的に探索してリアクション要素を検出
   - 対象の絵文字リアクションが見つかった場合：
     - 集中モード（`isDisappear: true`）なら完全に非表示（`visibility: hidden`）
     - 通常モード（`isDisappear: false`）なら半透明（`opacity: TRANSPARENCY_MIDDLE`）に設定

`addObserver` 関数は以下の処理を行います：
1. Slackのスクロールコンテナ（`.c-virtual_list__scroll_container`）を取得
2. `MutationObserver` を作成し、DOM変更時に `constolMessagesWithDoneReaction` を実行するよう設定
3. スクロールコンテナの子要素の変更を監視

### デバッグ方法

拡張機能のデバッグには以下の方法が有効です：

1. **Chrome DevTools を使用したデバッグ**：
   - 拡張機能のアイコンを右クリックし、「拡張機能を検証」を選択
   - コンソールタブでログを確認（`console.log` 出力）
   - ソースタブでブレークポイントを設定して実行フローを追跡

2. **バックグラウンドスクリプトのデバッグ**：
   - Chrome拡張機能管理ページ（`chrome://extensions`）を開く
   - 「デベロッパーモード」を有効にする
   - 対象の拡張機能の「バックグラウンドページを検証」をクリック

3. **コンテンツスクリプトのデバッグ**：
   - Slackページを開いた状態でDevToolsを開く
   - コンソールタブで `console.log` 出力を確認
   - 「Sources」タブの「Content Scripts」セクションでコードを確認

### 拡張機能の改良案

1. **パフォーマンス最適化**：
   - メッセージの走査を最適化（すべてのメッセージを毎回処理しない）
   - キャッシュを導入して既に処理したメッセージを記録
   - 必要な場合のみDOMを更新

2. **機能拡張**：
   - ユーザーが対象絵文字をカスタマイズできるオプション画面の追加
   - 透過率の調整機能
   - 特定のチャンネルでのみ機能を有効化するオプション

3. **コード改善**：
   - TypeScriptへの移行によるコードの型安全性向上
   - モジュール化によるコードの整理
   - テスト導入によるバグの早期発見

### 開発環境のセットアップ

1. リポジトリをクローン：
   ```bash
   git clone https://github.com/TomohiroIshiguro/chrome_ext_disappear_slack_messages.git
   cd chrome_ext_disappear_slack_messages
   ```

2. Chrome拡張機能として読み込む：
   - Chrome拡張機能管理ページ（`chrome://extensions`）を開く
   - 「デベロッパーモード」を有効にする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - クローンしたリポジトリのディレクトリを選択

3. 変更を加えてテスト：
   - コードを編集
   - 拡張機能管理ページで拡張機能の更新ボタンをクリック
   - Slackページをリロードして変更を確認
