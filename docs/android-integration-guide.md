# Guía de Integración del Sistema de Traducción en LNReader Android

Esta guía explica cómo integrar el sistema de traducción multi-motor en la aplicación Android de LNReader.

## Requisitos Previos

- Android Studio
- Repositorio de LNReader Android
- Conocimientos básicos de Android/Kotlin/Java

## Estructura de Integración

### 1. Archivos a Agregar

Necesitarás agregar los siguientes archivos al proyecto Android:

```
app/src/main/
├── java/com/lnreader/
│   ├── translation/
│   │   ├── TranslationEngine.kt
│   │   ├── MultiEngineTranslator.kt
│   │   ├── engines/
│   │   │   ├── BaseEngine.kt
│   │   │   ├── GoogleTranslateEngine.kt
│   │   │   ├── MicrosoftEdgeEngine.kt
│   │   │   ├── DeepLEngine.kt
│   │   │   └── ... (otros motores)
│   │   └── cache/
│   │       └── TranslationCache.kt
│   └── ui/reader/
│       └── ReaderActivity.kt (modificar)
```

### 2. Dependencias Gradle

Agregar al `build.gradle` (Module: app):

```gradle
dependencies {
    // JSON parsing
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // HTTP client
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    
    // Coroutines for async operations
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // ViewModel
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
}
```

### 3. Estructura Base del Motor de Traducción

#### BaseEngine.kt

```kotlin
package com.lnreader.translation

import kotlinx.coroutines.Deferred

abstract class BaseEngine {
    abstract val name: String
    abstract val alias: String
    abstract val free: Boolean
    abstract val needApiKey: Boolean
    
    var currentApiKey: String? = null
    var sourceLang: String = "auto"
    var targetLang: String = "en"
    
    abstract suspend fun translate(text: String): String
    abstract suspend fun translateHtml(html: String): String
}
```

#### GoogleTranslateEngine.kt

```kotlin
package com.lnreader.translation.engines

import com.lnreader.translation.BaseEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import java.net.URLEncoder

class GoogleTranslateEngine : BaseEngine() {
    override val name = "Google"
    override val alias = "Google"
    override val free = true
    override val needApiKey = false
    
    private val client = OkHttpClient()
    
    override suspend fun translate(text: String): String = withContext(Dispatchers.IO) {
        try {
            val encodedText = URLEncoder.encode(text, "UTF-8")
            val url = "https://translate.googleapis.com/translate_a/single?" +
                    "client=gtx&sl=$sourceLang&tl=$targetLang&dt=t&q=$encodedText"
            
            val request = Request.Builder()
                .url(url)
                .addHeader("User-Agent", "Mozilla/5.0")
                .build()
            
            val response = client.newCall(request).execute()
            val jsonResponse = JSONArray(response.body?.string() ?: "")
            
            if (jsonResponse.length() > 0) {
                val sentences = jsonResponse.getJSONArray(0)
                val translated = StringBuilder()
                for (i in 0 until sentences.length()) {
                    val sentence = sentences.getJSONArray(i)
                    if (sentence.length() > 0) {
                        translated.append(sentence.getString(0))
                    }
                }
                translated.toString()
            } else {
                text
            }
        } catch (e: Exception) {
            e.printStackTrace()
            text
        }
    }
    
    override suspend fun translateHtml(html: String): String {
        // Extract text from HTML, translate, and reconstruct
        val textContent = extractTextFromHtml(html)
        val translated = translate(textContent)
        return replaceTextInHtml(html, textContent, translated)
    }
    
    private fun extractTextFromHtml(html: String): String {
        // Simple HTML text extraction
        return html.replace(Regex("<[^>]*>"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
    }
    
    private fun replaceTextInHtml(html: String, original: String, translated: String): String {
        // Simple replacement - in production, use proper HTML parser
        return html.replace(original, translated)
    }
}
```

### 4. Multi-Engine Translator

#### MultiEngineTranslator.kt

