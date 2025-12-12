import { BaseEngine } from './base';
import { userAgentRotator } from '../utils/user-agents';

/**
 * DeepL Translation Engine
 * Requires API key for DeepL Pro
 */

const DEEPL_LANGUAGES: Record<string, string> = {
  'Bulgarian': 'BG',
  'Czech': 'CS',
  'Danish': 'DA',
  'German': 'DE',
  'Greek': 'EL',
  'English': 'EN',
  'Spanish': 'ES',
  'Estonian': 'ET',
  'Finnish': 'FI',
  'French': 'FR',
  'Hungarian': 'HU',
  'Indonesian': 'ID',
  'Italian': 'IT',
  'Japanese': 'JA',
  'Korean': 'KO',
  'Lithuanian': 'LT',
  'Latvian': 'LV',
  'Norwegian': 'NB',
  'Dutch': 'NL',
  'Polish': 'PL',
  'Portuguese': 'PT',
  'Romanian': 'RO',
  'Russian': 'RU',
  'Slovak': 'SK',
  'Slovenian': 'SL',
  'Swedish': 'SV',
  'Turkish': 'TR',
  'Ukrainian': 'UK',
  'Chinese (Simplified)': 'ZH',
};

export class DeepLFreeTranslate extends BaseEngine {
  name = 'DeepL(Free)';
  alias = 'DeepL (Free)';
  free = true;
  needApiKey = false;
  endpoint = 'https://api-free.deepl.com/v2/translate';
  supportHtml = true;

  langCodes = {
    source: DEEPL_LANGUAGES,
    target: DEEPL_LANGUAGES,
  };

  protected getHeaders(): Record<string, string> {
    // Use rotating User-Agents to simulate different devices
    const rotatedHeaders = userAgentRotator.getNextHeaders();

    return {
      ...rotatedHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  protected getBody(text: string): string {
    const params = new URLSearchParams({
      auth_key: this.currentApiKey || '',
      text: text,
      target_lang: this.getTargetCode(),
      source_lang: this.getSourceCode() !== 'auto' ? this.getSourceCode() : '',
    });

    return params.toString();
  }

  async translate(text: string): Promise<string> {
    if (!this.currentApiKey && this.needApiKey) {
      throw new Error('DeepL Free requires an API key');
    }

    const endpoint = this.getEndpoint();
    const headers = this.getHeaders();
    const body = this.getBody(text);

    const response = await this.request(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();
    return data.translations?.[0]?.text || text;
  }
}

export class DeepLProTranslate extends BaseEngine {
  name = 'DeepL(Pro)';
  alias = 'DeepL (Pro)';
  free = false;
  needApiKey = true;
  apiKeyErrors = ['403', '456'];
  endpoint = 'https://api.deepl.com/v2/translate';
  supportHtml = true;

  langCodes = {
    source: DEEPL_LANGUAGES,
    target: DEEPL_LANGUAGES,
  };

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `DeepL-Auth-Key ${this.currentApiKey || ''}`,
    };
  }

  protected getBody(text: string): string {
    const params = new URLSearchParams({
      text: text,
      target_lang: this.getTargetCode(),
      source_lang: this.getSourceCode() !== 'auto' ? this.getSourceCode() : '',
    });

    return params.toString();
  }

  async translate(text: string): Promise<string> {
    if (!this.currentApiKey) {
      throw new Error('DeepL Pro requires an API key');
    }

    const endpoint = this.getEndpoint();
    const headers = this.getHeaders();
    const body = this.getBody(text);

    const response = await this.request(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();
    return data.translations?.[0]?.text || text;
  }
}
