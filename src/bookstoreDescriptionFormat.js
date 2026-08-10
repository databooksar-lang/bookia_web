const INLINE_TOKEN = /\[([^\]]+)\]\(([^()\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
const UNORDERED_LIST_ITEM = /^-\s+(.+)$/;
const ORDERED_LIST_ITEM = /^\d+\.\s+(.+)$/;

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function parseDescriptionInline(value) {
  const source = typeof value === "string" ? value : "";
  const nodes = [];
  let cursor = 0;

  for (const match of source.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push({ type: "text", value: source.slice(cursor, index) });
    }

    if (match[1]) {
      const href = safeHttpUrl(match[2]);
      if (href) {
        nodes.push({ type: "link", href, children: [{ type: "text", value: match[1] }] });
      } else {
        nodes.push({ type: "text", value: match[0] });
      }
    } else if (match[3]) {
      nodes.push({ type: "strong", children: [{ type: "text", value: match[3] }] });
    } else {
      nodes.push({ type: "emphasis", children: [{ type: "text", value: match[4] }] });
    }
    cursor = index + match[0].length;
  }

  if (cursor < source.length) {
    nodes.push({ type: "text", value: source.slice(cursor) });
  }
  return nodes;
}

function paragraphChildren(lines) {
  return lines.flatMap((line, index) => {
    const children = parseDescriptionInline(line);
    return index === 0 ? children : [{ type: "lineBreak" }, ...children];
  });
}

export function parseBookstoreDescription(value) {
  const lines = (typeof value === "string" ? value : "").replaceAll("\r\n", "\n").split("\n");
  const blocks = [];
  let paragraphLines = [];
  let list = null;

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", children: paragraphChildren(paragraphLines) });
      paragraphLines = [];
    }
  }

  function flushList() {
    if (list) {
      blocks.push(list);
      list = null;
    }
  }

  for (const line of lines) {
    const unordered = line.match(UNORDERED_LIST_ITEM);
    const ordered = line.match(ORDERED_LIST_ITEM);
    const type = unordered ? "unorderedList" : ordered ? "orderedList" : null;
    const itemText = unordered?.[1] || ordered?.[1];

    if (type) {
      flushParagraph();
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(parseDescriptionInline(itemText));
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}
