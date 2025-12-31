/**
 * Content Script
 * Slackページ内で動作し、DONEリアクション付きメッセージの表示制御を担当
 * - メッセージのグレーアウト表示
 * - メッセージの非表示（Disappearモード）
 * - スクロール時のリアルタイム更新
 */

// ============================================================================
// 定数定義
// ============================================================================

const MESSAGE_TYPE_SWITCH_DISPLAY = "001";

/** 対象となるDONE系リアクション絵文字 */
const TARGET_EMOJIS = new Set([
  ":done:",
  ":done_1:",
  ":done-1:",
  ":done_ja:",
  ":done_en:",
]);

/** 透過率設定 */
const OPACITY = Object.freeze({
  VISIBLE: 1,      // 透過率 0%（完全に表示）
  DIMMED: 0.3,     // 透過率 70%（グレーアウト）
});

/** DOMセレクタ */
const SELECTORS = Object.freeze({
  // メインチャンネルとスレッドパネル両方のメッセージを対象
  MESSAGE_CONTAINER: ".c-message_kit__gutter__right",
  SCROLL_CONTAINER: ".c-virtual_list__scroll_container",
});

// ============================================================================
// モジュール状態
// ============================================================================

/** 現在のMutationObserverインスタンスの配列（重複登録防止用） */
let currentObservers = [];

/** デバウンス用のタイマーID */
let debounceTimer = null;

/** デバウンス待機時間（ミリ秒） */
const DEBOUNCE_DELAY = 100;

// ============================================================================
// DOM操作関数
// ============================================================================

/**
 * メッセージ要素からリアクション絵文字名のリストを抽出
 * @param {HTMLElement} messageElement - メッセージ要素
 * @returns {string[]} 絵文字名の配列
 */
function extractReactionEmojis(messageElement) {
  const emojiImages = messageElement.querySelectorAll(
    "div > span > button > img[data-stringify-emoji]"
  );

  return Array.from(emojiImages)
    .map(img => img.getAttribute("data-stringify-emoji"))
    .filter(Boolean);
}

/**
 * メッセージがDONEリアクションを持っているかチェック
 * @param {HTMLElement} messageElement - メッセージ要素
 * @returns {boolean} DONEリアクションがある場合true
 */
function hasDoneReaction(messageElement) {
  const emojis = extractReactionEmojis(messageElement);
  return emojis.some(emoji => TARGET_EMOJIS.has(emoji));
}

/**
 * メッセージ要素の表示スタイルをリセット
 * @param {HTMLElement} element - 対象要素
 */
function resetMessageStyle(element) {
  element.style.visibility = "visible";
  element.style.opacity = OPACITY.VISIBLE;
}

/**
 * メッセージ要素を非表示にする（Disappearモード）
 * @param {HTMLElement} element - 対象要素
 */
function hideMessage(element) {
  element.style.visibility = "hidden";
}

/**
 * メッセージ要素をグレーアウト表示する
 * @param {HTMLElement} element - 対象要素
 */
function dimMessage(element) {
  element.style.opacity = OPACITY.DIMMED;
}

// ============================================================================
// メイン処理
// ============================================================================

/**
 * DONEリアクション付きメッセージの表示を制御
 * @param {boolean} isDisappear - Disappearモードかどうか
 */
function controlMessagesWithDoneReaction(isDisappear) {
  console.debug("[Content] メッセージ表示を更新中...");

  const messageElements = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);

  messageElements.forEach(element => {
    // まずスタイルをリセット（リアクション削除時の対応）
    resetMessageStyle(element);

    // DONEリアクションがなければ何もしない
    if (!hasDoneReaction(element)) {
      return;
    }

    // モードに応じてスタイルを適用
    if (isDisappear) {
      hideMessage(element);
    } else {
      dimMessage(element);
    }
  });
}

// ============================================================================
// Observer管理
// ============================================================================

/**
 * デバウンス付きでメッセージ表示を更新
 * subtree監視により頻繁に発火するため、パフォーマンス最適化
 * @param {boolean} isDisappear - Disappearモードかどうか
 */
function debouncedControlMessages(isDisappear) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    controlMessagesWithDoneReaction(isDisappear);
    debounceTimer = null;
  }, DEBOUNCE_DELAY);
}

/** リトライ設定 */
const RETRY_CONFIG = Object.freeze({
  MAX_ATTEMPTS: 5,      // 最大リトライ回数
  DELAY_MS: 500,        // リトライ間隔（ミリ秒）
});

/**
 * DOM更新を監視するObserverを設定
 * メインチャンネルとスレッドパネルの両方を監視
 * @param {boolean} isDisappear - Disappearモードかどうか
 * @param {number} attempt - 現在のリトライ回数（内部使用）
 */
function setupScrollObserver(isDisappear, attempt = 1) {
  // 既存のObserverをすべて解除
  currentObservers.forEach(observer => observer.disconnect());
  currentObservers = [];

  const scrollContainers = document.querySelectorAll(SELECTORS.SCROLL_CONTAINER);

  // スクロールコンテナが見つからない場合はリトライ
  if (scrollContainers.length === 0) {
    if (attempt < RETRY_CONFIG.MAX_ATTEMPTS) {
      console.debug(`[Content] スクロールコンテナが見つかりません。リトライ ${attempt}/${RETRY_CONFIG.MAX_ATTEMPTS}...`);
      setTimeout(() => {
        setupScrollObserver(isDisappear, attempt + 1);
      }, RETRY_CONFIG.DELAY_MS);
    } else {
      console.debug("[Content] スクロールコンテナが見つかりませんでした（SPA読み込み待機タイムアウト）");
    }
    return;
  }

  // すべてのスクロールコンテナを監視（メイン、スレッド等）
  // [0]は左側のメニューコンテナなのでスキップ
  scrollContainers.forEach((container, index) => {
    if (index === 0) return; // 左側メニューはスキップ

    const observer = new MutationObserver(() => {
      // デバウンス処理で頻繁な更新を最適化
      debouncedControlMessages(isDisappear);
    });

    observer.observe(container, {
      childList: true,  // 子要素の追加・削除を監視（スクロール時）
      subtree: true,    // サブツリー全体を監視（リアクションの付け外し）
    });

    currentObservers.push(observer);
  });

  console.debug(`[Content] DOM Observerを${currentObservers.length}個設定しました（subtree監視有効）`);
}

// ============================================================================
// メッセージリスナー
// ============================================================================

/**
 * バックグラウンドスクリプトからのメッセージを処理
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    const payload = JSON.parse(message);

    if (payload.procId !== MESSAGE_TYPE_SWITCH_DISPLAY) {
      return;
    }

    const { isDisappear } = payload;

    console.info(`[Content] 表示モード変更: ${isDisappear ? "Disappear" : "Dimmed"}`);

    controlMessagesWithDoneReaction(isDisappear);
    setupScrollObserver(isDisappear);

  } catch (error) {
    console.error("[Content] メッセージ処理エラー:", error);
  }
});
