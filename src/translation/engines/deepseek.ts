import { ChatGPTranslate } from './openai';

/**
 * DeepSeek Translation Engine
 * Based on OpenAI API but uses DeepSeek endpoint
 * Requires API key
 */

export class DeepseekTranslate extends ChatGPTranslate {
  name = 'DeepSeek';
  alias = 'DeepSeek (Chat)';
  endpoint = 'https://api.deepseek.com/v1/chat/completions';
  temperature = 1.3;
  concurrencyLimit = 0;
  requestInterval = 0.0;

  private models: string[] = ['deepseek-chat', 'deepseek-reasoner'];
  private model: string = 'deepseek-chat';

  protected getBody(text: string): Record<string, any> {
    const body = super.getBody(text);
    body.model = this.model;
    body.temperature = this.temperature;
    return body;
  }
}
