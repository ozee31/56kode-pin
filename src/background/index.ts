import { handlePinArticle } from "./handler";

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse): true | undefined => {
    if (message.type === "PIN_ARTICLE") {
      handlePinArticle().then(sendResponse);
      return true; // Keep message channel open for async response
    }
  },
);
