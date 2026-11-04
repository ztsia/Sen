package io.github.ztsia.sen.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * The outbox's sync as WorkManager work (B07, spec §5): needs a network, backs off from 30 seconds when the
 * server can't be reached, and one at a time under the unique name `sen-sync`. Triggered by a new captured
 * event, opening the app, signing in, a change of chosen apps, a write from the web app, and once a day so
 * the server hears a heartbeat even when nothing happens. The work itself is [SyncRun].
 */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result =
        withContext(Dispatchers.IO) {
            when (SyncRun(applicationContext).run()) {
                SyncRun.Outcome.DONE -> Result.success()
                SyncRun.Outcome.RETRY -> Result.retry()
            }
        }

    companion object {
        const val UNIQUE = "sen-sync"
        const val DAILY = "sen-sync-daily"

        private val needsNetwork = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        /** Asks for a sync; one already waiting or running isn't doubled, the new one follows it. */
        fun enqueue(context: Context) {
            val request =
                OneTimeWorkRequestBuilder<SyncWorker>()
                    .setConstraints(needsNetwork)
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                    .build()
            WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(UNIQUE, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }

        /** A sync every 24 hours, a heartbeat for the server even on a quiet day. */
        fun scheduleDaily(context: Context) {
            WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
                DAILY,
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<SyncWorker>(24, TimeUnit.HOURS).setConstraints(needsNetwork).build(),
            )
        }
    }
}
