/**
 * Translation Library for LNReader Plugins
 * Standalone version that works in compiled plugins for Android
 *
 * Usage in plugin:
 * ```ts
 * import { translateChapter } from '@libs/translation';
 *
 * async parseChapter(chapterPath: string): Promise<string> {
 *   const html = await fetchChapter(chapterPath);
 *   // Translate automatically to Spanish
 *   return await translateChapter(html, 'es');
 * }
 * ```
 */

// Simple Google Translate implementation (free, no API key needed)
async function translateWithGoogle(
  text: string,
  targetLang: string,
  sourceLang: string = 'auto',
): Promise<string> {
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
      return data.sentences.map((s: any) => s.trans || '').join('');
    }

    if (Array.isArray(data) && data[0]) {
      return data[0].map((item: any[]) => item[0] || '').join('');
    }

    return text;
  } catch (error) {
    console.error('Google Translate error:', error);
    throw error;
  }
}

// Simple Microsoft Edge Translate (free)
async function translateWithMicrosoftEdge(
  text: string,
  targetLang: string,
): Promise<string> {
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
  text: string,
  targetLang: string,
  sourceLang: string = 'auto',
): Promise<string> {
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
function extractTextFromHtml(html: string): { text: string; structure: any[] } {
  // Simple HTML parser to extract text nodes
  const textNodes: Array<{ text: string; tag: string }> = [];
  const tagStack: string[] = [];

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
export async function translateChapter(
  html: string,
  targetLang: string = 'es',
  useAllEngines: boolean = true,
): Promise<string> {
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
      const combinedNodes: Array<{ original: string; indices: number[] }> = [];
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
      const translations: Array<{
        original: string;
        translated: string;
        indices: number[];
      }> = [];

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
export async function translateText(
  text: string,
  targetLang: string = 'es',
  useAllEngines: boolean = true,
): Promise<string> {
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
export function isTranslationAvailable(): boolean {
  return typeof fetch !== 'undefined';
}
