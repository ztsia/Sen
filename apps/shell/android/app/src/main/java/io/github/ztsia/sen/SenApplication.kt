package io.github.ztsia.sen

import android.app.Application
import io.github.ztsia.sen.capture.Heartbeat

class SenApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // The heartbeat runs only where capture does: release and e2e, never the debug build.
        if (BuildConfig.CAPTURE) Heartbeat.schedule(this)
    }
}
