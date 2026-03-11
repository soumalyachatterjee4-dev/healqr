/**
 * PDF Bilingual Support — Transliteration + Canvas Rendering
 *
 * Renders non-Latin text (Hindi, Bengali, Tamil, etc.) as high-DPI
 * canvas images that can be embedded in jsPDF documents.
 *
 * Flow: English text → AI transliteration → Canvas render → PDF image
 */

import { aiTranslateBatch, type AILanguage, AI_SUPPORTED_LANGUAGES } from '../services/aiTranslationService';

// ─── Script → Google Font mapping ───
const SCRIPT_FONTS: Record<string, string> = {
  Devanagari: 'Noto Sans Devanagari',
  Bengali: 'Noto Sans Bengali',
  Tamil: 'Noto Sans Tamil',
  Telugu: 'Noto Sans Telugu',
  Gujarati: 'Noto Sans Gujarati',
  Kannada: 'Noto Sans Kannada',
  Malayalam: 'Noto Sans Malayalam',
  Gurmukhi: 'Noto Sans Gurmukhi',
  Odia: 'Noto Sans Oriya',
  Arabic: 'Noto Sans Arabic',
  Cyrillic: 'Noto Sans',
  CJK: 'Noto Sans SC',
  Hangul: 'Noto Sans KR',
  'Ol Chiki': 'Noto Sans Ol Chiki',
};

// Track which fonts are loaded
const loadedFonts = new Set<string>();

/**
 * Get the Google Font family name for a language's script.
 * Returns null for Latin-script languages (no special font needed).
 */
export function getScriptFont(language: AILanguage): string | null {
  const langInfo = AI_SUPPORTED_LANGUAGES[language];
  if (!langInfo || langInfo.script === 'Latin') return null;
  return SCRIPT_FONTS[langInfo.script] || null;
}

/**
 * Load a Google Font dynamically via CSS link injection.
 * Uses document.fonts API to wait for actual font availability.
 */
export async function ensureFontLoaded(language: AILanguage): Promise<string | null> {
  const fontFamily = getScriptFont(language);
  if (!fontFamily) return null;
  if (loadedFonts.has(fontFamily)) return fontFamily;

  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  try {
    await document.fonts.load(`16px "${fontFamily}"`);
    loadedFonts.add(fontFamily);
  } catch {
    // Font load failed — will fall back to system fonts
    console.warn(`Failed to load font: ${fontFamily}`);
  }

  return fontFamily;
}

/**
 * Render non-Latin text as a high-DPI PNG image suitable for jsPDF.
 * Returns a dataURL + dimensions in mm (jsPDF default unit).
 */
export function renderNonLatinForPDF(
  text: string,
  fontFamily: string,
  fontSize: number,
  color: string = '#555',
): { dataUrl: string; widthMM: number; heightMM: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const scale = 4; // 4x DPI for crisp rendering
  const fontStr = `${fontSize * scale}px "${fontFamily}", "Noto Sans", sans-serif`;

  // Measure text
  ctx.font = fontStr;
  const metrics = ctx.measureText(text);

  canvas.width = Math.ceil(metrics.width) + 4 * scale;
  canvas.height = Math.ceil(fontSize * 1.6 * scale);

  // Re-set after resize (canvas reset clears state)
  ctx.font = fontStr;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 1 * scale, 2 * scale);

  const dataUrl = canvas.toDataURL('image/png');

  // Convert pixels to mm: 1px ≈ 0.2646mm at 96dpi, divide by scale
  const pxToMM = 25.4 / 96;
  const widthMM = (canvas.width / scale) * pxToMM;
  const heightMM = (canvas.height / scale) * pxToMM;

  return { dataUrl, widthMM, heightMM };
}

/**
 * Transliterate an array of texts (medicine names, instructions)
 * via Gemini AI with 'transliterate' context.
 */
export async function transliterateTexts(
  texts: string[],
  language: AILanguage,
): Promise<string[]> {
  if (language === 'english' || texts.length === 0) return texts;

  try {
    const results = await aiTranslateBatch(texts, language, 'transliterate');
    return results.map(r => r.translated);
  } catch (error) {
    console.error('Transliteration failed:', error);
    return texts; // fallback: return originals
  }
}

/**
 * Check if a language needs non-Latin rendering (canvas images in PDF).
 */
export function needsNonLatinRendering(language: string): boolean {
  const langInfo = AI_SUPPORTED_LANGUAGES[language as AILanguage];
  if (!langInfo) return false;
  return langInfo.script !== 'Latin';
}
