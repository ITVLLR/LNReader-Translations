import { ChatGPTranslate } from './openai';

/**
 * Azure ChatGPT Translation Engine
 * Requires Azure OpenAI API key and endpoint configuration
 */

export class AzureChatGPTTranslate extends ChatGPTranslate {
  name = 'ChatGPT(Azure)';
  alias = 'ChatGPT (Azure)';
  endpoint =
    'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}';

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'api-key': this.currentApiKey || '',
    };
  }

  protected getBody(text: string): Record<string, any> {
    const body = super.getBody(text);
    // Azure uses api-key instead of Authorization header
    return body;
  }
}
