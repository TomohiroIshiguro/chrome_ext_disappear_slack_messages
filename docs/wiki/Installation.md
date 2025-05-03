# インストール方法

このページでは、Chrome拡張機能「Slack メッセージ非表示」のインストール方法について説明します。

## 前提条件

- Google Chrome ブラウザ
- デベロッパーモードの有効化

## インストール手順

### 方法1: ローカルからのインストール（開発者向け）

1. このリポジトリをクローンまたはダウンロード
   ```bash
   git clone https://github.com/TomohiroIshiguro/chrome_ext_disappear_slack_messages.git
   ```

2. Chromeブラウザで `chrome://extensions/` を開く

3. 右上の「デベロッパーモード」をオンにする
   ![デベロッパーモード](https://developer.chrome.com/docs/extensions/mv3/getstarted/extensions-enabled.png)

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. ダウンロードしたリポジトリのフォルダを選択

6. 拡張機能が正常にインストールされると、Chrome拡張機能バーにアイコンが表示されます

### 方法2: Chrome ウェブストアからのインストール（一般ユーザー向け）

※現在、この拡張機能はChrome ウェブストアでは公開されていません。

## インストール後の確認

1. Chromeブラウザで Slack のウェブアプリ（`https://app.slack.com/client/*`）を開く

2. 拡張機能のアイコンをクリックして、機能が有効になっていることを確認

3. `:done:` リアクションがついたメッセージが半透明になっていれば、正常にインストールされています

## トラブルシューティング

インストール時に問題が発生した場合は、以下を確認してください：

1. Chrome のバージョンが最新であることを確認
2. デベロッパーモードが有効になっていることを確認
3. 拡張機能のパーミッションが正しく設定されていることを確認
4. Chrome を再起動して再度試す

問題が解決しない場合は、[Issues](https://github.com/TomohiroIshiguro/chrome_ext_disappear_slack_messages/issues) ページで報告してください。
