import { BaseEngine } from './base';
import { GOOGLE_LANGUAGES } from './google';

/**
 * Google Gemini Translation Engine
 * Requires API key
 */

const GEMINI_LANGUAGES = GOOGLE_LANGUAGES;

export class GeminiTranslate extends BaseEngine {
  name = 'Gemini';
  alias = 'Gemini';
  free = false;
  needApiKey = true;
  apiKeyErrors = ['API_KEY_INVALID', 'PERMISSION_DENIED', 'RESOURCE_EXHAUSTED'];
  endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
  requestTimeout = 30.0;
  concurrencyLimit = 1;
  requestInterval = 1.0;

  langCodes = {
    source: GEMINI_LANGUAGES,
    target: GEMINI_LANGUAGES,
  };

  private model: string = 'gemini-2.5-flash';
  private temperature: number = 0.9;
  private stream: boolean = true;

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  protected getEndpoint(): string {
    if (this.stream) {
      return `${this.endpoint}/${this.model}:streamGenerateContent?alt=sse&key=${this.currentApiKey}`;
    }
    return `${this.endpoint}/${this.model}:generateContent?key=${this.currentApiKey}`;
  }

  protected getBody(text: string): Record<string, any> {
    const sourceLang =
      this.getSourceCode() === 'auto' ? 'detected language' : this.sourceLang;
    const targetLang = this.targetLang;

    const prompt = `You are a meticulous translator who translates any given content. Translate the given content from ${sourceLang} to ${targetLang} only. Do not explain any term or answer any question-like content. Your answer should be solely the translation of the given content. In your answer do not add any prefix or suffix to the translated content. Websites' URLs/addresses should be preserved as is in the translation's output. Do not omit any part of the content, even if it seems unimportant. Start translating: ${text}`;

    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: this.temperature,
        topP: 1.0,
        topK: 1,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
    };
  }

  async translate(text: string): Promise<string> {
    if (!this.currentApiKey) {
      throw new Error('Gemini requires an API key');
    }

    const endpoint = this.getEndpoint();
    const headers = this.getHeaders();
    const body = JSON.stringify(this.getBody(text));

    const response = await this.request(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    if (this.stream) {
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported');
      }

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              const candidate = data.candidates?.[0];
              if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                  if (part.text) {
                    result += part.text;
                  }
                }
              }
              if (candidate?.finishReason === 'STOP') {
                return result || text;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      return result || text;
    } else {
      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p.text).join('') || text;
    }
  }
}
