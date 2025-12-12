# Guía: Incluir Bundle de Traducción en Android

Esta guía explica cómo incluir el bundle de traducción en la app Android de LNReader para que los plugins puedan usar traducción automática.

## Paso 1: Generar el Bundle de Traducción

Ejecuta el script de build para generar el bundle:

```bash
npm run build:translation-bundle
```

Esto generará los siguientes archivos en `.dist/`:

- `translation-standalone.js` - Versión completa sin minificar
- `translation-standalone.min.js` - Versión minificada (recomendada)
- `translation-bundle.js` - Bundle completo con todos los motores
- `translation-bundle.min.js` - Bundle completo minificado

**Recomendación:** Usa `translation-standalone.min.js` para Android (más pequeño y compatible).

## Paso 2: Incluir el Bundle en Android

### Opción A: Incluir como Asset (Recomendado)

1. **Copia el archivo a tu proyecto Android:**

   ```bash
   # Desde el proyecto lnreader-plugins
   cp .dist/translation-standalone.min.js <ruta-proyecto-android>/app/src/main/assets/translation.js
   ```

2. **Carga el bundle en el runtime JavaScript de Android:**

   En tu código Android (Kotlin/Java), cuando inicialices el runtime JavaScript:

   ```kotlin
   // Ejemplo en Kotlin
   fun loadTranslationBundle(context: Context) {
       try {
           val translationCode = context.assets.open("translation.js")
               .bufferedReader().use { it.readText() }
           
           // Ejecutar en el runtime JavaScript
           val jsRuntime = // Tu runtime JavaScript (Rhino, V8, etc.)
           jsRuntime.evaluate(translationCode)
           
           Log.d("Translation", "Translation bundle loaded successfully")
       } catch (e: Exception) {
           Log.e("Translation", "Failed to load translation bundle", e)
       }
   }
   ```

### Opción B: Descargar desde el Repositorio

Si publicas el bundle en GitHub, puedes descargarlo dinámicamente:

```kotlin
fun loadTranslationBundleFromUrl(url: String) {
    lifecycleScope.launch(Dispatchers.IO) {
        try {
            val response = OkHttpClient().newCall(
                Request.Builder().url(url).build()
            ).execute()
            
            val translationCode = response.body?.string() ?: return@launch
            
            // Ejecutar en runtime JavaScript
            jsRuntime.evaluate(translationCode)
            
            Log.d("Translation", "Translation bundle loaded from URL")
        } catch (e: Exception) {
            Log.e("Translation", "Failed to load translation bundle", e)
        }
    }
}

// URL del bundle en GitHub
val bundleUrl = "https://raw.githubusercontent.com/<usuario>/<repo>/plugins/v3.0.0/.dist/translation-standalone.min.js"
loadTranslationBundleFromUrl(bundleUrl)
```

## Paso 3: Verificar que Funciona

Después de cargar el bundle, verifica que las funciones están disponibles:

```kotlin
fun verifyTranslationAvailable(): Boolean {
    return try {
        val result = jsRuntime.evaluate("typeof translateChapter !== 'undefined'")
        result.toString().toBoolean()
    } catch (e: Exception) {
        false
    }
}
```

## Paso 4: Los Plugins Funcionarán Automáticamente

Una vez que el bundle está cargado, los plugins que usan `translateChapter` funcionarán automáticamente:

```typescript
// En el plugin (esto ya funciona si el bundle está cargado)
import { translateChapter } from '@libs/translation';

async parseChapter(chapterPath: string): Promise<string> {
  const html = await fetchChapter(chapterPath);
  return await translateChapter(html, 'es'); // ✅ Funciona automáticamente
}
```

## Estructura del Bundle

El bundle incluye:

- ✅ `translateChapter(html, targetLang, useAllEngines)` - Traduce HTML preservando estructura
- ✅ `translateText(text, targetLang, useAllEngines)` - Traduce texto plano
- ✅ `isTranslationAvailable()` - Verifica si la traducción está disponible
- ✅ Múltiples motores de traducción (Google, Microsoft Edge, DeepL)
- ✅ Rotación de User-Agents para evitar límites
- ✅ Sistema de caché para mejorar rendimiento

## APIs Disponibles

### `translateChapter(html, targetLang, useAllEngines)`

Traduce contenido HTML preservando la estructura.

