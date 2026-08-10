import { useId, useRef, useState } from "react";

import { formatDescriptionSelection } from "../descriptionEditorState";
import { BookstoreDescription } from "./BookstoreDescription";

export function RichDescriptionEditor({ value, onChange, disabled = false, placeholder, maxLength = 5000 }) {
  const textareaRef = useRef(null);
  const helpId = useId();
  const [formatError, setFormatError] = useState("");

  function applyFormat(format) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const linkUrl = format === "link" ? window.prompt("Pegá una URL que comience con http:// o https://") : "";
    if (format === "link" && linkUrl === null) return;
    const result = formatDescriptionSelection(value, textarea.selectionStart, textarea.selectionEnd, format, linkUrl);
    if (!result) {
      setFormatError("El enlace debe comenzar con http:// o https://.");
      return;
    }
    setFormatError("");
    onChange(result.value);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return <>
    <div className="description-toolbar" role="toolbar" aria-label="Formato de la descripción">
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("bold")} disabled={disabled} aria-label="Negrita"><strong>B</strong></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("italic")} disabled={disabled} aria-label="Cursiva"><em>I</em></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("link")} disabled={disabled} aria-label="Insertar enlace">Enlace</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("unorderedList")} disabled={disabled} aria-label="Lista con viñetas">• Lista</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("orderedList")} disabled={disabled} aria-label="Lista numerada">1. Lista</button>
    </div>
    <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} rows={6} maxLength={maxLength} disabled={disabled} placeholder={placeholder} aria-describedby={helpId} />
    <small id={helpId}>Usá los botones para resaltar texto, agregar enlaces o crear listas.</small>
    {formatError ? <small className="description-format-error" role="alert">{formatError}</small> : null}
    <div className="description-preview"><span>Vista previa</span><BookstoreDescription value={value || "Sin descripción"} /></div>
  </>;
}
