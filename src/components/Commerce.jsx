import { buildWhatsAppHref } from "../formatters";

export function WhatsAppButton({ className = "primary-button", whatsappPhone, phoneCountryCd, phone, children }) {
  const href = buildWhatsAppHref(whatsappPhone, phoneCountryCd, phone);

  if (!href) {
    return (
      <span className={`${className} button-disabled`} aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
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
