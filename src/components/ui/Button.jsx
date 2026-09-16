// Buton reutilizabil: link (<a>) când primește `href`, altfel <button>.
// Variante: 'primary' (roșu NetBet), 'outline', 'ghost'.

const ICONS = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  external: <path d="M7 17L17 7M9 7h8v8" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
};

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  external = false,
  icon,
  onClick,
  className = '',
  children,
  ...rest
}) {
  const classes = ['ui-button', `ui-button--${variant}`, `ui-button--${size}`, className]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      <span>{children}</span>
      {icon && ICONS[icon] && (
        <svg className="ui-button__icon" viewBox="0 0 24 24" aria-hidden="true">
          {ICONS[icon]}
        </svg>
      )}
    </>
  );

  if (href) {
    return (
      <a
        className={classes}
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        {...rest}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} {...rest}>
      {content}
    </button>
  );
}

/** Butonul pentru un CTA din date (slots.json / settings.js): link sau acțiune în pagină. */
export function CtaButton({ cta, onAction, variant = 'primary', size, className }) {
  if (!cta) return null;
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      href={cta.href}
      external={cta.external}
      icon={cta.href ? (cta.external ? 'external' : 'arrow') : 'arrow'}
      onClick={cta.href ? undefined : () => onAction?.(cta.action)}
    >
      {cta.label}
    </Button>
  );
}
