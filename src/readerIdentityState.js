export const READER_TRAIT_GROUPS = [
  {
    key: "how_i_read",
    label: "Cómo leo",
    options: [
      ["multiple_at_once", "Siempre tengo varios abiertos"],
      ["underline_memorable", "Subrayo lo que me queda"],
      ["one_at_a_time", "Leo de a un libro"],
      ["daily_ritual", "Leo un rato cada día"],
      ["single_sitting", "Prefiero leer de un tirón"],
      ["reread_favorites", "Vuelvo a mis favoritos"],
      ["take_notes", "Tomo notas al margen"],
      ["follow_mood", "Elijo según el ánimo"],
    ],
  },
  {
    key: "what_i_seek",
    label: "Qué busco",
    options: [
      ["make_me_think", "Que me haga pensar"],
      ["companionship", "Una historia que acompañe"],
      ["surprise_me", "Que me sorprenda"],
      ["move_me", "Que me emocione"],
      ["learn_something", "Aprender algo nuevo"],
      ["other_worlds", "Viajar a otros mundos"],
      ["make_me_laugh", "Reírme"],
      ["spark_conversation", "Tener algo para conversar"],
    ],
  },
  {
    key: "book_relationship",
    label: "Mi vínculo con los libros",
    options: [
      ["love_recommending", "Me encanta recomendar"],
      ["discover_new_authors", "Busco autores nuevos"],
      ["loyal_to_authors", "Soy fiel a mis autores"],
      ["classic_lover", "Tengo debilidad por los clásicos"],
      ["follow_new_releases", "Sigo las novedades"],
      ["special_editions", "Busco ediciones especiales"],
      ["share_readings", "Disfruto compartir lecturas"],
      ["choose_by_intuition", "Elijo por intuición"],
    ],
  },
];

const TRAIT_CODES = new Map(READER_TRAIT_GROUPS.map((group) => [group.key, new Set(group.options.map(([code]) => code))]));

export function normalizeReaderTraits(value = {}) {
  return Object.fromEntries(READER_TRAIT_GROUPS.map((group) => [
    group.key,
    Array.isArray(value?.[group.key])
      ? value[group.key].filter((code, index, items) => typeof code === "string" && TRAIT_CODES.get(group.key).has(code) && items.indexOf(code) === index).slice(0, 2)
      : [],
  ]));
}

export function toggleReaderTrait(traits, groupKey, traitCode) {
  const normalized = normalizeReaderTraits(traits);
  if (!TRAIT_CODES.get(groupKey)?.has(traitCode)) return normalized;
  const selected = normalized[groupKey];
  if (selected.includes(traitCode)) return { ...normalized, [groupKey]: selected.filter((code) => code !== traitCode) };
  if (selected.length >= 2) return normalized;
  return { ...normalized, [groupKey]: [...selected, traitCode] };
}

export function hasReaderTraits(traits) {
  const normalized = normalizeReaderTraits(traits);
  return READER_TRAIT_GROUPS.some((group) => normalized[group.key].length > 0);
}

export function readerTraitLabel(groupKey, traitCode) {
  return READER_TRAIT_GROUPS.find((group) => group.key === groupKey)?.options.find(([code]) => code === traitCode)?.[1] || traitCode;
}

export function deriveReaderMonogram(displayName = "") {
  const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "L";
  return `${parts[0][0] || ""}${parts.length > 1 ? parts[parts.length - 1][0] || "" : ""}`.toLocaleUpperCase("es-AR");
}
