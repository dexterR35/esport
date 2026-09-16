// Mesajul de joc responsabil, cu insigna 18+.
export default function ResponsibleNote({ text }) {
  if (!text) return null;
  return (
    <p className="ui-responsible">
      <span className="ui-responsible__badge" aria-label="Doar peste 18 ani">18+</span>
      <span>{text}</span>
    </p>
  );
}
