package com.kasbokar.tattooclass

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class ApiException(message: String, val code: Int) : Exception(message)

data class ModuleCard(val id: String, val title: String, val description: String)
data class LessonCard(val id: String, val title: String)

data class LessonGroup(val title: String, val lessons: List<LessonCard>)
data class LessonImage(val path: String, val caption: String)
data class Lesson(val id: String, val title: String, val content: String, val images: List<LessonImage>)
data class Question(val id: String, val text: String, val answer: String, val answered: Boolean)

class Api(private val token: String?) {
    fun activate(code: String, deviceId: String): String {
        val json = request("POST", "/api/tattoo/activate", JSONObject().put("code", code).put("deviceId", deviceId), auth = false)
        val value = json.optString("token")
        if (value.isBlank()) throw ApiException("ورود انجام نشد.", 500)
        return value
    }

    fun modules(): List<ModuleCard> {
        val list = request("GET", "/api/tattoo/modules", null).optJSONArray("modules") ?: return emptyList()
        return List(list.length()) { index ->
            val item = list.getJSONObject(index)
            ModuleCard(item.optString("id"), item.optString("title"), item.optString("description"))
        }
    }

    fun catalog(moduleId: String): List<LessonGroup> {
        val json = request("GET", "/api/tattoo/lessons/$moduleId", null)
        val groups = json.optJSONArray("groups")
        if (groups != null && groups.length() > 0) {
            return List(groups.length()) { index ->
                val group = groups.getJSONObject(index)
                LessonGroup(group.optString("title"), cards(group.optJSONArray("lessons")))
            }
        }
        val loose = cards(json.optJSONArray("lessons"))
        return if (loose.isEmpty()) emptyList() else listOf(LessonGroup("", loose))
    }

    private fun cards(list: org.json.JSONArray?): List<LessonCard> {
        if (list == null) return emptyList()
        return List(list.length()) { index ->
            val item = list.getJSONObject(index)
            LessonCard(item.optString("id"), item.optString("title"))
        }
    }

    fun lesson(id: String): Lesson {
        val item = request("GET", "/api/tattoo/lesson/$id", null).getJSONObject("lesson")
        val imagesJson = item.optJSONArray("images")
        val images = if (imagesJson == null) emptyList() else List(imagesJson.length()) { index ->
            val image = imagesJson.getJSONObject(index)
            LessonImage(image.optString("path"), image.optString("caption"))
        }
        return Lesson(item.optString("id"), item.optString("title"), item.optString("content"), images)
    }

    fun questions(): List<Question> {
        val list = request("GET", "/api/tattoo/my-questions", null).optJSONArray("questions") ?: return emptyList()
        return List(list.length()) { index ->
            val item = list.getJSONObject(index)
            Question(
                item.optString("id"),
                item.optString("questionText"),
                item.optString("answerText"),
                item.optString("status") == "answered",
            )
        }
    }

    fun ask(lessonId: String, text: String) {
        request("POST", "/api/tattoo/question", JSONObject().put("lessonId", lessonId).put("questionText", text))
    }

    fun bytes(path: String): ByteArray {
        val url = URL(if (path.startsWith("http")) path else "$BASE$path")
        val conn = open(url, "GET", auth = true)
        val code = conn.responseCode
        if (code == 401) throw ApiException("کد این دستگاه دیگر معتبر نیست.", 401)
        if (code !in 200..299) throw ApiException("تصویر باز نشد.", code)
        return conn.inputStream.use { it.readBytes() }
    }

    private fun request(method: String, path: String, body: JSONObject?, auth: Boolean = true): JSONObject {
        val conn = open(URL("$BASE$path"), method, auth)
        if (body != null) {
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
        }
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        val json = if (text.trim().startsWith("{")) JSONObject(text) else JSONObject()
        if (code == 401) throw ApiException(json.optString("error").ifBlank { "کد این دستگاه دیگر معتبر نیست." }, 401)
        if (code !in 200..299) throw ApiException(json.optString("error").ifBlank { "انجام نشد." }, code)
        return json
    }

    private fun open(url: URL, method: String, auth: Boolean): HttpURLConnection {
        return (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 20_000
            readTimeout = 20_000
            setRequestProperty("Accept", if (auth && method == "GET" && url.path.contains("/image/")) "image/*" else "application/json")
            if (auth && !token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
        }
    }

    companion object {
        const val BASE = "https://kasbokarapp.com"
    }
}
