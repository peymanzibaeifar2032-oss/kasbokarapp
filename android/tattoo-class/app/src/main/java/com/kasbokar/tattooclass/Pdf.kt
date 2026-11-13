package com.kasbokar.tattooclass

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.MatrixCursor
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.text.Layout
import android.text.StaticLayout
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import java.io.File

/** A saved lesson PDF: where it is and how to open it. */
data class SavedPdf(val uri: Uri, val shownPath: String)

/**
 * Builds a real A4 PDF of one lesson on the phone (text laid out right-to-left by Android, images below)
 * and saves it in Download/TattooClass. Runs off the UI thread.
 */
class LessonPdf(private val context: Context) {
    private val pageW = 595
    private val pageH = 842
    private val margin = 42f
    private val contentW get() = (pageW - margin * 2).toInt()

    private lateinit var doc: PdfDocument
    private var page: PdfDocument.Page? = null
    private var canvas: Canvas? = null
    private var y = 0f
    private var pageNo = 0

    fun save(title: String, place: String, content: String, images: List<Pair<Bitmap, String>>, fileName: String): SavedPdf {
        doc = PdfDocument()
        try {
            newPage()
            text("استودیو پیمان زیبائی‌فر · کلاس آموزش تاتو", 10f, 0xFF7B61FF.toInt(), bold = true)
            if (place.isNotBlank()) text(place, 10f, 0xFF6B6F8E.toInt())
            y += 4f
            text(title, 20f, 0xFF23264A.toInt(), bold = true)
            rule()
            content.split("\n").forEach { line ->
                if (line.isBlank()) y += 6f else text(line, 12f, 0xFF23264A.toInt(), spacing = 1.35f)
            }
            images.forEach { (bitmap, caption) -> picture(bitmap, caption) }
            finishPage()
            return write(fileName)
        } finally {
            doc.close()
        }
    }

    private fun newPage() {
        finishPage()
        pageNo += 1
        val info = PdfDocument.PageInfo.Builder(pageW, pageH, pageNo).create()
        page = doc.startPage(info)
        canvas = page!!.canvas
        y = margin
    }

    private fun finishPage() {
        val current = page ?: return
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 9f; color = 0xFF6B6F8E.toInt(); textAlign = Paint.Align.CENTER }
        current.canvas.drawText(fa(pageNo), pageW / 2f, pageH - 20f, paint)
        doc.finishPage(current)
        page = null
        canvas = null
    }

    private fun layout(value: String, size: Float, color: Int, bold: Boolean, spacing: Float): StaticLayout {
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = size
            this.color = color
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }
        return StaticLayout.Builder.obtain(value, 0, value.length, paint, contentW)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setTextDirection(TextDirectionHeuristics.FIRSTSTRONG_RTL)
            .setLineSpacing(0f, spacing)
            .setIncludePad(false)
            .build()
    }

    /** Draws a paragraph and carries the lines that do not fit onto the next page. */
    private fun text(value: String, size: Float, color: Int, bold: Boolean = false, spacing: Float = 1.2f) {
        val layout = layout(value, size, color, bold, spacing)
        var line = 0
        while (line < layout.lineCount) {
            val room = pageH - margin - 18f - y
            var last = line
            while (last < layout.lineCount && layout.getLineBottom(last) - layout.getLineTop(line) <= room) last++
            if (last == line) {
                newPage()
                continue
            }
            val top = layout.getLineTop(line).toFloat()
            val bottom = layout.getLineBottom(last - 1).toFloat()
            val c = canvas!!
            c.save()
            c.translate(margin, y - top)
            c.clipRect(0f, top, contentW.toFloat(), bottom)
            layout.draw(c)
            c.restore()
            y += bottom - top
            line = last
        }
        y += size * 0.35f
    }

    private fun rule() {
        y += 4f
        canvas!!.drawRect(margin, y, pageW - margin, y + 2f, Paint().apply { color = 0xFFE4E0FF.toInt() })
        y += 12f
    }

    private fun picture(bitmap: Bitmap, caption: String) {
        val maxH = 520f
        var w = contentW.toFloat()
        var h = bitmap.height * (w / bitmap.width)
        if (h > maxH) {
            w *= maxH / h
            h = maxH
        }
        if (y + h + 8f > pageH - margin - 18f) newPage()
        val left = margin + (contentW - w) / 2f
        canvas!!.drawRect(left - 1f, y + 7f, left + w + 1f, y + h + 9f, Paint().apply { color = 0xFFE4E0FF.toInt() })
        canvas!!.drawBitmap(bitmap, null, RectF(left, y + 8f, left + w, y + 8f + h), Paint(Paint.FILTER_BITMAP_FLAG).apply { color = Color.BLACK })
        y += h + 14f
        if (caption.isNotBlank()) text(caption, 10f, 0xFF6B6F8E.toInt())
        y += 6f
    }

    private fun write(fileName: String): SavedPdf {
        if (Build.VERSION.SDK_INT >= 29) {
            val resolver = context.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/TattooClass")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: throw IllegalStateException("جای ذخیره پیدا نشد.")
            try {
                resolver.openOutputStream(uri)?.use { doc.writeTo(it) } ?: throw IllegalStateException("فایل باز نشد.")
                values.clear()
                values.put(MediaStore.Downloads.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            } catch (error: Exception) {
                resolver.delete(uri, null, null)
                throw error
            }
            return SavedPdf(uri, "Download/TattooClass/$fileName")
        }
        val dir = PdfProvider.folder(context)
        val file = File(dir, fileName)
        file.outputStream().use { doc.writeTo(it) }
        return SavedPdf(PdfProvider.uriFor(fileName), file.absolutePath)
    }

    companion object {
        fun fa(value: Int) = value.toString().map { if (it in '0'..'9') "۰۱۲۳۴۵۶۷۸۹"[it - '0'] else it }.joinToString("")

        fun fileName(seq: Int?, title: String): String {
            val clean = title.replace(Regex("[\\\\/:*?\"<>|\\n\\r\\t]+"), " ").trim().take(60).ifBlank { "lesson" }
            return if (seq != null && seq > 0) "درس-$seq-$clean.pdf" else "$clean.pdf"
        }
    }
}

/** Shares the PDFs saved on Android 7–9 (app folder, no storage permission) with a PDF viewer, read-only. */
class PdfProvider : ContentProvider() {
    override fun onCreate() = true

    private fun file(uri: Uri): File? {
        val ctx = context ?: return null
        val name = uri.lastPathSegment ?: return null
        if (name.contains('/') || name.contains("..")) return null
        val file = File(folder(ctx), name)
        return if (file.isFile) file else null
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        if (mode != "r") throw SecurityException("read only")
        val file = file(uri) ?: throw java.io.FileNotFoundException(uri.toString())
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    }

    override fun getType(uri: Uri) = "application/pdf"

    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor {
        val file = file(uri)
        val cursor = MatrixCursor(arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE))
        if (file != null) cursor.addRow(arrayOf<Any>(file.name, file.length()))
        return cursor
    }

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0

    companion object {
        const val AUTHORITY = "com.kasbokar.tattooclass.pdf"
        fun folder(context: Context): File {
            val dir = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir, "TattooClass")
            dir.mkdirs()
            return dir
        }
        fun uriFor(name: String): Uri = Uri.Builder().scheme("content").authority(AUTHORITY).appendPath(name).build()
    }
}
