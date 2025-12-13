import { BaseEngine } from './base';
import { MICROSOFT_LANGUAGES } from './microsoft';
import { userAgentRotator } from '../utils/user-agents';

/**
 * Microsoft Edge Translator (Free)
 * No API key required
 */

export class MicrosoftEdgeTranslate extends BaseEngine {
  name = 'MicrosoftEdge(Free)';
  alias = 'Microsoft Edge (Free)';
  free = true;
  needApiKey = false;
  endpoint = 'https://api-edge.cognitive.microsofttranslator.com/translate';
  supportHtml = true;

  langCodes = {
    source: { 'Auto detect': 'auto', ...MICROSOFT_LANGUAGES },
    target: MICROSOFT_LANGUAGES,
  };

  private accessInfo: { Token: string; Expire: Date } | null = null;

  private async getAppKey(): Promise<string> {
    const now = new Date();
    if (!this.accessInfo || now > this.accessInfo.Expire) {
      const authUrl = 'https://edge.microsoft.com/translate/auth';
      const response = await fetch(authUrl, { method: 'GET' });
      const token = await response.text();
      this.accessInfo = this.parseJwt(token);
    }
    return this.accessInfo.Token;
  }

  private parseJwt(token: string): { Token: string; Expire: Date } {
    const parts = token.split('.');
    if (parts.length <= 1) {
      throw new Error('Failed to get APP key due to an invalid Token.');
    }

    const base64Url = parts[1];
    if (!base64Url) {
      throw new Error('Failed to get APP key due to an invalid Base64 URL.');
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64 + '===');
    const parsed = JSON.parse(jsonPayload);
    const expiredDate = new Date(parsed.exp * 1000);

    return { Token: token, Expire: expiredDate };
  }

  protected getEndpoint(): string {
    const params = new URLSearchParams({
      to: this.getTargetCode(),
      'api-version': '3.0',
      includeSentenceLength: 'true',
    });

    if (this.getSourceCode() !== 'auto') {
      params.append('from', this.getSourceCode());
    }

    return `${this.endpoint}?${params.toString()}`;
  }

  protected getHeaders(): Promise<Record<string, string>> {
    // Use rotating User-Agents to simulate different devices
    const rotatedHeaders = userAgentRotator.getNextHeaders();

    return this.getAppKey().then(token => ({
      ...rotatedHeaders,
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
    }));
  }

  protected getBody(text: string): string {
    return JSON.stringify([{ text }]);
  }

  async translate(text: string): Promise<string> {
    const endpoint = this.getEndpoint();
    const headers = await this.getHeaders();
    const body = this.getBody(text);

    const response = await this.request(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();
    return data[0]?.translations?.[0]?.text || text;
  }
}
