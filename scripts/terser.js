import { minify_sync } from 'terser';
import fs from 'fs';

const config = {
  compress: {
    arrows: false,
  },
  mangle: {},
  ecma: 5, // specify one of: 5, 2015, 2016, etc.
  enclose: false, // or specify true, or "args:values"
  module: true,
  toplevel: true,
};

const minify = function (path) {
  try {
    const code = fs.readFileSync(path).toString();

    // Skip minification for plugins with auto-translation (they have complex code)
    if (
      code.includes('window.__translateChapter') ||
      code.includes('// Auto-translation')
    ) {
      return; // Keep original code
    }

    const result = minify_sync(code, config);
    if (result.error) {
      console.warn(
        `⚠️  Minification failed for ${path}: ${result.error.message}`,
      );
      // Keep original code if minification fails
      return;
    }
    fs.writeFileSync(path, result.code);
  } catch (error) {
    console.warn(`⚠️  Minification failed for ${path}: ${error.message}`);
    // Keep original code if minification fails
  }
};

export { minify };
