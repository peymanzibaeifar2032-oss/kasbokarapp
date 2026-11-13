package com.kasbokar.tattooclass

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.res.Configuration
import android.graphics.BitmapFactory
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.Editable
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.TextWatcher
import android.text.style.ForegroundColorSpan
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.util.UUID
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val io = Executors.newSingleThreadExecutor()
    private val side = Executors.newSingleThreadExecutor()
    private lateinit var frame: FrameLayout
    private var scroll: ScrollView? = null
    private val prefs by lazy { getSharedPreferences("tattoo-class", MODE_PRIVATE) }
    private var token: String = ""
    private var moduleId: String = ""
    private var moduleTitle: String = ""
    private val stack = ArrayDeque<String>()
    private val openGroups = mutableSetOf<String>()
    private val closedParts = mutableSetOf<String>()
    private var lessonOrder = listOf<LessonCard>()
    private var lessonSeq = mapOf<String, Int>()
    private var lastIndex: ClassIndex? = null
    private var query = ""
    private var level = ""
    private var onlyUnread = false
    private var synced = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            frame = FrameLayout(this)
            setContentView(frame)
            window.decorView.setBackgroundColor(pageColor())
            token = prefs.getString("token", "").orEmpty()
            show(if (token.isBlank()) "gate" else "home", reset = true)
        } catch (error: Throwable) {
            val text = TextView(this)
            text.text = "باز نشد:\n$error"
            text.setPadding(48, 48, 48, 48)
            setContentView(text)
        }
    }

    override fun onDestroy() {
        io.shutdownNow()
        side.shutdownNow()
        super.onDestroy()
    }

    @Deprecated("Back goes through the class screens.")
    override fun onBackPressed() {
        val zoom = frame.findViewWithTag<View>("zoom")
        if (zoom != null) {
            frame.removeView(zoom)
            return
        }
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
        window.decorView.setBackgroundColor(pageColor())
        val view = ScrollView(this)
        view.isFillViewport = true
        val page = column()
        view.addView(page)
        scroll = view
        frame.addView(view, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        when (screen) {
            "gate" -> gate(page)
            "home" -> home(page)
            "module" -> module(page)
            "questions" -> questions(page)
            "progress" -> progressScreen(page)
            else -> if (screen.startsWith("lesson:")) lesson(page, screen.removePrefix("lesson:"))
        }
    }

    // ---------- gate ----------

    private fun gate(page: LinearLayout) {
        page.addView(stripe())
        page.addView(space(24))
        val logo = ImageView(this).apply { setImageResource(R.mipmap.ic_launcher) }
        page.addView(logo, LinearLayout.LayoutParams(dp(88), dp(88)).apply { gravity = Gravity.CENTER_HORIZONTAL })
        page.addView(kicker("نسخه ۱.۶.۰", VIOLET).apply { gravity = Gravity.CENTER; setPadding(0, dp(12), 0, 0) }, match())
        page.addView(brandTitle(30f).apply { gravity = Gravity.CENTER }, match())
        page.addView(body("این کلاس فقط برای کسی است که پرداخت کرده و کد ورود گرفته. بدون کد، درسی نشان داده نمی‌شود.").apply { gravity = Gravity.CENTER })
        val input = EditText(this).apply {
            hint = "کد ورود"
            textSize = 18f
            gravity = Gravity.CENTER
            textDirection = View.TEXT_DIRECTION_LTR
            setTextColor(ink())
            setHintTextColor(muted())
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
                    synced = false
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

    // ---------- home ----------

    private fun home(page: LinearLayout) {
        header(page)
        val host = column().apply { setPadding(0, 0, 0, 0) }
        page.addView(host)
        val cached = lastIndex
        if (cached != null) {
            homeView(host, cached)
        } else {
            host.addView(ProgressBar(this), LinearLayout.LayoutParams(dp(48), dp(48)).apply { gravity = Gravity.CENTER_HORIZONTAL; topMargin = dp(24) })
        }
        work(
            { Api(token).index() },
            { index ->
                remember(index)
                host.removeAllViews()
                if (index.parts.isEmpty()) {
                    host.addView(body("هنوز درسی منتشر نشده. به محض انتشار در پنل، همین‌جا می‌آید."))
                    return@work
                }
                homeView(host, index)
                syncProgress()
            },
            { message ->
                if (message.contains("معتبر نیست")) {
                    logout()
                    return@work
                }
                if (cached != null) return@work
                if (message == OFFLINE || message.startsWith("سایت دیر")) {
                    host.removeAllViews()
                    host.addView(body(message))
                    host.addView(primary("دوباره تلاش کن").apply { setOnClickListener { render("home") } }, match().apply { topMargin = dp(12) })
                    return@work
                }
                // An older server without the index: fall back to the section cards.
                legacyHome(host)
            },
        )
    }

    private fun remember(index: ClassIndex) {
        lastIndex = index
        lessonOrder = index.order.map { LessonCard(it.id, it.title) }
        lessonSeq = index.order.associate { it.id to it.seq }
    }

    /** Progress card, search and level filter, then new lessons and every part. The list below redraws on each keystroke. */
    private fun homeView(host: LinearLayout, index: ClassIndex) {
        host.addView(progressCard(index))
        host.addView(searchBox(index))
        val list = column().apply { setPadding(0, 0, 0, 0); tag = "list" }
        host.addView(list)
        drawList(list, index)
    }

    private fun drawList(list: LinearLayout, index: ClassIndex) {
        list.removeAllViews()
        val filtering = query.isNotBlank() || level.isNotBlank() || onlyUnread
        val done = done()
        if (!filtering && index.recent.isNotEmpty()) list.addView(recentBox(index))
        var shown = 0
        index.parts.forEachIndexed { partIndex, part ->
            val chapters = part.chapters.map { chapter -> chapter to chapter.lessons.filter { matches(it, part, done) } }
                .filter { it.second.isNotEmpty() }
            if (filtering && chapters.isEmpty()) return@forEachIndexed
            shown += chapters.sumOf { it.second.size }
            list.addView(partCard(part, partIndex, chapters, done, filtering))
        }
        if (filtering) {
            val note = if (shown == 0) "درسی با این جستجو پیدا نشد." else "${fa(shown)} درس پیدا شد."
            list.addView(kicker(note, if (shown == 0) PINK else TEAL).apply { setPadding(0, dp(10), 0, 0) }, 0)
        }
    }

    private fun matches(lesson: IndexLesson, part: IndexPart, done: Set<String>): Boolean {
        if (level.isNotBlank() && lesson.level.ifBlank { part.level } != level) return false
        if (onlyUnread && lesson.id in done) return false
        if (query.isBlank()) return true
        val needle = norm(query)
        return norm(lesson.title).contains(needle) || norm(lesson.chapterTitle).contains(needle) || fa(lesson.seq) == needle || lesson.seq.toString() == query.trim()
    }

    private fun norm(value: String) = value.lowercase()
        .replace('ي', 'ی').replace('ك', 'ک').replace('ة', 'ه')
        .replace("\u200c", "").replace(" ", "")

    private fun progressCard(index: ClassIndex): View {
        val all = index.order
        val done = done()
        val finished = all.count { it.id in done }
        val percent = percent(finished, all.size)
        val card = column()
        card.background = gradient(intArrayOf(VIOLET, 0xFF5B8DEF.toInt()))
        card.setPadding(dp(18), dp(16), dp(18), dp(16))
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(TextView(this).apply { text = "پیشرفت من"; textSize = 14f; setTextColor(0xE6FFFFFF.toInt()) })
        texts.addView(TextView(this).apply {
            text = "${fa(finished)} از ${fa(all.size)} درس تمام شده"
            textSize = 17f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
        })
        row.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(TextView(this).apply {
            text = "${fa(percent)}٪"
            textSize = 30f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
        })
        card.addView(row)
        card.addView(bar(percent, 0xFFFFFFFF.toInt(), 0x40FFFFFF), match().apply { topMargin = dp(10) })
        val partsDone = index.parts.count { part -> part.lessons().let { list -> list.isNotEmpty() && list.all { it.id in done } } }
        val line = when {
            all.isNotEmpty() && finished == all.size -> "🏅 نشان کامل دوره: همهٔ درس‌ها را تمام کردی!"
            partsDone > 0 -> "🎖 ${fa(partsDone)} نشان بخش گرفتی · برای نشان کامل، همهٔ درس‌ها را تمام کن"
            else -> "هر درس را تا آخر بخوان تا خودکار تیک بخورد؛ با تمام شدن هر بخش نشان می‌گیری."
        }
        card.addView(TextView(this).apply { text = line; textSize = 13f; setTextColor(0xF2FFFFFF.toInt()); setPadding(0, dp(10), 0, 0) })
        card.isClickable = true
        card.setOnClickListener { show("progress") }
        card.layoutParams = match().apply { topMargin = dp(14) }
        return card
    }

    private fun searchBox(index: ClassIndex): View {
        val box = column()
        box.setPadding(0, dp(14), 0, 0)
        val input = EditText(this).apply {
            hint = "🔍  جستجوی عنوان یا شمارهٔ درس…"
            setText(query)
            textSize = 15f
            setSingleLine(true)
            setTextColor(ink())
            setHintTextColor(muted())
            background = cardBg()
            setPadding(dp(16), dp(12), dp(16), dp(12))
        }
        box.addView(input, match())
        val chips = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; layoutDirection = View.LAYOUT_DIRECTION_RTL; setPadding(0, dp(10), 0, dp(2)) }
        val options = listOf("" to "همه", "مبتدی" to "مبتدی", "متوسط" to "متوسط", "پیشرفته" to "پیشرفته")
        val chipViews = mutableListOf<TextView>()
        fun paint() {
            chipViews.forEachIndexed { i, chip ->
                val on = if (i < options.size) level == options[i].first else onlyUnread
                val color = if (i < options.size) levelColor(options[i].first) else PINK
                chip.background = fill(if (on) color else card(), 999).apply { if (!on) setStroke(dp(1), color) }
                chip.setTextColor(if (on) 0xFFFFFFFF.toInt() else color)
            }
        }
        val redraw = {
            paint()
            (frame.findViewWithTag<LinearLayout>("list"))?.let { drawList(it, index) }
        }
        options.forEach { (value, label) ->
            val chip = pill(label)
            chip.setOnClickListener { level = if (level == value) "" else value; redraw() }
            chipViews.add(chip)
            chips.addView(chip, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(36)).apply { marginEnd = dp(6) })
        }
        val unread = pill("نخوانده‌ها")
        unread.setOnClickListener { onlyUnread = !onlyUnread; redraw() }
        chipViews.add(unread)
        chips.addView(unread, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(36)))
        paint()
        val scroller = HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; layoutDirection = View.LAYOUT_DIRECTION_RTL }
        scroller.addView(chips)
        box.addView(scroller, match())
        input.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) {
                query = s?.toString().orEmpty()
                redraw()
            }
        })
        return box
    }

    private fun recentBox(index: ClassIndex): View {
        val box = column()
        box.background = fill(if (night()) 0xFF3A2414.toInt() else 0xFFFFF4E8.toInt()).apply { setStroke(dp(2), 0x66F08A24) }
        box.setPadding(dp(16), dp(14), dp(16), dp(10))
        val head = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        head.addView(title("✨ درس‌های تازه", 19f), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        head.addView(badge("${fa(index.recent.size)} جدید", ORANGE))
        box.addView(head)
        val done = done()
        index.recent.forEach { item ->
            val lvl = index.order.firstOrNull { it.id == item.id }?.level.orEmpty()
            box.addView(lessonRow(item.seq, item.title, item.where, true, true, item.id in done, levelColor(lvl)) { show("lesson:${item.id}") })
        }
        box.layoutParams = match().apply { topMargin = dp(14) }
        return box
    }

    private fun partCard(part: IndexPart, partIndex: Int, chapters: List<Pair<IndexChapter, List<IndexLesson>>>, done: Set<String>, filtering: Boolean): View {
        val color = levelColor(part.level)
        val all = part.lessons()
        val finished = all.count { it.id in done }
        val percent = percent(finished, all.size)
        val card = column()
        card.background = cardBg()
        card.setPadding(0, 0, 0, dp(10))
        val band = column()
        band.background = GradientDrawable(GradientDrawable.Orientation.RIGHT_LEFT, intArrayOf(color, lighten(color))).apply {
            cornerRadii = floatArrayOf(dp(22).toFloat(), dp(22).toFloat(), dp(22).toFloat(), dp(22).toFloat(), 0f, 0f, 0f, 0f)
        }
        band.setPadding(dp(16), dp(14), dp(16), dp(14))
        val top = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val facts = listOfNotNull(
            part.level.takeIf { it.isNotBlank() },
            "${fa(part.chapters.size)} فصل · ${fa(all.size)} درس",
            if (part.newCount > 0) "${fa(part.newCount)} جدید" else null,
        ).joinToString(" · ")
        top.addView(TextView(this).apply { text = facts; textSize = 12f; setTypeface(typeface, Typeface.BOLD); setTextColor(0xE6FFFFFF.toInt()) }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        if (all.isNotEmpty() && finished == all.size) top.addView(badge("🎖 کامل", 0x33000000))
        band.addView(top)
        band.addView(TextView(this).apply { text = part.title; textSize = 19f; setTypeface(typeface, Typeface.BOLD); setTextColor(0xFFFFFFFF.toInt()); setPadding(0, dp(4), 0, 0) })
        val progressRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        progressRow.addView(bar(percent, 0xFFFFFFFF.toInt(), 0x40FFFFFF), LinearLayout.LayoutParams(0, dp(8), 1f))
        progressRow.addView(TextView(this).apply { text = "  ${fa(finished)}/${fa(all.size)} · ${fa(percent)}٪"; textSize = 12f; setTextColor(0xFFFFFFFF.toInt()) })
        band.addView(progressRow, match().apply { topMargin = dp(8) })
        card.addView(band, match())
        val key = part.title
        val open = filtering || key !in closedParts
        band.isClickable = true
        band.setOnClickListener {
            if (key in closedParts) closedParts.remove(key) else closedParts.add(key)
            (frame.findViewWithTag<LinearLayout>("list"))?.let { list -> lastIndex?.let { drawList(list, it) } }
        }
        val inner = column().apply { setPadding(dp(16), 0, dp(16), 0) }
        if (open) {
            if (!filtering && part.description.isNotBlank()) inner.addView(body(part.description).apply { textSize = 13f; setTextColor(muted()) })
            chapters.forEach { (chapter, lessons) ->
                val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
                val chapterDone = chapter.lessons.count { it.id in done }
                row.addView(View(this).apply { background = fill(color, 4) }, LinearLayout.LayoutParams(dp(4), dp(18)).apply { marginEnd = dp(8) })
                row.addView(title(chapter.title, 16f), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
                if (chapter.newCount > 0) row.addView(badge("جدید", ORANGE))
                row.addView(TextView(this).apply { text = "  ${fa(chapterDone)}/${fa(chapter.lessons.size)}"; textSize = 12f; setTextColor(muted()) })
                inner.addView(row, match().apply { topMargin = dp(14) })
                lessons.forEach { lesson ->
                    inner.addView(lessonRow(lesson.seq, lesson.title, lesson.note, lesson.isNew, lesson.published, lesson.id in done, color) { show("lesson:${lesson.id}") })
                }
            }
        } else {
            inner.addView(TextView(this).apply { text = "برای دیدن فصل‌ها و درس‌ها بزن ▾"; textSize = 13f; setTextColor(color); setPadding(0, dp(10), 0, 0) })
        }
        card.addView(inner, match())
        card.layoutParams = match().apply { topMargin = dp(14) }
        return card
    }

    private fun lessonRow(seq: Int, heading: String, detail: String, isNew: Boolean, enabled: Boolean, finished: Boolean, color: Int, onClick: () -> Unit): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            setPadding(0, dp(8), 0, dp(8))
            alpha = if (enabled) 1f else 0.45f
        }
        val number = TextView(this).apply {
            text = if (finished) "✓" else fa(seq)
            textSize = if (finished) 16f else 13f
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFFFFFFFF.toInt())
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(if (finished) GREEN else if (isNew) ORANGE else color) }
        }
        row.addView(number, LinearLayout.LayoutParams(dp(34), dp(34)))
        row.addView(space(10), LinearLayout.LayoutParams(dp(10), 1))
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(TextView(this).apply {
            text = heading
            textSize = 15f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(ink())
        })
        val sub = listOfNotNull(detail.takeIf { it.isNotBlank() }, if (finished) "خوانده شد" else null).joinToString(" · ")
        if (sub.isNotBlank()) texts.addView(TextView(this).apply { text = sub; textSize = 12f; setTextColor(if (finished) GREEN else muted()) })
        row.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        if (isNew) row.addView(badge("جدید", ORANGE))
        if (enabled) {
            row.isClickable = true
            row.setOnClickListener { onClick() }
        }
        return row.also { it.layoutParams = match() }
    }

    // ---------- progress ----------

    private fun progressScreen(page: LinearLayout) {
        header(page)
        val index = lastIndex
        if (index == null) {
            page.addView(body("اول فهرست را باز کن."))
            return
        }
        val done = done()
        page.addView(progressCard(index).apply { isClickable = false; setOnClickListener(null) })
        page.addView(title("نشان‌های من", 20f).apply { setPadding(0, dp(18), 0, 0) })
        index.parts.forEach { part ->
            val all = part.lessons()
            val finished = all.count { it.id in done }
            val percent = percent(finished, all.size)
            val color = levelColor(part.level)
            val card = column()
            card.background = cardBg()
            card.setPadding(dp(16), dp(14), dp(16), dp(14))
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
            row.addView(TextView(this).apply {
                text = if (all.isNotEmpty() && finished == all.size) "🎖" else "○"
                textSize = 26f
                setTextColor(color)
            }, LinearLayout.LayoutParams(dp(44), LinearLayout.LayoutParams.WRAP_CONTENT))
            val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            texts.addView(title(part.title, 16f))
            texts.addView(TextView(this).apply { text = "${part.level.ifBlank { "—" }} · ${fa(finished)} از ${fa(all.size)} · ${fa(percent)}٪"; textSize = 12f; setTextColor(muted()) })
            row.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            card.addView(row)
            card.addView(bar(percent, color, if (night()) 0x33FFFFFF else 0x14000000), match().apply { topMargin = dp(10) })
            page.addView(card, match().apply { topMargin = dp(12) })
        }
        page.addView(body("تیک هر درس روی همین گوشی ذخیره می‌شود و با کد ورودت روی سایت هم نگه داشته می‌شود؛ اگر گوشی را عوض کنی، برمی‌گردد.").apply { textSize = 13f; setTextColor(muted()) })
    }

    // ---------- legacy (older server) ----------

    private fun legacyHome(host: LinearLayout) {
        host.removeAllViews()
        host.addView(ProgressBar(this))
        work(
            { Api(token).modules() },
            { modules ->
                host.removeAllViews()
                if (modules.isEmpty()) host.addView(body("هنوز درسی منتشر نشده. به محض انتشار در پنل، همین‌جا می‌آید."))
                modules.forEach { item ->
                    host.addView(cardButton("", item.title, item.description.ifBlank { "درس‌های این بخش" }) {
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
        header(page)
        page.addView(title(moduleTitle.ifBlank { "درس‌ها" }, 22f))
        val host = column().apply { setPadding(0, 0, 0, 0) }
        page.addView(host)
        host.addView(ProgressBar(this))
        work(
            { Api(token).catalog(moduleId) },
            { groups ->
                lessonOrder = groups.flatMap { it.lessons }
                host.removeAllViews()
                if (groups.isEmpty()) host.addView(body("در این بخش هنوز درس منتشر نشده."))
                groups.forEach { group ->
                    val opened = group.title.isBlank() || openGroups.contains(group.title)
                    if (group.title.isNotBlank()) {
                        host.addView(cardButton(if (opened) "بستن" else "باز کردن", group.title, "${fa(group.lessons.size)} درس") {
                            if (opened) openGroups.remove(group.title) else openGroups.add(group.title)
                            render("module")
                        })
                    }
                    if (opened) {
                        group.lessons.forEachIndexed { index, item ->
                            host.addView(cardButton(fa(index + 1), item.title, "") { show("lesson:${item.id}") })
                        }
                    }
                }
            },
            { message ->
                host.removeAllViews()
                host.addView(body(message))
                if (message.contains("معتبر نیست")) logout()
            },
        )
    }

    // ---------- lesson ----------

    private fun lesson(page: LinearLayout, id: String) {
        header(page)
        val host = column().apply { setPadding(0, 0, 0, 0) }
        page.addView(host)
        host.addView(ProgressBar(this))
        tell(id, "open")
        work(
            { Api(token).lesson(id) },
            { item ->
                host.removeAllViews()
                val index = lessonOrder.indexOfFirst { it.id == id }
                val info = lastIndex?.order?.firstOrNull { it.id == id }
                val color = levelColor(info?.level.orEmpty())
                host.addView(lessonMoves(index))
                val where = listOfNotNull(
                    lessonSeq[id]?.let { "درس ${fa(it)} از ${fa(lessonSeq.size)}" },
                    info?.level?.takeIf { it.isNotBlank() },
                    info?.chapterTitle?.takeIf { it.isNotBlank() },
                ).joinToString(" · ")
                if (where.isNotBlank()) host.addView(kicker(where, color).apply { setPadding(0, dp(14), 0, 0) })
                host.addView(title(item.title, 26f))
                val status = TextView(this).apply { textSize = 13f; setPadding(0, dp(6), 0, 0) }
                val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
                val pdf = chip("⬇ دانلود PDF") {}
                val mark = primary("")
                fun paintMark() {
                    val finished = id in done()
                    mark.text = if (finished) "✓ خوانده شد" else "علامت: خواندم"
                    mark.background = fill(if (finished) GREEN else VIOLET)
                }
                paintMark()
                mark.setOnClickListener {
                    setDone(id, id !in done())
                    paintMark()
                }
                pdf.setOnClickListener { savePdf(item, info, pdf, status) }
                actions.addView(pdf, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
                actions.addView(space(8), LinearLayout.LayoutParams(dp(8), 1))
                actions.addView(mark, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
                host.addView(actions, match().apply { topMargin = dp(12) })
                host.addView(status)
                val reading = body(item.content)
                reading.setTextIsSelectable(true)
                host.addView(reading)
                item.images.forEach { image -> host.addView(picture(image)) }
                val end = TextView(this).apply {
                    text = "— پایان درس —"
                    gravity = Gravity.CENTER
                    textSize = 13f
                    setTextColor(muted())
                    setPadding(0, dp(18), 0, 0)
                }
                host.addView(end, match())
                host.addView(askBox(id))
                host.addView(lessonMoves(index))
                // Reaching the end of the lesson marks it as read.
                scroll?.setOnScrollChangeListener { view, _, scrollY, _, _ ->
                    if (scrollY <= 0 || id in done()) return@setOnScrollChangeListener
                    val location = IntArray(2)
                    val screen = IntArray(2)
                    end.getLocationOnScreen(location)
                    view.getLocationOnScreen(screen)
                    if (location[1] < screen[1] + view.height) {
                        setDone(id, true)
                        paintMark()
                        Toast.makeText(this, "این درس تمام شد ✓", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            { message ->
                host.removeAllViews()
                host.addView(body(message))
                if (message.contains("معتبر نیست")) logout()
            },
        )
    }

    private fun savePdf(item: Lesson, info: IndexLesson?, button: Button, status: TextView) {
        button.isEnabled = false
        button.text = "در حال ساخت PDF…"
        status.setTextColor(muted())
        status.text = "متن و تصویرها آماده می‌شوند؛ چند ثانیه صبر کن."
        work(
            {
                val images = item.images.mapNotNull { image ->
                    try {
                        decode(Api(token).bytes(image.path), 1200)?.let { it to image.caption }
                    } catch (_: Exception) {
                        null
                    }
                }
                val place = listOfNotNull(info?.partTitle?.takeIf { it.isNotBlank() }, info?.chapterTitle?.takeIf { it.isNotBlank() }).joinToString(" · ")
                LessonPdf(applicationContext).save(item.title, place, item.content, images, LessonPdf.fileName(info?.seq, item.title))
            },
            { saved ->
                button.isEnabled = true
                button.text = "⬇ دانلود PDF"
                status.setTextColor(GREEN)
                status.text = "PDF ذخیره شد: ${saved.shownPath}"
                val view = Intent(Intent.ACTION_VIEW).setDataAndType(saved.uri, "application/pdf")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                try {
                    startActivity(Intent.createChooser(view, "باز کردن PDF").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
                } catch (_: ActivityNotFoundException) {
                    status.text = "PDF ذخیره شد: ${saved.shownPath}\nبرنامهٔ PDF خوان روی گوشی نیست؛ فایل در پوشهٔ دانلود است."
                }
            },
            { message ->
                button.isEnabled = true
                button.text = "⬇ دانلود PDF"
                status.setTextColor(0xFFB42318.toInt())
                status.text = "PDF ساخته نشد: $message"
            },
        )
    }

    // ---------- questions ----------

    private fun questions(page: LinearLayout) {
        header(page)
        page.addView(title("سؤال‌های من", 22f))
        val host = column().apply { setPadding(0, 0, 0, 0) }
        page.addView(host)
        host.addView(ProgressBar(this))
        work(
            { Api(token).questions() },
            { list ->
                host.removeAllViews()
                if (list.isEmpty()) host.addView(body("هنوز سؤالی نفرستاده‌ای. پایین هر درس می‌توانی از همان درس بپرسی."))
                list.forEach { item ->
                    val card = column()
                    card.background = cardBg()
                    card.setPadding(dp(16), dp(14), dp(16), dp(14))
                    card.addView(badge(if (item.answered) "جواب داده شد" else "منتظر جواب", if (item.answered) GREEN else ORANGE).apply { layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT) })
                    card.addView(body(item.text))
                    if (item.answer.isNotBlank()) {
                        val answer = body(item.answer)
                        answer.setTextColor(0xFFFFFFFF.toInt())
                        answer.background = fill(TEAL)
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
        box.addView(title("💬 سؤال از همین درس", 17f))
        val input = EditText(this).apply {
            hint = "سؤالت را بنویس"
            minLines = 3
            textSize = 16f
            setTextColor(ink())
            setHintTextColor(muted())
            background = null
        }
        box.addView(input)
        val error = body("")
        error.setTextColor(0xFFB42318.toInt())
        box.addView(error)
        val button = primary("فرستادن سؤال").apply { background = fill(TEAL) }
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
        val box = column().apply { setPadding(0, 0, 0, 0) }
        val view = ImageView(this).apply {
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.FIT_CENTER
            background = fill(0xFFFFFFFF.toInt())
        }
        box.addView(view, match().apply { topMargin = dp(16) })
        if (image.caption.isNotBlank()) box.addView(body(image.caption).apply { textSize = 14f; setTextColor(muted()) })
        io.execute {
            try {
                val bytes = Api(token).bytes(image.path)
                val bitmap = decode(bytes, 1400) ?: return@execute
                runOnUiThread {
                    if (!alive()) return@runOnUiThread
                    view.setImageBitmap(bitmap)
                    view.setOnClickListener {
                        val zoom = ImageView(this).apply {
                            tag = "zoom"
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

    private fun lessonMoves(index: Int): View {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, dp(10), 0, 0) }
        val back = chip("درس قبل") {
            if (index > 0) show("lesson:${lessonOrder[index - 1].id}")
        }
        val forward = primary("درس بعد").apply {
            setOnClickListener { if (index in 0 until lessonOrder.lastIndex) show("lesson:${lessonOrder[index + 1].id}") }
            isEnabled = index in 0 until lessonOrder.lastIndex
            alpha = if (isEnabled) 1f else 0.5f
        }
        back.isEnabled = index > 0
        back.alpha = if (back.isEnabled) 1f else 0.5f
        row.addView(back, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(space(8), LinearLayout.LayoutParams(dp(8), 1))
        row.addView(forward, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        return row
    }

    // ---------- header ----------

    /** Colourful header like the booking calendar: stripe, title, theme and exit, then three tiles. */
    private fun header(page: LinearLayout) {
        page.addView(stripe())
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(12), 0, 0) }
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(kicker("استودیو پیمان زیبائی‌فر · نسخه ۱.۶.۰", TEAL))
        texts.addView(brandTitle(23f))
        row.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(smallChip(if (night()) "☀ روشن" else "☾ تیره") {
            prefs.edit().putBoolean("dark", !night()).apply()
            render(stack.lastOrNull() ?: "home")
        })
        if (token.isNotBlank()) row.addView(smallChip("خروج") { logout() }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(40)).apply { marginStart = dp(6) })
        page.addView(row)
        val tiles = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, dp(14), 0, 0) }
        val current = stack.lastOrNull().orEmpty()
        tiles.addView(tile("📚", "فهرست", VIOLET, current == "home") { show("home", reset = true) }, LinearLayout.LayoutParams(0, dp(78), 1f))
        tiles.addView(space(8), LinearLayout.LayoutParams(dp(8), 1))
        tiles.addView(tile("🏅", "پیشرفت من", GREEN, current == "progress") { if (current != "progress") show("progress") }, LinearLayout.LayoutParams(0, dp(78), 1f))
        tiles.addView(space(8), LinearLayout.LayoutParams(dp(8), 1))
        tiles.addView(tile("💬", "سؤال‌های من", ORANGE, current == "questions") { if (current != "questions") show("questions") }, LinearLayout.LayoutParams(0, dp(78), 1f))
        page.addView(tiles, match())
    }

    private fun tile(icon: String, label: String, color: Int, active: Boolean, onClick: () -> Unit): View {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(lighten(color), color)).apply {
                cornerRadius = dp(20).toFloat()
                if (active) setStroke(dp(3), 0xCCFFFFFF.toInt())
            }
            elevation = if (active) dp(4).toFloat() else dp(1).toFloat()
            isClickable = true
            setOnClickListener { onClick() }
        }
        box.addView(TextView(this).apply { text = icon; textSize = 22f; gravity = Gravity.CENTER })
        box.addView(TextView(this).apply { text = label; textSize = 13f; gravity = Gravity.CENTER; setTypeface(typeface, Typeface.BOLD); setTextColor(0xFFFFFFFF.toInt()); maxLines = 1 })
        return box
    }

    private fun stripe() = View(this).apply {
        background = GradientDrawable(GradientDrawable.Orientation.RIGHT_LEFT, intArrayOf(VIOLET, SKY, TEAL, ORANGE, PINK)).apply { cornerRadius = dp(4).toFloat() }
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(6))
    }

    private fun brandTitle(size: Float) = TextView(this).apply {
        val text = SpannableStringBuilder("کلاس آموزش ")
        val start = text.length
        text.append("تاتو")
        text.setSpan(ForegroundColorSpan(VIOLET), start, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        this.text = text
        textSize = size
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(ink())
    }

    private fun logout() {
        token = ""
        lastIndex = null
        synced = false
        prefs.edit().remove("token").apply()
        show("gate", reset = true)
    }

    // ---------- progress store ----------

    private fun done(): Set<String> = prefs.getStringSet("done", emptySet()).orEmpty()

    private fun setDone(id: String, value: Boolean) {
        val next = done().toMutableSet()
        if (value) next.add(id) else next.remove(id)
        prefs.edit().putStringSet("done", HashSet(next)).apply()
        if (value) tell(id, "complete")
    }

    /** Best effort: tell the server an open or completion. Never blocks or bothers the apprentice. */
    private fun tell(id: String, kind: String) {
        if (token.isBlank()) return
        val current = token
        side.execute {
            try {
                Api(current).activity(id, kind)
            } catch (_: Exception) {
                // Offline or an older server: progress stays on the phone.
            }
        }
    }

    /** Once per launch: merge lessons finished on other devices of this code, and send ones finished offline. */
    private fun syncProgress() {
        if (synced || token.isBlank()) return
        synced = true
        val current = token
        side.execute {
            try {
                val server = Api(current).progress()
                val local = done()
                (local - server).forEach { id -> runCatching { Api(current).activity(id, "complete") } }
                val merged = local + server
                if (merged.size != local.size) {
                    runOnUiThread {
                        if (!alive()) return@runOnUiThread
                        prefs.edit().putStringSet("done", HashSet(merged)).apply()
                        if (stack.lastOrNull() == "home") render("home")
                    }
                }
            } catch (_: Exception) {
                synced = false
            }
        }
    }

    private fun IndexPart.lessons() = chapters.flatMap { chapter -> chapter.lessons.filter { it.published } }

    private fun percent(part: Int, whole: Int) = if (whole <= 0) 0 else (part * 100 / whole)

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
                val message = friendly(error)
                runOnUiThread {
                    if (!alive()) return@runOnUiThread
                    fail(message)
                }
            }
        }
    }

    /** Network failures in plain Persian; server messages are already Persian. */
    private fun friendly(error: Exception): String = when (error) {
        is ApiException -> error.message ?: "انجام نشد."
        is java.net.UnknownHostException, is java.net.ConnectException, is java.net.NoRouteToHostException -> OFFLINE
        is java.net.SocketTimeoutException -> "سایت دیر جواب داد. چند لحظه بعد دوباره بزن."
        is java.io.IOException -> OFFLINE
        else -> error.message ?: "انجام نشد."
    }

    private fun decode(bytes: ByteArray, max: Int): android.graphics.Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        var sample = 1
        while (bounds.outWidth / sample > max || bounds.outHeight / sample > max) sample *= 2
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
    }

    // ---------- views ----------

    private fun column() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(14), dp(16), dp(32))
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

    private fun kicker(text: String, color: Int) = TextView(this).apply {
        this.text = text
        textSize = 12f
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(color)
    }

    private fun badge(text: String, color: Int) = TextView(this).apply {
        this.text = text
        textSize = 11f
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(0xFFFFFFFF.toInt())
        background = fill(color, 999)
        setPadding(dp(8), dp(2), dp(8), dp(2))
    }

    private fun pill(text: String) = TextView(this).apply {
        this.text = text
        textSize = 13f
        gravity = Gravity.CENTER
        setTypeface(typeface, Typeface.BOLD)
        setPadding(dp(14), 0, dp(14), 0)
        isClickable = true
    }

    private fun primary(text: String) = Button(this).apply {
        this.text = text
        textSize = 15f
        isAllCaps = false
        setTextColor(0xFFFFFFFF.toInt())
        background = fill(VIOLET)
        minHeight = dp(50)
    }

    private fun chip(text: String, onClick: () -> Unit) = Button(this).apply {
        this.text = text
        isAllCaps = false
        textSize = 14f
        setTextColor(ink())
        background = cardBg()
        minHeight = dp(50)
        setOnClickListener { onClick() }
    }

    private fun smallChip(text: String, onClick: () -> Unit) = Button(this).apply {
        this.text = text
        isAllCaps = false
        textSize = 12f
        setTextColor(ink())
        background = cardBg()
        minHeight = 0
        minimumHeight = 0
        minWidth = 0
        minimumWidth = 0
        setPadding(dp(10), 0, dp(10), 0)
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(40))
        setOnClickListener { onClick() }
    }

    private fun bar(percent: Int, color: Int, track: Int): View {
        val outer = FrameLayout(this)
        outer.background = fill(track, 999)
        val inner = View(this).apply { background = fill(color, 999) }
        outer.addView(inner, FrameLayout.LayoutParams(0, FrameLayout.LayoutParams.MATCH_PARENT, Gravity.START))
        outer.layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(8))
        outer.addOnLayoutChangeListener { v, left, _, right, _, _, _, _, _ ->
            val width = ((right - left) * percent.coerceIn(0, 100) / 100)
            if (inner.layoutParams.width != width) {
                inner.layoutParams = (inner.layoutParams as FrameLayout.LayoutParams).apply { this.width = width }
                v.post { inner.requestLayout() }
            }
        }
        return outer
    }

    private fun cardButton(kicker: String, heading: String, detail: String, onClick: () -> Unit): View {
        val card = column()
        card.background = cardBg()
        card.setPadding(dp(16), dp(16), dp(16), dp(16))
        card.addView(kicker(kicker, VIOLET))
        card.addView(title(heading, 19f))
        if (detail.isNotBlank()) card.addView(body(detail))
        card.setOnClickListener { onClick() }
        card.isClickable = true
        return card.also { it.layoutParams = match().apply { topMargin = dp(12) } }
    }

    private fun gradient(colors: IntArray) = GradientDrawable(GradientDrawable.Orientation.TL_BR, colors).apply { cornerRadius = dp(22).toFloat() }

    private fun cardBg(): GradientDrawable = fill(card()).apply {
        setStroke(dp(1), if (night()) 0x22FFFFFF else 0x1A7B61FF)
    }

    private fun fill(color: Int, radius: Int = 22) = GradientDrawable().apply {
        cornerRadius = dp(radius).toFloat()
        setColor(color)
    }

    private fun levelColor(value: String) = when (value) {
        "مبتدی" -> GREEN
        "متوسط" -> ORANGE
        "پیشرفته" -> VIOLET
        else -> SKY
    }

    private fun lighten(color: Int): Int {
        val r = (color shr 16 and 0xFF)
        val g = (color shr 8 and 0xFF)
        val b = (color and 0xFF)
        fun up(c: Int) = c + (255 - c) * 30 / 100
        return (0xFF shl 24) or (up(r) shl 16) or (up(g) shl 8) or up(b)
    }

    private fun fa(value: Int): String = LessonPdf.fa(value)
    private fun card() = if (night()) 0xFF1D2040.toInt() else 0xFFFFFFFF.toInt()
    private fun ink() = if (night()) 0xFFEEF0FF.toInt() else 0xFF23264A.toInt()
    private fun muted() = if (night()) 0xFFA9ADD0.toInt() else 0xFF6B6F8E.toInt()
    private fun night(): Boolean {
        if (prefs.contains("dark")) return prefs.getBoolean("dark", false)
        return (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }

    private fun pageColor() = if (night()) 0xFF12142A.toInt() else 0xFFF6F5FF.toInt()
    private fun space(n: Int) = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(n)) }
    private fun match() = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    companion object {
        val VIOLET = 0xFF7B61FF.toInt()
        val GREEN = 0xFF22A06B.toInt()
        val TEAL = 0xFF14A39A.toInt()
        val ORANGE = 0xFFF08A24.toInt()
        val PINK = 0xFFF45B8C.toInt()
        val SKY = 0xFF3BA6F5.toInt()
        const val OFFLINE = "اینترنت وصل نیست یا سایت در دسترس نیست. اتصال را بررسی کن و دوباره بزن."
    }
}
