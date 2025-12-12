
// === Translation code included ===
/**
 * Translation Library for LNReader Plugins
 * Standalone version that works in compiled plugins for Android
 *
 * Usage in plugin:
 * ```ts
 * import { translateChapter } from '@libs/translation';
 *
 * async parseChapter(chapterPath) {
 *   const html = await fetchChapter(chapterPath);
 *   // Translate automatically to Spanish
 *   return await translateChapter(html, 'es');
 * }
 * ```
 */

// Simple Google Translate implementation (free, no API key needed)
async function translateWithGoogle(
  text,
  targetLang,
  sourceLang= 'auto',
) {
  try {
    // Use Google Translate free API
    const params = new URLSearchParams({
      client: 'gtx',
      sl: sourceLang,
      tl: targetLang,
      dt: 't',
      dj: '1',
      q: text.substring(0, 4500), // Limit text length
    });

    const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();

    // Parse Google Translate response
    if (data.sentences) {
      return data.sentences.map((s) => s.trans || '').join('');
    }

    if (Array.isArray(data) && data[0]) {
      return data[0].map((item[]) => item[0] || '').join('');
    }

    return text;
  } catch (error) {
    console.error('Google Translate error:', error);
    throw error;
  }
}

// Simple Microsoft Edge Translate (free)
async function translateWithMicrosoftEdge(
  text,
  targetLang,
) {
  try {
    // Get auth token
    const authResponse = await fetch(
      'https://edge.microsoft.com/translate/auth',
      {
        method: 'GET',
      },
    );
    const token = await authResponse.text();

    const params = new URLSearchParams({
      to: targetLang,
      'api-version': '3.0',
      includeSentenceLength: 'true',
    });

    const url = `https://api-edge.cognitive.microsofttranslator.com/translate?${params.toString()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify([{ text }]),
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    return data[0]?.translations?.[0]?.text || text;
  } catch (error) {
    console.error('Microsoft Edge Translate error:', error);
    throw error;
  }
}

/**
 * Translate text using multiple free engines
 */
async function translateTextMultiEngine(
  text,
  targetLang,
  sourceLang= 'auto',
) {
  // Try Google first (most reliable)
  try {
    return await translateWithGoogle(text, targetLang, sourceLang);
  } catch (error) {
    console.warn('Google Translate failed, trying Microsoft Edge...', error);
  }

  // Fallback to Microsoft Edge
  try {
    return await translateWithMicrosoftEdge(text, targetLang);
  } catch (error) {
    console.error('All translation engines failed:', error);
    // Return original text if all fail
    return text;
  }
}

/**
 * Extract text from HTML while preserving structure
 */
function extractTextFromHtml(html): { text; structure[] } {
  // Simple HTML parser to extract text nodes
  const textNodes: [] = [];
  const tagStack[] = [];

  // Use regex to extract text (simplified approach)
  const tempDiv =
    typeof document !== 'undefined' ? document.createElement('div') : null;

  if (tempDiv) {
    tempDiv.innerHTML = html;
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent?.trim()) {
        const parent = node.parentElement;
        textNodes.push({
          text: node.textContent,
          tag: parent?.tagName.toLowerCase() || 'p',
        });
      }
    }
  }

  return {
    text: textNodes.map(n => n.text).join(' '),
    structure: textNodes,
  };
}

/**
 * Translate chapter HTML content
 * @param html - HTML content of the chapter
 * @param targetLang - Target language code (e.g., 'es', 'en', 'fr')
 * @param useAllEngines - Whether to use multiple engines (default: true)
 * @returns Translated HTML content
 */
async function translateChapter(
  html,
  targetLang= 'es',
  useAllEngines= true,
) {
  if (!html || !html.trim()) {
    return html;
  }

  try {
    // Check if HTML contains text
    const hasHtml = /<[a-z][\s\S]*>/i.test(html);

    if (!hasHtml) {
      // Plain text, translate directly
      return await translateTextMultiEngine(html, targetLang);
    }

    // For HTML, we need to translate while preserving structure
    // Extract text nodes and translate them
    if (typeof document !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      if (!doc.body) {
        // Fallback if body is not available
        return await translateTextMultiEngine(html, targetLang);
      }

      // Find all text nodes
      const textNodes: Text[] = [];
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);

      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          textNodes.push(node as Text);
        }
      }

      // Optimize: Combine small text nodes to reduce API calls
      // Group consecutive small text nodes together
      const MIN_TEXT_LENGTH = 50; // Minimum characters before translating separately
      const combinedNodes: [] = [];
      let currentGroup = '';
      let currentIndices: number[] = [];

      textNodes.forEach((node, index) => {
        const text = node.textContent || '';
        if (text.trim().length < MIN_TEXT_LENGTH && currentGroup.length < 200) {
          // Combine small nodes
          currentGroup += text;
          currentIndices.push(index);
        } else {
          // Save current group if exists
          if (currentGroup.trim()) {
            combinedNodes.push({
              original: currentGroup,
              indices: currentIndices,
            });
          }
          // Start new group with current node
          currentGroup = text;
          currentIndices = [index];
        }
      });

      // Save last group
      if (currentGroup.trim()) {
        combinedNodes.push({ original: currentGroup, indices: currentIndices });
      }

      // Translate with limited concurrency (process in batches)
      const MAX_CONCURRENT = 3; // Process 3 translations at a time
      const translations: [] = [];

      for (let i = 0; i < combinedNodes.length; i += MAX_CONCURRENT) {
        const batch = combinedNodes.slice(i, i + MAX_CONCURRENT);
        const batchTranslations = await Promise.all(
          batch.map(async ({ original, indices }) => {
            if (!original.trim()) {
              return { original, translated: original, indices };
            }

            try {
              const translated = await translateTextMultiEngine(
                original,
                targetLang,
              );
              return { original, translated, indices };
            } catch (error) {
              console.error('Error translating text node:', error);
              return { original, translated: original, indices };
            }
          }),
        );
        translations.push(...batchTranslations);
      }

      // Replace text in original HTML
      // Create a map for quick lookup
      const translationMap = new Map<string, string>();
      translations.forEach(({ original, translated }) => {
        translationMap.set(original, translated);
      });

      // Replace text nodes in order
      let translatedHtml = html;
      translations.forEach(({ original, translated }) => {
        // Replace first occurrence to avoid replacing multiple times
        translatedHtml = translatedHtml.replace(original, translated);
      });

      return translatedHtml;
    } else {
      // Fallback for environments without DOM (like Android)
      // Translate the entire HTML as text (simpler but less accurate)
      return await translateTextMultiEngine(html, targetLang);
    }
  } catch (error) {
    console.error('Translation error:', error);
    // Return original content if translation fails
    return html;
  }
}

/**
 * Translate plain text
 * @param text - Plain text to translate
 * @param targetLang - Target language code
 * @param useAllEngines - Whether to use multiple engines (default: true)
 * @returns Translated text
 */
async function translateText(
  text,
  targetLang= 'es',
  useAllEngines= true,
) {
  if (!text || !text.trim()) {
    return text;
  }

  try {
    return await translateTextMultiEngine(text, targetLang);
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

/**
 * Check if translation is available
 */
function isTranslationAvailable(): boolean {
  return typeof fetch !== 'undefined';
}

// === End translation code ===

"use strict";
/**
 * Example Plugin with Automatic Translation
 * This demonstrates how to use the translation system in LNReader plugins
 *
 * This plugin will automatically translate chapters to Spanish when loaded
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var defaultCover_1 = require("@libs/defaultCover");
// Import translation function
var translation_1 = require("@libs/translation");
var fetch_1 = require("@libs/fetch");
var cheerio_1 = require("cheerio");
var ExampleTranslatedPlugin = /** @class */ (function () {
    function ExampleTranslatedPlugin() {
        this.id = 'example-translated';
        this.name = 'Example Translated Plugin';
        this.icon = 'src/en/example/icon.png';
        this.site = 'https://example.com';
        this.version = '1.0.0';
        // Target language for translation (can be configured)
        this.targetLanguage = 'es';
    }
    ExampleTranslatedPlugin.prototype.popularNovels = function (pageNo, options) {
        return __awaiter(this, void 0, void 0, function () {
            var novels;
            return __generator(this, function (_a) {
                novels = [];
                // Your normal novel fetching logic here
                // ...
                return [2 /*return*/, novels];
            });
        });
    };
    ExampleTranslatedPlugin.prototype.parseNovel = function (novelPath) {
        return __awaiter(this, void 0, void 0, function () {
            var novel, chapters;
            return __generator(this, function (_a) {
                novel = {
                    path: novelPath,
                    name: 'Example Novel',
                    cover: defaultCover_1.defaultCover,
                };
                chapters = [];
                // Your normal chapter parsing logic here
                // ...
                novel.chapters = chapters;
                return [2 /*return*/, novel];
            });
        });
    };
    ExampleTranslatedPlugin.prototype.parseChapter = function (chapterPath) {
        return __awaiter(this, void 0, void 0, function () {
            var response, html, loadedCheerio, chapterContent, translatedContent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, fetch_1.fetchApi)(this.site + chapterPath)];
                    case 1:
                        response = _a.sent();
                        return [4 /*yield*/, response.text()];
                    case 2:
                        html = _a.sent();
                        loadedCheerio = (0, cheerio_1.load)(html);
                        chapterContent = loadedCheerio('.chapter-content').html() || '';
                        return [4 /*yield*/, (0, translation_1.translateChapter)(chapterContent, this.targetLanguage, // Target language: 'es' for Spanish
                            true)];
                    case 3:
                        translatedContent = _a.sent();
                        return [2 /*return*/, translatedContent];
                }
            });
        });
    };
    ExampleTranslatedPlugin.prototype.searchNovels = function (searchTerm, pageNo) {
        return __awaiter(this, void 0, void 0, function () {
            var novels;
            return __generator(this, function (_a) {
                novels = [];
                // Your normal search logic here
                // ...
                return [2 /*return*/, novels];
            });
        });
    };
    return ExampleTranslatedPlugin;
}());
exports.default = new ExampleTranslatedPlugin();
