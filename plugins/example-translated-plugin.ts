/**
 * Example Plugin with Automatic Translation
 * This demonstrates how to use the translation system in LNReader plugins
 *
 * This plugin will automatically translate chapters to Spanish when loaded
 */

import { Plugin } from '@/types/plugin';
import { defaultCover } from '@libs/defaultCover';
// Import translation function
import { translateChapter } from '@libs/translation';
import { fetchApi } from '@libs/fetch';
import { load as parseHTML } from 'cheerio';
import { Filters } from '@libs/filterInputs';

class ExampleTranslatedPlugin implements Plugin.PluginBase {
  id = 'example-translated';
  name = 'Example Translated Plugin';
  icon = 'src/en/example/icon.png';
  site = 'https://example.com';
  version = '1.0.0';

  // Target language for translation (can be configured)
  private targetLanguage: string = 'es';

  async popularNovels(
    pageNo: number,
    options: Plugin.PopularNovelsOptions<Filters>,
  ): Promise<Plugin.NovelItem[]> {
    const novels: Plugin.NovelItem[] = [];

    // Your normal novel fetching logic here
    // ...

    return novels;
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const novel: Plugin.SourceNovel = {
      path: novelPath,
      name: 'Example Novel',
      cover: defaultCover,
    };

    const chapters: Plugin.ChapterItem[] = [];
    // Your normal chapter parsing logic here
    // ...

    novel.chapters = chapters;
    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    // Step 1: Fetch the chapter content normally
    const response = await fetchApi(this.site + chapterPath);
    const html = await response.text();
    const loadedCheerio = parseHTML(html);

    // Step 2: Extract the chapter content
    const chapterContent = loadedCheerio('.chapter-content').html() || '';

    // Step 3: Translate automatically to target language
    // This will use all available free translation engines
    const translatedContent = await translateChapter(
      chapterContent,
      this.targetLanguage, // Target language: 'es' for Spanish
      true, // Use all available engines for better quality
    );

    return translatedContent;
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    const novels: Plugin.NovelItem[] = [];
    // Your normal search logic here
    // ...
    return novels;
  }
}

export default new ExampleTranslatedPlugin();
