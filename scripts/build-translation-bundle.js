/**
 * Build Translation Bundle for Android
 *
 * This script creates a standalone bundle of the translation code
 * that can be included in the Android app's JavaScript runtime.
 *
 * The bundle includes:
 * - translateChapter function
 * - translateText function
 * - All translation engines (Google, Microsoft Edge, DeepL)
 * - User-Agent rotation
 * - Caching system
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DIST_DIR = '.dist';
const TRANSLATION_BUNDLE_FILE = path.join(DIST_DIR, 'translation-bundle.js');
const TRANSLATION_BUNDLE_MIN_FILE = path.join(
  DIST_DIR,
  'translation-bundle.min.js',
);

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

console.log('📦 Building translation bundle for Android...\n');

// Step 1: Read the standalone translation.ts file
console.log('1️⃣ Reading translation source...');

// Step 2: Create standalone bundle from translation.ts
console.log('2️⃣ Creating standalone bundle...');

// Read the existing translation.ts which is already standalone-friendly
const translationSourcePath = path.join(
  process.cwd(),
  'src/libs/translation.ts',
);
if (!fs.existsSync(translationSourcePath)) {
  console.error('❌ Translation source file not found:', translationSourcePath);
  process.exit(1);
}

// First, compile using TypeScript to get proper JavaScript output
console.log('   Compiling TypeScript to JavaScript...');
let translationCode = '';
try {
  execSync(`npx tsc --project tsconfig.translation-bundle.json`, {
    stdio: 'inherit',
  });

  // Read the compiled JavaScript instead of the TypeScript source
  const compiledPath = path.join(
    process.cwd(),
    '.js/translation-temp/libs/translation.js',
  );
  const translationDir = path.join(
    process.cwd(),
    '.js/translation-temp/translation',
  );

  if (fs.existsSync(compiledPath)) {
    // Read all necessary compiled files
    const filesToInclude = [
      path.join(translationDir, 'translator.js'),
      path.join(translationDir, 'cache.js'),
      path.join(translationDir, 'engines', 'index.js'),
      path.join(translationDir, 'engines', 'base.js'),
      path.join(translationDir, 'engines', 'google.js'),
      path.join(translationDir, 'engines', 'microsoft-edge.js'),
      path.join(translationDir, 'engines', 'deepl.js'),
      path.join(translationDir, 'utils', 'user-agents.js'),
      compiledPath, // translation.js last
    ];

    // Simply concatenate all files - we'll wrap them in a CommonJS shim
    const codeParts = [];
    let firstFile = true;
    for (const filePath of filesToInclude) {
      if (fs.existsSync(filePath)) {
        let fileCode = fs.readFileSync(filePath, 'utf-8');
        // Remove "use strict"; from all files except the first one
        // (we'll add it once in the wrapper)
        if (!firstFile) {
          fileCode = fileCode.replace(/^['"]use strict['"];?\s*/m, '');
        }
        firstFile = false;
        codeParts.push(fileCode);
      }
    }

    translationCode = codeParts.join('\n\n');
    console.log('   ✅ Using compiled JavaScript code');
  } else {
    throw new Error('Compiled code not found');
  }
} catch (error) {
  console.warn('   ⚠️  TypeScript compilation failed, using source conversion');
  // Fallback: read source and convert manually
  let sourceCode = fs.readFileSync(translationSourcePath, 'utf-8');
  translationCode = sourceCode
    .replace(/export\s+(async\s+)?function/g, '$1function')
    .replace(/export\s+/g, '')
    .replace(/\)\s*:\s*[^{]+?\s*\{/g, ') {')
    .replace(/:\s*string\s*=/g, '=')
    .replace(/:\s*boolean\s*=/g, '=')
    .replace(/:\s*Promise<string>/g, '')
    .replace(/:\s*string(?![,=)])/g, '')
    .replace(/:\s*number(?![,=)])/g, '')
    .replace(/:\s*any\[\](?![,=)])/g, '')
    .replace(/:\s*any(?![,=)])/g, '')
    .replace(/:\s*\[\](?![,=)])/g, '')
    .replace(/:\s*\{[^}]+\}(?![,=)])/g, '')
    .replace(/Array<\{[^}]+\}>/g, '[]')
    .replace(/Record<string,\s*string>/g, '{}')
    .replace(/const\s+(\w+)\s*:\s*[^=]+=\s*/g, 'const $1 = ')
    .replace(/let\s+(\w+)\s*:\s*[^=]+=\s*/g, 'let $1 = ')
    .replace(/var\s+(\w+)\s*:\s*[^=]+=\s*/g, 'var $1 = ')
    .replace(/,\s*,/g, ',')
    .replace(/const\s+(\w+)\s*,/g, 'const $1,')
    .replace(/let\s+(\w+)\s*,/g, 'let $1,')
    .replace(/var\s+(\w+)\s*,/g, 'var $1,');
}

