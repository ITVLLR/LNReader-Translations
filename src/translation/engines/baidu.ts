import { BaseEngine } from './base';
import { md5 } from './md5';

/**
 * Baidu Translate Engine
 * Requires API key in format: appid|appkey
 */

const BAIDU_LANGUAGES: Record<string, string> = {
  'Auto detect': 'auto',
  'English': 'en',
  'Chinese (Simplified)': 'zh',
  'Japanese': 'jp',
  'Korean': 'kor',
  'Spanish': 'spa',
  'French': 'fra',
  'Thai': 'th',
  'Arabic': 'ara',
  'Russian': 'ru',
  'Portuguese': 'pt',
  'German': 'de',
  'Italian': 'it',
  'Greek': 'el',
  'Dutch': 'nl',
  'Polish': 'pl',
  'Bulgarian': 'bul',
  'Estonian': 'est',
  'Danish': 'dan',
  'Finnish': 'fin',
  'Czech': 'cs',
  'Romanian': 'rom',
  'Slovenian': 'slo',
  'Swedish': 'swe',
  'Hungarian': 'hu',
  'Vietnamese': 'vie',
};

export class BaiduTranslate extends BaseEngine {
  name = 'Baidu';
  alias = 'Baidu';
  free = false;
  needApiKey = true;
  apiKeyErrors = ['54004'];
  apiKeyPattern = /^[^\s:\|]+?[:\|][^\s:\|]+$/;
  endpoint = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

  langCodes = {
    source: BAIDU_LANGUAGES,
    target: BAIDU_LANGUAGES,
  };

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  protected getBody(text: string): string {
    if (!this.currentApiKey || !this.apiKeyPattern.test(this.currentApiKey)) {
      throw new Error('Baidu requires API key in format: appid|appkey');
    }

    const [appId, appKey] = this.currentApiKey.split(/[:\|]/);
    const salt = Math.floor(Math.random() * 32768) + 32768;
    const signStr = appId + text + salt + appKey;
    const sign = md5(signStr);

    const params = new URLSearchParams({
      appid: appId,
      q: text,
      from: this.getSourceCode() === 'auto' ? 'auto' : this.getSourceCode(),
      to: this.getTargetCode(),
      salt: salt.toString(),
      sign: sign,
    });

    return params.toString();
  }

  async translate(text: string): Promise<string> {
    if (!this.currentApiKey) {
      throw new Error('Baidu requires an API key');
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
    return data.trans_result?.[0]?.dst || text;
  }
}
