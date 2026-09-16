// Listă de avantaje: titlu scurt + explicație, pe coloane care se adaptează la lățime.
export default function FeatureList({ items = [] }) {
  if (!items.length) return null;
  return (
    <ul className="ui-feature-list">
      {items.map((item) => (
        <li key={item.title} className="ui-feature">
          <strong className="ui-feature__title">{item.title}</strong>
          {item.text && <span className="ui-feature__text">{item.text}</span>}
        </li>
      ))}
    </ul>
  );
}
