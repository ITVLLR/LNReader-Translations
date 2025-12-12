/**
 * User-Agent rotation utility
 * Generates random User-Agents to simulate different devices/browsers
 * IMPORTANT: These User-Agents are ONLY used for translation API requests,
 * NOT for novel searches or chapter fetching (those use fetchApi which has fixed headers)
 * This helps avoid rate limits on translation services by making requests appear to come from different clients
 */

/**
 * Generate User-Agents dynamically to create a large pool
 * This function generates variations of User-Agents for different browsers/devices
 */
function generateUserAgents(): string[] {
  const userAgents: string[] = [];

  // Chrome versions (120-122)
  const chromeVersions = [
    '120.0.0.0',
    '121.0.0.0',
    '122.0.0.0',
    '119.0.0.0',
    '118.0.0.0',
  ];
  // Firefox versions (119-122)
  const firefoxVersions = ['119.0', '120.0', '121.0', '122.0'];
  // Safari versions
  const safariVersions = ['17.0', '17.1', '17.2', '16.6', '16.5'];
  // Edge versions
  const edgeVersions = ['120.0.0.0', '121.0.0.0', '119.0.0.0'];

  // Windows versions
  const windowsVersions = ['10.0', '11.0'];
  // macOS versions
  const macVersions = ['10_15_7', '11_7_10', '12_7_1', '13_5_2', '14_2_1'];
  // Linux distributions
  const linuxDistros = ['', 'Ubuntu; ', 'Fedora; ', 'Debian; '];
  // Android versions
  const androidVersions = ['11', '12', '13', '14'];
  // iOS versions
  const iosVersions = ['16_6', '17_0', '17_1', '17_2', '15_7'];

  // Generate Chrome on Windows (30 variations)
  for (const winVer of windowsVersions) {
    for (const chromeVer of chromeVersions.slice(0, 6)) {
      userAgents.push(
        `Mozilla/5.0 (Windows NT ${winVer}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`,
      );
    }
  }

  // Generate Chrome on macOS (25 variations)
  for (const macVer of macVersions) {
    for (const chromeVer of chromeVersions.slice(0, 5)) {
      userAgents.push(
        `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVer}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`,
      );
    }
  }

  // Generate Chrome on Linux (20 variations)
  for (const distro of linuxDistros) {
    for (const chromeVer of chromeVersions.slice(0, 5)) {
      userAgents.push(
        `Mozilla/5.0 (X11; ${distro}Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`,
      );
    }
  }

  // Generate Firefox on Windows (20 variations)
  for (const winVer of windowsVersions) {
    for (const ffVer of firefoxVersions) {
      userAgents.push(
        `Mozilla/5.0 (Windows NT ${winVer}; Win64; x64; rv:${ffVer}) Gecko/20100101 Firefox/${ffVer}`,
      );
    }
  }

  // Generate Firefox on macOS (15 variations)
  for (const macVer of macVersions.slice(0, 3)) {
    for (const ffVer of firefoxVersions) {
      userAgents.push(
        `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVer.replace('_', '.')}; rv:${ffVer}) Gecko/20100101 Firefox/${ffVer}`,
      );
    }
  }

  // Generate Safari on macOS (20 variations)
  for (const macVer of macVersions) {
    for (const safariVer of safariVersions) {
      userAgents.push(
        `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVer}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${safariVer} Safari/605.1.15`,
      );
    }
  }

  // Generate Edge on Windows (15 variations)
  for (const winVer of windowsVersions) {
    for (const edgeVer of edgeVersions) {
      userAgents.push(
        `Mozilla/5.0 (Windows NT ${winVer}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${edgeVer} Safari/537.36 Edg/${edgeVer}`,
      );
    }
  }

  // Generate Chrome on Android (20 variations)
  const androidDevices = [
    'SM-S918B',
    'Pixel 6',
    'Pixel 7',
    'Pixel 8',
    'SM-G998B',
    'OnePlus 11',
    'Xiaomi 13',
    'OPPO Find X5',
    'vivo X90',
    'Realme GT 3',
  ];
  for (const device of androidDevices.slice(0, 10)) {
    for (const androidVer of androidVersions.slice(0, 2)) {
      const chromeVer =
        chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
      userAgents.push(
        `Mozilla/5.0 (Linux; Android ${androidVer}; ${device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Mobile Safari/537.36`,
      );
    }
  }

  // Generate Safari on iOS (20 variations)
  const iosDevices = ['iPhone', 'iPad'];
  for (const device of iosDevices) {
    for (const iosVer of iosVersions) {
      for (const safariVer of safariVersions.slice(0, 2)) {
        userAgents.push(
          `Mozilla/5.0 (${device}; CPU ${device} OS ${iosVer} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${safariVer} Mobile/15E148 Safari/604.1`,
        );
      }
    }
  }

  // Generate Opera User-Agents (10 variations)
  for (const winVer of windowsVersions) {
    for (const chromeVer of chromeVersions.slice(0, 5)) {
      userAgents.push(
        `Mozilla/5.0 (Windows NT ${winVer}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36 OPR/106.0.0.0`,
      );
    }
  }

  // Generate Brave User-Agents (10 variations)
  for (const winVer of windowsVersions) {
    for (const chromeVer of chromeVersions.slice(0, 5)) {
      userAgents.push(
        `Mozilla/5.0 (Windows NT ${winVer}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36 Brave/${chromeVer}`,
      );
    }
  }

  // Remove duplicates and shuffle
  const uniqueAgents: string[] = [];
  const seen = new Set<string>();
  for (const agent of userAgents) {
    if (!seen.has(agent)) {
      seen.add(agent);
      uniqueAgents.push(agent);
    }
  }
  return uniqueAgents.sort(() => Math.random() - 0.5);
}

