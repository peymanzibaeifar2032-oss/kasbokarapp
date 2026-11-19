package com.kasbokar.tattooclass

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Log
import android.view.View
import android.view.ViewGroup
import java.io.File

/**
 * Debug build only: render the real class screens from a made-up index so the
 * progress bar can be screenshotted at any percentage without touching the server.
 *
 * adb shell am start -n com.kasbokar.tattooclass/.MainActivity --ei preview_total 42 --ei preview_done 2 [--es preview_screen progress] [--ez preview_glow true]
 *   [--es preview_capture NAME --el preview_delay 1800]  -> draws the whole scrolling page with View.draw()
 *   into files/NAME.png (adb exec-out run-as com.kasbokar.tattooclass cat files/NAME.png) (works even when the emulator's screen capture is blank).
 */
object Hooks {
    fun index(intent: Intent?): ClassIndex? {
        val total = intent?.getIntExtra("preview_total", -1) ?: -1
        if (total <= 0) return null
        val levels = listOf("مبتدی", "متوسط", "پیشرفته")
        val names = listOf("پایه‌های تاتو و ایمنی", "خط‌زنی و سایه", "طراحی و رنگ حرفه‌ای")
        var seq = 0
        val parts = levels.indices.map { p ->
            val count = total / 3 + if (p < total % 3) 1 else 0
            val lessons = (0 until count).map {
                seq += 1
                IndexLesson("L$seq", seq, "درس ${LessonPdf.fa(seq)}", false, true, "", levels[p], names[p], "")
            }
            val half = (lessons.size + 1) / 2
            IndexPart(names[p], levels[p], "", 0, listOf(
                IndexChapter("فصل ۱", 0, lessons.take(half)),
                IndexChapter("فصل ۲", 0, lessons.drop(half)),
            ))
        }
        return ClassIndex(parts, emptyList())
    }

    fun done(intent: Intent?): Set<String>? {
        if (index(intent) == null) return null
        val n = intent?.getIntExtra("preview_done", 0) ?: 0
        return (1..n).map { "L$it" }.toSet()
    }

    fun screen(intent: Intent?): String? = intent?.getStringExtra("preview_screen")
    fun holdGlow(intent: Intent?): Boolean = intent?.getBooleanExtra("preview_glow", false) ?: false

    fun afterRender(activity: Activity, root: View, background: Int) {
        val name = activity.intent?.getStringExtra("preview_capture") ?: return
        val delay = activity.intent.getLongExtra("preview_delay", 1800L)
        root.postDelayed({
            val page = (root as? ViewGroup)?.getChildAt(0) ?: root
            if (page.width <= 0 || page.height <= 0) return@postDelayed
            val bmp = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bmp)
            canvas.drawColor(background)
            page.draw(canvas)
            val part = File(activity.filesDir, "$name.part")
            part.outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
            part.renameTo(File(activity.filesDir, "$name.png"))
            Log.i("TattooPreview", "saved $name ${page.width}x${page.height}")
        }, delay)
    }
}
