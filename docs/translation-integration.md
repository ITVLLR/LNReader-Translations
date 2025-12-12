# Integración de Traducción en Plugins de LNReader

Este documento explica cómo integrar el sistema de traducción automática en tus plugins de LNReader para que funcionen tanto en la aplicación web como en la app Android.

## Opción 1: Traducción Automática en el Plugin

Puedes agregar traducción directamente en el método `parseChapter` de tu plugin:

```typescript
import { translateChapter } from '@libs/translation';

class MyPlugin implements Plugin.PluginBase {
  // ... otras propiedades ...

  async parseChapter(chapterPath: string): Promise<string> {
    // Obtener el contenido del capítulo normalmente
    const html = await this.getChapterContent(chapterPath);
    
    // Traducir automáticamente al español (o el idioma que prefieras)
    const translatedHtml = await translateChapter(html, 'es');
    
    return translatedHtml;
  }
}
```

## Opción 2: Traducción Condicional

Puedes hacer la traducción opcional basada en configuración:

```typescript
import { translateChapter } from '@libs/translation';

class MyPlugin implements Plugin.PluginBase {
  // Idioma de destino (puede venir de configuración)
  private targetLanguage: string = 'es';
  
  async parseChapter(chapterPath: string): Promise<string> {
    const html = await this.getChapterContent(chapterPath);
    
    // Solo traducir si el idioma de destino está configurado
    if (this.targetLanguage && this.targetLanguage !== 'auto') {
      return await translateChapter(html, this.targetLanguage);
    }
    
    return html;
  }
}
```

## Opción 3: Traducción con Múltiples Motores

Para mejor calidad, usa todos los motores disponibles:

```typescript
import { translateChapter } from '@libs/translation';

async parseChapter(chapterPath: string): Promise<string> {
  const html = await this.getChapterContent(chapterPath);
  
  // Usar todos los motores disponibles (incluyendo los que requieren API key)
  return await translateChapter(html, 'es', true);
}
```

## Funciones Disponibles

### `translateChapter(html, targetLang, useAllEngines)`

Traduce contenido HTML preservando la estructura.

**Parámetros:**
- `html` (string): Contenido HTML del capítulo
- `targetLang` (string): Código de idioma destino (default: 'es')
- `useAllEngines` (boolean): Usar todos los motores o solo gratuitos (default: true)

**Retorna:** Promise<string> - HTML traducido

### `translateText(text, targetLang, useAllEngines)`

Traduce texto plano.

**Parámetros:**
- `text` (string): Texto a traducir
- `targetLang` (string): Código de idioma destino (default: 'es')
- `useAllEngines` (boolean): Usar todos los motores o solo gratuitos (default: true)

**Retorna:** Promise<string> - Texto traducido

## Idiomas Soportados

Los códigos de idioma comunes incluyen:
- `'es'` - Español
- `'en'` - Inglés
- `'fr'` - Francés
- `'de'` - Alemán
- `'it'` - Italiano
- `'pt'` - Portugués
- `'ru'` - Ruso
- `'ja'` - Japonés
- `'ko'` - Coreano
- `'zh-CN'` - Chino Simplificado
- `'zh-TW'` - Chino Traditional
- Y muchos más...

## Ejemplo Completo

```typescript
import { Plugin } from '@/types/plugin';
import { defaultCover } from '@libs/defaultCover';
import { translateChapter } from '@libs/translation';
import { fetchApi } from '@libs/fetch';
import { parseHTML } from '@libs/utils';

class TranslatedNovelPlugin implements Plugin.PluginBase {
  id = 'translated-novel';
  name = 'Translated Novel';
  icon = 'src/en/translatednovel/icon.png';
  site = 'https://example.com';
  version = '1.0.0';
  
  // Idioma de destino para traducción
  private targetLanguage = 'es';

  async popularNovels(
    pageNo: number,
    options: Plugin.PopularNovelsOptions<undefined>,
  ): Promise<Plugin.NovelItem[]> {
    // ... implementación normal ...
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    // ... implementación normal ...
  }

  async parseChapter(chapterPath: string): Promise<string> {
    // Obtener contenido del capítulo
    const response = await fetchApi(this.site + chapterPath);
    const html = await response.text();
    const loadedCheerio = parseHTML(html);
    
    // Extraer el contenido del capítulo
    const chapterContent = loadedCheerio('.chapter-content').html() || '';
    
    // Traducir automáticamente
    const translatedContent = await translateChapter(
      chapterContent,
      this.targetLanguage,
      true // Usar todos los motores disponibles
    );
    
    return translatedContent;
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    // ... implementación normal ...
  }
}

export default new TranslatedNovelPlugin();
```

## Notas Importantes

1. **Rendimiento**: La traducción puede tomar tiempo, especialmente con múltiples motores. Considera usar caché.

2. **Errores**: Si la traducción falla, se devuelve el contenido original para no romper el plugin.

3. **API Keys**: Los motores que requieren API key fallarán si no están configurados, pero los motores gratuitos funcionarán normalmente.

4. **Compatibilidad**: Este sistema funciona tanto en la aplicación web como en la app Android de LNReader.

5. **Caché**: El sistema de traducción incluye caché automático para evitar traducir el mismo contenido múltiples veces.

## Integración en la App Android

Para usar esto en la app Android de LNReader:

1. Los plugins se ejecutan en un entorno JavaScript en Android
2. El código de traducción se incluirá automáticamente cuando se construyan los plugins
3. Los plugins pueden usar `translateChapter` directamente sin cambios adicionales
4. La app Android ejecutará el código JavaScript del plugin, incluyendo las llamadas de traducción

## Configuración Avanzada

Si necesitas más control, puedes crear tu propia instancia del traductor:

```typescript
import { createTranslator } from '@/translation/translator';
import { FREE_ENGINES } from '@/translation/engines';

const translator = createTranslator('es', {
  engines: Array.from(FREE_ENGINES),
  useMultipleEngines: true,
});

// Usar el traductor directamente
const translated = await translator.translateHtml(html);
```