/**
 * List of User-Agents for different browsers/devices
 * Generated lazily to avoid performance issues on module load
 */
let USER_AGENTS_CACHE: string[] | null = null;

function getUserAgents(): string[] {
  if (!USER_AGENTS_CACHE) {
    USER_AGENTS_CACHE = generateUserAgents();
  }
  return USER_AGENTS_CACHE;
}

/**
 * Accept-Language headers for different regions
 */
const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9',
  'en-GB,en;q=0.9',
  'es-ES,es;q=0.9,en;q=0.8',
  'fr-FR,fr;q=0.9,en;q=0.8',
  'de-DE,de;q=0.9,en;q=0.8',
  'pt-BR,pt;q=0.9,en;q=0.8',
  'ja-JP,ja;q=0.9,en;q=0.8',
  'zh-CN,zh;q=0.9,en;q=0.8',
];

/**
 * Get a random User-Agent
 */
export function getRandomUserAgent(): string {
  const agents = getUserAgents();
  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Get a random Accept-Language header
 */
export function getRandomAcceptLanguage(): string {
  return ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
}

/**
 * Generate headers that simulate a different device/browser
 */
export function getRandomHeaders(): Record<string, string> {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept-Language': getRandomAcceptLanguage(),
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
}

/**
 * Rotate User-Agent and headers for each request
 * This creates a pool of "virtual devices" to avoid rate limits
 * Uses atomic counter for thread-safe rotation when multiple requests happen in parallel
 */
class UserAgentRotator {
  private currentIndex = 0;
  private readonly pool: Array<{ userAgent: string; acceptLanguage: string }> =
    [];

  constructor() {
    // Create a large pool of different device profiles (150-200 different "devices")
    // This ensures we have enough unique identities to avoid rate limits
    // Lazy initialization to avoid performance issues
    const agents = getUserAgents();
    const poolSize = Math.min(200, agents.length);
    for (let i = 0; i < poolSize; i++) {
      // Use different User-Agents from the pool, cycling through them
      const userAgentIndex = i % agents.length;
      this.pool.push({
        userAgent: agents[userAgentIndex],
        acceptLanguage:
          ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)],
      });
    }
    // Shuffle the pool to randomize the order
    for (let i = this.pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pool[i], this.pool[j]] = [this.pool[j], this.pool[i]];
    }
  }

  /**
   * Get next User-Agent from the pool (round-robin, thread-safe)
   * Each call returns a different User-Agent to simulate different devices
   */
  getNextUserAgent(): string {
    // Use atomic increment to ensure each request gets a different User-Agent
    // even when called in parallel
    const index = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.pool.length;
    return this.pool[index].userAgent;
  }

  /**
   * Get next Accept-Language from the pool
   */
  getNextAcceptLanguage(): string {
    const index = this.currentIndex;
    return this.pool[index].acceptLanguage;
  }

  /**
   * Get headers for next request (simulates different device)
   * Each call returns headers with a different User-Agent to avoid rate limits
   */
  getNextHeaders(): Record<string, string> {
    const index = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.pool.length;

    const headers = {
      'User-Agent': this.pool[index].userAgent,
      'Accept-Language': this.pool[index].acceptLanguage,
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };
    return headers;
  }
}

// Singleton instance
export const userAgentRotator = new UserAgentRotator();
