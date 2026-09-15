const brandTones = [
  '#436cff',
  '#5c79b8',
  '#7357d8',
  '#237e95',
  '#a44962',
  '#6d768c',
];

// Pentru imaginile finale, folosește `thumbnail`/`srcSet` în grid și
// `detailImage`/`detailSrcSet` pentru varianta mare din modal. MapViewport
// încarcă doar imaginile apropiate de cameră și le eliberează pe cele îndepărtate.

// Există suficient conținut pentru ca algoritmul să poată acoperi fiecare celulă.
// În DOM ajung numai elementele necesare tiling-ului final.
export const galleryItems = Array.from({ length: 1600 }, (_, index) => {
  const number = String(index + 1).padStart(3, '0');
  const featured = index === 0;

  return {
    id: `brand-slot-${number}`,
    index: index + 1,
    title: featured ? 'Brand Canvas' : `Brand Slot ${number}`,
    category: 'Brand placement',
    code: featured ? 'CENTER' : 'BRAND',
    color: brandTones[index % brandTones.length],
    featured,
    description:
      'Un spațiu modular din grid, pregătit pentru identitatea, imaginea sau campania unui brand.',
  };
});

export const heroActions = [
  { id: 'explore', label: 'Explorează', variant: 'outline' },
  { id: 'subscribe', label: 'Abonează-te', variant: 'primary' },
];