```kotlin
package com.lnreader.translation

import com.lnreader.translation.engines.GoogleTranslateEngine
import com.lnreader.translation.engines.MicrosoftEdgeEngine
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

class MultiEngineTranslator(
    private val engines: List<BaseEngine>,
    private val useMultipleEngines: Boolean = true
) {
    var sourceLang: String = "auto"
        set(value) {
            field = value
            engines.forEach { it.sourceLang = value }
        }
    
    var targetLang: String = "en"
        set(value) {
            field = value
            engines.forEach { it.targetLang = value }
        }
    
    suspend fun translate(text: String): String = coroutineScope {
        if (useMultipleEngines && engines.size > 1) {
            // Try all engines in parallel, use first successful result
            val results = engines.map { engine ->
                async {
                    try {
                        engine.translate(text)
                    } catch (e: Exception) {
                        null
                    }
                }
            }.awaitAll()
            
            results.firstOrNull { it != null } ?: text
        } else {
            // Use first engine only
            try {
                engines.firstOrNull()?.translate(text) ?: text
            } catch (e: Exception) {
                text
            }
        }
    }
    
    suspend fun translateHtml(html: String): String = coroutineScope {
        if (useMultipleEngines && engines.size > 1) {
            val results = engines.map { engine ->
                async {
                    try {
                        engine.translateHtml(html)
                    } catch (e: Exception) {
                        null
                    }
                }
            }.awaitAll()
            
            results.firstOrNull { it != null } ?: html
        } else {
            try {
                engines.firstOrNull()?.translateHtml(html) ?: html
            } catch (e: Exception) {
                html
            }
        }
    }
}
```

### 5. Integración en ReaderActivity

Modificar el Activity o Fragment que muestra los capítulos:

```kotlin
class ReaderActivity : AppCompatActivity() {
    private lateinit var translator: MultiEngineTranslator
    private var isTranslationEnabled = false
    private var targetLanguage = "es" // Spanish by default
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize translator with free engines
        translator = MultiEngineTranslator(
            engines = listOf(
                GoogleTranslateEngine(),
                MicrosoftEdgeEngine()
            ),
            useMultipleEngines = true
        )
        
        translator.targetLang = targetLanguage
        
        // Load chapter and translate if enabled
        loadChapter()
    }
    
    private fun loadChapter() {
        lifecycleScope.launch {
            val chapterContent = viewModel.getChapterContent(chapterId)
            
            if (isTranslationEnabled) {
                showLoading()
                val translated = translator.translateHtml(chapterContent)
                displayChapter(translated)
                hideLoading()
            } else {
                displayChapter(chapterContent)
            }
        }
    }
    
    private fun toggleTranslation() {
        isTranslationEnabled = !isTranslationEnabled
        loadChapter()
    }
}
```

### 6. UI para Configuración

Agregar un menú o botón en el ReaderActivity:

```kotlin
// En el menú de opciones
menu.findItem(R.id.translate).setOnMenuItemClickListener {
    toggleTranslation()
    true
}

// O un botón flotante
floatingActionButton.setOnClickListener {
    toggleTranslation()
}
```

### 7. Preferencias de Usuario

Guardar preferencias de traducción:

```kotlin
class TranslationPreferences(context: Context) {
    private val prefs = context.getSharedPreferences("translation_prefs", Context.MODE_PRIVATE)
    
    fun isAutoTranslateEnabled(): Boolean {
        return prefs.getBoolean("auto_translate", false)
    }
    
    fun getTargetLanguage(): String {
        return prefs.getString("target_language", "es") ?: "es"
    }
    
    fun setAutoTranslate(enabled: Boolean) {
        prefs.edit().putBoolean("auto_translate", enabled).apply()
    }
    
    fun setTargetLanguage(lang: String) {
        prefs.edit().putString("target_language", lang).apply()
    }
}
```

## Compilación del APK

### 1. Build Debug APK

```bash
./gradlew assembleDebug
```

El APK estará en: `app/build/outputs/apk/debug/app-debug.apk`

### 2. Build Release APK (requiere firma)

1. Crear keystore:
```bash
keytool -genkey -v -keystore lnreader-release.keystore -alias lnreader -keyalg RSA -keysize 2048 -validity 10000
```

2. Configurar `app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('lnreader-release.keystore')
            storePassword 'your_password'
            keyAlias 'lnreader'
            keyPassword 'your_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. Compilar:
```bash
./gradlew assembleRelease
```

El APK estará en: `app/build/outputs/apk/release/app-release.apk`

## Próximos Pasos

1. Comparte el repositorio de GitHub de LNReader Android
2. Revisaré la estructura del proyecto
3. Integraré el código de traducción adaptado a su arquitectura
4. Te proporcionaré instrucciones detalladas para compilar

## Notas Importantes

- El sistema de traducción usa APIs gratuitas (Google, Microsoft Edge)
- Para motores premium (ChatGPT, DeepL Pro), necesitarás agregar manejo de API keys
- Considera implementar caché para mejorar el rendimiento
- Las traducciones pueden tardar varios segundos dependiendo del tamaño del capítulo

