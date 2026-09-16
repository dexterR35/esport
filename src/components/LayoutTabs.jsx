export default function LayoutTabs({ layouts, value, counts, onChange }) {
  return (
    <div className="layout-tabs" role="radiogroup" aria-label="Variantă de hartă">
      {layouts.map((layout) => (
        <button
          key={layout.id}
          type="button"
          role="radio"
          aria-checked={layout.id === value}
          className="layout-tab"
          onClick={() => onChange(layout.id)}
        >
          {layout.label}
          <span className="layout-tab__count">{counts[layout.id]}</span>
        </button>
      ))}
    </div>
  );
}
