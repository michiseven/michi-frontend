import { findVerifiedAirport } from "./airports";
import type { Language } from "./i18n";

const KOREAN_PLACE_NAMES: Record<string, string> = {
  "[MOCK] 静かなカフェ": "[MOCK] 조용한 카페",
  "[MOCK] セレクトショップ": "[MOCK] 편집숍",
  "[MOCK] 焼肉店": "[MOCK] 고깃집",
  "[MOCK] ソウルの公園": "[MOCK] 서울의 공원",
};

const KOREAN_TEXT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ["[MOCK] 焼肉店는", "[MOCK] 고깃집은"],
  ["[MOCK] 静かなカフェ", "[MOCK] 조용한 카페"],
  ["[MOCK] セレクトショップ", "[MOCK] 편집숍"],
  ["[MOCK] 焼肉店", "[MOCK] 고깃집"],
  ["[MOCK] ソウルの公園", "[MOCK] 서울의 공원"],
  ["静かなカフェ", "조용한 카페"],
  ["セレクトショップ", "편집숍"],
  ["焼肉店", "고깃집"],
  ["ソウルの公園", "서울의 공원"],
  ["MOCK_NORMAL", "보통(모의 데이터)"],
  ["고깃집는", "고깃집은"],
];

const CATEGORY_LABELS: Record<Language, Record<string, string>> = {
  ko: {
    cafe: "카페",
    restaurant: "음식점",
    shopping: "쇼핑",
    select_shop: "편집숍",
    attraction: "관광지",
    culture: "문화",
    leisure: "레저",
    park: "공원",
    museum: "박물관",
  },
  ja: {
    cafe: "カフェ",
    restaurant: "飲食店",
    shopping: "ショッピング",
    select_shop: "セレクトショップ",
    attraction: "観光地",
    culture: "文化",
    leisure: "レジャー",
    park: "公園",
    museum: "博物館",
  },
};

function koreanAlias(name: string): string | null {
  const matches = name.matchAll(/[（(]([^）)]*[가-힣][^）)]*)[）)]/gu);
  let lastAlias: string | null = null;
  for (const match of matches) {
    const alias = match[1]?.trim();
    if (alias) lastAlias = alias;
  }
  return lastAlias;
}

export function localizePlaceName(name: string, lang: Language): string {
  const verifiedAirport = findVerifiedAirport(name);
  if (verifiedAirport) {
    return lang === "ja" ? verifiedAirport.nameJa : verifiedAirport.nameKo;
  }
  if (lang !== "ko") return name;
  return KOREAN_PLACE_NAMES[name] ?? koreanAlias(name) ?? name;
}

export function localizePlaceText(text: string, lang: Language): string {
  if (lang !== "ko") return text;
  return KOREAN_TEXT_REPLACEMENTS.reduce(
    (localized, [source, target]) => localized.replaceAll(source, target),
    text,
  );
}

export function localizeCategory(category: string | null | undefined, lang: Language): string | null {
  if (!category) return null;
  return CATEGORY_LABELS[lang][category.toLowerCase()] ?? category;
}
