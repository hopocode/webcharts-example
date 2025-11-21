````markdown
# Integrating `Graph2` into native apps (iOS / Android)

This document explains how to embed the `/graph2` page (which contains the `CashFlowBarChart`) into native iOS (Swift, `WKWebView`) and Android (Kotlin, `WebView`) apps without using an `iframe`. Communication from native -> web is done with `evaluateJavascript` (calling JS from native). Communication from web -> native uses platform-specific JS bridges.

Contents:

- Message format overview
- Recommended small web changes
- iOS (Swift) — example and steps
- Android (Kotlin) — example and steps
- Testing and security recommendations

---

**Message format**

Recommended JSON format for messages from the web to native (for example, when a week bar is clicked):

```json
{
  "type": "weekClick",
  "payload": {
    "point": { "name": "Week 1", "value": 1200, "key": "Week 1" },
    "key": "Week 1"
  }
}
```
````

Recommended JSON format for native -> web messages (sent via `evaluateJavascript`):

```json
{
  "type": "selectWeek",
  "payload": { "key": "Week 3" }
}
```

---

**Recommended small web changes**

Add a lightweight global handler in your frontend (for example in `src/main.tsx` or in the `Graph2` page) so the web app can receive native messages and send messages to the native host:

````js
// Called by native via evaluateJavascript: window.onNativeMessage(jsonString)
window.onNativeMessage = function (msg) {
  try {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    if (!m || !m.type) return;
    switch (m.type) {
      case 'selectWeek':
        // highlight bar with matching m.payload.key
        console.log('Native requested selectWeek', m.payload);
        break;
      // handle other message types
    }
  } catch (e) {
    console.warn('onNativeMessage parse error', e);
  }
};

// Helper function to send messages to native in a robust way.
window.postMessageToHost = function (message) {
  const m = typeof message === 'string' ? message : JSON.stringify(message);
  try {
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(m);
      return;
    }
  } catch (e) {}
  try {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.native) {
      // WKWebView
      window.webkit.messageHandlers.native.postMessage(message);
      return;
    }
  } catch (e) {}
  try {
    if (window.Android && typeof window.Android.postMessage === 'function') {
      window.Android.postMessage(m);
      return;
    }
  } catch (e) {}
};

// Note: the project's container (`CashFlowBarChartContainer`) already posts messages to native.
// The helper above is provided so other parts of the web app can also send/receive messages.

---

**Embedding in an iframe (browser-to-browser integration)**

When embedding the `/graph2` page inside an `iframe` on another web page you can use the standard
`window.postMessage` API for two-way messaging. This is useful when the host is another web app
or a dashboard and you don't control a native layer.

Parent page (host) example:

```html
<!-- parent.html -->
<iframe id="chartIframe" src="http://localhost:5173/graph2" style="width:100%;height:600px;border:0"></iframe>
<script>
const iframe = document.getElementById('chartIframe');

// Listen for messages from the iframe
window.addEventListener('message', (event) => {
  // Verify origin for security (use your app's origin in production)
  if (event.origin !== 'http://localhost:5173') return;
  const m = event.data;
  if (!m || !m.type) return;
  switch (m.type) {
    case 'weekClick':
      console.log('Iframe clicked week:', m.payload);
      break;
  }
});

// Send a selectWeek message to the iframe
function selectWeekInIframe(key) {
  const msg = { type: 'selectWeek', payload: { key } };
  // Use exact target origin in production
  iframe.contentWindow.postMessage(msg, 'http://localhost:5173');
}
</script>
```

Inside the iframe (the web app at `/graph2`) you can forward incoming messages into the
app's existing message handler (we already expose `window.onNativeMessage` and dispatch
`nativeMessage` CustomEvents in this project):

```js
// inside web app (e.g. in src/main.tsx or CashFlowBarChartContainer)
window.addEventListener('message', (event) => {
  // Optionally check event.origin to ensure message is trusted
  // if (event.origin !== 'https://your-host.com') return;

  // event.data may be an object (no need to JSON.parse) or a string
  const m = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
  if (!m || !m.type) return;

  // Reuse existing onNativeMessage convention if available
  if (window.onNativeMessage) {
    window.onNativeMessage(m);
    return;
  }

  // Fallback: dispatch app-level event
  window.dispatchEvent(new CustomEvent('nativeMessage', { detail: m }));
});
```

To send messages from the iframe to the parent (for example when a bar is clicked):

```js
// when a bar is clicked in CashFlowBarChartContainer
const message = { type: 'weekClick', payload: { point, key } };
// Use explicit origin in production; '*' is ok for local development only
window.parent.postMessage(message, 'http://localhost:5173');
```

Security notes for iframe embedding:

