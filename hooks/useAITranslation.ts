/**
 * useAITranslation Hook — Dynamic real-time translation for any text
 *
 * Instead of hardcoding translation dictionaries, this hook uses
 * Gemini AI to translate any English text to the selected language.
 * Results are cached in-memory and IndexedDB for performance.
 *
 * Usage:
 *   const { dt } = useAITranslation(language);
 *   return <h1>{dt('Find Your Doctor')}</h1>;
 */

import { useState, useEffect, useCallback, useRef, createElement, Fragment } from 'react';
import type { ReactNode } from 'react';
import type { Language } from '../utils/translations';

// Session-wide cache shared across all hook instances
const dynamicCache = new Map<string, string>();

// Track in-flight translations to avoid duplicate API calls
const pendingTranslations = new Map<string, Promise<string>>();

// All non-English languages use AI translation via dt()

/**
 * Batch translate multiple texts via Gemini and cache results
 */
async function batchTranslateAndCache(
  texts: string[],
  language: Language
): Promise<void> {
  if (texts.length === 0) return;

  try {
    const { aiTranslateBatch } = await import('../services/aiTranslationService');
    const results = await aiTranslateBatch(texts, language as any, 'ui');

    for (let i = 0; i < results.length; i++) {
      const cacheKey = `${language}::${texts[i]}`;
      dynamicCache.set(cacheKey, results[i].translated);
    }
  } catch (error) {
    console.warn('Gemini batch translation failed, trying Google Translate:', error);
    try {
      const { googleTranslateBatch } = await import('../services/googleTranslateService');
      const translations = await googleTranslateBatch(texts, language);
      for (let i = 0; i < translations.length; i++) {
        dynamicCache.set(`${language}::${texts[i]}`, translations[i]);
      }
    } catch (fallbackError) {
      console.warn('Google Translate fallback also failed:', fallbackError);
      for (const text of texts) {
        dynamicCache.set(`${language}::${text}`, text);
      }
    }
  }
}

/**
 * Translate a single text dynamically (with deduplication)
 */
export async function translateSingle(text: string, language: Language): Promise<string> {
  const cacheKey = `${language}::${text}`;

  // Already cached
  const cached = dynamicCache.get(cacheKey);
  if (cached) return cached;

  // Already in flight
  const pending = pendingTranslations.get(cacheKey);
  if (pending) return pending;

  // Start new translation
  const promise = (async () => {
    try {
      const { aiTranslate } = await import('../services/aiTranslationService');
      const result = await aiTranslate(text, language as any, 'ui');
      dynamicCache.set(cacheKey, result.translated);
      return result.translated;
    } catch {
      try {
        const { googleTranslate } = await import('../services/googleTranslateService');
        const translated = await googleTranslate(text, language);
        dynamicCache.set(cacheKey, translated);
        return translated;
      } catch {
        dynamicCache.set(cacheKey, text);
        return text;
      }
    } finally {
      pendingTranslations.delete(cacheKey);
    }
  })();

  pendingTranslations.set(cacheKey, promise);
  return promise;
}

/**
 * React hook for dynamic AI translation
 *
 * @param language - Target language
 * @returns { dt } - Dynamic translate function (returns cached or English while loading)
 */
export function useAITranslation(language: Language) {
  const [, forceUpdate] = useState(0);
  const batchQueue = useRef<Set<string>>(new Set());
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEnglish = language === 'english';

  // Batch flush: translate all queued texts at once
  const flushBatch = useCallback(async () => {
    if (batchQueue.current.size === 0) return;

    const textsToTranslate = Array.from(batchQueue.current);
    batchQueue.current.clear();

    await batchTranslateAndCache(textsToTranslate, language);
    forceUpdate(n => n + 1); // Re-render with translated values
  }, [language]);

  // Queue a text for batch translation
  const queueTranslation = useCallback((text: string) => {
    const cacheKey = `${language}::${text}`;
    if (dynamicCache.has(cacheKey)) return;

    batchQueue.current.add(text);

    // Debounce: collect all texts from this render cycle, then batch translate
    if (batchTimer.current) clearTimeout(batchTimer.current);
    batchTimer.current = setTimeout(flushBatch, 50);
  }, [language, flushBatch]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, []);

  /**
   * Dynamic translate function
   * Returns cached translation immediately, or English text while loading
   * Automatically queues uncached texts for batch translation
   */
  const dt = useCallback((englishText: string): string => {
    if (!englishText) return englishText;
    if (isEnglish) return englishText;

    const cacheKey = `${language}::${englishText}`;
    const cached = dynamicCache.get(cacheKey);
    if (cached) return cached;

    // Queue for batch translation and return English as placeholder
    queueTranslation(englishText);
    return englishText;
  }, [language, isEnglish, queueTranslation]);

  /**
   * Bilingual translate function
   * Returns English text + translated text below (smaller, dimmer)
   * For visible labels, headers, buttons — NOT for placeholders/attributes
   */
  const bt = useCallback((englishText: string): ReactNode => {
    if (!englishText) return englishText;
    if (isEnglish) return englishText;

    const cached = dynamicCache.get(`${language}::${englishText}`);
    if (cached && cached !== englishText) {
      return createElement(Fragment, null,
        englishText,
        createElement('span', {
          className: 'block text-xs opacity-70',
          style: { lineHeight: '1.3' },
        }, cached)
      );
    }

    // Queue for translation, return English only until loaded
    queueTranslation(englishText);
    return englishText;
  }, [language, isEnglish, queueTranslation]);

  /**
   * Preload an array of texts all at once (call in useEffect)
   */
  const preload = useCallback(async (texts: string[]) => {
    if (isEnglish) return;

    const uncached = texts.filter(t => !dynamicCache.has(`${language}::${t}`));
    if (uncached.length === 0) return;

    await batchTranslateAndCache(uncached, language);
    forceUpdate(n => n + 1);
  }, [language, isEnglish]);

  return { dt, bt, preload };
}

export default useAITranslation;
