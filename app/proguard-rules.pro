# Keep JavaScriptInterface methods for Simorgh WebView Bridge
-keepclassmembers class ir.simorgh.lifeos.bridge.SimorghJsBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