- Always restrict `targetOrigin` and validate `event.origin` on the receiver side.
- Prefer posting JS objects (browsers support structured clone) instead of stringified JSON to avoid double-parsing; if you must stringify, parse safely.
- Avoid `'*'` as `targetOrigin` in production.

This iframe flow mirrors the native messaging contract used elsewhere in this doc:
- Web -> host: `{ type: 'weekClick', payload: { point, key } }`
- Host -> web: `{ type: 'selectWeek', payload: { key } }`


**iOS (Swift) — WKWebView**

1) Add a `WKWebView` and register a `WKScriptMessageHandler` to receive messages from JS (JS -> native):

```swift
import UIKit
import WebKit

class WebViewController: UIViewController, WKScriptMessageHandler {
  var webView: WKWebView!

  override func loadView() {
    let config = WKWebViewConfiguration()
    config.userContentController.add(self, name: "native") // name used by JS
    webView = WKWebView(frame: .zero, configuration: config)
    view = webView
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    let url = URL(string: "http://localhost:5173/graph2")! // or production URL
    webView.load(URLRequest(url: url))
  }

  // Receives messages sent by JS via window.webkit.messageHandlers.native.postMessage(...)
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard message.name == "native" else { return }
    print("Received from web: \(message.body)")
    // message.body can be a String or Dictionary — parse as needed
    if let dict = message.body as? [String: Any], let type = dict["type"] as? String {
      switch type {
      case "weekClick":
        // handle the click
        print("weekClick payload: \(dict["payload"] ?? "")")
      default:
        break
      }
    }
  }
}
````

2. Send a message from native to web using `evaluateJavaScript` (native -> web):

```swift
let message: [String: Any] = ["type": "selectWeek", "payload": ["key": "Week 3"]]
if let jsonData = try? JSONSerialization.data(withJSONObject: message, options: []),
   let jsonString = String(data: jsonData, encoding: .utf8) {
  // Safely call the global JS function exposed by the web app
  let escaped = jsonString
    .replacingOccurrences(of: "\\", with: "\\\\")
    .replacingOccurrences(of: "\"", with: "\\\"")
  let call = "window.onNativeMessage && window.onNativeMessage(\"\(escaped)\")"
  webView.evaluateJavaScript(call) { (result, error) in
    if let error = error { print("evaluate error: \(error)") }
  }
}
```

Notes:

- You can also use other global function names (e.g. `window.handleMessageFromNative`) — the important part is that the web app exposes a function to be called from native.
- When building the JS call string, escape JSON safely. Alternatively, you can use message handlers (as above) for JS -> native; `window.postMessage` is not delivered to `userContentController` in WKWebView.

---

**Android (Kotlin) — WebView**

1. Setup `WebView` and `addJavascriptInterface` to receive calls from JS (JS -> native):

```kotlin
class WebAppInterface(private val context: Context) {
  @JavascriptInterface
  fun postMessage(message: String) {
    // message is a JSON string
    Log.d("WebView", "Received: $message")
    // parse and handle JSON
  }
}

// in Activity/Fragment:
val webView: WebView = findViewById(R.id.webView)
webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(WebAppInterface(this), "Android")
webView.loadUrl("http://10.0.2.2:5173/graph2")
```

In JS call `window.Android.postMessage(JSON.stringify(...))` to send to native.

2. Send a message from native to web using `evaluateJavascript`:

```kotlin
val message = JSONObject()
message.put("type", "selectWeek")
val payload = JSONObject()
payload.put("key", "Week 3")
message.put("payload", payload)

val js = "window.onNativeMessage && window.onNativeMessage(${JSONObject.quote(message.toString())});"
webView.evaluateJavascript(js, null)
```

Notes:

- `evaluateJavascript` is asynchronous and safer than `loadUrl("javascript:...")`.
- `JSONObject.quote` (or another escape method) ensures the JSON string is safely embedded in the JS call.

---

**End-to-end example (practical)**

1. Web: `CashFlowBarChartContainer` sends a message on click like `window.postMessageToHost({ type: 'weekClick', payload: { point, key } })` (or uses platform-specific calls). The container in this repo already performs this.
2. iOS: `userContentController` receives the object and handles it (e.g. updates UI).
3. Native can react and call `evaluateJavaScript` with a `selectWeek` message, e.g. `window.onNativeMessage(JSON_STRING)`, so the web app highlights the requested bar.

---

**Testing**

- Run the dev server locally:

```bash
cd /Users/honzap/dev/webgraph
npm run dev
```

- In the iOS simulator open `http://<host>:5173/graph2` (for Android emulator use `10.0.2.2` if hosting locally).
- Click a bar in the chart and watch logs in Xcode / Logcat — you should see `weekClick` messages.
- Test native -> web by calling `evaluateJavascript` with a `selectWeek` message and verify `window.onNativeMessage` receives it.

