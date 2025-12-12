import { useState } from 'react';
import { toast } from 'sonner';
import {
  createTranslator,
  MultiEngineTranslator,
} from '@/translation/translator';
import { BUILTIN_ENGINES, FREE_ENGINES } from '@/translation/engines';
import { translationCache } from '@/translation/cache';

export interface Language {
  code: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-CN', name: '中文 (简体)' },
  { code: 'zh-TW', name: '中文 (繁體)' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
];

/**
 * Translate text using multi-engine translation system
 */
async function translateText(
  text: string,
  targetLang: string,
  translator: MultiEngineTranslator,
): Promise<string> {
  if (!text.trim()) {
    return text;
  }

  try {
    // Use HTML translation if the text contains HTML tags
    const hasHtml = /<[a-z][\s\S]*>/i.test(text);

    if (hasHtml) {
      return await translator.translateHtml(text);
    } else {
      return await translator.translate(text);
    }
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

const getAutoTranslateSetting = (): boolean => {
  // Always return true - auto-translate is always enabled
  return true;
};

const getTargetLanguageSetting = (): string => {
  if (typeof window === 'undefined') return 'es';
  return localStorage.getItem('lnreader_target_language') || 'es';
};

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>(
    getTargetLanguageSetting(),
  );
  const [isTranslated, setIsTranslated] = useState(false);
  const [useMultipleEngines, setUseMultipleEngines] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(getAutoTranslateSetting());
  const [cacheStats, setCacheStats] = useState(translationCache.getStats());

  // Create translator instance
  const translator = createTranslator(targetLanguage, {
    engines: useMultipleEngines
      ? Array.from(BUILTIN_ENGINES) // Use all available engines
      : [BUILTIN_ENGINES[0]], // Use only first engine
    useMultipleEngines,
    sourceLang: 'auto',
  });

  const translate = async (
    text: string,
    lang: string = targetLanguage,
    silent: boolean = false,
  ) => {
    if (!text.trim()) {
      if (!silent) toast.error('No hay texto para traducir');
      return;
    }

    setIsTranslating(true);
    setTargetLanguage(lang);

    // Save language preference
    localStorage.setItem('lnreader_target_language', lang);

    // Update translator with new language
    translator.setTargetLang(lang);

    try {
      if (!silent) {
        toast.info('Traduciendo capítulo con múltiples motores...');
      }
      const result = await translateText(text, lang, translator);
      setTranslatedText(result);
      setIsTranslated(true);
      if (!silent) {
        toast.success(
          `Capítulo traducido exitosamente usando ${useMultipleEngines ? 'múltiples motores' : translator.getEngines()[0].name}`,
        );
      }
    } catch (error) {
      console.error('Error translating:', error);
      if (!silent) {
        toast.error('Error al traducir el capítulo. Intenta nuevamente.');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const setAutoTranslateEnabled = (enabled: boolean) => {
    setAutoTranslate(enabled);
    localStorage.setItem('lnreader_auto_translate', enabled.toString());
  };

  const resetTranslation = () => {
    setTranslatedText(null);
    setIsTranslated(false);
  };

  const clearCache = () => {
    translationCache.clear();
    setCacheStats(translationCache.getStats());
    toast.success('Caché de traducciones limpiado');
  };

  const refreshCacheStats = () => {
    setCacheStats(translationCache.getStats());
  };

  return {
    translate,
    isTranslating,
    translatedText,
    targetLanguage,
    setTargetLanguage,
    isTranslated,
    resetTranslation,
    useMultipleEngines,
    setUseMultipleEngines,
    autoTranslate,
    setAutoTranslate: setAutoTranslateEnabled,
    cacheStats,
    clearCache,
    refreshCacheStats,
    SUPPORTED_LANGUAGES,
    availableEngines: translator.getEngines().map(e => ({
      name: e.name,
      alias: e.alias,
      free: e.free,
    })),
  };
}
