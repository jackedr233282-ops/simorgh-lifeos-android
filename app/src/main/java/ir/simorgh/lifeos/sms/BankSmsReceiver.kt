package ir.simorgh.lifeos.sms

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import androidx.core.app.NotificationCompat
import ir.simorgh.lifeos.MainActivity
import ir.simorgh.lifeos.R
import ir.simorgh.lifeos.widget.SimorghWidgetProvider
import org.json.JSONArray
import java.text.NumberFormat
import java.util.Locale

class BankSmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (messages.isEmpty()) return

        val sender = messages.firstOrNull()?.displayOriginatingAddress ?: "Bank"

        // فیلتر سخت‌گیرانه سرشماره/مخاطب انتخابی کاربر
        if (!isSenderWhitelisted(context, sender)) {
            return
        }

        // تجمیع متن پیامک‌های چندبخشی
        val fullBody = messages.joinToString(separator = "") { it.displayMessageBody ?: "" }
        val ts = messages.firstOrNull()?.timestampMillis ?: System.currentTimeMillis()

        // فیلتر ساختار تراکنش بانکی و مسدودسازی قطعی رمز پویا (OTP)
        val parsed = BankSmsParser.parse(sender, fullBody, ts) ?: return

        savePendingBankTransaction(context, parsed)
        MainActivity.dispatchLiveBankTxToWeb(parsed.toJson().toString())
        SimorghWidgetProvider.updateCachedBalance(context, parsed.balanceToman, parsed.bankName)
        showBankAutoAccountNotification(context, parsed)
    }

    companion object {
        const val PREFS_NAME = "simorgh_bank_sms_store"
        const val KEY_QUEUE = "pending_tx_queue"
        const val KEY_SEEN_HASHES = "seen_tx_hashes"
        const val KEY_ALLOWED_SENDERS = "allowed_sms_senders"
        private const val CHANNEL_ID = "simorgh_bank_tx_channel"

        fun normalizeSender(sender: String): String {
            return sender.trim()
                .lowercase()
                .replace(" ", "")
                .replace("-", "")
                .replace("+98", "")
                .replace("0098", "")
                .let { if (it.startsWith("0")) it.substring(1) else it }
        }

        fun isSenderWhitelisted(context: Context, incomingSender: String): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val rawAllowed = prefs.getString(KEY_ALLOWED_SENDERS, "[]") ?: "[]"
            val arr = try { JSONArray(rawAllowed) } catch (_: Exception) { JSONArray() }

            // اگر کاربر هنوز هیچ سرشماره خاصی تنظیم نکرده، پیامک‌های معمول بانکی با تشخیص الگو کار می‌کنند
            if (arr.length() == 0) return true

            val normIncoming = normalizeSender(incomingSender)
            for (i in 0 until arr.length()) {
                val item = arr.optJSONObject(i) ?: continue
                val targetSender = normalizeSender(item.optString("sender", ""))
                val label = item.optString("label", "").lowercase()
                if (targetSender.isNotEmpty()) {
                    if (normIncoming.contains(targetSender) || targetSender.contains(normIncoming)) {
                        return true
                    }
                }
                if (label.isNotEmpty() && incomingSender.lowercase().contains(label)) {
                    return true
                }
            }
            return false
        }

        fun setAllowedSendersJson(context: Context, jsonArrayStr: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_ALLOWED_SENDERS, jsonArrayStr).apply()
        }

        fun getAllowedSendersJson(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_ALLOWED_SENDERS, "[]") ?: "[]"
        }

        fun savePendingBankTransaction(context: Context, tx: BankSmsParser.ParsedBankTx): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val seen = prefs.getStringSet(KEY_SEEN_HASHES, emptySet())?.toMutableSet() ?: mutableSetOf()
            if (seen.contains(tx.idHash)) return false

            seen.add(tx.idHash)
            val arr = JSONArray(prefs.getString(KEY_QUEUE, "[]") ?: "[]")
            arr.put(tx.toJson())

            prefs.edit()
                .putStringSet(KEY_SEEN_HASHES, seen)
                .putString(KEY_QUEUE, arr.toString())
                .apply()
            return true
        }

        private fun showBankAutoAccountNotification(context: Context, tx: BankSmsParser.ParsedBankTx) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val ch = NotificationChannel(
                    CHANNEL_ID,
                    context.getString(R.string.bank_channel_name),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "ثبت خودکار واریز و برداشت پیامک‌های بانکی"
                }
                nm.createNotificationChannel(ch)
            }

            val nf = NumberFormat.getInstance(Locale("fa", "IR"))
            val sign = if (tx.kind == "income") "+" else "−"
            val balPart = tx.balanceToman?.let { " · مانده: ${nf.format(it)} تومان" } ?: ""
            val bodyText = "$sign${nf.format(tx.amountToman)} تومان (${tx.category})$balPart"

            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("open_tab", "finance")
            }
            val pi = PendingIntent.getActivity(
                context,
                tx.idHash.hashCode(),
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notif = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_simorgh_logo)
                .setContentTitle("💳 ${tx.title}")
                .setContentText(bodyText)
                .setStyle(NotificationCompat.BigTextStyle().bigText("$bodyText\nمحاسبه خودکار در کیف پول سیمرغ"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build()

            nm.notify(tx.idHash.hashCode(), notif)
        }
    }
}