// Wrap in IIFE and add exports
const standaloneBundle = `/**
 * LNReader Translation Bundle
 * Standalone translation library for Android
 * 
 * This bundle works in any JavaScript environment including Android's JavaScript runtime.
 * 
 * Usage:
 *   const translated = await translateChapter(html, 'es');
 *   const text = await translateText('Hello', 'es');
 * 
 * Generated: ${new Date().toISOString()}
 */

(function(global) {
  'use strict';
  
  // CommonJS shim for compiled code
  var module = { exports: {} };
  var exports = module.exports;
  
  // Simple require shim (returns empty object for dependencies)
  function require(name) {
    return {};
  }
  
${translationCode}

  // Extract functions from module.exports (they were exported by compiled code)
  var translateChapter = module.exports.translateChapter;
  var translateText = module.exports.translateText;
  
  if (!translateChapter || !translateText) {
    console.error('Translation functions not found in bundle. module.exports:', Object.keys(module.exports));
  }
  
  // Make functions available globally for plugins
  if (typeof global !== 'undefined') {
    global.translateChapter = translateChapter;
    global.translateText = translateText;
    global.__translateChapter = translateChapter; // For plugin wrapper
  }
  
  if (typeof window !== 'undefined') {
    window.translateChapter = translateChapter;
    window.translateText = translateText;
    window.__translateChapter = translateChapter; // For plugin wrapper
  }
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this);
`;

const standalonePath = path.join(DIST_DIR, 'translation-standalone.js');
fs.writeFileSync(standalonePath, standaloneBundle, 'utf-8');
console.log(`✅ Standalone bundle created: ${standalonePath}`);

// Step 3: Minify standalone version
console.log('\n3️⃣ Minifying bundle...');
try {
  const { minify_sync } = await import('terser');
  const result = minify_sync(standaloneBundle, {
    compress: {
      arrows: false,
      drop_console: false, // Keep console for debugging
    },
    mangle: {
      reserved: ['translateChapter', 'translateText', 'isTranslationAvailable'],
    },
    ecma: 5,
  });

  if (result.code) {
    const standaloneMinPath = path.join(
      DIST_DIR,
      'translation-standalone.min.js',
    );
    fs.writeFileSync(standaloneMinPath, result.code, 'utf-8');
    const originalSize = (standaloneBundle.length / 1024).toFixed(2);
    const minifiedSize = (result.code.length / 1024).toFixed(2);
    console.log(`✅ Minified bundle created: ${standaloneMinPath}`);
    console.log(
      `   Original: ${originalSize} KB → Minified: ${minifiedSize} KB`,
    );
  } else {
    console.warn('⚠️  Minification produced no output');
  }
} catch (error) {
  console.warn('⚠️  Minification failed:', error.message);
  console.log('   Using unminified bundle');
}

console.log('\n✅ Translation bundle build complete!');
console.log('\n📁 Generated files:');
console.log(`   - ${TRANSLATION_BUNDLE_FILE}`);
console.log(`   - ${TRANSLATION_BUNDLE_MIN_FILE}`);
console.log(`   - ${path.join(DIST_DIR, 'translation-standalone.js')}`);
console.log(`   - ${path.join(DIST_DIR, 'translation-standalone.min.js')}`);
console.log('\n📖 Next steps:');
console.log('   1. Include translation-standalone.min.js in your Android app');
console.log('   2. Load it before loading plugins');
console.log('   3. Plugins can use translateChapter() and translateText()');
