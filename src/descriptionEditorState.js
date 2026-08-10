function normalizeDescriptionLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function formatDescriptionSelection(value, selectionStart, selectionEnd, format, linkUrl = "") {
  const source = typeof value === "string" ? value : "";
  const start = Math.max(0, Math.min(Number.isInteger(selectionStart) ? selectionStart : source.length, source.length));
  const end = Math.max(start, Math.min(Number.isInteger(selectionEnd) ? selectionEnd : start, source.length));
  const selected = source.slice(start, end);

  if (format === "unorderedList" || format === "orderedList") {
    const selectedLines = (selected || "Elemento de lista").split("\n");
    const replacement = selectedLines.map((line, index) => format === "unorderedList" ? `- ${line}` : `${index + 1}. ${line}`).join("\n");
    return { value: `${source.slice(0, start)}${replacement}${source.slice(end)}`, selectionStart: start, selectionEnd: start + replacement.length };
  }

  const text = selected || (format === "link" ? "enlace" : format === "bold" ? "texto en negrita" : "texto en cursiva");
  let replacement;
  let selectionOffset;
  if (format === "bold") {
    replacement = `**${text}**`;
    selectionOffset = 2;
  } else if (format === "italic") {
    replacement = `*${text}*`;
    selectionOffset = 1;
  } else if (format === "link") {
    const href = normalizeDescriptionLink(linkUrl);
    if (!href) return null;
    replacement = `[${text}](${href})`;
    selectionOffset = 1;
  } else {
    return null;
  }
  return { value: `${source.slice(0, start)}${replacement}${source.slice(end)}`, selectionStart: start + selectionOffset, selectionEnd: start + selectionOffset + text.length };
}
