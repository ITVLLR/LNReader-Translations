import { BaseEngine, Language } from './base';
import { userAgentRotator } from '../utils/user-agents';

/**
 * Google Translate Engine (Free)
 * Multiple implementations for better reliability
 */

export const GOOGLE_LANGUAGES: Record<string, string> = {
  'Auto detect': 'auto',
  'Afrikaans': 'af',
  'Albanian': 'sq',
  'Amharic': 'am',
  'Arabic': 'ar',
  'Armenian': 'hy',
  'Azerbaijani': 'az',
  'Basque': 'eu',
  'Belarusian': 'be',
  'Bengali': 'bn',
  'Bosnian': 'bs',
  'Bulgarian': 'bg',
  'Catalan': 'ca',
  'Cebuano': 'ceb',
  'Chinese (Simplified)': 'zh-CN',
  'Chinese (Traditional)': 'zh-TW',
  'Corsican': 'co',
  'Croatian': 'hr',
  'Czech': 'cs',
  'Danish': 'da',
  'Dutch': 'nl',
  'English': 'en',
  'Esperanto': 'eo',
  'Estonian': 'et',
  'Finnish': 'fi',
  'French': 'fr',
  'Galician': 'gl',
  'Georgian': 'ka',
  'German': 'de',
  'Greek': 'el',
  'Gujarati': 'gu',
  'Haitian Creole': 'ht',
  'Hausa': 'ha',
  'Hawaiian': 'haw',
  'Hebrew': 'he',
  'Hindi': 'hi',
  'Hmong': 'hmn',
  'Hungarian': 'hu',
  'Icelandic': 'is',
  'Igbo': 'ig',
  'Indonesian': 'id',
  'Irish': 'ga',
  'Italian': 'it',
  'Japanese': 'ja',
  'Javanese': 'jw',
  'Kannada': 'kn',
  'Kazakh': 'kk',
  'Khmer': 'km',
  'Korean': 'ko',
  'Kurdish': 'ku',
  'Kyrgyz': 'ky',
  'Lao': 'lo',
  'Latin': 'la',
  'Latvian': 'lv',
  'Lithuanian': 'lt',
  'Luxembourgish': 'lb',
  'Macedonian': 'mk',
  'Malagasy': 'mg',
  'Malay': 'ms',
  'Malayalam': 'ml',
  'Maltese': 'mt',
  'Maori': 'mi',
  'Marathi': 'mr',
  'Mongolian': 'mn',
  'Myanmar (Burmese)': 'my',
  'Nepali': 'ne',
  'Norwegian': 'no',
  'Nyanja (Chichewa)': 'ny',
  'Pashto': 'ps',
  'Persian': 'fa',
  'Polish': 'pl',
  'Portuguese': 'pt',
  'Punjabi': 'pa',
  'Romanian': 'ro',
  'Russian': 'ru',
  'Samoan': 'sm',
  'Scots Gaelic': 'gd',
  'Serbian': 'sr',
  'Sesotho': 'st',
  'Shona': 'sn',
  'Sindhi': 'sd',
  'Sinhala (Sinhalese)': 'si',
  'Slovak': 'sk',
  'Slovenian': 'sl',
  'Somali': 'so',
  'Spanish': 'es',
  'Sundanese': 'su',
  'Swahili': 'sw',
  'Swedish': 'sv',
  'Tagalog (Filipino)': 'tl',
  'Tajik': 'tg',
  'Tamil': 'ta',
  'Telugu': 'te',
  'Thai': 'th',
  'Turkish': 'tr',
  'Ukrainian': 'uk',
  'Urdu': 'ur',
  'Uzbek': 'uz',
  'Vietnamese': 'vi',
  'Welsh': 'cy',
  'Xhosa': 'xh',
  'Yiddish': 'yi',
  'Yoruba': 'yo',
  'Zulu': 'zu',
};

export class GoogleFreeTranslate extends BaseEngine {
  name = 'Google(Free)';
  alias = 'Google (Free)';
  free = true;
  needApiKey = false;
  endpoint = 'https://translate.googleapis.com/translate_a/single';
  method: 'GET' | 'POST' = 'GET';

  langCodes = {
    source: GOOGLE_LANGUAGES,
    target: GOOGLE_LANGUAGES,
  };

  protected getHeaders(): Record<string, string> {
    // Use rotating User-Agents to simulate different devices
    const rotatedHeaders = userAgentRotator.getNextHeaders();

    return {
      ...rotatedHeaders,
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
    };
  }

  protected getBody(text: string): Record<string, string> {
    // Use GET for shorter texts, POST for longer ones
    this.method = text.length <= 1800 ? 'GET' : 'POST';

    return {
      client: 'gtx',
      sl: this.getSourceCode(),
      tl: this.getTargetCode(),
      dt: 't',
      dj: '1',
      q: text,
    };
  }

  async translate(text: string): Promise<string> {
    const endpoint = this.getEndpoint();
    const headers = this.getHeaders();
    const body = this.getBody(text);

    let url = endpoint;
    if (this.method === 'GET') {
      const params = new URLSearchParams(body as Record<string, string>);
      url = `${endpoint}?${params.toString()}`;
    }

    const response = await this.request(url, {
      method: this.method,
      headers:
        this.method === 'POST'
          ? { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }
          : headers,
      body:
        this.method === 'POST'
          ? new URLSearchParams(body as Record<string, string>).toString()
          : undefined,
    });

    const data = await response.json();

    // Parse Google Translate response format
    if (data.sentences) {
      return data.sentences.map((s: any) => s.trans || '').join('');
    }

    if (Array.isArray(data) && data[0]) {
      return data[0].map((item: any[]) => item[0] || '').join('');
    }

    throw new Error('Unexpected response format from Google Translate');
  }
}

export class GoogleFreeTranslateNew extends BaseEngine {
  name = 'Google(Free)New';
  alias = 'Google (Free) - New';
  free = true;
  needApiKey = false;
  endpoint = 'https://translate-pa.googleapis.com/v1/translate';
  method: 'GET' | 'POST' = 'GET';

  langCodes = {
    source: GOOGLE_LANGUAGES,
    target: GOOGLE_LANGUAGES,
  };

  protected getHeaders(): Record<string, string> {
    // Use rotating User-Agents to simulate different devices
    const rotatedHeaders = userAgentRotator.getNextHeaders();

    return {
      ...rotatedHeaders,
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  protected getBody(text: string): Record<string, string> {
    return {
      'params.client': 'gtx',
      'query.source_language': this.getSourceCode(),
      'query.target_language': this.getTargetCode(),
      'query.display_language': 'en-US',
      'data_types': 'TRANSLATION',
      key: 'AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA',
      'query.text': text,
    };
  }

  async translate(text: string): Promise<string> {
    const endpoint = this.getEndpoint();
    const headers = this.getHeaders();
    const body = this.getBody(text);

    const params = new URLSearchParams(body);
    const url = `${endpoint}?${params.toString()}`;

    const response = await this.request(url, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    return data.translation || text;
  }
}
