/**
 * Bundle Translation Code into Plugins
 *
 * This script modifies compiled plugins to include translation code
 * directly when they import @libs/translation.
 *
 * This allows plugins to work in Android without modifying the APK.
 */

import fs from 'fs';
import path from 'path';

const COMPILED_PLUGIN_DIR = './.js/plugins';
const TRANSLATION_SOURCE = './src/libs/translation.ts';

/**
 * Convert TypeScript translation code to JavaScript
 */
function convertTranslationToJS(tsCode) {
  return tsCode
    .replace(/export\s+(async\s+)?function/g, '$1function')
    .replace(/export\s+/g, '')
    .replace(/:\s*string\s*=/g, '=')
    .replace(/:\s*boolean\s*=/g, '=')
    .replace(/:\s*Promise<string>/g, '')
    .replace(/:\s*string/g, '')
    .replace(/:\s*any\[\]/g, '[]')
    .replace(/:\s*any/g, '')
    .replace(/Array<\{[^}]+\}>/g, '[]')
    .replace(/Record<string,\s*string>/g, '{}');
}

/**
 * Check if plugin uses translation
 */
function usesTranslation(pluginCode) {
  return (
    pluginCode.includes('@libs/translation') ||
    pluginCode.includes('translateChapter') ||
    pluginCode.includes('translateText')
  );
}

/**
 * Bundle translation code into plugin
 */
function bundleTranslationIntoPlugin(pluginCode) {
  if (!usesTranslation(pluginCode)) {
    return pluginCode; // No necesita traducción
  }

  // Leer código de traducción
  if (!fs.existsSync(TRANSLATION_SOURCE)) {
    console.warn(`⚠️  Translation source not found: ${TRANSLATION_SOURCE}`);
    return pluginCode;
  }

  let translationCode = fs.readFileSync(TRANSLATION_SOURCE, 'utf-8');

  // Convertir a JavaScript
  const jsTranslationCode = convertTranslationToJS(translationCode);

  // Reemplazar imports de traducción con código incluido
  const importPattern =
    /import\s*\{[^}]*translateChapter[^}]*\}\s*from\s*['"]@libs\/translation['"];?/g;

  if (importPattern.test(pluginCode)) {
    // Reemplazar el import con el código incluido
    const bundledCode = pluginCode.replace(
      importPattern,
      `\n// === Translation code included ===\n${jsTranslationCode}\n// === End translation code ===\n`,
    );
    return bundledCode;
  }

  // Si no hay import pero usa las funciones, agregar el código al inicio
  if (
    pluginCode.includes('translateChapter') ||
    pluginCode.includes('translateText')
  ) {
    return `\n// === Translation code included ===\n${jsTranslationCode}\n// === End translation code ===\n\n${pluginCode}`;
  }

  return pluginCode;
}

/**
 * Process all compiled plugins
 */
function processPlugins() {
  console.log('📦 Bundling translation code into plugins...\n');

  if (!fs.existsSync(COMPILED_PLUGIN_DIR)) {
    console.error(
      `❌ Compiled plugins directory not found: ${COMPILED_PLUGIN_DIR}`,
    );
    console.log('   Run "npm run build:compile" first');
    process.exit(1);
  }

  let processedCount = 0;
  let bundledCount = 0;

  // Función para procesar plugins en un directorio
  function processDirectory(dirPath, dirName = '') {
    const plugins = fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter(
        dirent =>
          dirent.isFile() &&
          dirent.name.endsWith('.js') &&
          !dirent.name.startsWith('.'),
      )
      .map(dirent => dirent.name);

    for (const pluginFile of plugins) {
      processedCount++;
      const pluginPath = path.join(dirPath, pluginFile);
      const displayPath = dirName ? `${dirName}/${pluginFile}` : pluginFile;

      try {
        let pluginCode = fs.readFileSync(pluginPath, 'utf-8');
        const originalCode = pluginCode;

        // Bundle translation if needed
        pluginCode = bundleTranslationIntoPlugin(pluginCode);

        if (pluginCode !== originalCode) {
          fs.writeFileSync(pluginPath, pluginCode, 'utf-8');
          bundledCount++;
          console.log(`   ✅ ${displayPath} - Translation bundled`);
        }
      } catch (error) {
        console.warn(`   ⚠️  ${displayPath} - Error: ${error.message}`);
      }
    }
  }

  // Procesar plugins en la raíz primero
  processDirectory(COMPILED_PLUGIN_DIR, '');

  // Recorrer todos los directorios de idiomas
  const languageDirs = fs
    .readdirSync(COMPILED_PLUGIN_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const langDir of languageDirs) {
    const langPath = path.join(COMPILED_PLUGIN_DIR, langDir);
    processDirectory(langPath, langDir);
  }

  console.log(`\n✅ Processed ${processedCount} plugins`);
  console.log(`   ${bundledCount} plugins now include translation code`);
  console.log(
    `   ${processedCount - bundledCount} plugins don't use translation\n`,
  );
}

// Ejecutar
processPlugins();
