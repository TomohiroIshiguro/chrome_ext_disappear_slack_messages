// 定数定義
const PROCESS_ID_SWITCH_DISPLAY = "001"; // invoke switching to show messages in slack

// Slack を開いたとき、ch. を切り替えた時に処理をキックする
function sendMessageToInvokeControlingSlackView(tab) {
  chrome.storage.session.get(["toggleDisappear"])
    .then((result) => {
      const message = {
        procId: PROCESS_ID_SWITCH_DISPLAY,
        isDisappear: result.toggleDisappear,
      };
      chrome.tabs.sendMessage(tab.id, JSON.stringify(message));
    })
    .catch(err => {
      console.log(err);
      // ignore: before the storage key was set a value, this error occurs.
      // ignore: before a page is ready to receive the message, this error occurs.
    });
}


// --------------------------------------------------------------------------------
// イベントリスナーを登録する
// --------------------------------------------------------------------------------

// 拡張機能をインストールした時に処理する
chrome.runtime.onInstalled.addListener((tabId, changeInfo, tab) => {
  chrome.storage.session.set({ toggleDisappear: false });
});

// Slack を開いたとき、ch. を切り替えた時に処理する
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete"
      && tab.url
      && tab.url.indexOf("https://app.slack.com/client") !== -1) {
    sendMessageToInvokeControlingSlackView(tab);
  }
});

// 拡張機能ボタンを押下時
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.session.get(["toggleDisappear"])
    .then((result) => {
      const toggleDisappear = !result.toggleDisappear;
      if (tab.url
          && tab.url.indexOf("https://app.slack.com/client") !== -1) {
        chrome.storage.session.set({ toggleDisappear: toggleDisappear })
          .then(() => sendMessageToInvokeControlingSlackView(tab));
      }
    })
    .catch(err => {
      console.log(err);
      // ignore: before the storage key was set a value, this error occurs.
      // ignore: before a page is ready to receive the message, this error occurs.
    });
});
