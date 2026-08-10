import assert from "node:assert/strict";

import { parseBookstoreDescription } from "../src/bookstoreDescriptionFormat.js";

export function registerBookstoreDescriptionFormatTests(test) {
  test("parses paragraphs, line breaks, and supported inline formatting", () => {
    assert.deepEqual(
      parseBookstoreDescription("Hola **mundo** y *libros*.\nNueva linea.\n\nSegundo parrafo."),
      [
        { type: "paragraph", children: [
          { type: "text", value: "Hola " },
          { type: "strong", children: [{ type: "text", value: "mundo" }] },
          { type: "text", value: " y " },
          { type: "emphasis", children: [{ type: "text", value: "libros" }] },
          { type: "text", value: "." },
          { type: "lineBreak" },
          { type: "text", value: "Nueva linea." },
        ] },
        { type: "paragraph", children: [{ type: "text", value: "Segundo parrafo." }] },
      ],
    );
  });

  test("parses consecutive unordered and ordered list items", () => {
    assert.deepEqual(
      parseBookstoreDescription("- Narrativa\n- Poesia\n\n1. Talleres\n2. Club de lectura"),
      [
        { type: "unorderedList", items: [[{ type: "text", value: "Narrativa" }], [{ type: "text", value: "Poesia" }]] },
        { type: "orderedList", items: [[{ type: "text", value: "Talleres" }], [{ type: "text", value: "Club de lectura" }]] },
      ],
    );
  });

  test("creates links only for safe http and https URLs", () => {
    assert.deepEqual(
      parseBookstoreDescription("[Visitanos](https://libreria.example) y [no](javascript:alert(1))"),
      [{ type: "paragraph", children: [
        { type: "link", href: "https://libreria.example/", children: [{ type: "text", value: "Visitanos" }] },
        { type: "text", value: " y [no](javascript:alert(1))" },
      ] }],
    );
  });

  test("keeps HTML and unsupported Markdown as literal text", () => {
    assert.deepEqual(
      parseBookstoreDescription("<script>alert(1)</script> # titulo"),
      [{ type: "paragraph", children: [{ type: "text", value: "<script>alert(1)</script> # titulo" }] }],
    );
  });
}
