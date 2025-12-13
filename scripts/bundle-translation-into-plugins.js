/**
 * Bundle Translation Code into ALL Plugins
 *
 * This script modifies ALL compiled plugins to automatically translate chapters.
 * It wraps the parseChapter method to translate content automatically.
 *
 * This allows ALL plugins to translate chapters without modifying each one individually.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRANSLATION_BUNDLE_MIN = path.resolve(
  __dirname,
  '../.dist/translation-standalone.min.js',
);
const TRANSLATION_BUNDLE = path.resolve(
  __dirname,
  '../.dist/translation-standalone.js',
);
const COMPILED_PLUGIN_DIR = path.resolve(__dirname, '../.js/plugins');

let jsTranslationCode = '';

// Always use unminified code to avoid syntax errors
const bundlePath = TRANSLATION_BUNDLE;

try {
  // Read the standalone bundle directly - it's already wrapped in an IIFE
  // We'll inject it as-is, wrapped in another IIFE to ensure isolation
  jsTranslationCode = fs.readFileSync(bundlePath, 'utf-8');
  console.log(`📦 Using translation bundle: ${path.basename(bundlePath)}`);
} catch (error) {
  console.error(`❌ Failed to read translation bundle: ${bundlePath}`, error);
  console.log('   Run "npm run build:translation-bundle" first');
  process.exit(1);
}

/**
 * Wraps parseChapter method to automatically translate content
 * Uses a simpler approach: intercepts return statements
 */
function wrapParseChapterWithTranslation(pluginCode, pluginPath) {
  // Check if plugin has parseChapter method (look for common patterns)
  // Pattern 1: ClassName.prototype.parseChapter = function(...)
  // Pattern 2: async parseChapter(...) { (TypeScript/ES6)
  const hasParseChapter =
    /\.prototype\.parseChapter\s*=\s*function\s*\(/.test(pluginCode) ||
    /(async\s+)?parseChapter\s*\(/.test(pluginCode);

  if (!hasParseChapter) {
    return pluginCode;
  }

  // Check if already has auto-translation
  if (
    pluginCode.includes('// Auto-translation wrapper') ||
    pluginCode.includes('__autoTranslateResult')
  ) {
    return pluginCode; // Already processed
  }

  // Pattern for compiled JavaScript: ClassName.prototype.parseChapter = function(chapterPath) {
  const prototypePattern =
    /(\w+\.prototype\.parseChapter\s*=\s*function\s*\([^)]*\)\s*\{)/;
  const prototypeMatch = pluginCode.match(prototypePattern);

  let methodStart, methodSignature, match;

  if (prototypeMatch) {
    // Compiled JavaScript format (ES5)
    methodStart = prototypeMatch.index;
    methodSignature = prototypeMatch[1];
    match = prototypeMatch;
  } else {
    // Try TypeScript/ES6 format: async parseChapter(...) { ... }
    const methodRegex =
      /((?:async\s+)?parseChapter\s*\([^)]*\)\s*:\s*Promise<string>\s*\{)/;
    const methodMatch = pluginCode.match(methodRegex);
    if (!methodMatch) {
      return pluginCode;
    }
    methodStart = methodMatch.index;
    methodSignature = methodMatch[1];
    match = methodMatch;
  }

  // Find the matching closing brace
  let braceCount = 1;
  let inString = false;
  let stringChar = '';
  let i = methodStart + match[0].length;
  let methodEnd = -1;

  for (; i < pluginCode.length; i++) {
    const char = pluginCode[i];
    const prevChar = i > 0 ? pluginCode[i - 1] : '';

    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          methodEnd = i + 1;
          break;
        }
      }
    }
  }

  if (methodEnd === -1) {
    return pluginCode;
  }

  // Extract method body
  const methodBody = pluginCode.substring(
    methodStart + match[0].length,
    methodEnd - 1,
  );

  // Extract parameter name from method signature
  const paramMatch = methodSignature.match(/\(([^)]+)\)/);
  const params = paramMatch ? paramMatch[1] : 'chapterPath';

  // Wrap the method - preserve original structure but add translation wrapper
  // The method body already uses __awaiter/__generator, so we wrap it properly
  const wrappedMethod = `${methodSignature}
    var __self = this;
    var __originalMethod = function(${params}) {
      ${methodBody}
    };
    
    return __awaiter(__self, void 0, void 0, function() {
      var __originalResult, __translatedResult;
      return __generator(__self, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, __originalMethod(${params})];
          case 1:
            __originalResult = _a.sent();
            if (!(__originalResult && typeof __originalResult === 'string' && __originalResult.trim())) {
              return [2, __originalResult];
            }
            _a.label = 2;
          case 2:
            _a.trys.push([2, 4, , 5]);
            if (typeof window !== 'undefined' && window.__translateChapter) {
              return [4, window.__translateChapter(__originalResult, 'es', true)];
            }
            // Fallback: return original if translation not available
            return [2, __originalResult];
          case 3:
            __translatedResult = _a.sent();
            return [2, __translatedResult];
          case 4:
            _a.sent();
            console.warn('Auto-translation failed, returning original');
            return [2, __originalResult];
          case 5:
            return [2];
        }
      });
    });
  }`;

  // The translation code is already ES5 compatible (compiled from TypeScript)
  // No need to convert it
  let es5TranslationCode = jsTranslationCode;

  // Inject translation code at the beginning of the file (after "use strict" if present)
  let modifiedCode = pluginCode;
  const useStrictMatch = modifiedCode.match(/("use strict";\s*)/);
  const injectPosition = useStrictMatch
    ? useStrictMatch.index + useStrictMatch[0].length
    : 0;

  // Check if translation code already injected
  if (!modifiedCode.includes('window.__translateChapter')) {
    // The bundle is already wrapped in an IIFE, so we just inject it directly
    // It will execute and make window.__translateChapter available
    const translationWrapper = `
// === Auto-translation code ===
${es5TranslationCode}
// === End auto-translation code ===

`;
    modifiedCode =
      modifiedCode.substring(0, injectPosition) +
      translationWrapper +
      modifiedCode.substring(injectPosition);
  }

  const beforeMethod = modifiedCode.substring(0, methodStart);
  const afterMethod = modifiedCode.substring(methodEnd);
  modifiedCode = beforeMethod + wrappedMethod + afterMethod;

  console.log(`   ✅ ${path.basename(pluginPath)} - Auto-translation enabled`);
  return modifiedCode;
}

