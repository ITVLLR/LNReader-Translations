import { BaseEngine } from './base';

/**
 * Youdao Translate Engine
 * Requires API key in format: appid|appsecret
 */

const YOUDAO_LANGUAGES: Record<string, string> = {
  'Auto detect': 'auto',
  'Chinese (Simplified)': 'zh-CHS',
  'Chinese (Traditional)': 'zh-CHT',
  'English': 'en',
  'Japanese': 'ja',
  'Korean': 'ko',
  'French': 'fr',
  'Spanish': 'es',
  'Portuguese': 'pt',
  'Italian': 'it',
  'Russian': 'ru',
  'Vietnamese': 'vi',
  'German': 'de',
  'Arabic': 'ar',
  'Indonesian': 'id',
  'Afrikaans': 'af',
  'Bosnian': 'bs',
  'Bulgarian': 'bg',
  'Cantonese': 'yue',
  'Croatian': 'hr',
  'Czech': 'cs',
  'Danish': 'da',
  'Dutch': 'nl',
  'Estonian': 'et',
  'Fijian': 'fj',
  'Finnish': 'fi',
  'Greek': 'el',
  'Haitian Creole': 'ht',
  'Hebrew': 'he',
  'Hindi': 'hi',
  'Hungarian': 'hu',
  'Icelandic': 'is',
  'Malay': 'ms',
  'Maltese': 'mt',
  'Norwegian': 'no',
  'Polish': 'pl',
  'Romanian': 'ro',
  'Serbian': 'sr',
  'Slovak': 'sk',
  'Slovenian': 'sl',
  'Swahili': 'sw',
  'Swedish': 'sv',
  'Tahitian': 'ty',
  'Thai': 'th',
  'Tongan': 'to',
  'Turkish': 'tr',
  'Ukrainian': 'uk',
  'Urdu': 'ur',
  'Welsh': 'cy',
};

export class YoudaoTranslate extends BaseEngine {
  name = 'Youdao';
  alias = 'Youdao';
  free = false;
  needApiKey = true;
  apiKeyErrors = ['401'];
  apiKeyPattern = /^[^\s:\|]+?[:\|][^\s:\|]+$/;
  endpoint = 'https://openapi.youdao.com/api';

  langCodes = {
    source: YOUDAO_LANGUAGES,
    target: YOUDAO_LANGUAGES,
  };

  private async encrypt(signStr: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(signStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private truncate(text: string): string {
    if (!text) return '';
    const size = text.length;
    return size <= 20
      ? text
      : text.substring(0, 10) + size + text.substring(size - 10);
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  protected async getBody(text: string): Promise<string> {
    if (!this.currentApiKey || !this.apiKeyPattern.test(this.currentApiKey)) {
      throw new Error('Youdao requires API key in format: appid|appsecret');
    }

    const [appKey, appSecret] = this.currentApiKey.split(/[:\|]/);
    const curtime = Math.floor(Date.now() / 1000).toString();
    const salt = crypto.randomUUID();
    const signStr = appKey + this.truncate(text) + salt + curtime + appSecret;
    const sign = await this.encrypt(signStr);

    const params = new URLSearchParams({
      from: this.getSourceCode() === 'auto' ? 'auto' : this.getSourceCode(),
      to: this.getTargetCode(),
      signType: 'v3',
      curtime: curtime,
      appKey: appKey,
      q: text,
      salt: salt,
      sign: sign,
    });

    return params.toString();
  }

  async translate(text: string): Promise<string> {
    if (!this.currentApiKey) {
      throw new Error('Youdao requires an API key');
    }

    const endpoint = this.getEndpoint();
    const headers = this.getHeaders();
    const body = await this.getBody(text);

    const response = await this.request(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();
    return data.translation?.[0] || text;
  }
}
