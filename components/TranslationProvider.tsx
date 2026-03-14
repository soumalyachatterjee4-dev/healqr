/**
 * TranslationProvider — Automatic DOM-Level Real-Time Translation
 *
 * Wraps any section of the app and automatically translates ALL visible text
 * into the target language. No manual tagging needed — developers write plain English.
 *
 * How it works:
 * 1. MutationObserver watches for DOM changes (new text, React re-renders)
 * 2. Collects all visible text nodes
 * 3. Applies cached translations instantly (zero flash)
 * 4. Batches uncached texts → single Cloud Function call (Gemini 2.5 Flash)
 * 5. Updates DOM with translated text
 * 6. Caches in IndexedDB for instant loads next time
 *
 * What it skips: numbers, IDs, phone numbers, URLs, abbreviations,
 * SCRIPT/STYLE/CODE elements, and elements with data-no-translate.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { aiTranslateBatch, type AILanguage } from '../services/aiTranslationService';

interface TranslationProviderProps {
  language: string;
  children: React.ReactNode;
}

// ─── Global translation cache (survives component remounts) ───
const translationCache = new Map<string, string>(); // "lang::text" → translated

// Currently in-flight texts (prevent duplicate requests)
const pendingTexts = new Set<string>();

// ─── Skip rules ───
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'CODE', 'PRE', 'SVG', 'NOSCRIPT', 'IFRAME',
]);

function shouldSkipText(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return true;
  if (/^\d[\d\s.,/:%-]*$/.test(t)) return true;             // Pure numbers/dates
  if (/^[A-Z]{2,6}$/.test(t)) return true;                   // Abbreviations (MBBS, MD)
  if (/^#[A-Z0-9-]+$/i.test(t)) return true;                 // IDs (#HQL-123456)
  if (/^[+]?\d[\d\s()-]{6,}$/.test(t)) return true;          // Phone numbers
  if (/^https?:\/\//i.test(t)) return true;                   // URLs
  if (/^[^\p{L}\s]+$/u.test(t)) return true;                 // Pure symbols/punctuation
  if (/^[\d.]+\/[\d.]+$/.test(t)) return true;               // Ratios like "4.5/5"
  if (/^\d+\s*[xX×]\s*\d+$/.test(t)) return true;           // Dimensions
  if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(t) && t.split(' ').length <= 3 && !/\b(the|and|for|of|to|in|at|by|or|is|are|was|has|had|it|its|this|that|with|on|an|not|but|all|can|had|her|his|him|one|our|out|you|who|get|did|new|now|old|see|way|may|any|two|how|my)\b/i.test(t)) {
    return true; // Likely proper names (Dr. Anika Sharma) - 2-3 capitalized words with no common English words
  }
  return false;
}

function isSkippedElement(node: Node): boolean {
  let el: Element | null =
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute('data-no-translate')) return true;
    if (el.getAttribute('contenteditable') === 'true') return true;
    el = el.parentElement;
  }
  return false;
}

// ─── Batch size limit (Cloud Function accepts max 50 texts) ───
const MAX_BATCH_SIZE = 50;

export function TranslationProvider({ language, children }: TranslationProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textNodesQueue = useRef<Text[]>([]);
  const placeholderQueue = useRef<HTMLElement[]>([]);

  const observerConfig: MutationObserverInit = {
    childList: true,
    subtree: true,
    characterData: true,
  };

  // ─── Apply cached translations + queue uncached ───
  const collectTextNodes = useCallback((root: Node) => {
    if (language === 'english') return;
    const lang = language as AILanguage;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        if (isSkippedElement(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let hasNew = false;
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const fullText = textNode.textContent || '';
      const trimmed = fullText.trim();
      if (!trimmed || shouldSkipText(trimmed)) continue;

      const cacheKey = `${lang}::${trimmed}`;

      // Instant apply from cache
      if (translationCache.has(cacheKey)) {
        const translated = translationCache.get(cacheKey)!;
        if (translated !== trimmed) {
          textNode.textContent = fullText.replace(trimmed, translated);
        }
        continue;
      }

      // Queue for batch (skip if already pending)
      if (!pendingTexts.has(cacheKey)) {
        textNodesQueue.current.push(textNode);
        hasNew = true;
      }
    }

    // Also collect placeholder attributes on inputs
    if (root instanceof Element || root instanceof Document) {
      const inputs = (root as Element).querySelectorAll?.('input[placeholder], textarea[placeholder]') || [];
      inputs.forEach((el) => {
        const placeholder = (el as HTMLInputElement).placeholder?.trim();
        if (!placeholder || shouldSkipText(placeholder) || isSkippedElement(el)) return;

        const cacheKey = `${lang}::${placeholder}`;
        if (translationCache.has(cacheKey)) {
          (el as HTMLInputElement).placeholder = translationCache.get(cacheKey)!;
        } else if (!pendingTexts.has(cacheKey)) {
          placeholderQueue.current.push(el as HTMLElement);
          hasNew = true;
        }
      });
    }

    if (hasNew) {
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(flushBatch, 150);
    }
  }, [language]);

  // ─── Flush batch: translate + apply ───
  const flushBatch = useCallback(async () => {
    if (language === 'english') return;
    const lang = language as AILanguage;

    // Snapshot queues
    const textNodes = [...textNodesQueue.current];
    const placeholderEls = [...placeholderQueue.current];
    textNodesQueue.current = [];
    placeholderQueue.current = [];

    // Collect unique texts and map back to their nodes
    const textToNodes = new Map<string, Text[]>();
    const textToPlaceholders = new Map<string, HTMLElement[]>();

    for (const node of textNodes) {
      if (!node.parentNode) continue; // Node removed from DOM
      const text = node.textContent?.trim();
      if (!text || shouldSkipText(text)) continue;
      const cacheKey = `${lang}::${text}`;
      if (translationCache.has(cacheKey) || pendingTexts.has(cacheKey)) continue;
      if (!textToNodes.has(text)) textToNodes.set(text, []);
      textToNodes.get(text)!.push(node);
    }

    for (const el of placeholderEls) {
      const text = (el as HTMLInputElement).placeholder?.trim();
      if (!text || shouldSkipText(text)) continue;
      const cacheKey = `${lang}::${text}`;
      if (translationCache.has(cacheKey) || pendingTexts.has(cacheKey)) continue;
      if (!textToPlaceholders.has(text)) textToPlaceholders.set(text, []);
      textToPlaceholders.get(text)!.push(el);
    }

    const uniqueTexts = [...new Set([...textToNodes.keys(), ...textToPlaceholders.keys()])];
    if (uniqueTexts.length === 0) return;

    // Mark as pending
    uniqueTexts.forEach((t) => pendingTexts.add(`${lang}::${t}`));

    // Split into chunks of MAX_BATCH_SIZE
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueTexts.length; i += MAX_BATCH_SIZE) {
      chunks.push(uniqueTexts.slice(i, i + MAX_BATCH_SIZE));
    }

    for (const chunk of chunks) {
      try {
        const results = await aiTranslateBatch(chunk, lang, 'ui');

        // Disconnect observer while modifying DOM
        observerRef.current?.disconnect();

        results.forEach((result, i) => {
          const original = chunk[i];
          const cacheKey = `${lang}::${original}`;
          translationCache.set(cacheKey, result.translated);
          pendingTexts.delete(cacheKey);

          // Update text nodes
          const nodes = textToNodes.get(original) || [];
          for (const node of nodes) {
            if (node.parentNode && node.textContent) {
              node.textContent = node.textContent.replace(original, result.translated);
            }
          }

          // Update placeholders
          const els = textToPlaceholders.get(original) || [];
          for (const el of els) {
            (el as HTMLInputElement).placeholder = result.translated;
          }
        });

        // Reconnect observer
        if (containerRef.current && observerRef.current) {
          observerRef.current.observe(containerRef.current, observerConfig);
        }
      } catch (error) {
        console.error('Auto-translation failed:', error);
        chunk.forEach((t) => pendingTexts.delete(`${lang}::${t}`));

        // Reconnect observer even on error
        if (containerRef.current && observerRef.current) {
          observerRef.current.observe(containerRef.current, observerConfig);
        }
      }
    }
  }, [language]);

  // ─── Main effect: observe DOM ───
  useEffect(() => {
    if (!containerRef.current || language === 'english') return;

    // Initial pass to translate existing content
    collectTextNodes(containerRef.current);

    // Delayed re-scan to catch texts from async React renders / data fetching
    const rescanTimer = setTimeout(() => {
      if (containerRef.current) collectTextNodes(containerRef.current);
    }, 1500);

    // Watch for new content
    const observer = new MutationObserver((mutations) => {
      let hasNewNodes = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim();
              if (text && !shouldSkipText(text) && !isSkippedElement(node)) {
                textNodesQueue.current.push(node as Text);
                hasNewNodes = true;
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              collectTextNodes(node);
              hasNewNodes = true;
            }
          });
        } else if (mutation.type === 'characterData') {
          const text = mutation.target.textContent?.trim();
          if (text && !shouldSkipText(text) && !isSkippedElement(mutation.target)) {
            textNodesQueue.current.push(mutation.target as Text);
            hasNewNodes = true;
          }
        }
      }

      if (hasNewNodes && textNodesQueue.current.length > 0) {
        if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
        batchTimerRef.current = setTimeout(flushBatch, 150);
      }
    });

    observerRef.current = observer;
    observer.observe(containerRef.current, observerConfig);

    return () => {
      observer.disconnect();
      observerRef.current = null;
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      clearTimeout(rescanTimer);
    };
  }, [language, collectTextNodes, flushBatch]);

  // Always use div wrapper to avoid Fragment→div switch which
  // causes React to rebuild the entire child tree and break observers.
  // When English, the useEffect simply won't activate translation.
  return <div ref={containerRef}>{children}</div>;
}