/**
 * Recursively processes all compiled plugins in a directory.
 * @param {string} directory The directory to scan for plugins.
 * @param {number} [depth=0] Current recursion depth for logging.
 * @returns {number} The number of plugins that had translation code bundled.
 */
function processPluginsInDirectory(directory, depth = 0) {
  let bundledCount = 0;
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      bundledCount += processPluginsInDirectory(fullPath, depth + 1);
    } else if (file.endsWith('.js')) {
      let pluginCode = fs.readFileSync(fullPath, 'utf-8');
      const originalCode = pluginCode;

      pluginCode = wrapParseChapterWithTranslation(pluginCode, fullPath);

      if (pluginCode !== originalCode) {
        fs.writeFileSync(fullPath, pluginCode, 'utf-8');
        bundledCount++;
      }
    }
  });
  return bundledCount;
}

/**
 * Main function to process all compiled plugins.
 */
function processPlugins() {
  console.log('📦 Enabling auto-translation for ALL plugins...\n');

  if (!fs.existsSync(COMPILED_PLUGIN_DIR)) {
    console.error(
      `❌ Compiled plugins directory not found: ${COMPILED_PLUGIN_DIR}`,
    );
    console.log('   Run "npm run build:compile" first');
    process.exit(1);
  }

  let totalPlugins = 0;
  let pluginsWithTranslation = 0;

  // Process plugins directly in the root of COMPILED_PLUGIN_DIR
  const rootFiles = fs.readdirSync(COMPILED_PLUGIN_DIR);
  rootFiles.forEach(file => {
    const fullPath = path.join(COMPILED_PLUGIN_DIR, file);
    if (fs.statSync(fullPath).isFile() && file.endsWith('.js')) {
      totalPlugins++;
      let pluginCode = fs.readFileSync(fullPath, 'utf-8');
      const originalCode = pluginCode;
      pluginCode = wrapParseChapterWithTranslation(pluginCode, fullPath);
      if (pluginCode !== originalCode) {
        fs.writeFileSync(fullPath, pluginCode, 'utf-8');
        pluginsWithTranslation++;
      }
    }
  });

  // Process plugins in language subdirectories
  const languageDirs = fs
    .readdirSync(COMPILED_PLUGIN_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(COMPILED_PLUGIN_DIR, dirent.name));

  languageDirs.forEach(langDir => {
    const langPlugins = fs.readdirSync(langDir);
    langPlugins.forEach(file => {
      const fullPath = path.join(langDir, file);
      if (fs.statSync(fullPath).isFile() && file.endsWith('.js')) {
        totalPlugins++;
        let pluginCode = fs.readFileSync(fullPath, 'utf-8');
        const originalCode = pluginCode;
        pluginCode = wrapParseChapterWithTranslation(pluginCode, fullPath);
        if (pluginCode !== originalCode) {
          fs.writeFileSync(fullPath, pluginCode, 'utf-8');
          pluginsWithTranslation++;
        }
      }
    });
  });

  console.log(`\n✅ Processed ${totalPlugins} plugins`);
  console.log(
    `   ${pluginsWithTranslation} plugins now have auto-translation enabled`,
  );
  console.log(
    `   ${totalPlugins - pluginsWithTranslation} plugins don't have parseChapter method`,
  );
}

processPlugins();
