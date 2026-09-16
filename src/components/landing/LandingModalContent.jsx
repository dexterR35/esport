import { useRef, useState } from 'react';
import { getImageSources } from '../../lib/images';
import Button, { CtaButton } from '../ui/Button';
import FeatureList from '../ui/FeatureList';
import ResponsibleNote from '../ui/ResponsibleNote';
import SectionHeading from '../ui/SectionHeading';
import StepList from '../ui/StepList';
import TermsAccordion from '../ui/TermsAccordion';

// Modalul extins al boxului central: o pagină de prezentare în miniatură
// (hero, ofertă, pași, termeni). Conținutul vine din slots.json → "001".landing.
export default function LandingModalContent({ item, onCtaAction }) {
  const { landing } = item;
  const image = getImageSources(item.modal.image);
  const [imageLoaded, setImageLoaded] = useState(false);
  const termsRef = useRef(null);

  const showTerms = () => {
    const terms = termsRef.current;
    if (!terms) return;
    terms.open = true;
    terms.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing">
      <section className="landing-hero">
        {image && (
          <img
            className={`landing-hero__image${imageLoaded ? ' is-loaded' : ''}`}
            ref={(node) => { if (node?.complete && node.naturalWidth) setImageLoaded(true); }}
            onLoad={() => setImageLoaded(true)}
            src={image.src}
            srcSet={image.srcSet}
            sizes="(max-width: 760px) 100vw, 1120px"
            width={image.width}
            height={image.height}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
        )}
        {image && !imageLoaded && <span className="modal-visual__loader" aria-hidden="true" />}

        <div className="landing-hero__content">
          {item.logo && (
            <img
              className="landing-hero__logo"
              src={item.logo.src}
              alt={item.logo.alt}
              width={item.logo.width}
              height={item.logo.height}
            />
          )}
          {landing.eyebrow && <p className="ui-eyebrow">{landing.eyebrow}</p>}
          <h2 id="modal-title" className="landing-hero__title">{landing.title}</h2>
          {landing.subtitle && <p className="landing-hero__subtitle">{landing.subtitle}</p>}
          <div className="landing-actions">
            <CtaButton cta={landing.cta} onAction={onCtaAction} size="lg" />
            {landing.terms?.items?.length > 0 && (
              <Button variant="outline" size="lg" icon="down" onClick={showTerms}>
                {landing.termsButtonLabel ?? 'Vezi termenii'}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="landing-body">
        {landing.offer && (
          <section className="landing-offer" aria-labelledby="landing-offer-title">
            <div className="landing-offer__main">
              {landing.offer.badge && <span className="ui-badge">{landing.offer.badge}</span>}
              <SectionHeading id="landing-offer-title" title={landing.offer.title} text={landing.offer.text} />
            </div>
            <FeatureList items={landing.features} />
          </section>
        )}

        {landing.steps?.length > 0 && (
          <section className="landing-section" aria-labelledby="landing-steps-title">
            <SectionHeading
              id="landing-steps-title"
              eyebrow={landing.stepsEyebrow ?? 'Cum începi'}
              title={landing.stepsTitle ?? 'Trei pași până la primul pariu'}
            />
            <StepList steps={landing.steps} />
          </section>
        )}

        <TermsAccordion
          ref={termsRef}
          title={landing.terms?.title}
          items={landing.terms?.items}
          link={landing.terms?.link}
        />
      </div>

      <footer className="landing-footer">
        <ResponsibleNote text={landing.responsible} />
        <CtaButton cta={landing.cta} onAction={onCtaAction} />
      </footer>
    </div>
  );
}
