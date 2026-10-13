"use strict";

const DEFAULT_TITLE = "Show or hide the lead row copy button";

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id == null) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["classifier.bundle.js", "content.js"],
    });
  } catch (error) {
    console.error("Could not add the lead row copy button:", error);
    await chrome.action.setBadgeBackgroundColor({ color: "#b42318", tabId: tab.id });
    await chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    await chrome.action.setTitle({
      title: "Could not access this page. Open a regular website and try again.",
      tabId: tab.id,
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null || !message || message.type !== "lead-row-button-state") return;

  if (message.state === "missing-textarea") {
    void chrome.action.setBadgeBackgroundColor({ color: "#b42318", tabId });
    void chrome.action.setBadgeText({ text: "!", tabId });
    void chrome.action.setTitle({
      title: 'No textarea with id="comments" or name="comments" was found.',
      tabId,
    });
    return;
  }

  void chrome.action.setBadgeText({ text: "", tabId });
  void chrome.action.setTitle({ title: DEFAULT_TITLE, tabId });
});
