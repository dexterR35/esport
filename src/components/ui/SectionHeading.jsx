// Titlu de secțiune reutilizabil: text mic deasupra, titlu și descriere opțională.
export default function SectionHeading({ eyebrow, title, text, id, as: Tag = 'h3' }) {
  return (
    <header className="ui-section-heading">
      {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
      {title && <Tag id={id} className="ui-section-heading__title">{title}</Tag>}
      {text && <p className="ui-section-heading__text">{text}</p>}
    </header>
  );
}
