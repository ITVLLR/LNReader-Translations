# Guía Completa: Traducción en LNReader SIN Modificar el APK

Esta guía explica cómo usar traducción automática en [LNReader Android](https://github.com/LNReader/lnreader) **sin modificar el APK**.

## 🎯 Solución: Bundling Automático

El código de traducción se incluye **directamente en cada plugin** que lo necesite durante la compilación. Esto significa:

- ✅ **No necesitas modificar el APK** de LNReader
- ✅ **Los plugins funcionan independientemente**
- ✅ **Funciona con la app existente** sin cambios
- ✅ **Cada plugin incluye solo lo que necesita**

## 📋 Cómo Funciona

1. **Escribes tu plugin** con `import { translateChapter } from '@libs/translation'`
2. **Compilas el plugin** con `npm run build:compile`
3. **El script automáticamente** detecta el import y incluye el código de traducción
4. **El plugin compilado** contiene todo lo necesario para traducir
5. **LNReader carga el plugin** y funciona automáticamente

## 🚀 Pasos para Usar

### Paso 1: Crear Plugin con Traducción

```typescript
// plugins/spanish/mi-novel.ts
import { Plugin } from '@/types/plugin';
import { translateChapter } from '@libs/translation'; // ← Esto se incluirá automáticamente
import { fetchApi } from '@libs/fetch';
import { load as parseHTML } from 'cheerio';

class MiNovel implements Plugin.PluginBase {
  id = 'mi-novel';
  name = 'Mi Novel';
  site = 'https://ejemplo.com';
  version = '1.0.0';

  async parseChapter(chapterPath: string): Promise<string> {
    const response = await fetchApi(this.site + chapterPath);
    const html = await response.text();
    const loadedCheerio = parseHTML(html);
    const content = loadedCheerio('.chapter-content').html() || '';

    // Traducir automáticamente - el código está incluido en el plugin
    return await translateChapter(content, 'es', true);
  }

  // ... otros métodos requeridos
}

export default new MiNovel();
```

### Paso 2: Compilar y Publicar

```bash
# Compilar plugins (incluye traducción automáticamente)
npm run build:compile

# Bundle traducción en plugins que la usan
npm run build:bundle-translation

# Generar manifiesto
npm run build:manifest

# Publicar (opcional)
npm run publish:plugins
```

O todo en uno:

```bash
npm run build:full
```

### Paso 3: Usar en LNReader

1. **Abre LNReader Android**
2. **Ve a Configuración → Plugins**
3. **Agrega el repositorio:**
   ```
   https://raw.githubusercontent.com/<usuario>/<repo>/plugins/v3.0.0/.dist/plugins.min.json
   ```
4. **Instala tu plugin** - funcionará con traducción automática

## ✅ Ventajas

- ✅ **No modifica el APK** - funciona con la app existente
- ✅ **Plugins independientes** - cada uno incluye su código
- ✅ **Automático** - solo escribes `import { translateChapter }`
- ✅ **Compatible** - funciona con cualquier versión de LNReader

## ⚠️ Consideraciones

- ⚠️ **Tamaño del plugin**: Los plugins con traducción serán más grandes (~50-100 KB adicionales)
- ⚠️ **Duplicación**: Si tienes muchos plugins con traducción, el código se duplica en cada uno

## 🔍 Verificación

Para verificar que funciona:

1. **Compila un plugin** que use traducción
2. **Abre el archivo compilado** en `.js/plugins/<idioma>/tu-plugin.js`
3. **Busca "Translation code included"** - deberías ver el código de traducción incluido
4. **Prueba en LNReader** - el plugin debería traducir automáticamente

## 📝 Ejemplo Completo

```typescript
// plugins/spanish/ejemplo-traducido.ts
import { Plugin } from '@/types/plugin';
import { defaultCover } from '@libs/defaultCover';
import { translateChapter } from '@libs/translation';
import { fetchApi } from '@libs/fetch';
import { load as parseHTML } from 'cheerio';

class EjemploTraducido implements Plugin.PluginBase {
  id = 'ejemplo-traducido';
  name = 'Ejemplo Traducido';
  icon = 'src/en/example/icon.png';
  site = 'https://ejemplo.com';
  version = '1.0.0';

  private targetLanguage = 'es'; // Español

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
    // 1. Obtener contenido
    const response = await fetchApi(this.site + chapterPath);
    const html = await response.text();
    const loadedCheerio = parseHTML(html);
    const content = loadedCheerio('.chapter-content').html() || '';

    // 2. Traducir automáticamente
    // El código de translateChapter está incluido en el plugin compilado
    return await translateChapter(content, this.targetLanguage, true);
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    // Tu lógica aquí
    return [];
  }
}

export default new EjemploTraducido();
```

## 🎯 Resumen

**Para usar traducción en LNReader sin modificar el APK:**

1. ✅ Escribe tu plugin con `import { translateChapter } from '@libs/translation'`
2. ✅ Compila con `npm run build:full` (incluye bundling automático)
3. ✅ Publica los plugins
4. ✅ Los plugins funcionan automáticamente en LNReader con traducción

**¡No necesitas modificar el APK!** 🎉

## 📚 Recursos

- [Ejemplo de Plugin con Traducción](../plugins/example-translated-plugin.ts)
- [Guía de Desarrollo de Plugins](./docs.md)
- [Repositorio LNReader](https://github.com/LNReader/lnreader)

