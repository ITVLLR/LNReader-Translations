/* global Buffer, RequestInit */

import { parse as parseProto } from 'protobufjs';

type FetchInit = {
  headers?: Record<string, string | undefined> | Headers;
  method?: string;
  body?: FormData | string;
  [x: string]:
    | string
    | Record<string, string | undefined>
    | undefined
    | FormData
    | Headers;
};

const makeInit = async (init?: FetchInit) => {
  const defaultHeaders: Record<string, string> = {
    'Connection': 'keep-alive',
    'Accept': '*/*',
    'Accept-Language': '*',
    'Sec-Fetch-Mode': 'cors',
    'Accept-Encoding': 'gzip, deflate, br', // Added br for better compression
  };
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      for (const [name, value] of Object.entries(defaultHeaders)) {
        if (!init.headers.get(name)) init.headers.set(name, value);
      }
    } else {
      init.headers = {
        ...defaultHeaders,
        ...init.headers,
      };
    }
  } else {
    init = {
      ...init,
      headers: defaultHeaders,
    };
  }
  return init;
};

/**
 * Retry logic for failed requests
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on server errors (5xx) but not on client errors (4xx)
      if (!response.ok && response.status >= 500 && attempt < maxRetries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, retryDelay * (attempt + 1)),
        );
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort (timeout) or if it's the last attempt
      if (lastError.name === 'AbortError' || attempt === maxRetries - 1) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve =>
        setTimeout(resolve, retryDelay * (attempt + 1)),
      );
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Fetch API for plugin operations (novel search, chapter fetching, etc.)
 * NOTE: This does NOT use rotating User-Agents - those are ONLY for translation requests
 * Includes automatic retry logic and better error handling
 * @param url
 * @param init
 * @param options Optional: cacheKey for caching, skipRetry to disable retry logic
 * @returns response as normal fetch
 */
export async function fetchApi(
  url: string,
  init?: FetchInit,
  options?: { cacheKey?: string; skipRetry?: boolean },
): Promise<Response> {
  init = await makeInit(init);

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(url, init);
  }

  // Use retry logic unless explicitly disabled
  if (options?.skipRetry) {
    return await fetch(url, init as RequestInit);
  }

  return await fetchWithRetry(url, init as RequestInit);
}

/**
 *
 * @param url
 * @param init
 * @returns base64 string of file
 * @example fetchFile('https://avatars.githubusercontent.com/u/81222734?s=48&v=4');
 */
export const fetchFile = async function (url: string, init?: FetchInit) {
  init = await makeInit(init);
  console.log(url, init);
  try {
    const res = await fetch(url, init as RequestInit);
    if (!res.ok) return '';
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (e) {
    return '';
  }
};

/**
 *
 * @param url
 * @param init
 * @param encoding default: `utf-8`. link: https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/encoding
 * @returns plain text
 * @example fetchText('https://github.com/LNReader/lnreader', {}, 'gbk');
 */
export const fetchText = async function (
  url: string,
  init?: FetchInit,
  encoding?: string,
): Promise<string> {
  init = await makeInit(init);
  console.log(url, init);
  try {
    const res = await fetch(url, init as RequestInit);
    if (!res.ok) return '';
    const arrayBuffer = await res.arrayBuffer();
    const decoder = new TextDecoder(encoding);
    return decoder.decode(arrayBuffer);
  } catch (e) {
    return '';
  }
};

type ProtoRequestInit = {
  // merged .proto file
  proto: string;
  requestType: string;
  requestData?: any;
  responseType: string;
};

const BYTE_MARK = BigInt((1 << 8) - 1);

export const fetchProto = async function <ReturnType>(
  protoInit: ProtoRequestInit,
  url: string,
  init?: FetchInit,
) {
  const protoRoot = parseProto(protoInit.proto).root;
  const RequestMessge = protoRoot.lookupType(protoInit.requestType);
  if (RequestMessge.verify(protoInit.requestData)) {
    throw new Error('Invalid Proto');
  }
  // encode request data
  const encodedrequest = RequestMessge.encode(protoInit.requestData).finish();
  const requestLength = BigInt(encodedrequest.length);
  const headers = new Uint8Array(
    Array(5)
      .fill(0)
      .map((v, idx) => {
        if (idx === 0) return 0;
        return Number((requestLength >> BigInt(8 * (5 - idx - 1))) & BYTE_MARK);
      }),
  );
  init = await makeInit(init);
  const bodyArray = new Uint8Array(headers.length + encodedrequest.length);
  bodyArray.set(headers, 0);
  bodyArray.set(encodedrequest, headers.length);
  return fetch(url, {
    method: 'POST',
    ...init,
    body: bodyArray,
  } as RequestInit)
    .then(r => r.arrayBuffer())
    .then(arr => {
      // decode response data
      const payload = new Uint8Array(arr);
      const length = Number(
        BigInt(payload[1] << 24) |
          BigInt(payload[2] << 16) |
          BigInt(payload[3] << 8) |
          BigInt(payload[4]),
      );
      const ResponseMessage = protoRoot.lookupType(protoInit.responseType);
      return ResponseMessage.decode(payload.slice(5, 5 + length));
    }) as ReturnType;
};
