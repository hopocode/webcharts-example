import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root") as HTMLElement;
// Expose helpers for native integration
(window as any).postMessageToHost = function (message: any) {
  const m = typeof message === "string" ? message : JSON.stringify(message);
  try {
    if (
      (window as any).ReactNativeWebView &&
      typeof (window as any).ReactNativeWebView.postMessage === "function"
    ) {
      (window as any).ReactNativeWebView.postMessage(m);
      return;
    }
  } catch (e) {
    // ignore
  }
  try {
    if (
      (window as any).webkit &&
      (window as any).webkit.messageHandlers &&
      (window as any).webkit.messageHandlers.native
    ) {
      (window as any).webkit.messageHandlers.native.postMessage(message);
      return;
    }
  } catch (e) {
    // ignore
  }
  try {
    if (
      (window as any).Android &&
      typeof (window as any).Android.postMessage === "function"
    ) {
      (window as any).Android.postMessage(m);
      return;
    }
  } catch (e) {
    // ignore
  }
  // Fallback: postMessage to parent (iframe embedding)
  try {
    if (
      window.parent &&
      window.parent !== window &&
      typeof window.parent.postMessage === "function"
    ) {
      window.parent.postMessage(JSON.parse(m), "*");
    }
  } catch (e) {
    // ignore
  }
};

// Handler invoked by native apps via evaluateJavascript, e.g. window.onNativeMessage(JSON.stringify(...))
(window as any).onNativeMessage = function (msg: any) {
  try {
    const m = typeof msg === "string" ? JSON.parse(msg) : msg;
    if (!m || !m.type) return;
    // Dispatch a global event so components can listen for native messages
    const ev = new CustomEvent("nativeMessage", { detail: m });
    window.dispatchEvent(ev);

    // Shorthand: dispatch specific events for common message types
    if (m.type === "selectWeek") {
      const ev2 = new CustomEvent("selectWeek", { detail: m.payload });
      window.dispatchEvent(ev2);
    }
  } catch (e) {
    // ignore parse errors
    // console.warn('onNativeMessage parse error', e)
  }
};
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
