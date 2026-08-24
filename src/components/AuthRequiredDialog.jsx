import { useEffect, useRef } from "react";

import { navigate } from "../navigation";
import { getPendingReaderActionCopy } from "../pendingReaderAction";
import { buildRegisterPath } from "../registerState";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapDialogFocus(event, container, activeElement = typeof document === "undefined" ? null : document.activeElement) {
  if (event.key !== "Tab") return;
  const focusable = [...(container?.querySelectorAll(FOCUSABLE_SELECTOR) || [])];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function activateDialogFocus(primaryElement, previousFocus, { schedule = (callback) => globalThis.requestAnimationFrame?.(callback), cancel = (frame) => globalThis.cancelAnimationFrame?.(frame) } = {}) {
  const focusFrame = schedule(() => primaryElement?.focus());
  return () => {
    if (focusFrame !== undefined) cancel(focusFrame);
    previousFocus?.focus?.();
  };
}

export function handleActionDialogEscape(event, onCancel) {
  if (event.key !== "Escape") return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  onCancel();
  return true;
}

export function handleActionDialogBackdrop(event, onCancel) {
  if (event.target !== event.currentTarget) return false;
  onCancel();
  return true;
}

function ActionDialogFrame({ titleId, title, description, onCancel, primaryRef, children }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const restoreFocus = activateDialogFocus(primaryRef.current, previousFocus);
    const onKeyDown = (event) => handleActionDialogEscape(event, onCancel);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      restoreFocus();
    };
  }, [onCancel, primaryRef]);

  return (
    <div className="auth-required-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => handleActionDialogBackdrop(event, onCancel)}>
      <div ref={cardRef} className="auth-required-dialog-card" onKeyDown={(event) => trapDialogFocus(event, cardRef.current)}>
        <p className="section-label">Cuenta Bookia</p>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        {children}
      </div>
    </div>
  );
}

export function AuthRequiredDialog({ action, onCancel }) {
  const primaryRef = useRef(null);
  const copy = getPendingReaderActionCopy(action);
  return (
    <ActionDialogFrame titleId="auth-required-title" title={copy.title} description={copy.description} onCancel={onCancel} primaryRef={primaryRef}>
      <div className="auth-required-dialog-actions">
        <button ref={primaryRef} type="button" className="primary-button" onClick={() => navigate(buildRegisterPath({ profileType: "reader" }))}>Crear cuenta</button>
        <button type="button" className="secondary-button" onClick={() => navigate("/login")}>Iniciar sesión</button>
        <button type="button" className="text-link" onClick={onCancel}>Ahora no</button>
      </div>
    </ActionDialogFrame>
  );
}

export function ReaderActionContinuationDialog({ action, continueLabel, continueHref, onContinue, onCancel }) {
  const primaryRef = useRef(null);
  const copy = getPendingReaderActionCopy(action);
  return (
    <ActionDialogFrame titleId="reader-action-continuation-title" title={copy.continuationTitle} description={copy.continuationDescription} onCancel={onCancel} primaryRef={primaryRef}>
      <div className="auth-required-dialog-actions">
        {continueHref ? <a ref={primaryRef} className="primary-button" href={continueHref} target="_blank" rel="noreferrer" onClick={onContinue}>{continueLabel}</a> : <button ref={primaryRef} type="button" className="primary-button" onClick={onContinue}>{continueLabel}</button>}
        <button type="button" className="secondary-button" onClick={onCancel}>Ahora no</button>
      </div>
    </ActionDialogFrame>
  );
}
