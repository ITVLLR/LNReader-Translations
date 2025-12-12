# Guía: Usar Plugins con Traducción en LNReader Android

Esta guía explica cómo usar plugins con traducción automática en la aplicación Android de LNReader.

## ¿Cómo Funciona?

Los plugins de LNReader se escriben en TypeScript y se compilan a JavaScript. Cuando un plugin usa `translateChapter`, el código de traducción debe estar disponible en el entorno de ejecución de Android.

## Opción 1: Usar Plugins Existentes (Recomendado)

Si ya tienes un plugin que usa traducción (como `example-translated-plugin.ts`), simplemente:

1. **Compila los plugins:**
   ```bash
   npm run build:compile
   npm run build:manifest
   ```

2. **Publica los plugins** (si tienes acceso al repositorio):
   ```bash
   npm run publish:plugins
   ```

3. **En la app Android**, agrega la URL del repositorio de plugins:
   ```
   https://raw.githubusercontent.com/<tu-usuario>/<tu-repo>/plugins/v3.0.0/.dist/plugins.min.json
   ```

4. **El plugin funcionará automáticamente** porque:
   - El código de traducción se incluye cuando TypeScript compila el plugin
   - Los imports de `@libs/translation` se resuelven durante la compilación
   - El código JavaScript resultante contiene todo lo necesario

## Opción 2: Crear un Plugin con Traducción

### Paso 1: Crear el Plugin

Crea un nuevo archivo en `plugins/<idioma>/tu-plugin.ts`:

```typescript
import { Plugin } from '@/types/plugin';
import { defaultCover } from '@libs/defaultCover';
import { translateChapter } from '@libs/translation'; // ← Importar traducción
import { fetchApi } from '@libs/fetch';
import { load as parseHTML } from 'cheerio';

class MiPluginTraducido implements Plugin.PluginBase {
  id = 'mi-plugin-traducido';
  name = 'Mi Plugin Traducido';
  icon = 'src/en/example/icon.png';
  site = 'https://ejemplo.com';
  version = '1.0.0';

  // Idioma de destino para traducción
  private targetLanguage: string = 'es'; // Español

  async parseChapter(chapterPath: string): Promise<string> {
    // 1. Obtener el contenido del capítulo
    const response = await fetchApi(this.site + chapterPath);
    const html = await response.text();
    const loadedCheerio = parseHTML(html);

    // 2. Extraer el contenido
    const chapterContent = loadedCheerio('.chapter-content').html() || '';

    // 3. Traducir automáticamente al español
    const translatedContent = await translateChapter(
      chapterContent,
      this.targetLanguage, // 'es' = Español
      true // Usar todos los motores disponibles
    );

    return translatedContent;
  }

  // ... otros métodos requeridos (popularNovels, parseNovel, searchNovels)
}

export default new MiPluginTraducido();
```

### Paso 2: Compilar el Plugin

```bash
# Compilar TypeScript a JavaScript
npm run build:compile

# Generar el manifiesto de plugins
npm run build:manifest
```

Esto generará:
- `.js/plugins/<idioma>/tu-plugin.js` - Plugin compilado
- `.dist/plugins.min.json` - Manifiesto con todos los plugins

### Paso 3: Verificar que el Código de Traducción Está Incluido

El código de traducción se incluye automáticamente cuando compilas porque:

1. TypeScript resuelve los imports de `@libs/translation`
2. El código fuente de traducción está en `src/libs/translation.ts` y `src/translation/`
3. Durante la compilación, TypeScript incluye todas las dependencias necesarias

**Nota importante:** El código de traducción debe estar disponible en el runtime de Android. Esto significa que la app Android debe tener acceso a las funciones de traducción.

## Opción 3: Verificar Compatibilidad con Android

Para que funcione en Android, necesitas asegurarte de que:

### 1. El Runtime de Android Soporte las APIs Necesarias

El código de traducción usa:
- `fetch()` o `window.fetch` para peticiones HTTP
- `DOMParser` para parsear HTML
- `Promise` para operaciones asíncronas

