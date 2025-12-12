import { BaseEngine } from './base';

/**
 * Microsoft Translator Engine
 * Requires API key
 */

export const MICROSOFT_LANGUAGES: Record<string, string> = {
  'Afrikaans': 'af',
  'Arabic': 'ar',
  'Bangla': 'bn',
  'Bosnian': 'bs',
  'Bulgarian': 'bg',
  'Cantonese (Traditional)': 'yue',
  'Catalan': 'ca',
  'Chinese (Simplified)': 'zh-Hans',
  'Chinese (Traditional)': 'zh-Hant',
  'Croatian': 'hr',
  'Czech': 'cs',
  'Danish': 'da',
  'Dutch': 'nl',
  'English': 'en',
  'Estonian': 'et',
  'Fijian': 'fj',
  'Filipino': 'fil',
  'Finnish': 'fi',
  'French': 'fr',
  'German': 'de',
  'Greek': 'el',
  'Gujarati': 'gu',
  'Hebrew': 'he',
  'Hindi': 'hi',
  'Hmong Daw': 'mww',
  'Hungarian': 'hu',
  'Icelandic': 'is',
  'Indonesian': 'id',
  'Irish': 'ga',
  'Italian': 'it',
  'Japanese': 'ja',
  'Kannada': 'kn',
  'Kazakh': 'kk',
  'Klingon': 'tlh',
  'Korean': 'ko',
  'Kurdish (Central)': 'ku',
  'Kurdish (Northern)': 'kmr',
  'Lao': 'lo',
  'Latvian': 'lv',
  'Lithuanian': 'lt',
  'Malagasy': 'mg',
  'Malay': 'ms',
  'Malayalam': 'ml',
  'Maltese': 'mt',
  'Maori': 'mi',
  'Marathi': 'mr',
  'Myanmar': 'my',
  'Norwegian': 'nb',
  'Pashto': 'ps',
  'Persian': 'fa',
  'Polish': 'pl',
  'Portuguese': 'pt',
  'Punjabi': 'pa',
  'Queretaro Otomi': 'otq',
  'Romanian': 'ro',
  'Russian': 'ru',
  'Samoan': 'sm',
  'Serbian': 'sr',
  'Slovak': 'sk',
  'Slovenian': 'sl',
  'Spanish': 'es',
  'Swahili': 'sw',
  'Swedish': 'sv',
  'Tahitian': 'ty',
  'Tamil': 'ta',
  'Telugu': 'te',
  'Thai': 'th',
  'Tongan': 'to',
  'Turkish': 'tr',
  'Ukrainian': 'uk',
  'Urdu': 'ur',
  'Vietnamese': 'vi',
  'Welsh': 'cy',
  'Yucatec Maya': 'yua',
};

export class MicrosoftTranslate extends BaseEngine {
  name = 'Microsoft';
  alias = 'Microsoft Translator';
  free = false;
  needApiKey = true;
  apiKeyErrors = ['401', '403', '400'];
  endpoint = 'https://api.cognitive.microsofttranslator.com/translate';

  langCodes = {
    source: { 'Auto detect': 'auto', ...MICROSOFT_LANGUAGES },
    target: MICROSOFT_LANGUAGES,
  };

  protected getHeaders(): Record<string, string> {
    return {
      'Ocp-Apim-Subscription-Key': this.currentApiKey || '',
      'Ocp-Apim-Subscription-Region': this.config.region || 'global',
      'Content-Type': 'application/json',
    };
  }

  protected getBody(text: string): any[] {
    return [
      {
        text: text,
      },
    ];
  }

  async translate(text: string): Promise<string> {
    if (!this.currentApiKey) {
      throw new Error('Microsoft Translator requires an API key');
    }

    const sourceLang =
      this.getSourceCode() === 'auto' ? null : this.getSourceCode();
    const targetLang = this.getTargetCode();

    const params = new URLSearchParams({
      'api-version': '3.0',
      to: targetLang,
      ...(sourceLang && { from: sourceLang }),
    });

    const endpoint = `${this.getEndpoint()}?${params.toString()}`;
    const headers = this.getHeaders();
    const body = JSON.stringify(this.getBody(text));

    const response = await this.request(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();
    return data[0]?.translations?.[0]?.text || text;
  }
}
