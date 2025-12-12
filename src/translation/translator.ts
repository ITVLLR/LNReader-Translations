/**
 * Multi-engine translation system
 * Based on Ebook Translator's translation system
 * Uses multiple engines simultaneously for better quality
 */

import {
  BaseEngine,
  BUILTIN_ENGINES,
  EngineClass,
  TranslationConfig,
  TranslationResult,
  GoogleFreeTranslate,
  GoogleFreeTranslateNew,
} from './engines';
import { translationCache } from './cache';

export interface TranslatorConfig {
  engines: EngineClass[];
  sourceLang?: string;
  targetLang: string;
  useMultipleEngines?: boolean;
  mergeStrategy?: 'first' | 'vote' | 'average';
  config?: TranslationConfig;
}

export class MultiEngineTranslator {
  private engines: BaseEngine[] = [];
  private sourceLang: string = 'auto';
  private targetLang: string = 'en';
  private useMultipleEngines: boolean = true;
  private mergeStrategy: 'first' | 'vote' | 'average' = 'first';

  constructor(config: TranslatorConfig) {
    this.sourceLang = config.sourceLang || 'auto';
    this.targetLang = config.targetLang;
    this.useMultipleEngines = config.useMultipleEngines ?? true;
    this.mergeStrategy = config.mergeStrategy || 'first';

    // Initialize engines
    this.engines = config.engines.map(
      EngineClass => new EngineClass(config.config || {}),
    ) as BaseEngine[];

    // Set languages for all engines
    this.engines.forEach(engine => {
      engine.setSourceLang(this.sourceLang);
      engine.setTargetLang(this.targetLang);
    });
  }

  /**
   * Translate text using multiple engines
   */
  async translate(text: string): Promise<string> {
    if (!text.trim()) {
      return text;
    }

    // Check cache first - try each engine
    for (const engine of this.engines) {
      const cached = translationCache.get(
        text,
        this.sourceLang,
        this.targetLang,
        engine.name,
      );
      if (cached) {
        return cached;
      }
    }

    let result: string;
    let usedEngine: BaseEngine;

    if (!this.useMultipleEngines || this.engines.length === 1) {
      // Use single engine (first one)
      usedEngine = this.engines[0];
      result = await this.translateWithEngine(usedEngine, text);
    } else {
      // Use multiple engines
      result = await this.translateWithMultipleEngines(text);
      usedEngine = this.engines[0]; // Store with first engine name
    }

    // Store in cache for all engines used
    if (this.useMultipleEngines && this.engines.length > 1) {
      // Store with each engine name for better cache hits
      this.engines.forEach(engine => {
        translationCache.set(
          text,
          result,
          this.sourceLang,
          this.targetLang,
          engine.name,
        );
      });
    } else {
      translationCache.set(
        text,
        result,
        this.sourceLang,
        this.targetLang,
        usedEngine.name,
      );
    }

    return result;
  }

  /**
   * Translate with a single engine
   */
  private async translateWithEngine(
    engine: BaseEngine,
    text: string,
  ): Promise<string> {
    try {
      return await engine.translate(text);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Silently skip expected errors (API keys, network issues, timeouts)
      if (
        errorMessage.includes('API key') ||
        errorMessage.includes('requires an API key') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') ||
        errorMessage.includes('network')
      ) {
        throw error;
      }
      // Only log unexpected errors
      console.warn(`Translation failed with ${engine.name}:`, errorMessage);
      throw error;
    }
  }

  /**
   * Translate with multiple engines and merge results
   */
  private async translateWithMultipleEngines(text: string): Promise<string> {
    const results: TranslationResult[] = [];

    // Translate with all engines in parallel
    const promises = this.engines.map(async (engine, index) => {
      try {
        const translated = await engine.translate(text);
        results.push({
          text: translated,
          engine: engine.name,
        });
        return translated;
      } catch (error) {
        // Silently skip engines that require API key but don't have one configured
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('API key') ||
          errorMessage.includes('requires an API key') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') ||
          errorMessage.includes('network')
        ) {
          // These are expected errors (API keys, network issues, timeouts), don't log
          return null;
        }
        // Only log unexpected errors
        console.warn(`Translation failed with ${engine.name}:`, errorMessage);
        return null;
      }
    });

    await Promise.allSettled(promises);

