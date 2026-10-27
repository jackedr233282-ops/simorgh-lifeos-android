package ir.simorgh.lifeos.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import ir.simorgh.lifeos.MainActivity
import ir.simorgh.lifeos.R

class SimorghAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val alarmId = intent.getIntExtra("alarm_id", 1001)

        when (intent.action) {
            ACTION_DISMISS -> {
                stopActiveRingtone()
                nm.cancel(alarmId)
                SimorghAlarmScheduler.removePersistedAlarm(context, alarmId)
                return
            }
            ACTION_SNOOZE -> {
                stopActiveRingtone()
                nm.cancel(alarmId)
                val title = intent.getStringExtra("title") ?: "یادآور سیمرغ"
                val message = intent.getStringExtra("message") ?: "زمان انجام برنامه فرا رسیده است"
                SimorghAlarmScheduler.scheduleExact(
                    context,
                    alarmId,
                    System.currentTimeMillis() + 10 * 60 * 1000L,
                    title,
                    message,
                    true
                )
                return
            }
        }

        // روشن کردن موقت پردازنده برای پخش مطمئن زنگ و اعلان روی صفحه قفل
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "simorgh:alarm_wake")
        wl.acquire(25_000L)

        val title = intent.getStringExtra("title") ?: "⏰ هشدار هوشمند سیمرغ"
        val message = intent.getStringExtra("message") ?: "زمان برنامه یا سررسید مالی شما فرا رسیده است."
        val playRing = intent.getBooleanExtra("play_ringtone", true)

        ensureAlarmChannel(context, nm)

        // ویبره ریتمیک بیدارباش
        try {
            val vib = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vib.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 500, 250, 600, 250, 800), -1))
            } else {
                @Suppress("DEPRECATION")
                vib.vibrate(1500)
            }
        } catch (_: Exception) {}

        // پخش صدای واقعی زنگ هشدار گوشی (تا ۲۰ ثانیه یا تا لمس دکمه توقف/اسنوز)
        if (playRing) {
            startAlarmRingtone(context)
        }

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val fullScreenPi = PendingIntent.getActivity(
            context,
            alarmId,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val snoozeIntent = Intent(context, SimorghAlarmReceiver::class.java).apply {
            action = ACTION_SNOOZE
            putExtra("alarm_id", alarmId)
            putExtra("title", title)
            putExtra("message", message)
        }
        val snoozePi = PendingIntent.getBroadcast(
            context,
            alarmId + 50000,
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val dismissIntent = Intent(context, SimorghAlarmReceiver::class.java).apply {
            action = ACTION_DISMISS
            putExtra("alarm_id", alarmId)
        }
        val dismissPi = PendingIntent.getBroadcast(
            context,
            alarmId + 90000,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notif = NotificationCompat.Builder(context, CHANNEL_ALARM)
            .setSmallIcon(R.drawable.ic_simorgh_logo)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPi, true)
            .setContentIntent(fullScreenPi)
            .addAction(0, context.getString(R.string.snooze_10m), snoozePi)
            .addAction(0, context.getString(R.string.dismiss_alarm), dismissPi)
            .setAutoCancel(true)
            .build()

        nm.notify(alarmId, notif)
    }

    private fun ensureAlarmChannel(context: Context, nm: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            val ch = NotificationChannel(
                CHANNEL_ALARM,
                context.getString(R.string.alarm_channel_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "اعلان روی صفحه قفل و زنگ بیدارباش برنامه‌ها و سررسیدها"
                enableVibration(true)
                setSound(alarmUri, attrs)
            }
            nm.createNotificationChannel(ch)
        }
    }

    companion object {
        const val ACTION_FIRE_ALARM = "ir.simorgh.lifeos.FIRE_ALARM"
        const val ACTION_SNOOZE = "ir.simorgh.lifeos.SNOOZE_ALARM"
        const val ACTION_DISMISS = "ir.simorgh.lifeos.DISMISS_ALARM"
        private const val CHANNEL_ALARM = "simorgh_high_alarm_v1"

        private var activeRingtone: Ringtone? = null

        fun startAlarmRingtone(context: Context) {
            try {
                stopActiveRingtone()
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                val r = RingtoneManager.getRingtone(context.applicationContext, uri)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    r.isLooping = false
                }
                r.play()
                activeRingtone = r
                Handler(Looper.getMainLooper()).postDelayed({ stopActiveRingtone() }, 20_000L)
            } catch (_: Exception) {}
        }

        fun stopActiveRingtone() {
            try {
                activeRingtone?.let { if (it.isPlaying) it.stop() }
                activeRingtone = null
            } catch (_: Exception) {}
        }
    }
}
