import { BaseEngine } from './base';

/**
 * OpenAI ChatGPT Translation Engine
 * Requires API key
 */

const OPENAI_LANGUAGES: Record<string, string> = {
  'Auto detect': 'auto',
  'Afrikaans': 'af',
  'Albanian': 'sq',
  'Arabic': 'ar',
  'Armenian': 'hy',
  'Azerbaijani': 'az',
  'Basque': 'eu',
  'Belarusian': 'be',
  'Bengali': 'bn',
  'Bosnian': 'bs',
  'Bulgarian': 'bg',
  'Catalan': 'ca',
  'Chinese (Simplified)': 'zh',
  'Chinese (Traditional)': 'zh-TW',
  'Croatian': 'hr',
  'Czech': 'cs',
  'Danish': 'da',
  'Dutch': 'nl',
  'English': 'en',
  'Estonian': 'et',
  'Finnish': 'fi',
  'French': 'fr',
  'Galician': 'gl',
  'Georgian': 'ka',
  'German': 'de',
  'Greek': 'el',
  'Gujarati': 'gu',
  'Hebrew': 'he',
  'Hindi': 'hi',
  'Hungarian': 'hu',
  'Icelandic': 'is',
  'Indonesian': 'id',
  'Irish': 'ga',
  'Italian': 'it',
  'Japanese': 'ja',
  'Kannada': 'kn',
  'Kazakh': 'kk',
  'Korean': 'ko',
  'Latvian': 'lv',
  'Lithuanian': 'lt',
  'Macedonian': 'mk',
  'Malay': 'ms',
  'Marathi': 'mr',
  'Norwegian': 'no',
  'Polish': 'pl',
  'Portuguese': 'pt',
  'Romanian': 'ro',
  'Russian': 'ru',
  'Serbian': 'sr',
  'Slovak': 'sk',
  'Slovenian': 'sl',
  'Spanish': 'es',
  'Swahili': 'sw',
  'Swedish': 'sv',
  'Tagalog': 'tl',
  'Tamil': 'ta',
  'Telugu': 'te',
  'Thai': 'th',
  'Turkish': 'tr',
  'Ukrainian': 'uk',
  'Urdu': 'ur',
  'Vietnamese': 'vi',
  'Welsh': 'cy',
};

export class ChatGPTranslate extends BaseEngine {
  name = 'ChatGPT';
  alias = 'ChatGPT (OpenAI)';
  free = false;
  needApiKey = true;
  apiKeyErrors = ['401', '429', 'insufficient_quota'];
  endpoint = 'https://api.openai.com/v1/chat/completions';
  requestTimeout = 30.0;
  concurrencyLimit = 1;
  requestInterval = 1.0;

  langCodes = {
    source: OPENAI_LANGUAGES,
    target: OPENAI_LANGUAGES,
  };

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.currentApiKey || ''}`,
    };
  }

  protected getBody(text: string): Record<string, any> {
    const sourceLang =
      this.getSourceCode() === 'auto'
        ? 'the detected language'
        : this.sourceLang;
    const targetLang = this.targetLang;

    return {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Only provide the translation, without any explanations or additional text. Preserve HTML tags and formatting if present.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    };
  }

  async translate(text: string): Promise<string> {
    if (!this.currentApiKey) {
      throw new Error('ChatGPT requires an API key');
    }

    const endpoint = this.getEndpoint();
    const headers = this.getHeaders();
    const body = JSON.stringify(this.getBody(text));

    const response = await this.request(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  }
}
