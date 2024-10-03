// 定数定義
const PROCESS_ID_SWITCH_DISPLAY = "001"; // invoke switching to show messages in slack

const TARGET_EMOJIS = [
  ":done:",
  ":done_1:",
  ":done-1:",
  ":done_ja:",
  ":done_en:",
];

const TRANSPARENCY_VISIBLE = 1; // 透過率  0%
const TRANSPARENCY_MIDDLE = 0.3; // 透過率 70%

// Slach ch. のメッセージに DONE リアクションがついていたら区別できるようにする
function constolMessagesWithDoneReaction(isDisappear) {
  console.log("----- Control Slack View -----");
  const messageItems = document.querySelectorAll(
    ".p-workspace__primary_view_body .c-message_kit__gutter__right",
  );
  messageItems.forEach((item) => {
    item.style.visibility = "visible"; // DONE リアクションを削除したら透過をリセットする
    item.style.opacity = TRANSPARENCY_VISIBLE; // DONE リアクションを削除したら透過をリセットする
    // リアクションを調べる
    const molecules = item.children;
    for (let i = 0; i < molecules.length; i++) {
      if (molecules[i].tagName !== "DIV") continue;
      const reactions0 = molecules[i].children;
      for (let j = 0; j < reactions0.length; j++) {
        if (reactions0[j].tagName !== "SPAN") continue;
        const reactions1 = reactions0[j].children;
        for (let k = 0; k < reactions1.length; k++) {
          if (reactions1[k].tagName !== "BUTTON") continue;
          const reactions2 = reactions1[k].children;
          if (reactions2.length == 0) continue;
          if (reactions2[0].tagName !== "IMG") continue;
          const emojiName = reactions2[0].getAttribute("data-stringify-emoji");
          let isTarget = false;
          TARGET_EMOJIS.forEach((target) => {
            isTarget = emojiName === target ? true : isTarget;
          });
          if (isTarget && isDisappear) {
            item.style.visibility = "hidden"; // 集中モード
          } else if (isTarget) {
            item.style.opacity = TRANSPARENCY_MIDDLE; // グレーアウト
          }
        }
      }
    }
  });
}

// --------------------------------------------------------------------------------
// イベントリスナーを登録する
// --------------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const arguments = JSON.parse(message);
  if (arguments.procId !== PROCESS_ID_SWITCH_DISPLAY) return;
  constolMessagesWithDoneReaction(arguments.isDisappear);
  addObserver(arguments.isDisappear);
});

// Slack ch. のスクロールに対応するため、DOM の更新を監視して、検知したら処理をキックする
function addObserver(isDisappear) {
  const dom = document.querySelectorAll(".c-virtual_list__scroll_container");
  const chHistoryArea = dom[1]; // [1] はメッセージ一覧、[0] は左辺のメニューのコンテナとして使われている.
  observer = new MutationObserver(() => {
    constolMessagesWithDoneReaction(isDisappear);
  });
  observer.observe(chHistoryArea, { childList: true });
}
