/**
 * Royal Road Plugin with Automatic Translation
 * This plugin automatically translates chapters to Spanish when loaded
 * Based on the original Royal Road plugin
 */

import { Parser } from 'htmlparser2';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';
import { Filters, FilterTypes } from '@libs/filterInputs';
import { NovelStatus } from '@libs/novelStatus';
import { isUrlAbsolute } from '@libs/isAbsoluteUrl';
import { translateChapter } from '@libs/translation';

enum ParsingState {
  Idle,
  Novel,
  InTitle,
  InAuthor,
  InDescription,
  InTags,
  InTagLink,
  InStatusSpan,
  InScript,
  InNote,
  InChapter,
  InHidden,
}

class RoyalRoadTranslated implements Plugin.PluginBase {
  id = 'royalroad-translated';
  name = 'Royal Road (Traducido)';
  version = '2.2.3';
  icon = 'src/en/royalroad/icon.png';
  site = 'https://www.royalroad.com/';

  // Target language for translation
  private targetLanguage: string = 'es';

  parseNovels(html: string) {
    const baseUrl = this.site;
    const novels: Plugin.NovelItem[] = [];
    let tempNovel: Partial<Plugin.NovelItem> = {};
    let state: ParsingState = ParsingState.Idle;
    const parser = new Parser({
      onopentag(name, attribs) {
        if (attribs['class']?.includes('fiction-list-item')) {
          state = ParsingState.Novel;
        }
        if (state !== ParsingState.Novel) return;

        switch (name) {
          case 'a':
            if (attribs['href']) {
              tempNovel.path = attribs['href'].split('/').slice(1, 3).join('/');
            }
            break;
          case 'img':
            if (attribs['src']) {
              tempNovel.name = attribs['alt'] || '';
              tempNovel.cover = !isUrlAbsolute(attribs['src'])
                ? baseUrl + attribs['src'].slice(1)
                : attribs['src'];
            }
            break;
        }
      },
      onclosetag(name) {
        if (name === 'figure') {
          if (tempNovel.path && tempNovel.name) {
            novels.push(tempNovel as Plugin.NovelItem);
            tempNovel = {};
          }
          state = ParsingState.Idle;
        }
      },
    });

    parser.write(html);
    parser.end();

    return novels;
  }

