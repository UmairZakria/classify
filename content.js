"use strict";

(() => {
  const INSTANCE_KEY = "__leadRowCopier";
  if (window[INSTANCE_KEY]) {
    window[INSTANCE_KEY].toggle();
    return;
  }

  const textarea =
    document.querySelector("textarea#comments[name='comments']") ||
    document.querySelector("textarea#comments") ||
    document.querySelector("textarea[name='comments']");

  if (!textarea) {
    chrome.runtime.sendMessage({ type: "lead-row-button-state", state: "missing-textarea" });
    return;
  }

  const host = document.createElement("div");
  host.setAttribute("aria-label", "Lead row copy button");
  host.style.cssText = "position:fixed;z-index:2147483647;pointer-events:auto;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      button {
        border: 0;
        border-radius: 999px;
        padding: 9px 15px;
        background: #155eef;
        color: #fff;
        box-shadow: 0 2px 8px rgb(16 24 40 / 24%);
        cursor: pointer;
        font: 600 13px/1.2 system-ui, sans-serif;
        white-space: nowrap;
      }
      button:hover { background: #004eeb; }
      button:focus-visible { outline: 3px solid #84caff; outline-offset: 2px; }
      button:disabled { cursor: wait; opacity: .8; }
    </style>
    <button type="button">Copy</button>
  `;
  const button = shadow.querySelector("button");
  document.documentElement.appendChild(host);

  let visible = true;
  let resetTimer;

  function positionButton() {
    if (!visible || !textarea.isConnected) return;
    const rect = textarea.getBoundingClientRect();
    const buttonRect = host.getBoundingClientRect();
    const margin = 8;
    const left = rect.right + buttonRect.width + margin <= window.innerWidth
      ? rect.right + margin
      : Math.max(margin, rect.left - buttonRect.width - margin);
    const top = Math.max(margin, Math.min(rect.top, window.innerHeight - buttonRect.height - margin));
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  }

  function setStatus(text, title, resetAfter) {
    button.textContent = text;
    button.title = title;
    window.clearTimeout(resetTimer);
    if (resetAfter) {
      resetTimer = window.setTimeout(() => {
        button.textContent = "Copy";
        button.title = "Classify the comments text and copy one Google Sheets row.";
      }, resetAfter);
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (_error) {
        // Try the user-gesture-based fallback below for pages without clipboard API access.
      }
    }

    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.cssText = "position:fixed;left:-9999px;top:0;";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw new Error("Clipboard access was denied by the browser.");
  }

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const row = window.LeadRowClassifier.toGoogleSheetsRow(textarea.value);
      await copyText(row);
      setStatus("Copied!", "Google Sheets row copied to the clipboard.", 1400);
    } catch (error) {
      setStatus("Copy failed", error instanceof Error ? error.message : "Could not classify or copy this lead.", 3000);
    } finally {
      button.disabled = false;
    }
  });

  function toggle() {
    visible = !visible;
    host.style.display = visible ? "" : "none";
    if (visible) positionButton();
  }

  window[INSTANCE_KEY] = { toggle };
  window.addEventListener("scroll", positionButton, true);
  window.addEventListener("resize", positionButton);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(positionButton).observe(textarea);
  }
  const documentObserver = new MutationObserver(() => {
    if (!textarea.isConnected) {
      host.remove();
      documentObserver.disconnect();
      window.removeEventListener("scroll", positionButton, true);
      window.removeEventListener("resize", positionButton);
      delete window[INSTANCE_KEY];
      chrome.runtime.sendMessage({ type: "lead-row-button-state", state: "missing-textarea" });
    } else {
      positionButton();
    }
  });
  documentObserver.observe(document.documentElement, { childList: true, subtree: true });

  positionButton();
  chrome.runtime.sendMessage({ type: "lead-row-button-state", state: "visible" });
})();