---

**Security notes**

- Do not send sensitive data via open channels without origin verification. If you use `postMessage` with `targetOrigin='*'` in production, consider narrowing the allowed origin.
- Validate incoming messages in the web app (types, allowed key values, ranges, etc.).
- Escape JSON properly when inserting it into JS code (use `JSONObject.quote` on Android or safe escaping on Swift).

---

If you want, I can:

- Add a concrete `window.onNativeMessage` implementation to the web app (for example, actually highlight the bar) and commit it.
- Create a small demo native project for iOS and Android (snippets or branches) showing the full integration.

Tell me which option you prefer and I'll proceed.

````
# Integrace `Graph2` do nativních aplikací (iOS / Android)

Tento dokument popisuje, jak embedovat stránku `/graph2` (která obsahuje `CashFlowBarChart`) do nativní aplikace pro iOS (Swift, `WKWebView`) a Android (Kotlin, `WebView`) bez použití `iframe`. Komunikace native -> web bude přes `evaluateJavascript` (volání JS z nativní vrstvy). Web -> native komunikace je zajištěna voláním vhodných JS API (přizpůsobeno platformě).

Obsah:

- Přehled formátu zpráv
- Doporučené změny v JS (web)
- iOS (Swift) — ukázka a postup
- Android (Kotlin) — ukázka a postup
- Testování a bezpečnostní doporučení

---

**Formát zpráv**

Doporučený JSON formát z webu do native (příklad při kliknutí na týden):

```json
{
  "type": "weekClick",
  "payload": { "point": { "name": "Week 1", "value": 1200 }, "index": 0 }
}
````

Native -> web: doporučený objekt, který nativní appka předá webu pomocí `evaluateJavascript`:

```json
{
  "type": "selectWeek",
  "payload": { "index": 2 }
}
```

---

**Doporučené drobné úpravy na straně webu**

Pro jednoduché a robustní zpracování zpráv z nativní vrstvy přidejte do frontendu (např. v `src/main.tsx` nebo v komponentě `Graph2`) tento globální handler:

```js
// window.bridge přijímá zprávy z native
window.onNativeMessage = function (msg) {
  try {
    const m = typeof msg === "string" ? JSON.parse(msg) : msg;
    if (!m || !m.type) return;
    switch (m.type) {
      case "selectWeek":
        // implementujte zvýraznění sloupce podle m.payload.index
        console.log("Native wants to select week", m.payload);
        break;
      // další typy zpráv
    }
  } catch (e) {
    console.warn("onNativeMessage parse error", e);
  }
};

// Helper: robustně pošlete zprávu do nativní vrstvy (pokud existuje několik mechanismů)
window.postMessageToHost = function (message) {
  const m = typeof message === "string" ? message : JSON.stringify(message);
  try {
    if (
      window.ReactNativeWebView &&
      typeof window.ReactNativeWebView.postMessage === "function"
    ) {
      window.ReactNativeWebView.postMessage(m);
      return;
    }
  } catch (e) {}
  try {
    if (
      window.webkit &&
      window.webkit.messageHandlers &&
      window.webkit.messageHandlers.native
    ) {
      // WKWebView
      window.webkit.messageHandlers.native.postMessage(message);
      return;
    }
  } catch (e) {}
  try {
    if (window.Android && typeof window.Android.postMessage === "function") {
      window.Android.postMessage(m);
      return;
    }
  } catch (e) {}
};

// Váš existující klik-handler v CashFlowBarChart containeru posílá nyní objekt
// { type: 'weekClick', payload: { point, index } }
```

Poznámka: součástí této repo úpravy není nutné měnit container — v projektu jsem přidal postMessage kroky už do `CashFlowBarChartContainer`. Předpokládejte, že web bude volat `window.postMessageToHost(...)` nebo platform-specific volání (viz výše).

---

**iOS (Swift) — WKWebView**

1. Přidání `WKWebView` a registrace `WKScriptMessageHandler` pro příjem zpráv z JS (JS -> native):

```swift
import UIKit
import WebKit

class WebViewController: UIViewController, WKScriptMessageHandler {
  var webView: WKWebView!

  override func loadView() {
    let config = WKWebViewConfiguration()
    config.userContentController.add(self, name: "native") // jméno, které JS použije
    webView = WKWebView(frame: .zero, configuration: config)
    view = webView
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    let url = URL(string: "http://localhost:5173/graph2")! // nebo produkční URL
    webView.load(URLRequest(url: url))
  }

