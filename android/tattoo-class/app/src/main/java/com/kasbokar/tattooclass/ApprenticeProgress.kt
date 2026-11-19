package com.kasbokar.tattooclass

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.view.View
import android.view.animation.PathInterpolator
import kotlin.math.roundToInt

/**
 * The class progress bar with the walking apprentice.
 *
 * Right-to-left: 0% sits at the RIGHT end and the turquoise part grows to the LEFT.
 * The apprentice (facing left, toward what is still to learn) stands on the filled edge,
 * its centre on the current percentage, clamped so it is never cut by the card.
 * The percentage is drawn big and turquoise above his head and moves with him;
 * it is not repeated beside the bar. Changes glide in ~750 ms; reaching 100% gives a short glow.
 */
class ApprenticeProgressView(
    context: Context,
    private val compact: Boolean = false,
    /** Darker turquoise for the number when the card behind it is white. */
    private val onLight: Boolean = false,
    /** A soft light rim around the figure, for dark navy cards where the navy hoodie would vanish. */
    private val rim: Boolean = false,
) : View(context) {

    private val density = resources.displayMetrics.density
    private val scaled = resources.displayMetrics.scaledDensity
    private fun dp(v: Float) = v * density

    private val icon: Bitmap = BitmapFactory.decodeResource(resources, R.drawable.tattoo_progress_icon)
    private val rimOffset = IntArray(2)
    private val rimBitmap: Bitmap? = if (rim) icon.extractAlpha(Paint().apply { maskFilter = BlurMaskFilter(dp(2.2f), BlurMaskFilter.Blur.OUTER) }, rimOffset) else null

    private val iconH = dp(if (compact) 34f else 54f)
    private val iconW = iconH * icon.width / icon.height
    private val barH = dp(if (compact) 8f else 12f)
    private val gap = dp(if (compact) 1f else 2f)

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = FILL }
    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = TRACK }
    private val iconPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val rimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(150, 230, 255, 252) }
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (onLight) TEXT_ON_LIGHT else FILL
        textSize = (if (compact) 17f else 30f) * scaled
        typeface = Typeface.DEFAULT_BOLD
        textAlign = Paint.Align.CENTER
        setShadowLayer(dp(2f), 0f, dp(1f), if (onLight) 0x33000000 else 0x80101030.toInt())
    }
    private val textH = textPaint.fontMetrics.let { it.descent - it.ascent }

    private var target = 0
    private var shown = 0f
    private var glow = 0f
    private var animator: ValueAnimator? = null
    private var glowAnimator: ValueAnimator? = null

    /** Draw the last frame of the 100% glow and keep it (screenshots only). */
    var holdGlow = false
        set(value) { field = value; glow = if (value && target >= 100) 0.85f else glow; invalidate() }

    init {
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
    }

    /** Show [percent]; animates from [from] (or from what is on screen now) unless [animate] is false. */
    fun setProgress(percent: Int, from: Int? = null, animate: Boolean = true) {
        target = percent.coerceIn(0, 100)
        contentDescription = "پیشرفت ${LessonPdf.fa(target)} درصد"
        animator?.cancel()
        val start = from?.coerceIn(0, 100)?.toFloat() ?: shown
        if (!animate || start == target.toFloat()) {
            shown = target.toFloat()
            invalidate()
            if (animate && target >= 100) startGlow()
            return
        }
        shown = start
        animator = ValueAnimator.ofFloat(start, target.toFloat()).apply {
            duration = 750
            startDelay = 120
            interpolator = PathInterpolator(0.2f, 0f, 0f, 1f)
            addUpdateListener { shown = it.animatedValue as Float; invalidate() }
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: android.animation.Animator) {
                    if (shown >= 100f) startGlow()
                }
            })
            start()
        }
    }

    private fun startGlow() {
        glowAnimator?.cancel()
        glowAnimator = ValueAnimator.ofFloat(0f, 1f, 0f).apply {
            duration = 1200
            addUpdateListener { if (!holdGlow) { glow = it.animatedValue as Float; invalidate() } }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        animator?.cancel()
        glowAnimator?.cancel()
        super.onDetachedFromWindow()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val w = MeasureSpec.getSize(widthMeasureSpec)
        val h = (dp(2f) + textH + iconH + gap + barH + dp(2f)).roundToInt()
        setMeasuredDimension(w, resolveSize(h, heightMeasureSpec))
    }

    private val bar = RectF()
    private val part = RectF()
    private val dst = Rect()

    override fun onDraw(canvas: Canvas) {
        val left = paddingLeft.toFloat()
        val right = (width - paddingRight).toFloat()
        val span = right - left
        if (span <= 0f) return
        val barTop = dp(2f) + textH + iconH + gap
        bar.set(left, barTop, right, barTop + barH)
        val radius = barH / 2
        canvas.drawRoundRect(bar, radius, radius, trackPaint)

        val p = shown.coerceIn(0f, 100f) / 100f
        // RTL: 0% at the right edge, filling toward the left.
        val edge = right - span * p
        if (p > 0f) {
            part.set(minOf(edge, right - barH), barTop, right, barTop + barH)
            canvas.drawRoundRect(part, radius, radius, fillPaint)
        }

        // The figure's centre follows the edge, kept fully inside the bar's width.
        val cx = edge.coerceIn(left + iconW / 2, right - iconW / 2)
        val iconBottom = barTop - gap
        val iconTop = iconBottom - iconH

        if (glow > 0f) {
            val r = iconH * 0.62f  // parent turns clipChildren off so this may spill into the card padding
            val cy = iconTop + iconH * 0.55f
            glowPaint.shader = RadialGradient(cx, cy, r, intArrayOf(Color.argb((170 * glow).toInt(), 127, 245, 230), Color.argb(0, 127, 245, 230)), null, Shader.TileMode.CLAMP)
            canvas.drawCircle(cx, cy, r, glowPaint)
            glowPaint.shader = null
            glowPaint.color = Color.argb((140 * glow).toInt(), 255, 255, 255)
            canvas.drawRoundRect(bar, radius, radius, glowPaint)
        }

        dst.set((cx - iconW / 2).roundToInt(), iconTop.roundToInt(), (cx + iconW / 2).roundToInt(), iconBottom.roundToInt())
        rimBitmap?.let { r ->
            val sx = iconW / icon.width
            val sy = iconH / icon.height
            val rd = RectF(dst.left + rimOffset[0] * sx, dst.top + rimOffset[1] * sy, dst.left + (rimOffset[0] + r.width) * sx, dst.top + (rimOffset[1] + r.height) * sy)
            canvas.drawBitmap(r, null, rd, rimPaint)
        }
        canvas.drawBitmap(icon, null, dst, iconPaint)

        // The number rides above the head, clamped the same way.
        val label = "${LessonPdf.fa(shown.roundToInt())}٪"
        val half = textPaint.measureText(label) / 2
        val tx = cx.coerceIn(left + half, right - half)
        canvas.drawText(label, tx, dp(2f) - textPaint.fontMetrics.ascent, textPaint)
    }

    companion object {
        /** Light turquoise for the finished part and the number. */
        val FILL = 0xFF7FF5E6.toInt()
        val TEXT_ON_LIGHT = 0xFF0E9F94.toInt()
        /** Dark grey for what is left. */
        val TRACK = 0xFF3B3F4C.toInt()
    }
}
