package ir.simorgh.lifeos.bridge

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat
import ir.simorgh.lifeos.MainActivity
import ir.simorgh.lifeos.alarm.SimorghAlarmReceiver
import ir.simorgh.lifeos.alarm.SimorghAlarmScheduler
import ir.simorgh.lifeos.security.BiometricVault
import ir.simorgh.lifeos.widget.SimorghWidgetProvider
import org.json.JSONArray
import org.json.JSONObject

/**
 * پل بومی SimorghNative — امن و سبک و بدون هرگونه دسترسی به پیامک
 * سازنده: سید هادی موسوی (Syed Hadi Mosavi) — شرکت سیمرغ (Simorgh Co.)
 */
class SimorghJsBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun getAppMeta(): String {
        return JSONObject().apply {
            put("platform", "android-native")
            put("appNameFa", "زندگی من · سیمرغ")
            put("appNameEn", "Simorgh LifeOS")
            put("creatorFa", "سید هادی موسوی")
            put("creatorEn", "Syed Hadi Mosavi")
            put("companyFa", "شرکت سیمرغ")
            put("companyEn", "Simorgh Co.")
            put("version", "2.2.0-Pure-Safe")
            put("smsPermission", false)
            put("notifPermission", hasNotifPermission())
            put("features", JSONArray(listOf("manual_ledger", "exact_alarm", "screen_notif", "biometric", "home_widget")))
        }.toString()
    }

    @JavascriptInterface
    fun requestPermissions() {
        activity.runOnUiThread {
            activity.requestSimorghPermissions()
        }
    }

    // ==================== زنگ بیدارباش و اعلان روی صفحه ====================

    @JavascriptInterface
    fun scheduleAlarm(alarmId: Int, triggerAtMillis: Long, title: String, message: String, playRingtone: Boolean): Boolean {
        SimorghAlarmScheduler.scheduleExact(activity, alarmId, triggerAtMillis, title, message, playRingtone)
        return true
    }

    @JavascriptInterface
    fun cancelAlarm(alarmId: Int) {
        SimorghAlarmScheduler.cancel(activity, alarmId)
    }

    @JavascriptInterface
    fun stopRingingAlarm() {
        SimorghAlarmReceiver.stopActiveRingtone()
    }

    @JavascriptInterface
    fun sendScreenNotification(title: String, message: String, withRingtone: Boolean) {
        val intent = Intent(activity, SimorghAlarmReceiver::class.java).apply {
            action = SimorghAlarmReceiver.ACTION_FIRE_ALARM
            putExtra("alarm_id", (System.currentTimeMillis() % 10000).toInt() + 2000)
            putExtra("title", title)
            putExtra("message", message)
            putExtra("play_ringtone", withRingtone)
        }
        activity.sendBroadcast(intent)
    }

    // ==================== ویجت، ویبره و اثر انگشت ====================

    @JavascriptInterface
    fun updateHomeWidget(balanceToman: Long, nextTask: String) {
        SimorghWidgetProvider.updateFromWeb(activity, balanceToman, nextTask)
    }

    @JavascriptInterface
    fun vibrate(ms: Long) {
        try {
            val vib = activity.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vib.vibrate(VibrationEffect.createOneShot(ms.coerceIn(10L, 400L), VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vib.vibrate(ms.coerceIn(10L, 400L))
            }
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun triggerBiometricLock() {
        activity.runOnUiThread {
            BiometricVault.authenticate(
                activity,
                onSuccess = { activity.evalJs("window.__onSimorghBiometricResult?.(true)") },
                onError = { activity.evalJs("window.__onSimorghBiometricResult?.(false)") }
            )
        }
    }

    @JavascriptInterface
    fun shareTextBackup(filename: String, jsonContent: String) {
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/json"
            putExtra(Intent.EXTRA_TITLE, filename)
            putExtra(Intent.EXTRA_TEXT, jsonContent)
        }
        activity.startActivity(Intent.createChooser(sendIntent, "پشتیبان‌گیری سیمرغ / Simorgh Backup"))
    }

    private fun hasNotifPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else true
    }
}
