/**
 * GEOMETRIA KADRU - wspólna dla audytu, narzędzia kadrowania i generatora.
 *
 * Trzy funkcje muszą dawać identyczny wynik we wszystkich trzech miejscach,
 * inaczej raport obiecuje wariant, którego generator nie zrobi, a narzędzie
 * pokazuje zapas, którego nie ma. Dlatego mieszkają w jednym pliku.
 */

/** Największy prostokąt o zadanej proporcji mieszczący się w `size`. */
export function maxInscribed(size, ratio) {
  const want = ratio[0] / ratio[1]
  const have = size.w / size.h
  return have > want
    ? { w: Math.floor(size.h * want), h: size.h }
    : { w: size.w, h: Math.floor(size.w / want) }
}

/**
 * Szerokość źródła wymagana, żeby dany kadr wyszedł w swojej największej
 * szerokości. Wzór wyprowadzony w `source.mjs`; tutaj żyje jego jedyna
 * implementacja, żeby audyt i normalizacja nie rozjechały się o zaokrąglenie.
 */
export function requiredSourceWidth({ sourceSize, ratio, width, headroom = 1 }) {
  const A = sourceSize.w / sourceSize.h
  const a = ratio[0] / ratio[1]
  return Math.ceil(width * Math.max(1, A / a) * headroom)
}

/**
 * Drabina powiększenia liczona Z PROPORCJI ŹRÓDŁA.
 *
 * Sufit dotyczy DŁUŻSZEJ krawędzi, nie szerokości. Dla pionu 2:3 sufit 2560 px
 * na wysokości oznacza 1707 px szerokości - i to jest poprawny największy
 * wariant, a nie brak. Drabina liczona na sztywno w szerokościach zgłaszałaby
 * każdy pion jako niekompletny.
 */
export function lightboxLadder(size, ceilings) {
  const landscape = size.w >= size.h
  const widths = ceilings
    .map((edge) => (landscape ? edge : Math.round(edge * (size.w / size.h))))
    .map((w) => Math.min(w, size.w))
    .filter((w) => w > 0)
  return [...new Set(widths)].sort((x, y) => x - y)
}

/** Werdykt wykonalności kadru - trzy stany, zgodnie z ustaleniem. */
export const VERDICT = {
  OK:     { rank: 2, label: 'OK' },
  CIASNY: { rank: 1, label: 'CIASNY' },
  ZLE:    { rank: 0, label: 'ZŁE DOPASOWANIE' }
}

/**
 * Werdykt dla jednego kadru.
 *
 * `rect` - prostokąt z `crops.json`, jeśli już jest. Bez niego liczymy dla
 * największego możliwego prostokąta, czyli w najlepszym przypadku: jeśli już
 * tam jest ZŁE DOPASOWANIE, to żadne zaznaczenie tego nie uratuje.
 *
 * ZŁE DOPASOWANIE ma dwie drogi i jeden wniosek - potrzebne inne zdjęcie:
 *   · po kadrze zostaje mniej niż `badFitAreaPct` powierzchni źródła
 *   · kadr nie wychodzi nawet przy największym prostokącie (za mało pikseli)
 *
 * Ta funkcja jest czystą matematyką i nie importuje niczego z node - liczy ją
 * zarówno audyt, jak i narzędzie do kadrowania w przeglądarce. Dwie
 * implementacje rozjechałyby się przy pierwszej zmianie progu.
 */
export function cropVerdict({ crop, size, rect, thresholds }) {
  const need = Math.max(...crop.widths)
  const box = rect ?? maxInscribed(size, crop.ratio)
  const areaPct = (box.w * box.h) / (size.w * size.h) * 100
  const headroomPct = (box.w / need - 1) * 100

  let verdict = VERDICT.OK
  let why = null

  if (areaPct < thresholds.badFitAreaPct) {
    verdict = VERDICT.ZLE
    why = `po kadrze zostaje ${areaPct.toFixed(0)}% powierzchni źródła (próg ${thresholds.badFitAreaPct}%) - to zdjęcie nie nadaje się do tego miejsca, potrzebne inne`
  } else if (box.w < need) {
    verdict = VERDICT.ZLE
    why = `kadr daje ${box.w} px, potrzeba ${need} px - brakuje ${need - box.w} px i nie da się tego odzyskać kadrowaniem`
  } else if (headroomPct < thresholds.tightHeadroomPct) {
    verdict = VERDICT.CIASNY
    why = `zapas ${headroomPct.toFixed(0)}% (próg ${thresholds.tightHeadroomPct}%) - każde ciaśniejsze zaznaczenie zejdzie poniżej ${need} px`
  }

  return { verdict, why, need, box, areaPct, headroomPct }
}
