// Pași numerotați (ordinea contează): număr, titlu, explicație.
export default function StepList({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <ol className="ui-steps">
      {steps.map((step, index) => (
        <li key={step.title} className="ui-step">
          <span className="ui-step__number" aria-hidden="true">{index + 1}</span>
          <div className="ui-step__body">
            <strong className="ui-step__title">{step.title}</strong>
            {step.text && <p className="ui-step__text">{step.text}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
