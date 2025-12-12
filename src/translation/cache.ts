/**
 * Translation Cache System
 * Stores translated content to avoid re-translating the same text
 */

export interface CacheEntry {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  engine: string;
  timestamp: number;
}

export class TranslationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 1000; // Maximum cache entries
  private ttl: number = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Generate cache key from text and language pair
   */
  private getCacheKey(
    text: string,
    sourceLang: string,
    targetLang: string,
    engine: string,
  ): string {
    // Use hash of text + languages + engine as key
    const content = `${text}|${sourceLang}|${targetLang}|${engine}`;
    return this.hashString(content);
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if entry exists and is still valid
   */
  get(
    text: string,
    sourceLang: string,
    targetLang: string,
    engine: string,
  ): string | null {
    const key = this.getCacheKey(text, sourceLang, targetLang, engine);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.translatedText;
  }

  /**
   * Store translation in cache
   */
  set(
    originalText: string,
    translatedText: string,
    sourceLang: string,
    targetLang: string,
    engine: string,
  ): void {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const key = this.getCacheKey(originalText, sourceLang, targetLang, engine);

    const entry: CacheEntry = {
      originalText,
      translatedText,
      sourceLang,
      targetLang,
      engine,
      timestamp: Date.now(),
    };

    this.cache.set(key, entry);
    this.saveToStorage();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));

    // If still too many entries, remove oldest ones
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, this.cache.size - this.maxSize + 100);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const entries = Array.from(this.cache.entries());
      const data = JSON.stringify(entries);
      localStorage.setItem('lnreader_translation_cache', data);
    } catch (error) {
      console.warn('Failed to save translation cache:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  loadFromStorage(): void {
    try {
      const data = localStorage.getItem('lnreader_translation_cache');
      if (!data) return;

      const entries: [string, CacheEntry][] = JSON.parse(data);
      const now = Date.now();

      entries.forEach(([key, entry]) => {
        // Only load non-expired entries
        if (now - entry.timestamp <= this.ttl) {
          this.cache.set(key, entry);
        }
      });
    } catch (error) {
      console.warn('Failed to load translation cache:', error);
    }
  }

  /**
   * Initialize cache (load from storage)
   */
  initialize(): void {
    this.loadFromStorage();
  }
}

// Singleton instance
export const translationCache = new TranslationCache();

// Initialize on module load
if (typeof window !== 'undefined') {
  translationCache.initialize();
}
