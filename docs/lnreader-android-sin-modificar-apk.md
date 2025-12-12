# Usar Traducción en LNReader Android SIN Modificar el APK

Esta guía explica cómo usar el sistema de traducción en [LNReader Android](https://github.com/LNReader/lnreader) **sin necesidad de modificar o recompilar el APK**.

## 🎯 Solución: Plugin de Traducción como Pre-Loader

Como LNReader carga plugins dinámicamente desde URLs, podemos crear un **"plugin especial"** que solo carga el bundle de traducción antes que los demás plugins.

## 📋 Paso 1: Crear Plugin de Traducción

Crea un plugin especial que solo carga el bundle de traducción:

```typescript
// plugins/translation-loader/translation-loader.ts
import { Plugin } from '@/types/plugin';
import { defaultCover } from '@libs/defaultCover';

class TranslationLoaderPlugin implements Plugin.PluginBase {
  id = 'translation-loader';
  name = 'Translation Loader';
  icon = 'src/en/example/icon.png';
  site = 'https://github.com/LNReader/lnreader-plugins';
  version = '1.0.0';

  async popularNovels() {
    return [];
  }

  async parseNovel() {
    return {
      path: '',
      name: 'Translation Loader',
      cover: defaultCover,
      chapters: [],
    };
  }

  async parseChapter() {
    // Este plugin solo carga el bundle, no traduce capítulos
    return '';
  }

  async searchNovels() {
    return [];
  }
}

export default new TranslationLoaderPlugin();
```

## 📋 Paso 2: Generar Bundle de Traducción

```bash
npm run build:translation-bundle
```

Esto genera `.dist/translation-standalone.min.js`

## 📋 Paso 3: Publicar Bundle y Plugin

El bundle se publica automáticamente cuando ejecutas:

```bash
npm run publish:plugins
```

El bundle estará disponible en:
```
https://raw.githubusercontent.com/<usuario>/<repo>/plugins/v3.0.0/.dist/translation-standalone.min.js
```

## 📋 Paso 4: Modificar Plugin para Cargar Bundle Dinámicamente

**Opción A: Plugin que carga el bundle automáticamente**

Modifica el plugin de traducción para que cargue el bundle cuando se inicializa:

```typescript
// En tu plugin que usa traducción
class MyTranslatedPlugin implements Plugin.PluginBase {
  private translationLoaded = false;

  async parseChapter(chapterPath: string): Promise<string> {
    // Cargar bundle si no está cargado
    if (!this.translationLoaded) {
      await this.loadTranslationBundle();
      this.translationLoaded = true;
    }

    const html = await fetchChapter(chapterPath);
    
    // Usar traducción (ahora disponible globalmente)
    if (typeof translateChapter !== 'undefined') {
      return await translateChapter(html, 'es');
    }
    
    return html;
  }

  private async loadTranslationBundle(): Promise<void> {
    try {
      const bundleUrl = 'https://raw.githubusercontent.com/<usuario>/<repo>/plugins/v3.0.0/.dist/translation-standalone.min.js';
      const response = await fetch(bundleUrl);
      const code = await response.text();
      
      // Ejecutar el código en el contexto actual
      eval(code);
    } catch (error) {
      console.error('Failed to load translation bundle:', error);
    }
  }
}
```

**Opción B: Incluir código directamente en el plugin (Bundling)**

Modificar el proceso de build para incluir el código de traducción directamente en cada plugin que lo necesite.

## 🚀 Solución Recomendada: Bundling Automático

La mejor solución es modificar el proceso de build para que cuando un plugin importe `@libs/translation`, el código se incluya automáticamente en el plugin compilado.

### Implementación:

1. **Modificar el script de build** para detectar imports de traducción
2. **Incluir el código** directamente en el plugin compilado
3. **Los plugins funcionan independientemente** sin necesidad de cargar nada externo

## 📝 Ejemplo: Plugin con Traducción Incluida

```typescript
// plugins/spanish/mi-novel-traducida.ts
import { Plugin } from '@/types/plugin';
import { translateChapter } from '@libs/translation'; // ← Se incluirá automáticamente
import { fetchApi } from '@libs/fetch';
import { load as parseHTML } from 'cheerio';

class MiNovelTraducida implements Plugin.PluginBase {
  id = 'mi-novel-traducida';
  name = 'Mi Novel Traducida';
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

  // ... otros métodos
}

export default new MiNovelTraducida();
```

## 🔧 Implementar Bundling Automático

Necesitamos modificar el proceso de compilación para incluir el código de traducción cuando se detecte el import.

### Script de Bundling:

```javascript
// scripts/bundle-plugin-translation.js
import fs from 'fs';
import path from 'path';

function bundleTranslationIntoPlugin(pluginCode, pluginPath) {
  // Detectar si el plugin usa traducción
  if (!pluginCode.includes('@libs/translation') && 
      !pluginCode.includes('translateChapter')) {
    return pluginCode; // No necesita traducción
  }

  // Leer código de traducción
  const translationCode = fs.readFileSync(
    path.join(process.cwd(), 'src/libs/translation.ts'),
    'utf-8'
  );

  // Convertir TypeScript a JavaScript básico
  const jsTranslationCode = translationCode
    .replace(/export\s+(async\s+)?function/g, '$1function')
    .replace(/export\s+/g, '')
    .replace(/:\s*string\s*=/g, '=')
    .replace(/:\s*boolean\s*=/g, '=')
    .replace(/:\s*Promise<string>/g, '')
    .replace(/:\s*string/g, '')
    .replace(/:\s*any/g, '');

  // Reemplazar el import con el código incluido
  const bundledCode = pluginCode.replace(
    /import\s*\{[^}]*translateChapter[^}]*\}\s*from\s*['"]@libs\/translation['"];?/g,
    `\n// Translation code included\n${jsTranslationCode}\n`
  );

  return bundledCode;
}
```

## ✅ Ventajas de Esta Solución

- ✅ **No necesitas modificar el APK** de LNReader
- ✅ **Cada plugin es independiente** (incluye su propio código de traducción)
- ✅ **Funciona con la app existente** sin cambios
- ✅ **Fácil de mantener** (solo modificas el proceso de build)

## ⚠️ Desventajas

- ⚠️ Cada plugin será más grande (incluye el código de traducción)
- ⚠️ Duplicación de código entre plugins que usan traducción

## 🎯 Próximos Pasos

1. **Implementar el bundling automático** en el script de build
2. **Probar con un plugin** que use traducción
3. **Publicar los plugins** - funcionarán automáticamente en LNReader

¿Quieres que implemente el sistema de bundling automático para que los plugins incluyan el código de traducción automáticamente?

