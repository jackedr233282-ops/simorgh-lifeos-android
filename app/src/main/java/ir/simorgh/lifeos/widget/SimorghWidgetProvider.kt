package ir.simorgh.lifeos.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import ir.simorgh.lifeos.MainActivity
import ir.simorgh.lifeos.R
import java.text.NumberFormat
import java.util.Locale

class SimorghWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            renderWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        private const val PREFS_WIDGET = "simorgh_widget_state"

        fun updateCachedBalance(context: Context, balanceToman: Long?, bankName: String?) {
            if (balanceToman == null) return
            context.getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE).edit()
                .putLong("balance", balanceToman)
                .putString("bank", bankName ?: "کارت اصلی")
                .apply()
            refreshAll(context)
        }

        fun updateFromWeb(context: Context, balanceToman: Long, nextTask: String) {
            context.getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE).edit()
                .putLong("balance", balanceToman)
                .putString("next_task", nextTask)
                .apply()
            refreshAll(context)
        }

        fun refreshAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, SimorghWidgetProvider::class.java))
            for (id in ids) renderWidget(context, mgr, id)
        }

        private fun renderWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE)
            val bal = prefs.getLong("balance", 0L)
            val nextTask = prefs.getString("next_task", "برنامه‌های امروز در آرامش آماده است ✨")
            val nf = NumberFormat.getInstance(Locale("fa", "IR"))

            val views = RemoteViews(context.packageName, R.layout.widget_simorgh)
            views.setTextViewText(R.id.widgetBalance, "${nf.format(bal)} تومان")
            views.setTextViewText(R.id.widgetNextTask, "▸ $nextTask")

            val openIntent = Intent(context, MainActivity::class.java)
            val pi = PendingIntent.getActivity(
                context,
                widgetId,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widgetRoot, pi)
            mgr.updateAppWidget(widgetId, views)
        }
    }
}