  // přijímá zprávy z JS voláním window.webkit.messageHandlers.native.postMessage(...)
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard message.name == "native" else { return }
    print("Received from web: \(message.body)")
    // message.body je typ Any (string, dictionary, ...) - parsujte podle potřeby
    if let dict = message.body as? [String: Any], let type = dict["type"] as? String {
      switch type {
      case "weekClick":
        // zpracujte kliknutí
        print("weekClick payload: \(dict["payload"] ?? "")")
      default:
        break
      }
    }
  }
}
```

2. Odeslání zprávy z native do webu pomocí `evaluateJavaScript` (native -> web):

```swift
let message: [String: Any] = ["type": "selectWeek", "payload": ["index": 2]]
if let jsonData = try? JSONSerialization.data(withJSONObject: message, options: []),
   let jsonString = String(data: jsonData, encoding: .utf8) {
  // Bezpečně zavolat globální JS funkci, kterou web expozoval
  let escaped = jsonString
    .replacingOccurrences(of: "\\", with: "\\\\")
    .replacingOccurrences(of: "\"", with: "\\\"")
  let call = "window.onNativeMessage && window.onNativeMessage(\"\(escaped)\")"
  webView.evaluateJavaScript(call) { (result, error) in
    if let error = error { print("evaluate error: \(error)") }
  }
}
```

Poznámky:

- Můžete také použít `webView.evaluateJavaScript("window.handleMessageFromNative(\"")` atd. důležité je, aby web expozoval funkci jménem, kterou zavoláte.
- Při tvorbě JS stringu bezpečně escapujte JSON (`\\` a `\"`). Alternativně lze volat `window.postMessage` na webu (ale u WKWebView to nezasílá do `userContentController`).

---

**Android (Kotlin) — WebView**

1. Nastavení `WebView` a `addJavascriptInterface` pro přijímání volání z JS (JS -> native):

```kotlin
class WebAppInterface(private val context: Context) {
  @JavascriptInterface
  fun postMessage(message: String) {
    // message je JSON string
    Log.d("WebView", "Received: $message")
    // parsujte JSON a zpracujte
  }
}

// v Activity/Fragmentu:
val webView: WebView = findViewById(R.id.webView)
webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(WebAppInterface(this), "Android")
webView.loadUrl("http://10.0.2.2:5173/graph2")
```

V JS použijte `window.Android.postMessage(JSON.stringify(...))` pro odeslání na native.

2. Odeslání zprávy z native do webu:

```kotlin
val message = JSONObject()
message.put("type", "selectWeek")
val payload = JSONObject()
payload.put("index", 2)
message.put("payload", payload)

val js = "window.onNativeMessage && window.onNativeMessage(${JSONObject.quote(message.toString())});"
webView.evaluateJavascript(js, null)
```

Poznámky:

- `evaluateJavascript` je asynchronní a bezpečnější než `loadUrl("javascript:...")`.
- `JSONObject.quote` (resp. jiná escapovací metoda) zajistí, že JSON string bude bezpečně vložen do JS volání.

---

**Praktický příklad end-to-end**

1. Web: `CashFlowBarChartContainer` pošle na klik `window.postMessageToHost({ type: 'weekClick', payload: { point, index } })` (nebo platform-specific volání). V kódu tohoto repo se o to stará container.
2. iOS: `userContentController` obdrží objekt a zpracuje klik (přepošle do UI apod.).
3. Native může reagovat a použít `evaluateJavaScript` k zavolání `window.onNativeMessage(JSON_STRING)`, např. k zvýraznění sloupce.

---

**Testování**

- Lokálně spusťte dev server:

```bash
cd /Users/honzap/dev/webgraph
npm run dev
```

- V iOS simulátoru načtěte `http://<host>:5173/graph2` (pro simulátor Android emulatoru použijte `10.0.2.2` pokud hostujete lokálně).
- Klikněte na sloupec grafu a sledujte logy v Xcode / Logcat — měly by přijít zprávy typu `weekClick`.
- Vyzkoušejte native -> web: volejte `evaluateJavascript` s `selectWeek` a ověřte, že `window.onNativeMessage` v prohlížeči dostane zprávu.

---

**Bezpečnostní poznámky**

- Neposílejte citlivé informace přes otevřené kanály bez ověření původu. Pokud používáte `postMessage` s `targetOrigin='*'` v produkci, zvážte zúžení originu.
- Na straně webu validujte příchozí zprávy (typy, rozsah indexu apod.).
- Escapujte JSON při vkládání přímo do JS kódu (používejte `JSONObject.quote` nebo bezpečné escapování v Swiftu).

---

Pokud chcete, mohu:

- Přidat do klientského (web) kódu konkrétní `window.onNativeMessage` implementaci (např. zvýraznění sloupce) a commitnout.
- Vytvořit malý demo projekt pro iOS a Android (včetně snippetů souborů) ve formě ZIP nebo samostatné branches/commity.

Dejte vědět, co preferujete — doplním soubory a/nebo provedu implementaci web-side handleru.
