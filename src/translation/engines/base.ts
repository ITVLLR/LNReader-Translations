/**
 * Base class for all translation engines
 * Based on Ebook Translator's engine system
 */

import { userAgentRotator } from '../utils/user-agents';

export interface TranslationConfig {
  apiKey?: string;
  apiKeys?: string[];
  proxyType?: 'http' | 'socks5';
  proxyHost?: string;
  proxyPort?: number;
  requestTimeout?: number;
  requestAttempt?: number;
  requestInterval?: number;
  concurrencyLimit?: number;
  maxErrorCount?: number;
}

export interface Language {
  code: string;
  name: string;
}

export interface TranslationResult {
  text: string;
  engine: string;
  confidence?: number;
}

export abstract class BaseEngine {
  abstract name: string;
  abstract alias: string;
  abstract free: boolean;

  abstract langCodes: {
    source: Record<string, string>;
    target: Record<string, string>;
  };

  protected config: TranslationConfig = {};
  protected sourceLang: string = 'auto';
  protected targetLang: string = 'en';

  protected apiKeys: string[] = [];
  protected badApiKeys: string[] = [];
  protected currentApiKey?: string;

  protected needApiKey: boolean = false;
  protected apiKeyErrors: string[] = ['401', '403'];
  protected requestTimeout: number = 10.0;
  protected requestAttempt: number = 3;
  protected requestInterval: number = 0.0;
  protected maxErrorCount: number = 10;
  protected concurrencyLimit: number = 0;

  protected supportHtml: boolean = false;
  protected endpoint?: string;
  protected method: 'GET' | 'POST' = 'POST';

  constructor(config: TranslationConfig = {}) {
    this.config = config;
    this.apiKeys = config.apiKeys || [];
    this.currentApiKey = this.getApiKey();
    this.requestTimeout = config.requestTimeout || 10.0;
    this.requestAttempt = config.requestAttempt || 3;
    this.requestInterval = config.requestInterval || 0.0;
    this.maxErrorCount = config.maxErrorCount || 10;
    this.concurrencyLimit = config.concurrencyLimit || 0;
  }

  setSourceLang(lang: string): void {
    this.sourceLang = lang;
  }

  setTargetLang(lang: string): void {
    this.targetLang = lang;
  }

  getSourceCode(): string {
    if (this.sourceLang === 'auto') return 'auto';
    return this.langCodes.source[this.sourceLang] || this.sourceLang;
  }

  getTargetCode(): string {
    return this.langCodes.target[this.targetLang] || this.targetLang;
  }

  protected getApiKey(): string | undefined {
    if (this.needApiKey && this.apiKeys.length > 0) {
      return this.apiKeys[0];
    }
    return this.config.apiKey;
  }

  protected swapApiKey(): boolean {
    if (this.currentApiKey && !this.badApiKeys.includes(this.currentApiKey)) {
      this.badApiKeys.push(this.currentApiKey);
    }
    if (this.apiKeys.length > 0) {
      this.apiKeys.shift();
      this.currentApiKey = this.apiKeys[0] || this.config.apiKey;
      return true;
    }
    return false;
  }

  protected needSwapApiKey(errorMessage: string): boolean {
    if (!this.needApiKey || this.apiKeys.length === 0) {
      return false;
    }
    return this.apiKeyErrors.some(error => errorMessage.includes(error));
  }

  /**
   * Main translation method - must be implemented by each engine
   */
  abstract translate(text: string): Promise<string>;

  /**
   * Get endpoint URL for the translation API
   */
  protected getEndpoint(): string {
    if (!this.endpoint) {
      throw new Error(`Endpoint not defined for engine ${this.name}`);
    }
    return this.endpoint;
  }

  /**
   * Get headers for the API request
   * Uses rotating User-Agents ONLY for translation requests to avoid rate limits
   * This ensures User-Agents are not used for novel searches or other plugin operations
   */
  protected getHeaders(): Record<string, string> {
    // Only use rotating User-Agents for translation engines
    // This method is ONLY called by translation engines, not by plugin fetchApi calls
    const baseHeaders = userAgentRotator.getNextHeaders();

    return {
      ...baseHeaders,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get request body for the API
   */
  protected getBody(text: string): string | Record<string, any> {
    return { text };
  }

  /**
   * Parse the API response
   */
  protected getResult(response: any): string {
    if (typeof response === 'string') {
      return response;
    }
    throw new Error('Invalid response format');
  }

  /**
   * Make HTTP request with retry logic
   */
  protected async request(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.requestAttempt; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(this.requestTimeout * 1000),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const errorMessage = `HTTP ${response.status}: ${errorText}`;

          if (this.needSwapApiKey(errorMessage) && this.swapApiKey()) {
            continue; // Retry with new API key
          }

          throw new Error(errorMessage);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.requestAttempt - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, this.requestInterval * 1000),
          );
        }
      }
    }

    throw lastError || new Error('Translation request failed');
  }
}
