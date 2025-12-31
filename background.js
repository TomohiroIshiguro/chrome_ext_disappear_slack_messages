/**
 * Background Script
 * Chrome Extension のバックグラウンド処理を担当
 * - 拡張機能のインストール時の初期化
 * - タブ更新時のコンテンツスクリプトへの通知
 * - 拡張機能アイコンクリック時のトグル処理
 */

// ============================================================================
// 定数定義
// ============================================================================

const MESSAGE_TYPE_SWITCH_DISPLAY = "001";
const SLACK_URL_PATTERN = "https://app.slack.com/client";
const STORAGE_KEY = "toggleDisappear";

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * 指定されたURLがSlackのクライアントURLかどうかを判定
 * @param {string} url - 判定するURL
 * @returns {boolean} SlackのURLの場合true
 */
function isSlackUrl(url) {
  return url?.includes(SLACK_URL_PATTERN) ?? false;
}

/**
 * ストレージからDisappear状態を取得
 * @returns {Promise<boolean>} 現在のDisappear状態
 */
async function getDisappearState() {
  try {
    const result = await chrome.storage.session.get([STORAGE_KEY]);
    return result[STORAGE_KEY] ?? false;
  } catch (error) {
    console.warn("[Background] ストレージ読み取りエラー:", error.message);
    return false;
  }
}

/**
 * ストレージにDisappear状態を保存
 * @param {boolean} state - 保存する状態
 * @returns {Promise<void>}
 */
async function setDisappearState(state) {
  await chrome.storage.session.set({ [STORAGE_KEY]: state });
}

// ============================================================================
// メッセージング関数
// ============================================================================

/**
 * コンテンツスクリプトにメッセージを送信してSlack表示を制御
 * @param {chrome.tabs.Tab} tab - 対象のタブ
 */
async function notifyContentScript(tab) {
  try {
    const isDisappear = await getDisappearState();

    const message = {
      procId: MESSAGE_TYPE_SWITCH_DISPLAY,
      isDisappear,
    };

    await chrome.tabs.sendMessage(tab.id, JSON.stringify(message));
  } catch (error) {
    // 以下のケースでエラーが発生するが、正常な動作なので無視
    // - ストレージにキーが設定される前
    // - ページがメッセージを受信する準備ができる前
    console.debug("[Background] メッセージ送信スキップ:", error.message);
  }
}

// ============================================================================
// イベントリスナー
// ============================================================================

/**
 * 拡張機能インストール/更新時の初期化処理
 */
chrome.runtime.onInstalled.addListener(() => {
  setDisappearState(false);
  console.info("[Background] 拡張機能が初期化されました");
});

/**
 * タブ更新時の処理
 * Slackページの読み込み完了時にコンテンツスクリプトへ通知
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const isPageLoaded = changeInfo.status === "complete";

  if (isPageLoaded && isSlackUrl(tab.url)) {
    notifyContentScript(tab);
  }
});

/**
 * 拡張機能アイコンクリック時の処理
 * Disappear状態をトグルしてコンテンツスクリプトへ通知
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!isSlackUrl(tab.url)) {
    console.debug("[Background] Slack以外のページでクリックされました");
    return;
  }

  try {
    const currentState = await getDisappearState();
    const newState = !currentState;

    await setDisappearState(newState);
    await notifyContentScript(tab);

    console.info(`[Background] Disappearモード: ${newState ? "ON" : "OFF"}`);
  } catch (error) {
    console.error("[Background] トグル処理エラー:", error);
  }
});
