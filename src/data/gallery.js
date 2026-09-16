import { assignImages, sportFromKey } from '../lib/assignImages';
import { getSlotRegions } from '../lib/layout';
import { SETTINGS } from '../settings';
import slotImages from './slot-images.json';
import slotContent from './slots.json';

const { gallery } = SETTINGS;
const fallbackColors = SETTINGS.tiles.colors;

// Pozele se pun în images-src/ cu numele sportului (fotbal-01.jpg) și se distribuie
// automat pe boxuri. slots.json este folosit doar pentru excepții, după numărul
// afișat pe box ("012"): titlu, text în modal, CTA sau o poză fixată manual.
// Chei rezervate pentru poze manuale: numere ("001") și sufixul "-detail".
const isManualKey = (key) => /^\d+$/.test(key) || key.endsWith('-detail');

function resolveImage(key, number, field) {
  if (!key) return null;
  const image = slotImages[key];
  if (!image) {
    console.warn(`slots.json › ${number}.${field}: imaginea "${key}" lipsește. Rulează npm run images.`);
    return null;
  }
  return { key, ...image };
}

function resolveCta(cta, number) {
  if (!cta?.label) return null;
  // Fără link, butonul deschide fereastra de abonare din aceeași pagină.
  if (!cta.href) return { label: cta.label, action: 'subscribe' };
  // Acceptăm doar link-uri http(s), mailto, tel sau relative — niciodată `javascript:`.
  if (!/^(https?:|mailto:|tel:|\/|#)/i.test(cta.href)) {
    console.warn(`slots.json › ${number}.cta: link nepermis "${cta.href}".`);
    return null;
  }
  return {
    label: cta.label,
    href: cta.href,
    external: /^https?:/i.test(cta.href),
  };
}

// Logo-urile stau în public/brand/ și nu trec prin procesarea de imagini,
// ca să își păstreze transparența (SVG, PNG sau AVIF).
function resolveLogo(logo, number) {
  if (!logo?.src) return null;
  if (!/^[a-z0-9][a-z0-9_.-]*\.(svg|png|webp|avif)$/i.test(logo.src)) {
    console.warn(`slots.json › ${number}.logo: numele fișierului "${logo.src}" nu este valid.`);
    return null;
  }
  return {
    src: `${import.meta.env.BASE_URL}brand/${logo.src}`,
    alt: logo.alt ?? '',
    width: logo.width,
    height: logo.height,
  };
}

function sportLabel(sport) {
  if (!sport) return null;
  return gallery.sportLabels[sport]
    ?? sport.replace(/[-_]+/g, ' ').replace(/^\p{L}/u, (letter) => letter.toUpperCase());
}

const numberOf = (index) => String(index + 1).padStart(3, '0');

// ── Poze fixate manual în slots.json ────────────────────────────────────────
// Numerele din slots.json se aplică în toate variantele de hartă. Doar 001 (bannerul
// central) este același box peste tot; celelalte numere ajung în alte locuri.
const fixedImages = new Map();
const referencedKeys = new Set();
Object.entries(slotContent).forEach(([number, content]) => {
  if (content.image) {
    fixedImages.set(Number(number) - 1, content.image);
    referencedKeys.add(content.image);
  }
  if (content.modal?.image) referencedKeys.add(content.modal.image);
});

const autoPool = gallery.autoAssign
  ? Object.entries(slotImages)
      .filter(([key]) => !isManualKey(key) && !referencedKeys.has(key))
      .map(([key, image]) => ({ key, width: image.width, height: image.height }))
  : [];

function buildItem(index, assignedImages) {
  const number = numberOf(index);
  const featured = index === 0;
  const content = slotContent[number] ?? {};
  const modal = content.modal ?? {};

  const imageKey = content.image ?? assignedImages.get(index);
  const image = resolveImage(imageKey, number, 'image');
  const sport = image && !isManualKey(image.key) ? sportFromKey(image.key) : null;
  const label = sportLabel(sport);
  const title = content.title
    ?? (featured ? gallery.centerTitle : label ?? gallery.emptyTitle);
  const cta = resolveCta(content.cta, number)
    ?? resolveCta(
      gallery.cta && { ...gallery.cta, href: (gallery.cta.href ?? '').replaceAll('{sport}', sport ?? '') },
      number,
    );

  return {
    id: `slot-${number}`,
    number,
    index: index + 1,
    featured,
    sport,
    // Varianta devine clasa `sport-tile--<variant>`; acceptăm doar nume sigure pentru CSS.
    variant: /^[a-z][a-z0-9-]*$/.test(content.variant ?? '') ? content.variant : null,
    title,
    category: content.category ?? gallery.category,
    color: content.color ?? image?.color ?? fallbackColors[index % fallbackColors.length],
    imageAlt: content.imageAlt ?? title,
    image,
    logo: resolveLogo(content.logo, number),
    cta,
    modal: {
      title: modal.title ?? title,
      // În mijlocul propoziției: "Tenis" → "tenis"; abrevierile ("MMA", "eSports") rămân neschimbate.
      body: modal.body ?? gallery.modalBody.replaceAll(
        '{sport}',
        label ? label.replace(/^(\p{Lu})(?=\p{Ll})/u, (letter) => letter.toLowerCase()) : 'sport',
      ),
      image: resolveImage(modal.image, number, 'modal.image') ?? image,
      cta: resolveCta(modal.cta, number) ?? cta,
    },
  };
}

const itemsCache = new Map();

/** Boxurile unei variante de hartă, cu pozele distribuite automat pe forma ei. */
export function getGalleryItems(layout) {
  if (itemsCache.has(layout)) return itemsCache.get(layout);

  const regions = getSlotRegions(layout);
  const fixed = new Map([...fixedImages].filter(([index]) => index >= 0 && index < regions.length));
  const assignedImages = assignImages(regions, autoPool, fixed);
  const items = regions.map((_, index) => buildItem(index, assignedImages));

  Object.keys(slotContent)
    .filter((number) => !/^\d{3}$/.test(number) || Number(number) < 1 || Number(number) > regions.length)
    .forEach((number) => {
      console.warn(`slots.json › "${number}" nu există în varianta „${layout}” (boxuri 001–${numberOf(regions.length - 1)}).`);
    });

  itemsCache.set(layout, items);
  return items;
}

export const heroActions = [
  { id: 'explore', label: 'Explorează', variant: 'outline' },
  { id: 'subscribe', label: 'Abonează-te', variant: 'primary' },
];
