package ir.simorgh.lifeos.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            SimorghAlarmScheduler.rescheduleAllSaved(context)
        }
    }
}
