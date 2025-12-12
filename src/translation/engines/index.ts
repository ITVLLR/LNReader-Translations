/**
 * Export all translation engines
 */

export {
  BaseEngine,
  type TranslationConfig,
  type TranslationResult,
} from './base';
export { GoogleFreeTranslate, GoogleFreeTranslateNew } from './google';
export { DeepLFreeTranslate, DeepLProTranslate } from './deepl';
export { ChatGPTranslate } from './openai';
export { MicrosoftTranslate } from './microsoft';
export { ClaudeTranslate } from './anthropic';
export { BaiduTranslate } from './baidu';
export { YoudaoTranslate } from './youdao';
export { DeepseekTranslate } from './deepseek';
export { GeminiTranslate } from './gemini';
export { MicrosoftEdgeTranslate } from './microsoft-edge';
export { AzureChatGPTTranslate } from './azure-chatgpt';

import { GoogleFreeTranslate, GoogleFreeTranslateNew } from './google';
import { DeepLFreeTranslate, DeepLProTranslate } from './deepl';
import { ChatGPTranslate } from './openai';
import { MicrosoftTranslate } from './microsoft';
import { ClaudeTranslate } from './anthropic';
import { BaiduTranslate } from './baidu';
import { YoudaoTranslate } from './youdao';
import { DeepseekTranslate } from './deepseek';
import { GeminiTranslate } from './gemini';
import { MicrosoftEdgeTranslate } from './microsoft-edge';
import { AzureChatGPTTranslate } from './azure-chatgpt';

// List of all available engines (free engines first)
export const BUILTIN_ENGINES = [
  GoogleFreeTranslate,
  GoogleFreeTranslateNew,
  MicrosoftEdgeTranslate,
  DeepLFreeTranslate,
  DeepLProTranslate,
  ChatGPTranslate,
  AzureChatGPTTranslate,
  GeminiTranslate,
  ClaudeTranslate,
  DeepseekTranslate,
  MicrosoftTranslate,
  YoudaoTranslate,
  BaiduTranslate,
] as const;

export type EngineClass = (typeof BUILTIN_ENGINES)[number];

// Free engines (don't require API key)
export const FREE_ENGINES = [
  GoogleFreeTranslate,
  GoogleFreeTranslateNew,
  MicrosoftEdgeTranslate,
  DeepLFreeTranslate,
] as const;
