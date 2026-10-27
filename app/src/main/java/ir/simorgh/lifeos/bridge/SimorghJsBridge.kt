package ir.simorgh.lifeos.bridge

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Telephony
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat
import ir.simorgh.lifeos.MainActivity
import ir.simorgh.lifeos.alarm.SimorghAlarmReceiver
import ir.simorgh.lifeos.alarm.SimorghAlarmScheduler
import ir.simorgh.lifeos.security.BiometricVault
import ir.simorgh.lifeos.sms.BankSmsParser
import ir.simorgh.lifeos.sms.BankSmsReceiver
import ir.simorgh.lifeos.widget.SimorghWidgetProvider
import org.json.JSONArray
import org.json.JSONObject

/**
 * پل بومی SimorghNative
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
            put("version", "2.1.0-Simorgh-Pure")
            put("smsPermission", hasSmsPermission())
            put("notifPermission", hasNotifPermission())
            put("features", JSONArray(listOf("bank_sms_whitelist", "exact_alarm", "screen_notif", "biometric", "home_widget")))
        }.toString()
    }

    @JavascriptInterface
    fun requestPermissions() {
        activity.runOnUiThread {
            activity.requestSimorghPermissions()
        }
    }

    // ==================== ۱. مدیریت سرشماره‌های مجاز پیامک بانکی ====================

    @JavascriptInterface
    fun setAllowedSmsSenders(jsonArrayStr: String): Boolean {
        return try {
            BankSmsReceiver.setAllowedSendersJson(activity, jsonArrayStr)
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun getAllowedSmsSenders(): String {
        return BankSmsReceiver.getAllowedSendersJson(activity)
    }

    @JavascriptInterface
    fun listRecentSmsSenders(limit: Int): String {
        if (!hasSmsPermission()) {
            return JSONObject().put("ok", false).put("reason", "PERMISSION_REQUIRED").toString()
        }
        val maxRows = limit.coerceIn(10, 200)
        val seen = mutableSetOf<String>()
        val list = JSONArray()

        try {
            val cursor = activity.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
                null,
                null,
                "${Telephony.Sms.DATE} DESC LIMIT $maxRows"
            )
            cursor?.use { c ->
                val idxAddr = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val idxBody = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val idxDate = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
                while (c.moveToNext()) {
                    val addr = c.getString(idxAddr) ?: continue
                    if (seen.add(addr)) {
                        val body = c.getString(idxBody) ?: ""
                        val date = c.getLong(idxDate)
                        list.put(JSONObject().apply {
                            put("sender", addr)
                            put("preview", if (body.length > 50) body.take(47) + "..." else body)
                            put("date_ms", date)
                        })
                    }
                }
            }
            return JSONObject().put("ok", true).put("senders", list).toString()
        } catch (e: Exception) {
            return JSONObject().put("ok", false).put("error", e.message ?: "QUERY_ERROR").toString()
        }
    }

    // ==================== ۲. زنگ بیدارباش دقیق و اعلان روی صفحه ====================

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

    // ==================== ۳. همگام‌سازی پیامک‌های بانکی با فیلتر مخاطب خاص ====================

    @JavascriptInterface
    fun syncBankSmsInbox(limit: Int): String {
        if (!hasSmsPermission()) {
            requestPermissions()
            return JSONObject().apply {
                put("ok", false)
                put("reason", "PERMISSION_REQUIRED")
                put("items", JSONArray())
            }.toString()
        }

        val maxRows = limit.coerceIn(10, 400)
        try {
            val cursor = activity.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
                null,
                null,
                "${Telephony.Sms.DATE} DESC LIMIT $maxRows"
            )
            cursor?.use { c ->
                val idxAddr = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val idxBody = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val idxDate = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
                while (c.moveToNext()) {
                    val sender = c.getString(idxAddr) ?: ""

                    // فیلتر سخت‌گیرانه: اگر سرشماره در لیست مخاطبان مجاز کاربر نباشد رد می‌شود
                    if (!BankSmsReceiver.isSenderWhitelisted(activity, sender)) {
                        continue
                    }

                    val body = c.getString(idxBody) ?: ""
                    val dateMs = c.getLong(idxDate)
                    val parsed = BankSmsParser.parse(sender, body, dateMs) ?: continue
                    BankSmsReceiver.savePendingBankTransaction(activity, parsed)
                }
            }
        } catch (e: Exception) {
            return JSONObject().apply {
                put("ok", false)
                put("reason", e.message ?: "READ_ERROR")
                put("items", JSONArray())
            }.toString()
        }

        return drainPendingBankTransactions()
    }

    @JavascriptInterface
    fun drainPendingBankTransactions(): String {
        val prefs = activity.getSharedPreferences(BankSmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(BankSmsReceiver.KEY_QUEUE, "[]") ?: "[]"
        prefs.edit().putString(BankSmsReceiver.KEY_QUEUE, "[]").apply()
        return JSONObject().apply {
            put("ok", true)
            put("items", JSONArray(raw))
        }.toString()
    }

    // ==================== ۴. ویجت، ویبره و اثر انگشت ====================

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

    private fun hasSmsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
    }

    private fun hasNotifPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else true
    }
}