  async popularNovels(
    page: number,
    {
      filters,
      showLatestNovels,
    }: Plugin.PopularNovelsOptions<typeof this.filters>,
  ): Promise<Plugin.NovelItem[]> {
    const params = new URLSearchParams({
      page: page.toString(),
    });
    if (showLatestNovels) {
      params.append('orderBy', 'last_update');
    }
    if (!filters) filters = this.filters || {};
    for (const key in filters) {
      if (filters[key as keyof typeof filters].value === '') continue;
      if (key === 'genres' || key === 'tags' || key === 'content_warnings') {
        if (filters[key].value.include) {
          for (const include of filters[key].value.include) {
            params.append('tagsAdd', include);
          }
        }
        if (filters[key].value.exclude) {
          for (const exclude of filters[key].value.exclude) {
            params.append('tagsRemove', exclude);
          }
        }
      } else {
        params.append(key, String(filters[key as keyof typeof filters].value));
      }
    }

    const link = `${this.site}fictions/search?${params.toString()}`;
    const body = await fetchApi(link).then(r => r.text());

    return this.parseNovels(body);
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const result = await fetchApi(this.site + novelPath);
    const html = await result.text();

    const novel: Plugin.SourceNovel = {
      path: novelPath,
      name: '',
      cover: '',
      summary: '',
      author: '',
      status: NovelStatus.Unknown,
      chapters: [],
    };

    const baseUrl = this.site;
    let state: ParsingState = ParsingState.Idle;
    const nameParts: string[] = [];
    const summaryParts: string[] = [];
    let statusText = '';
    const genreArray: string[] = [];
    let statusSpanCounter = 0;
    const scriptContentParts: string[] = [];

    const parser = new Parser({
      onopentag(name, attribs) {
        switch (name) {
          case 'h1':
            if (attribs['property'] === 'name') {
              state = ParsingState.InTitle;
            }
            break;
          case 'span':
            if (attribs['property'] === 'author') {
              state = ParsingState.InAuthor;
            }
            if (attribs['class']?.includes('label')) {
              statusSpanCounter++;
              if (statusSpanCounter === 2) {
                state = ParsingState.InStatusSpan;
                statusText = '';
              }
            }
            break;
          case 'img':
            if (attribs['class']?.includes('thumbnail')) {
              novel.cover = attribs['src'];
              if (novel.cover && !isUrlAbsolute(novel.cover)) {
                novel.cover = baseUrl + novel.cover.slice(1);
              }
            }
            break;
          case 'script':
            state = ParsingState.InScript;
            break;
        }
      },
      ontext(text) {
        const trimmedText = text.trim();
        if (!trimmedText && state !== ParsingState.InScript) return;

        switch (state) {
          case ParsingState.InTitle:
            nameParts.push(text);
            break;
          case ParsingState.InAuthor:
            novel.author = trimmedText;
            break;
          case ParsingState.InDescription:
            summaryParts.push(text);
            break;
          case ParsingState.InStatusSpan:
            statusText = trimmedText;
            break;
          case ParsingState.InTagLink:
            genreArray.push(trimmedText);
            break;
          case ParsingState.InScript:
            scriptContentParts.push(text);
            break;
        }
      },
      onclosetag(name) {
        switch (name) {
          case 'h1':
            if (state === ParsingState.InTitle) {
              novel.name = nameParts.join('').trim();
            }
            state = ParsingState.Idle;
            break;
          case 'span':
            if (state === ParsingState.InAuthor) {
              state = ParsingState.Idle;
            }
            if (state === ParsingState.InStatusSpan) {
              novel.status =
                statusText === 'Ongoing'
                  ? NovelStatus.Ongoing
                  : statusText === 'Completed'
                    ? NovelStatus.Completed
                    : statusText === 'Hiatus'
                      ? NovelStatus.OnHiatus
                      : NovelStatus.Unknown;
              state = ParsingState.Idle;
            }
            break;
          case 'div':
            if (state === ParsingState.InDescription) {
              novel.summary = summaryParts.join('').trim();
              state = ParsingState.Idle;
            }
            break;
          case 'script':
            if (state === ParsingState.InScript) {
              const scriptContent = scriptContentParts.join('');
              const chapterMatch = scriptContent.match(
                /"chapters":\s*(\[[\s\S]*?\])/,
              );
              if (chapterMatch) {
                try {
                  const chaptersData = JSON.parse(chapterMatch[1]);
                  novel.chapters = chaptersData.map((chapter: any) => ({
                    name: chapter.title,
                    path: chapter.url,
                    releaseTime: chapter.date,
                  }));
                } catch (e) {
                  console.error('Error parsing chapters:', e);
                }
              }
              scriptContentParts.length = 0;
              state = ParsingState.Idle;
            }
            break;
        }
      },
    });

    parser.write(html);
    parser.end();

    novel.summary = summaryParts.join('').trim();
    novel.genres = genreArray.join(',');

    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    // Step 1: Fetch the chapter content normally (using original Royal Road logic)
    const result = await fetchApi(this.site + chapterPath);
    const html = await result.text();

    let state = ParsingState.Idle;
    let stateDepth = 0;
    let depth = 0;

    const chapterHtmlParts: string[] = [];
    const notesHtmlParts: string[] = [];
    const beforeNotesParts: string[] = [];
    const afterNotesParts: string[] = [];
    let isBeforeChapter = true;

    const match = html.match(/<style>\n\s+.(.+?){[^{]+?display: none;/);
    const hiddenClass = match?.[1]?.trim();
    let stateBeforeHidden: {
      state: ParsingState;
      depth: number;
    } | null = null;

    type EscapeChar = '&' | '<' | '>' | '"' | "'";
    const escapeRegex = /[&<>"']/g;
    const escapeMap: Record<EscapeChar, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    const escapeHtml = (text: string): string =>
      escapeRegex.test(text)
        ? ((escapeRegex.lastIndex = 0),
          text.replace(escapeRegex, char => escapeMap[char as EscapeChar]))
        : text;

    const parser = new Parser({
      onopentag(name, attribs) {
        depth++;
        const classes = attribs['class'] || '';

        if (
          state !== ParsingState.InHidden &&
          hiddenClass &&
          classes.includes(hiddenClass)
        ) {
          stateBeforeHidden = { state: state, depth: stateDepth };
          state = ParsingState.InHidden;
          stateDepth = depth;
          return;
        }

        switch (state) {
          case ParsingState.Idle:
            if (classes.includes('chapter-content')) {
              state = ParsingState.InChapter;
              stateDepth = depth;
              isBeforeChapter = false;
            } else if (classes.includes('author-note-portlet')) {
              state = ParsingState.InNote;
              stateDepth = depth;
            }
            break;
          case ParsingState.InHidden:
            return;
        }

        if (state === ParsingState.InChapter || state === ParsingState.InNote) {
          let tag = `<${name}`;
          for (const attr in attribs) {
            const value = attribs[attr].replace(/"/g, '&quot;');
            tag += ` ${attr}="${value}"`;
          }
          tag += '>';

          if (state === ParsingState.InChapter) {
            chapterHtmlParts.push(tag);
          } else {
            notesHtmlParts.push(tag);
          }
        }
      },
      ontext(text) {
        switch (state) {
          case ParsingState.InChapter:
            chapterHtmlParts.push(escapeHtml(text));
            break;
          case ParsingState.InNote:
            notesHtmlParts.push(escapeHtml(text));
            break;
        }
      },
      onclosetag(name) {
        if (depth === stateDepth) {
          switch (state) {
            case ParsingState.InHidden:
              if (!stateBeforeHidden) {
                state = ParsingState.Idle; // Attempt recovery
                stateDepth = 0;
              } else {
                state = stateBeforeHidden.state;
                stateDepth = stateBeforeHidden.depth;
                stateBeforeHidden = null;
              }
              depth--;
              return;
            case ParsingState.InChapter:
              chapterHtmlParts.push(`</div>`);
              state = ParsingState.Idle;
              stateDepth = 0;
              depth--;
              return;
            case ParsingState.InNote:
              const noteClass = `author-note-${isBeforeChapter ? 'before' : 'after'}`;
              const notesHtml = notesHtmlParts.join('').trim();
              const fullNote = `<div class="${noteClass}">${notesHtml}</div>`;
              if (isBeforeChapter) {
                beforeNotesParts.push(fullNote);
              } else {
                afterNotesParts.push(fullNote);
              }
              notesHtmlParts.length = 0;
              state = ParsingState.Idle;
              stateDepth = 0;
              depth--;
              return;
          }
        } else if (
          state === ParsingState.InChapter ||
          state === ParsingState.InNote
        ) {
          if (!parser['isVoidElement'](name)) {
            const closingTag = `</${name}>`;
            if (state === ParsingState.InChapter) {
              chapterHtmlParts.push(closingTag);
            } else {
              notesHtmlParts.push(closingTag);
            }
          }
        }
        depth--;
      },
    });

    parser.write(html);
    parser.end();

    const chapterContent = [
      beforeNotesParts.length > 0 ? beforeNotesParts.join('') : null,
      chapterHtmlParts.length > 0 ? chapterHtmlParts.join('').trim() : null,
      afterNotesParts.length > 0 ? afterNotesParts.join('') : null,
    ]
      .filter(Boolean)
      .join('\n<hr class="notes-separator">\n');

    // Step 2: Translate automatically to target language
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
    const params = new URLSearchParams({
      page: pageNo.toString(),
      title: searchTerm,
    });

    const link = `${this.site}fictions/search?${params.toString()}`;
    const body = await fetchApi(link).then(r => r.text());

    return this.parseNovels(body);
  }

  filters = {
    keyword: {
      type: FilterTypes.TextInput,
      label: 'Keyword (title or description)',
      value: '',
    },
    author: {
      type: FilterTypes.TextInput,
      label: 'Author',
      value: '',
    },
    genres: {
      type: FilterTypes.ExcludableCheckboxGroup,
      label: 'Genres',
      value: {
        include: [],
        exclude: [],
      },
      options: [
        {
          label: 'Action',
          value: 'action',
        },
        {
          label: 'Adventure',
          value: 'adventure',
        },
        {
          label: 'Comedy',
          value: 'comedy',
        },
        {
          label: 'Drama',
          value: 'drama',
        },
        {
          label: 'Fantasy',
          value: 'fantasy',
        },
        {
          label: 'Horror',
          value: 'horror',
        },
        {
          label: 'Mystery',
          value: 'mystery',
        },
        {
          label: 'Romance',
          value: 'romance',
        },
        {
          label: 'Sci-fi',
          value: 'sci_fi',
        },
        {
          label: 'Tragedy',
          value: 'tragedy',
        },
      ],
    },
    tags: {
      type: FilterTypes.ExcludableCheckboxGroup,
      label: 'Tags',
      value: {
        include: [],
        exclude: [],
      },
      options: [
        {
          label: 'Anti-Hero Lead',
          value: 'anti-hero_lead',
        },
        {
          label: 'Female Lead',
          value: 'female_lead',
        },
        {
          label: 'Male Lead',
          value: 'male_lead',
        },
        {
          label: 'Reincarnation',
          value: 'reincarnation',
        },
        {
          label: 'LitRPG',
          value: 'litrpg',
        },
        {
          label: 'Weak to Strong',
          value: 'weak_to_strong',
        },
      ],
    },
    content_warnings: {
      type: FilterTypes.ExcludableCheckboxGroup,
      label: 'Content Warnings',
      value: {
        include: [],
        exclude: [],
      },
      options: [
        {
          label: 'Gore',
          value: 'gore',
        },
        {
          label: 'Profanity',
          value: 'profanity',
        },
        {
          label: 'Sexual Content',
          value: 'sexual_content',
        },
        {
          label: 'Traumatising Content',
          value: 'traumatising_content',
        },
      ],
    },
  } satisfies Filters;
}

export default new RoyalRoadTranslated();
