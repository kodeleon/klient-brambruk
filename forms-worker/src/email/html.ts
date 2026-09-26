// Tagged template dla HTML maila. Każda wstawiana wartość jest ESCAPOWANA
// (& < > " '), chyba że jest już bezpiecznym fragmentem (SafeHtml) - czyli
// wynikiem innego html`...` albo jawnego trustedHtml().
//
//   html`<td>${userInput}</td>`         -> escapowane
//   html`<tr>${rows}</tr>`              -> tablica fragmentów, każdy wg tych samych zasad
//   trustedHtml('&nbsp;')               -> surowo; TYLKO stałe z kodu, nigdy dane od użytkownika

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]!)
}

export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value
  }
}

export type HtmlValue = SafeHtml | string | number | null | undefined | false | readonly HtmlValue[]

function toHtml(value: HtmlValue): string {
  if (value instanceof SafeHtml) return value.value
  if (Array.isArray(value)) return value.map(toHtml).join('')
  if (value === null || value === undefined || value === false) return ''
  return escapeHtml(String(value))
}

export function html(strings: TemplateStringsArray, ...values: HtmlValue[]): SafeHtml {
  let out = strings[0]!
  for (let i = 0; i < values.length; i++) out += toHtml(values[i]!) + strings[i + 1]!
  return new SafeHtml(out)
}

/** Surowy HTML bez escapowania. Tylko dla stałych z kodu - NIGDY dla danych od użytkownika. */
export function trustedHtml(markup: string): SafeHtml {
  return new SafeHtml(markup)
}

/** Tekst wielowierszowy: każdy wiersz escapowany, \n -> <br> (działa też w Outlooku). */
export function multiline(text: string): SafeHtml {
  return new SafeHtml(text.split('\n').map(escapeHtml).join('<br>'))
}
