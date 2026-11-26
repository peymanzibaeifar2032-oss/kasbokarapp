package com.kasbokar.tattooclass

import android.app.Activity
import android.content.Intent
import android.view.View

/** Release build: no preview data, the app always talks to the real class. */
object Hooks {
    fun index(intent: Intent?): ClassIndex? = null
    fun done(intent: Intent?): Set<String>? = null
    fun screen(intent: Intent?): String? = null
    fun holdGlow(intent: Intent?): Boolean = false
    fun afterRender(activity: Activity, root: View, background: Int) = Unit
}
