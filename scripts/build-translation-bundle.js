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

let translationCode = fs.readFileSync(translationSourcePath, 'utf-8');

// Remove TypeScript-specific syntax and convert to plain JavaScript
translationCode = translationCode
  .replace(/export\s+(async\s+)?function/g, '$1function')
  .replace(/export\s+/g, '')
  .replace(/:\s*string\s*=/g, '=')
  .replace(/:\s*boolean\s*=/g, '=')
  .replace(/:\s*Promise<string>/g, '')
  .replace(/:\s*string/g, '')
  .replace(/:\s*any\[\]/g, '')
  .replace(/:\s*any/g, '')
  .replace(/Array<\{[^}]+\}>/g, '[]')
  .replace(/Record<string,\s*string>/g, '{}');

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
  
${translationCode}

  // Export functions
  var exports = {
    translateChapter: translateChapter,
    translateText: translateText,
    isTranslationAvailable: isTranslationAvailable,
  };
  
  // CommonJS export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }
  
  // Global export
  if (typeof global !== 'undefined') {
    global.LNReaderTranslation = exports;
  }
  
  // Window export (browser)
  if (typeof window !== 'undefined') {
    window.LNReaderTranslation = exports;
  }
  
  // Make functions available globally for plugins (for compatibility)
  if (typeof global !== 'undefined') {
    global.translateChapter = translateChapter;
    global.translateText = translateText;
  }
  
  if (typeof window !== 'undefined') {
    window.translateChapter = translateChapter;
    window.translateText = translateText;
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
