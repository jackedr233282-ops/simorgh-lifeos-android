package ir.simorgh.lifeos

import android.Manifest
import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import ir.simorgh.lifeos.bridge.SimorghJsBridge
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Simorgh LifeOS — سوپراپلیکیشن دوزبانه حساب‌وکتاب و زندگی روزمره
 * سازنده: سید هادی موسوی (Syed Hadi Mosavi)
 * شرکت: شرکت سیمرغ (Simorgh Co.)
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    private val permLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val smsGranted = results[Manifest.permission.READ_SMS] == true || results[Manifest.permission.RECEIVE_SMS] == true
        evalJs("window.__onSimorghPermissionsUpdated?.(${smsGranted})")
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activeInstance = WeakReference(this)

        window.statusBarColor = Color.parseColor("#090B10")
        window.navigationBarColor = Color.parseColor("#090B10")

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#090B10"))
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }
        }
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.addJavascriptInterface(SimorghJsBridge(this), "SimorghNative")
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val openTab = intent?.getStringExtra("open_tab")
                if (!openTab.isNullOrEmpty()) {
                    evalJs("window.spPage?.('$openTab')")
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("window.__handleSimorghAndroidBack ? window.__handleSimorghAndroidBack() : false") { handled ->
                    if (handled != "true") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })

        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html#home")
    }

    fun requestSimorghPermissions() {
        val perms = mutableListOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permLauncher.launch(perms.toTypedArray())
    }

    fun dispatchJsJson(fnName: String, json: JSONObject) {
        val escaped = json.toString().replace("\\", "\\\\").replace("'", "\\'")
        evalJs("window.$fnName?.('$escaped')")
    }

    fun evalJs(script: String) {
        runOnUiThread {
            if (::webView.isInitialized) {
                webView.evaluateJavascript(script, null)
            }
        }
    }

    override fun onDestroy() {
        if (activeInstance?.get() === this) activeInstance = null
        super.onDestroy()
    }

    companion object {
        private var activeInstance: WeakReference<MainActivity>? = null

        fun dispatchLiveBankTxToWeb(jsonStr: String) {
            val act = activeInstance?.get() ?: return
            val escaped = jsonStr.replace("\\", "\\\\").replace("'", "\\'")
            act.evalJs("window.__onSimorghBankSmsReceived?.('$escaped')")
        }
    }
}