    // Filter out failed translations
    const successfulResults = results.filter(r => r.text);

    if (successfulResults.length === 0) {
      // If all engines failed, try to use the first free engine as fallback
      const freeEngine = this.engines.find(e => e.free);
      if (freeEngine) {
        try {
          return await this.translateWithEngine(freeEngine, text);
        } catch {
          // If even the fallback fails, throw the original error
        }
      }
      throw new Error('All translation engines failed');
    }

    // Merge results based on strategy
    return this.mergeResults(successfulResults);
  }

  /**
   * Merge translation results from multiple engines
   */
  private mergeResults(results: TranslationResult[]): string {
    switch (this.mergeStrategy) {
      case 'first':
        // Return first successful result
        return results[0].text;

      case 'vote':
        // Return most common translation (simplified - just return first for now)
        // TODO: Implement actual voting mechanism
        return results[0].text;

      case 'average':
        // Return first result (simplified)
        // TODO: Implement averaging mechanism
        return results[0].text;

      default:
        return results[0].text;
    }
  }

  /**
   * Translate HTML content while preserving structure
   */
  async translateHtml(html: string): Promise<string> {
    // Extract text nodes from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find all text nodes
    const textNodes: Text[] = [];
    if (!doc.body) {
      // Fallback if body is not available
      return await this.translate(html);
    }

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        textNodes.push(node as Text);
      }
    }

    // Translate each text node with limited concurrency to avoid overwhelming the browser
    // When translating many nodes, use sequential processing instead of parallel
    const MAX_CONCURRENT_TRANSLATIONS = textNodes.length > 20 ? 1 : 3;
    const translations: Array<{ original: string; translated: string }> = [];

    for (let i = 0; i < textNodes.length; i += MAX_CONCURRENT_TRANSLATIONS) {
      const batch = textNodes.slice(i, i + MAX_CONCURRENT_TRANSLATIONS);
      const batchTranslations = await Promise.all(
        batch.map(async node => {
          const original = node.textContent || '';
          if (!original.trim()) return { original, translated: original };

          try {
            // When translating many nodes, use single engine to reduce load
            const useSingleEngine = textNodes.length > 10;
            let translated: string = original;

            if (useSingleEngine) {
              // Try free engines one by one until one succeeds
              const freeEngines = this.engines.filter(e => e.free);
              let lastError: Error | null = null;
              for (const engine of freeEngines.length > 0
                ? freeEngines
                : this.engines) {
                try {
                  translated = await this.translateWithEngine(engine, original);
                  break;
                } catch (err) {
                  lastError =
                    err instanceof Error ? err : new Error(String(err));
                  continue;
                }
              }
              if (translated === original && lastError) {
                throw lastError;
              }
            } else {
              translated = await this.translate(original);
            }

            return { original, translated };
          } catch (error) {
            // Return original text if translation fails
            return { original, translated: original };
          }
        }),
      );
      translations.push(...batchTranslations);

      // Add small delay between batches to avoid overwhelming the browser
      if (i + MAX_CONCURRENT_TRANSLATIONS < textNodes.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Replace text in original HTML
    let translatedHtml = html;
    translations.forEach(({ original, translated }) => {
      translatedHtml = translatedHtml.replace(original, translated);
    });

    return translatedHtml;
  }

  /**
   * Set source language
   */
  setSourceLang(lang: string): void {
    this.sourceLang = lang;
    this.engines.forEach(engine => engine.setSourceLang(lang));
  }

  /**
   * Set target language
   */
  setTargetLang(lang: string): void {
    this.targetLang = lang;
    this.engines.forEach(engine => engine.setTargetLang(lang));
  }

  /**
   * Get available engines
   */
  getEngines(): BaseEngine[] {
    return this.engines;
  }
}

/**
 * Create a translator instance with default configuration
 */
export function createTranslator(
  targetLang: string,
  config?: Partial<TranslatorConfig>,
): MultiEngineTranslator {
  return new MultiEngineTranslator({
    engines: config?.engines || [GoogleFreeTranslateNew, GoogleFreeTranslate],
    targetLang,
    sourceLang: config?.sourceLang || 'auto',
    useMultipleEngines: config?.useMultipleEngines ?? true,
    mergeStrategy: config?.mergeStrategy || 'first',
    config: config?.config,
  });
}
