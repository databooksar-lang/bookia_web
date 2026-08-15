import { buildWhatsAppHref } from "../formatters";

export function WhatsAppButton({ className = "primary-button", whatsappPhone, message, children, onClick }) {
  const href = buildWhatsAppHref(whatsappPhone, message);

  if (!href) {
    return null;
  }

  return (
    <a className={className} href={href} target="_blank" rel="noreferrer" onClick={onClick}>
      {children}
    </a>
  );
}

export function EmptyState({ title, children, compact = false }) {
  return (
    <div className={`empty-state${compact ? " is-compact" : ""}`}>
      <span className="empty-state-mark" aria-hidden="true">B</span>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
