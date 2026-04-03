/**
 * BilingualText — Shows text in both English and translated language
 * Used in booking flow, patient details, and Digital RX contexts.
 * 
 * Only renders bilingual when language is not English.
 * English text shown first (smaller), translated text below (larger/primary).
 */

import React from 'react';

interface BilingualTextProps {
  /** The English text (source) */
  english: string;
  /** The translated text (displayed as primary when available) */
  translated?: string;
  /** Current language */
  language: string;
  /** CSS class for the translated (primary) text */
  className?: string;
  /** CSS class for the English (secondary) text */
  englishClassName?: string;
  /** Whether to show as inline or block */
  inline?: boolean;
}

export function BilingualText({
  english,
  translated,
  language,
  className = 'text-white',
  englishClassName = 'text-zinc-500 text-xs',
  inline = false,
}: BilingualTextProps) {
  // If English or no translation, just show the text
  if (language === 'english' || !translated || translated === english) {
    return <span className={className}>{english}</span>;
  }

  if (inline) {
    return (
      <span>
        <span className={className}>{translated}</span>
        {' '}
        <span className={englishClassName}>({english})</span>
      </span>
    );
  }

  return (
    <div>
      <div className={className}>{translated}</div>
      <div className={englishClassName}>{english}</div>
    </div>
  );
}

/**
 * BilingualLabel — A key-value label with bilingual value
 */
interface BilingualLabelProps {
  label: string;
  value: string;
  translatedValue?: string;
  language: string;
}

export function BilingualLabel({ label, value, translatedValue, language }: BilingualLabelProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-zinc-400 text-xs">{label}</span>
      <BilingualText
        english={value}
        translated={translatedValue}
        language={language}
        className="text-white text-sm font-medium"
        englishClassName="text-zinc-500 text-xs"
      />
    </div>
  );
}
