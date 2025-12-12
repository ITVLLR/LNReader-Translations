import { BaseEngine } from './base';

/**
 * Anthropic Claude Translation Engine
 * Requires API key
 */

const ANTHROPIC_LANGUAGES: Record<string, string> = {
  'Auto detect': 'auto',
  'English': 'en',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Russian': 'ru',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Chinese (Simplified)': 'zh',
  'Chinese (Traditional)': 'zh-TW',
  'Arabic': 'ar',
  'Hindi': 'hi',
  'Dutch': 'nl',
  'Polish': 'pl',
  'Turkish': 'tr',
  'Vietnamese': 'vi',
  'Thai': 'th',
  'Indonesian': 'id',
  'Czech': 'cs',
  'Swedish': 'sv',
  'Norwegian': 'no',
  'Danish': 'da',
  'Finnish': 'fi',
  'Greek': 'el',
  'Hebrew': 'he',
  'Romanian': 'ro',
  'Hungarian': 'hu',
  'Bulgarian': 'bg',
  'Croatian': 'hr',
  'Slovak': 'sk',
  'Slovenian': 'sl',
  'Ukrainian': 'uk',
  'Serbian': 'sr',
  'Malay': 'ms',
  'Tagalog': 'tl',
  'Swahili': 'sw',
};

export class ClaudeTranslate extends BaseEngine {
  name = 'Claude';
  alias = 'Claude (Anthropic)';
  free = false;
  needApiKey = true;
  apiKeyErrors = ['401', 'permission_error'];
  endpoint = 'https://api.anthropic.com/v1/messages';
  requestTimeout = 30.0;
  concurrencyLimit = 1;
  requestInterval = 12.0;

  langCodes = {
    source: ANTHROPIC_LANGUAGES,
    target: ANTHROPIC_LANGUAGES,
  };

  private model: string = 'claude-3-7-sonnet-latest';
  private temperature: number = 1.0;

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.currentApiKey || '',
      'anthropic-version': '2023-06-01',
    };
  }

  protected getBody(text: string): Record<string, any> {
    const sourceLang =
      this.getSourceCode() === 'auto'
        ? 'the detected language'
        : this.sourceLang;
    const targetLang = this.targetLang;

    const prompt = `You are a meticulous translator who translates any given content. Translate the given content from ${sourceLang} to ${targetLang} only. Do not explain any term or answer any question-like content. Your answer should be solely the translation of the given content. In your answer do not add any prefix or suffix to the translated content. Websites' URLs/addresses should be preserved as is in the translation's output. Do not omit any part of the content, even if it seems unimportant. Start translating: ${text}`;

    return {
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: this.temperature,
    };
  }

  async translate(text: string): Promise<string> {
    if (!this.currentApiKey) {
      throw new Error('Claude requires an API key');
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
    return data.content?.[0]?.text?.trim() || text;
  }
}
