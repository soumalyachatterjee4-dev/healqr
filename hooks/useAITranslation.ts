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

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Language } from '../utils/translations';

// Session-wide cache shared across all hook instances
const dynamicCache = new Map<string, string>();

// Track in-flight translations to avoid duplicate API calls
const pendingTranslations = new Map<string, Promise<string>>();

// Core languages with hardcoded translations — skip AI for these
const CORE_LANGUAGES: Language[] = [
  'english', 'hindi', 'bengali', 'marathi', 'tamil', 'telugu',
  'gujarati', 'kannada', 'malayalam', 'punjabi', 'assamese'
];

function needsAI(language: Language): boolean {
  return !CORE_LANGUAGES.includes(language);
}

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
    console.warn('Dynamic batch translation failed:', error);
    // Cache originals on failure to prevent re-attempts
    for (const text of texts) {
      dynamicCache.set(`${language}::${text}`, text);
    }
  }
}

/**
 * Translate a single text dynamically (with deduplication)
 */
async function translateSingle(text: string, language: Language): Promise<string> {
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
      dynamicCache.set(cacheKey, text);
      return text;
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
  const isEnglishOrCore = language === 'english' || !needsAI(language);

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
    if (isEnglishOrCore) return englishText; // Core languages use t() hardcoded
    
    const cacheKey = `${language}::${englishText}`;
    const cached = dynamicCache.get(cacheKey);
    if (cached) return cached;
    
    // Queue for batch translation and return English as placeholder
    queueTranslation(englishText);
    return englishText;
  }, [language, isEnglishOrCore, queueTranslation]);

  /**
   * Preload an array of texts all at once (call in useEffect)
   */
  const preload = useCallback(async (texts: string[]) => {
    if (isEnglishOrCore) return;
    
    const uncached = texts.filter(t => !dynamicCache.has(`${language}::${t}`));
    if (uncached.length === 0) return;
    
    await batchTranslateAndCache(uncached, language);
    forceUpdate(n => n + 1);
  }, [language, isEnglishOrCore]);

  return { dt, preload };
}

export default useAITranslation;
