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
```

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
