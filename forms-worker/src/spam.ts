// Anty-spam: honeypot, blokada linków, rate limit. Bez CAPTCHA i zewnętrznych skryptów.

/**
 * Pole-pułapka. Front renderuje je niewidoczne (tabindex="-1", autocomplete="off").
 * Człowiek zostawia je puste; niepuste = bot -> 200 bez wysyłki.
 */
export const HONEYPOT_FIELD = '_hp'

export function isHoneypotTripped(value: string): boolean {
  return value !== ''
}

const LINK_PATTERN = /https?:\/\/|www\./i

/** Linki w polach textarea: `http://`, `https://`, `www.` (bez rozróżniania wielkości liter). */
export function containsLink(text: string): boolean {
  return LINK_PATTERN.test(text)
}
