package com.kasbokar.tattooclass

import android.graphics.BitmapFactory
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import java.util.UUID
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {
    private val io = Executors.newSingleThreadExecutor()
    private lateinit var frame: FrameLayout
    private val prefs by lazy { getSharedPreferences("tattoo-class", MODE_PRIVATE) }
    private var token: String = ""
    private var moduleId: String = ""
    private var moduleTitle: String = ""
    private val stack = ArrayDeque<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        val dark = prefs.getBoolean("dark", false)
        val mode = if (dark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
        if (AppCompatDelegate.getDefaultNightMode() != mode) AppCompatDelegate.setDefaultNightMode(mode)
        super.onCreate(savedInstanceState)
        frame = FrameLayout(this)
        setContentView(frame)
        token = prefs.getString("token", "").orEmpty()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (stack.size > 1) {
                    stack.removeLast()
                    render(stack.last())
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
        show(if (token.isBlank()) "gate" else "home", reset = true)
    }

    override fun onDestroy() {
        io.shutdownNow()
        super.onDestroy()
    }

    @Deprecated("Back goes through the class screens.")
    override fun onBackPressed() {
        if (stack.size > 1) {
            stack.removeLast()
            render(stack.last())
        } else {
            super.onBackPressed()
        }
    }

    private fun alive() = !isDestroyed && !isFinishing

    private fun show(screen: String, reset: Boolean = false) {
        if (reset) stack.clear()
        stack.addLast(screen)
        render(screen)
    }

    private fun render(screen: String) {
        frame.removeAllViews()
        val scroll = ScrollView(this)
        val page = column()
        scroll.addView(page)
        frame.addView(scroll, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        when (screen) {
            "gate" -> gate(page)
            "home" -> home(page)
            "module" -> module(page)
            "questions" -> questions(page)
            else -> if (screen.startsWith("lesson:")) lesson(page, screen.removePrefix("lesson:"))
        }
    }

    private fun gate(page: LinearLayout) {
        page.addView(space(28))
        page.addView(gold("استودیو پیمان"))
        page.addView(title("کلاس آموزش تاتو", 32f))
        page.addView(body("این کلاس فقط برای کسی است که پرداخت کرده و کد ورود گرفته. بدون کد، درسی نشان داده نمی‌شود."))
        val input = EditText(this).apply {
            hint = "کد ورود"
            textSize = 18f
            gravity = Gravity.CENTER
            textDirection = View.TEXT_DIRECTION_LTR
            background = cardBg()
            setPadding(dp(16), dp(14), dp(16), dp(14))
        }
        page.addView(input, match().apply { topMargin = dp(20) })
        val error = body("")
        error.setTextColor(0xFFB42318.toInt())
        page.addView(error)
        val button = primary("ورود به کلاس")
        page.addView(button, match().apply { topMargin = dp(8) })
        button.setOnClickListener {
            val code = input.text.toString().trim()
            if (code.length < 4) {
                error.text = "کد را کامل بنویس."
                return@setOnClickListener
            }
            button.isEnabled = false
            work(
                { Api(null).activate(code, deviceId()) },
                { next ->
                    token = next
                    prefs.edit().putString("token", next).apply()
                    show("home", reset = true)
                },
                { message ->
                    button.isEnabled = true
                    error.text = message
                },
            )
        }
    }

    private fun home(page: LinearLayout) {
        header(page, "فهرست")
        val host = column()
        page.addView(host)
        val progress = ProgressBar(this)
        host.addView(progress, LinearLayout.LayoutParams(dp(48), dp(48)).apply { gravity = Gravity.CENTER_HORIZONTAL })
        work(
            { Api(token).modules() },
            { modules ->
                host.removeAllViews()
                if (modules.isEmpty()) host.addView(body("هنوز درسی منتشر نشده. به محض انتشار در پنل، همین‌جا می‌آید."))
                modules.forEachIndexed { index, item ->
                    host.addView(cardButton("بخش ${index + 1}", item.title, item.description.ifBlank { "درس‌های این بخش" }) {
                        moduleId = item.id
                        moduleTitle = item.title
                        show("module")
                    })
                }
            },
            { message ->
                host.removeAllViews()
                host.addView(body(message))
                if (message.contains("معتبر نیست")) logout()
            },
        )
    }

    private fun module(page: LinearLayout) {
        header(page, moduleTitle.ifBlank { "درس‌ها" })
        val host = column()
        page.addView(host)
        host.addView(ProgressBar(this))
        work(
            { Api(token).lessons(moduleId) },
            { lessons ->
                host.removeAllViews()
                if (lessons.isEmpty()) host.addView(body("در این بخش هنوز درس منتشر نشده."))
                lessons.forEachIndexed { index, item ->
                    host.addView(cardButton("${index + 1}", item.title, "") { show("lesson:${item.id}") })
                }
            },
            { message ->
                host.removeAllViews()
                host.addView(body(message))
                if (message.contains("معتبر نیست")) logout()
            },
        )
    }

    private fun lesson(page: LinearLayout, id: String) {
        header(page, "درس")
        val host = column()
        page.addView(host)
        host.addView(ProgressBar(this))
        work(
            { Api(token).lesson(id) },
            { item ->
                host.removeAllViews()
                host.addView(title(item.title, 28f))
                host.addView(body(item.content))
                item.images.forEach { image -> host.addView(picture(image)) }
                host.addView(askBox(id))
            },
            { message ->
                host.removeAllViews()
                host.addView(body(message))
                if (message.contains("معتبر نیست")) logout()
            },
        )
    }

    private fun questions(page: LinearLayout) {
        header(page, "سؤال‌های من")
        val host = column()
        page.addView(host)
        host.addView(ProgressBar(this))
        work(
            { Api(token).questions() },
            { list ->
                host.removeAllViews()
                if (list.isEmpty()) host.addView(body("هنوز سؤالی نفرستاده‌ای."))
                list.forEach { item ->
                    val card = column()
                    card.background = cardBg()
                    card.setPadding(dp(16), dp(14), dp(16), dp(14))
                    card.addView(gold(if (item.answered) "جواب داده شد" else "منتظر جواب"))
                    card.addView(body(item.text))
                    if (item.answer.isNotBlank()) {
                        val answer = body(item.answer)
                        answer.setTextColor(0xFFFFFFFF.toInt())
                        answer.background = fill(0xFF1C3D52.toInt())
                        answer.setPadding(dp(12), dp(10), dp(12), dp(10))
                        card.addView(answer, match().apply { topMargin = dp(8) })
                    }
                    host.addView(card, match().apply { topMargin = dp(10) })
                }
            },
            { message ->
                host.removeAllViews()
                host.addView(body(message))
                if (message.contains("معتبر نیست")) logout()
            },
        )
    }

    private fun askBox(lessonId: String): View {
        val box = column()
        box.background = cardBg()
        box.setPadding(dp(16), dp(14), dp(16), dp(14))
        box.addView(title("سؤال از همین درس", 18f))
        val input = EditText(this).apply {
            hint = "سؤالت را بنویس"
            minLines = 3
            textSize = 16f
            background = null
        }
        box.addView(input)
        val error = body("")
        error.setTextColor(0xFFB42318.toInt())
        box.addView(error)
        val button = primary("فرستادن سؤال")
        box.addView(button, match().apply { topMargin = dp(8) })
        button.setOnClickListener {
            val text = input.text.toString().trim()
            if (text.length < 2) {
                error.text = "سؤال را کمی بیشتر بنویس."
                return@setOnClickListener
            }
            button.isEnabled = false
            work(
                { Api(token).ask(lessonId, text); true },
                {
                    input.setText("")
                    button.isEnabled = true
                    show("questions")
                },
                { message ->
                    button.isEnabled = true
                    error.text = message
                },
            )
        }
        val params = match()
        params.topMargin = dp(18)
        box.layoutParams = params
        return box
    }

    private fun picture(image: LessonImage): View {
        val box = column()
        val view = ImageView(this).apply {
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.FIT_CENTER
            background = fill(0xFFFFFFFF.toInt())
        }
        box.addView(view, match().apply { topMargin = dp(16) })
        if (image.caption.isNotBlank()) box.addView(body(image.caption))
        io.execute {
            try {
                val bytes = Api(token).bytes(image.path)
                val bitmap = decode(bytes) ?: return@execute
                runOnUiThread {
                    if (!alive()) return@runOnUiThread
                    view.setImageBitmap(bitmap)
                    view.setOnClickListener {
                        val zoom = ImageView(this).apply {
                            setImageBitmap(bitmap)
                            setBackgroundColor(0xFF000000.toInt())
                            scaleType = ImageView.ScaleType.FIT_CENTER
                            setOnClickListener { frame.removeView(this@apply) }
                        }
                        frame.addView(zoom, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
                    }
                }
            } catch (_: Exception) {
                runOnUiThread {
                    if (!alive()) return@runOnUiThread
                    view.setImageBitmap(null)
                    if (image.caption.isBlank()) box.addView(body("تصویر باز نشد."))
                }
            }
        }
        return box
    }

    private fun header(page: LinearLayout, heading: String) {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val text = title(heading, 26f)
        row.addView(text, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(chip(if (prefs.getBoolean("dark", false)) "روشن" else "تیره") {
            prefs.edit().putBoolean("dark", !prefs.getBoolean("dark", false)).apply()
            recreate()
        })
        if (token.isNotBlank()) row.addView(chip("خروج") { logout() })
        page.addView(row)
        val nav = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        nav.addView(primary("فهرست").apply { setOnClickListener { show("home", reset = true) } })
        nav.addView(space(8), LinearLayout.LayoutParams(dp(8), 1))
        nav.addView(chip("سؤال‌های من") { show("questions") })
        page.addView(nav, match().apply { topMargin = dp(12); bottomMargin = dp(8) })
    }

    private fun logout() {
        token = ""
        prefs.edit().remove("token").apply()
        show("gate", reset = true)
    }

    private fun deviceId(): String {
        val saved = prefs.getString("device", "").orEmpty()
        if (saved.length >= 8) return saved
        val next = UUID.randomUUID().toString()
        prefs.edit().putString("device", next).apply()
        return next
    }

    private fun <T> work(task: () -> T, ok: (T) -> Unit, fail: (String) -> Unit) {
        io.execute {
            try {
                val value = task()
                runOnUiThread {
                    if (!alive()) return@runOnUiThread
                    ok(value)
                }
            } catch (error: Exception) {
                val message = error.message ?: "انجام نشد."
                runOnUiThread {
                    if (!alive()) return@runOnUiThread
                    fail(message)
                }
            }
        }
    }

    private fun decode(bytes: ByteArray): android.graphics.Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        var sample = 1
        while (bounds.outWidth / sample > 1400 || bounds.outHeight / sample > 1400) sample *= 2
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
    }

    private fun column() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(20), dp(20), dp(20), dp(32))
        layoutDirection = View.LAYOUT_DIRECTION_RTL
    }

    private fun title(text: String, size: Float) = TextView(this).apply {
        this.text = text
        textSize = size
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(ink())
        setLineSpacing(0f, 1.15f)
    }

    private fun body(text: String) = TextView(this).apply {
        this.text = text
        textSize = 17f
        setTextColor(ink())
        setLineSpacing(dp(4).toFloat(), 1f)
        setPadding(0, dp(8), 0, 0)
    }

    private fun gold(text: String) = TextView(this).apply {
        this.text = text
        textSize = 13f
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(0xFF9A7340.toInt())
    }

    private fun primary(text: String) = Button(this).apply {
        this.text = text
        textSize = 16f
        isAllCaps = false
        setTextColor(0xFFFFFFFF.toInt())
        background = fill(0xFF1C3D52.toInt())
        minHeight = dp(52)
    }

    private fun chip(text: String, onClick: () -> Unit) = Button(this).apply {
        this.text = text
        isAllCaps = false
        textSize = 14f
        setTextColor(ink())
        background = cardBg()
        minHeight = dp(44)
        setOnClickListener { onClick() }
    }

    private fun cardButton(kicker: String, heading: String, detail: String, onClick: () -> Unit): View {
        val card = column()
        card.background = cardBg()
        card.setPadding(dp(16), dp(16), dp(16), dp(16))
        card.addView(gold(kicker))
        card.addView(title(heading, 20f))
        if (detail.isNotBlank()) card.addView(body(detail))
        card.setOnClickListener { onClick() }
        card.isClickable = true
        return card.also { it.layoutParams = match().apply { topMargin = dp(12) } }
    }

    private fun cardBg(): GradientDrawable = fill(if (night()) 0xFF182229.toInt() else 0xFFFFFFFF.toInt()).apply {
        setStroke(dp(1), if (night()) 0x22FFFFFF else 0x221C3D52)
    }

    private fun fill(color: Int) = GradientDrawable().apply {
        cornerRadius = dp(22).toFloat()
        setColor(color)
    }

    private fun ink() = if (night()) 0xFFF4EFE6.toInt() else 0xFF1C3D52.toInt()
    private fun night() = prefs.getBoolean("dark", false)
    private fun space(n: Int) = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(n)) }
    private fun match() = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