**Parámetros:**
- `html` (string): Contenido HTML del capítulo
- `targetLang` (string): Código de idioma destino (ej: 'es', 'en', 'fr')
- `useAllEngines` (boolean, opcional): Usar todos los motores (default: true)

**Retorna:** Promise<string> - HTML traducido

**Ejemplo:**
```javascript
const translatedHtml = await translateChapter(
  '<p>Hello world</p>',
  'es',
  true
);
// Resultado: '<p>Hola mundo</p>'
```

### `translateText(text, targetLang, useAllEngines)`

Traduce texto plano.

**Parámetros:**
- `text` (string): Texto a traducir
- `targetLang` (string): Código de idioma destino
- `useAllEngines` (boolean, opcional): Usar todos los motores (default: true)

**Retorna:** Promise<string> - Texto traducido

**Ejemplo:**
```javascript
const translated = await translateText('Hello world', 'es');
// Resultado: 'Hola mundo'
```

## Compatibilidad

El bundle es compatible con:

- ✅ Android JavaScript Runtime (Rhino, V8, etc.)
- ✅ Navegadores web
- ✅ Node.js
- ✅ Cualquier entorno JavaScript ES5+

## Requisitos del Runtime

El runtime JavaScript debe soportar:

- ✅ `fetch()` o equivalente para peticiones HTTP
- ✅ `Promise` para operaciones asíncronas
- ✅ `JSON.parse()` y `JSON.stringify()`
- ✅ `URLSearchParams` (o polyfill)
- ✅ `DOMParser` (opcional, para mejor parsing de HTML)

## Solución de Problemas

### Error: "translateChapter is not defined"

**Causa:** El bundle no se cargó correctamente.

**Solución:**
1. Verifica que el bundle se carga antes que los plugins
2. Verifica que no hay errores al cargar el bundle
3. Usa `verifyTranslationAvailable()` para verificar

### Error: "fetch is not defined"

**Causa:** El runtime no tiene `fetch()`.

**Solución:** Agrega un polyfill de fetch o usa una librería HTTP compatible.

### La Traducción No Funciona

**Causa:** Posibles problemas de red o APIs bloqueadas.

**Solución:**
1. Verifica la conexión a internet
2. Verifica que las APIs de traducción no estén bloqueadas
3. Revisa los logs para errores específicos

## Integración Completa

### Ejemplo Completo en Android

```kotlin
class PluginRuntime {
    private lateinit var jsRuntime: // Tu runtime JavaScript
    
    fun initialize(context: Context) {
        // 1. Cargar bundle de traducción primero
        loadTranslationBundle(context)
        
        // 2. Verificar que está disponible
        if (!verifyTranslationAvailable()) {
            Log.e("PluginRuntime", "Translation bundle not available")
            return
        }
        
        // 3. Cargar plugins (ahora pueden usar traducción)
        loadPlugins()
    }
    
    private fun loadTranslationBundle(context: Context) {
        val translationCode = context.assets.open("translation.js")
            .bufferedReader().use { it.readText() }
        jsRuntime.evaluate(translationCode)
    }
    
    private fun verifyTranslationAvailable(): Boolean {
        return try {
            val result = jsRuntime.evaluate("typeof translateChapter !== 'undefined'")
            result.toString().toBoolean()
        } catch (e: Exception) {
            false
        }
    }
    
    private fun loadPlugins() {
        // Cargar plugins normalmente
        // Los plugins pueden usar translateChapter() automáticamente
    }
}
```

## Próximos Pasos

1. ✅ Genera el bundle: `npm run build:translation-bundle`
2. ✅ Incluye el bundle en tu app Android
3. ✅ Carga el bundle antes de cargar plugins
4. ✅ Verifica que funciona con `verifyTranslationAvailable()`
5. ✅ Los plugins con traducción funcionarán automáticamente

## Notas Importantes

- ⚠️ El bundle debe cargarse **antes** que los plugins
- ⚠️ El bundle requiere `fetch()` o equivalente en el runtime
- ⚠️ Las traducciones pueden tardar varios segundos
- ✅ El bundle incluye caché automático para mejorar rendimiento
- ✅ Usa rotación de User-Agents para evitar límites de cuota

## Recursos

- [Guía de Plugins con Traducción](./android-plugin-translation-guide.md)
- [Guía de Integración Android](./android-integration-guide.md)
- [Ejemplo de Plugin](./../plugins/example-translated-plugin.ts)

