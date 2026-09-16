import { forwardRef } from 'react';

// Termeni și condiții pliabili (<details>): accesibil din tastatură, fără JavaScript.
const TermsAccordion = forwardRef(function TermsAccordion(
  { title = 'Termeni și condiții', items = [], link, defaultOpen = false },
  ref,
) {
  if (!items.length && !link) return null;
  return (
    <details ref={ref} className="ui-terms" open={defaultOpen}>
      <summary className="ui-terms__summary">
        <span>{title}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </summary>
      <div className="ui-terms__content">
        {items.length > 0 && (
          <ul className="ui-terms__list">
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
        {link?.href && (
          <a
            className="ui-terms__link"
            href={link.href}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noopener noreferrer' : undefined}
          >
            {link.label}
          </a>
        )}
      </div>
    </details>
  );
});

export default TermsAccordion;