La app Android debe proporcionar estas APIs en su entorno JavaScript.

### 2. Las Dependencias Estén Disponibles

El código de traducción depende de:
- `cheerio` (para parsear HTML) - debe estar disponible en Android
- APIs de traducción (Google, Microsoft Edge, DeepL) - funcionan vía HTTP

### 3. Verificar el Entorno de Ejecución

En Android, los plugins se ejecutan en un entorno JavaScript. Verifica que:

```javascript
// Estas APIs deben estar disponibles:
typeof fetch !== 'undefined'        // ✅ Necesario
typeof DOMParser !== 'undefined'  // ✅ Necesario
typeof Promise !== 'undefined'    // ✅ Necesario
```

## Solución de Problemas

### Error: "translateChapter is not defined"

**Causa:** El código de traducción no está disponible en el runtime de Android.

**Solución:** 
1. Verifica que el plugin se compiló correctamente: `npm run build:compile`
2. Verifica que los imports están correctos en el plugin
3. Asegúrate de que la app Android incluye el código de traducción en su bundle

### Error: "require is not defined"

**Causa:** El código usa `require()` que no está disponible en navegadores/Android.

**Solución:** Ya está resuelto - todos los `require()` fueron reemplazados por imports ES6.

### La Traducción No Funciona

**Causa:** Posibles problemas de red o APIs bloqueadas.

**Solución:**
1. Verifica la conexión a internet
2. Verifica que las APIs de traducción no estén bloqueadas
3. Revisa los logs de la consola para errores específicos

## Ejemplo Completo

Aquí tienes un ejemplo completo de un plugin con traducción:

```typescript
import { Plugin } from '@/types/plugin';
import { defaultCover } from '@libs/defaultCover';
import { translateChapter } from '@libs/translation';
import { fetchApi } from '@libs/fetch';
import { load as parseHTML } from 'cheerio';

class NovelTraducida implements Plugin.PluginBase {
  id = 'novel-traducida';
  name = 'Novel Traducida';
  icon = 'src/en/example/icon.png';
  site = 'https://ejemplo.com';
  version = '1.0.0';

  private targetLanguage: string = 'es';

  async popularNovels(
    pageNo: number,
    options: Plugin.PopularNovelsOptions<undefined>,
  ): Promise<Plugin.NovelItem[]> {
    // Tu lógica aquí
    return [];
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    // Tu lógica aquí
    return {
      path: novelPath,
      name: 'Novel',
      cover: defaultCover,
      chapters: [],
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    // Obtener contenido
    const response = await fetchApi(this.site + chapterPath);
    const html = await response.text();
    const loadedCheerio = parseHTML(html);
    const chapterContent = loadedCheerio('.content').html() || '';

    // Traducir automáticamente
    return await translateChapter(chapterContent, this.targetLanguage, true);
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    // Tu lógica aquí
    return [];
  }
}

export default new NovelTraducida();
```

## Próximos Pasos

1. **Compila tu plugin:** `npm run build:compile`
2. **Prueba localmente:** Usa `npm run dev:start` para probar en el navegador
3. **Publica:** Si funciona, publícalo con `npm run publish:plugins`
4. **Usa en Android:** Agrega la URL del repositorio en la app Android

## Notas Importantes

- ✅ El código de traducción se incluye automáticamente al compilar
- ✅ Funciona con múltiples motores (Google, Microsoft Edge, DeepL)
- ✅ Incluye rotación de User-Agents para evitar límites de cuota
- ✅ Tiene caché automático para mejorar el rendimiento
- ⚠️ Requiere que el runtime de Android soporte las APIs necesarias
- ⚠️ Las traducciones pueden tardar varios segundos dependiendo del tamaño

## Recursos Adicionales

- [Guía de Integración Android](./android-integration-guide.md) - Para integrar traducción nativa en Android
- [Guía de Traducción en Plugins](./translation-integration.md) - Documentación completa de la API
- [Ejemplo de Plugin](./../plugins/example-translated-plugin.ts) - Plugin de ejemplo con traducción

