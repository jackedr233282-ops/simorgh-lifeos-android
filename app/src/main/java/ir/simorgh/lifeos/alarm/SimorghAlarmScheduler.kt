package ir.simorgh.lifeos.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

object SimorghAlarmScheduler {

    private const val PREFS_ALARMS = "simorgh_scheduled_alarms"
    private const val KEY_LIST = "alarms_json"

    fun scheduleExact(
        context: Context,
        alarmId: Int,
        triggerAtMillis: Long,
        title: String,
        message: String,
        playRingtone: Boolean = true
    ) {
        if (triggerAtMillis <= System.currentTimeMillis()) return
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, SimorghAlarmReceiver::class.java).apply {
            action = SimorghAlarmReceiver.ACTION_FIRE_ALARM
            putExtra("alarm_id", alarmId)
            putExtra("title", title)
            putExtra("message", message)
            putExtra("play_ringtone", playRingtone)
        }

        val pi = PendingIntent.getBroadcast(
            context,
            alarmId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
            }
            persistAlarm(context, alarmId, triggerAtMillis, title, message, playRingtone)
        } catch (_: SecurityException) {
            am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
        }
    }

    fun cancel(context: Context, alarmId: Int) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, SimorghAlarmReceiver::class.java).apply {
            action = SimorghAlarmReceiver.ACTION_FIRE_ALARM
        }
        val pi = PendingIntent.getBroadcast(
            context,
            alarmId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        am.cancel(pi)
        removePersistedAlarm(context, alarmId)
    }

    fun rescheduleAllSaved(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_ALARMS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_LIST, "[]") ?: "[]")
        val now = System.currentTimeMillis()
        val kept = JSONArray()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val at = o.optLong("trigger_at", 0L)
            if (at > now) {
                scheduleExact(
                    context,
                    o.optInt("id"),
                    at,
                    o.optString("title"),
                    o.optString("message"),
                    o.optBoolean("ring", true)
                )
                kept.put(o)
            }
        }
        prefs.edit().putString(KEY_LIST, kept.toString()).apply()
    }

    private fun persistAlarm(context: Context, id: Int, at: Long, title: String, msg: String, ring: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_ALARMS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_LIST, "[]") ?: "[]")
        val next = JSONArray()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (o.optInt("id") != id && o.optLong("trigger_at") > System.currentTimeMillis()) next.put(o)
        }
        next.put(JSONObject().apply {
            put("id", id)
            put("trigger_at", at)
            put("title", title)
            put("message", msg)
            put("ring", ring)
        })
        prefs.edit().putString(KEY_LIST, next.toString()).apply()
    }

    fun removePersistedAlarm(context: Context, id: Int) {
        val prefs = context.getSharedPreferences(PREFS_ALARMS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_LIST, "[]") ?: "[]")
        val next = JSONArray()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (o.optInt("id") != id) next.put(o)
        }
        prefs.edit().putString(KEY_LIST, next.toString()).apply()
    }
}
