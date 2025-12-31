/**
 * 共通定数モジュール
 * background.js と content_scripts.js で共有する定数を定義
 */

// メッセージプロセスID
export const MESSAGE_TYPES = Object.freeze({
  SWITCH_DISPLAY: "001", // Slackメッセージの表示切り替え
});

// 対象の絵文字リスト（DONE系リアクション）
export const TARGET_EMOJIS = Object.freeze([
  ":done:",
  ":done_1:",
  ":done-1:",
  ":done_ja:",
  ":done_en:",
]);

// 透過率設定
export const OPACITY = Object.freeze({
  VISIBLE: 1,      // 透過率 0%（完全に表示）
  DIMMED: 0.3,     // 透過率 70%（グレーアウト）
});

// Slack URL パターン
export const SLACK_URL_PATTERN = "https://app.slack.com/client";

// DOM セレクタ
export const SELECTORS = Object.freeze({
  MESSAGE_CONTAINER: ".p-workspace__primary_view_body .c-message_kit__gutter__right",
  SCROLL_CONTAINER: ".c-virtual_list__scroll_container",
});
