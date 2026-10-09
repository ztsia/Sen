package io.github.ztsia.sen.moments

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

/** A test button was tapped: close its notification and say which. B12's real prompt files the payment. */
class TestActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra(EXTRA_ID, 0)
        val label = intent.getStringExtra(EXTRA_LABEL).orEmpty()
        context.getSystemService(NotificationManager::class.java).cancel(id)
        Toast.makeText(context, "Test: you tapped $label", Toast.LENGTH_SHORT).show()
    }

    companion object {
        const val EXTRA_ID = "id"
        const val EXTRA_LABEL = "label"
    }
}
