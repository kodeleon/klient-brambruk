/**
 * IKONY - komplet kształtów użytych w serwisie, wstawianych wprost w HTML.
 *
 * Stary projekt ciągnął `lucide-react`: bibliotekę frameworkową po to, żeby
 * narysować kształt znany w chwili builda. Tutaj kształty są danymi, a rysuje
 * je `Ikona.astro` przy budowaniu - koszt w przeglądarce spada do zera.
 *
 * ŹRÓDŁO: pakiet `lucide-static` 0.562.0 (ta sama wersja, co `lucide-react`
 * w starym projekcie), licencja ISC. Zawartość to wnętrze pliku SVG bez
 * zmian - siatka 24x24, obrys `currentColor`, grubość 2.
 *
 * DOKŁADANIE IKONY: skopiuj wnętrze `node_modules/lucide-static/icons/<nazwa>.svg`
 * i dopisz pozycję niżej. Nie importuj biblioteki ikon do zależności projektu.
 */

export const ikony = {
  'alert-circle':
    `<circle cx="12" cy="12" r="10" /> <line x1="12" x2="12" y1="8" y2="12" /> <line x1="12" x2="12.01" y1="16" y2="16" />`,
  'alert-triangle':
    `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /> <path d="M12 9v4" /> <path d="M12 17h.01" />`,
  'arrow-left':
    `<path d="m12 19-7-7 7-7" /> <path d="M19 12H5" />`,
  'arrow-right':
    `<path d="M5 12h14" /> <path d="m12 5 7 7-7 7" />`,
  'award':
    `<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" /> <circle cx="12" cy="8" r="6" />`,
  'check':
    `<path d="M20 6 9 17l-5-5" />`,
  'check-circle-2':
    `<circle cx="12" cy="12" r="10" /> <path d="m9 12 2 2 4-4" />`,
  'chevron-down':
    `<path d="m6 9 6 6 6-6" />`,
  'chevron-left':
    `<path d="m15 18-6-6 6-6" />`,
  'chevron-right':
    `<path d="m9 18 6-6-6-6" />`,
  'clock':
    `<path d="M12 6v6l4 2" /> <circle cx="12" cy="12" r="10" />`,
  'construction':
    `<rect x="2" y="6" width="20" height="8" rx="1" /> <path d="M17 14v7" /> <path d="M7 14v7" /> <path d="M17 3v3" /> <path d="M7 3v3" /> <path d="M10 14 2.3 6.3" /> <path d="m14 6 7.7 7.7" /> <path d="m8 6 8 8" />`,
  'dollar-sign':
    `<line x1="12" x2="12" y1="2" y2="22" /> <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />`,
  'external-link':
    `<path d="M15 3h6v6" /> <path d="M10 14 21 3" /> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />`,
  'facebook':
    `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />`,
  'grid-3x3':
    `<rect width="18" height="18" x="3" y="3" rx="2" /> <path d="M3 9h18" /> <path d="M3 15h18" /> <path d="M9 3v18" /> <path d="M15 3v18" />`,
  'hammer':
    `<path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" /> <path d="m18 15 4-4" /> <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />`,
  'home':
    `<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /> <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />`,
  'images':
    `<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" /> <path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" /> <circle cx="13" cy="7" r="1" fill="currentColor" /> <rect x="8" y="2" width="14" height="14" rx="2" />`,
  'instagram':
    `<rect width="20" height="20" x="2" y="2" rx="5" ry="5" /> <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /> <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />`,
  'loader-2':
    `<path d="M21 12a9 9 0 1 1-6.219-8.56" />`,
  'mail':
    `<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /> <rect x="2" y="4" width="20" height="16" rx="2" />`,
  'map-pin':
    `<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /> <circle cx="12" cy="10" r="3" />`,
  'maximize-2':
    `<path d="M15 3h6v6" /> <path d="m21 3-7 7" /> <path d="m3 21 7-7" /> <path d="M9 21H3v-6" />`,
  'menu':
    `<path d="M4 5h16" /> <path d="M4 12h16" /> <path d="M4 19h16" />`,
  'minus':
    `<path d="M5 12h14" />`,
  'phone':
    `<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />`,
  'plus':
    `<path d="M5 12h14" /> <path d="M12 5v14" />`,
  'receipt-text':
    `<path d="M13 16H8" /> <path d="M14 8H8" /> <path d="M16 12H8" /> <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" />`,
  'search':
    `<path d="m21 21-4.34-4.34" /> <circle cx="11" cy="11" r="8" />`,
  'send':
    `<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /> <path d="m21.854 2.147-10.94 10.939" />`,
  'shield':
    `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />`,
  'star':
    `<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />`,
  'upload':
    `<path d="M12 3v12" /> <path d="m17 8-5-5-5 5" /> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />`,
  'x':
    `<path d="M18 6 6 18" /> <path d="m6 6 12 12" />`,
} as const

export type NazwaIkony = keyof typeof ikony
