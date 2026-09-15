export default function HeroTopActions({ actions, onAction }) {
  return (
    <nav className="hero-actions" aria-label="Acțiuni principale">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`hero-action hero-action--${action.variant}`}
          onClick={() => onAction(action.id)}
        >
          {action.label}
        </button>
      ))}
    </nav>
  );
}
