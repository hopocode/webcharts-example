import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root") as HTMLElement;
// Expose helpers for native integration.
// This helper tries several platform-specific messaging bridges in order:
//  - React Native WebView: `window.ReactNativeWebView.postMessage(string)`
//  - WKWebView (iOS): `window.webkit.messageHandlers.native.postMessage(obj)`
//  - Android JS interface: `window.Android.postMessage(string)`
//  - Fallback: `window.parent.postMessage(obj, '*')` for embedding via parent window
(window as any).postMessageToHost = function (message: any) {
  const m = typeof message === "string" ? message : JSON.stringify(message);

  // React Native (react-native-webview) expects a string via window.ReactNativeWebView.postMessage
  try {
    if (
      (window as any).ReactNativeWebView &&
      typeof (window as any).ReactNativeWebView.postMessage === "function"
    ) {
      (window as any).ReactNativeWebView.postMessage(m);
      return;
    }
  } catch (e) {
    // ignore and try next mechanism
  }

  // WKWebView (iOS) with injected message handler (window.webkit.messageHandlers.native)
  // this usually receives a JS object (no need to stringify)
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
    // ignore and try next mechanism
  }

  // Android WebView with addJavascriptInterface exposing `Android.postMessage(String)`
  try {
    if (
      (window as any).Android &&
      typeof (window as any).Android.postMessage === "function"
    ) {
      (window as any).Android.postMessage(m);
      return;
    }
  } catch (e) {
    // ignore and try next mechanism
  }

  // Generic fallback for non-native embedding: postMessage to parent window
  try {
    if (
      window.parent &&
      window.parent !== window &&
      typeof window.parent.postMessage === "function"
    ) {
      // parent.postMessage typically expects a structured object and an origin
      window.parent.postMessage(JSON.parse(m), "*");
    }
  } catch (e) {
    // ignore
  }
};

// Handler invoked by native apps via evaluateJavascript, e.g. `window.onNativeMessage(JSON.stringify(...))`.
// Native side should call evaluateJavascript with a JSON string argument.
// Example (Swift): webView.evaluateJavaScript("window.onNativeMessage('...')")
(window as any).onNativeMessage = function (msg: any) {
  try {
    const m = typeof msg === "string" ? JSON.parse(msg) : msg;
    if (!m || !m.type) return;

    // Dispatch a global event so React components can subscribe:
    // window.addEventListener('nativeMessage', e => { ... })
    const ev = new CustomEvent("nativeMessage", { detail: m });
    window.dispatchEvent(ev);

    // Shorthand: dispatch specific events for common message types
    // e.g. `selectWeek` -> window.addEventListener('selectWeek', ...) will receive payload
    if (m.type === "selectWeek") {
      const ev2 = new CustomEvent("selectWeek", { detail: m.payload });
      window.dispatchEvent(ev2);
    }
  } catch (e) {
    // ignore parse errors - native caller should ensure valid JSON / escaping
  }
};
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
