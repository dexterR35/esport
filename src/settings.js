// ─────────────────────────────────────────────────────────────────────────────
//  SETĂRI — tot ce se poate regla în hartă, într-un singur loc.
//  Conținutul boxurilor (titlu, imagine, modal, CTA) se editează în data/slots.json.
// ─────────────────────────────────────────────────────────────────────────────

export const SETTINGS = {
  // ── Grid ──────────────────────────────────────────────────────────────────
  // ATENȚIE: schimbarea oricărei valori din `grid` refață mozaicul, deci sloturile
  // își schimbă poziția și numărul. Verifică apoi slots.json.
  grid: {
    columns: 50, // câte celule pe orizontală
    rows: 32, // câte celule pe verticală
    cellSize: 190, // mărimea unei celule, în px (la zoom 100%)
    centerColumns: 6, // lățimea boxului central, în celule
    centerRows: 3, // înălțimea boxului central, în celule
    maxSpan: 4, // câte celule poate avea maxim un box pe o latură (4 × 190 = 760px)
    // Raport maxim între laturi. Boxurile mai lungi se împart în două:
    // 2 → 1×3, 1×4, 3×1, 4×1 devin câte 2 boxuri; 3 → doar 1×4 și 4×1; 99 → nimic nu se împarte.
    maxAspect: 2,
    // Împarte anumite boxuri în două (după numărul afișat pe box):
    // 'columns' = două boxuri alăturate, 'rows' = două boxuri unul peste altul.
    // Boxurile rămân pe celule întregi (ex. 4×3 pe 'rows' → 4×2 sus + 2×1 + 2×1 jos).
    // Bucățile noi primesc numere noi, la finalul listei.
    splits: {
      242: 'columns', // stânga bannerului central
      243: 'rows', // dreapta bannerului central
    },
    seed: 472, // alt număr = alt mozaic, cu aceleași reguli
  },

  // ── Zoom ──────────────────────────────────────────────────────────────────
  // Scale 1 = mărimea reală. Pe ecran, `initial` este afișat ca 100%.
  zoom: {
    initial: 0.76, // zoom-ul de start (după intro) = 100%
    min: 0.42, // zoom out maxim (0.42 / 0.76 = 55%)
    max: 1.12, // zoom in maxim (1.12 / 0.76 = 147%)
    wheelSpeed: 0.00105, // cât de mult zoom face un pas de rotiță
    wheelDuration: 0.46, // cât de lin se așază zoom-ul din rotiță, în secunde
    keyboardStep: 1.1, // multiplicator pentru tastele + / −
  },

  // ── Intro la încărcare ────────────────────────────────────────────────────
  intro: {
    enabled: true,
    startZoom: 0.24, // de unde pornește (mai mic = mai departe)
    duration: 2.6, // secunde
    delay: 0.15, // pauză înainte de start, în secunde
    // Curba cubic-bezier (x1, y1, x2, y2). Testează valori pe https://cubic-bezier.com
    ease: [0.65, 0, 0.25, 1],
  },

  // ── Cameră (drag, click, taste) ───────────────────────────────────────────
  camera: {
    ease: [0.35, 0.18, 0.22, 1], // curba pentru centrare pe box și revenire
    dragThreshold: 6, // câți px trebuie mișcat mouse-ul ca să conteze drept drag
    keyboardPanStep: 130, // câți px mută o săgeată de la tastatură
  },

  // ── Boxuri ────────────────────────────────────────────────────────────────
  tiles: {
    titleSize: 13, // px, titlul mic de jos
    titleSizeSmall: 12, // px, pe boxurile mici
    titleSizeCenter: 16, // px, pe boxul central
    logoWidth: 38, // % din lățimea boxului, pentru logo-ul centrat
    // Culori pentru boxurile fără `color` sau imagine (se folosesc pe rând).
    colors: ['#436cff', '#5c79b8', '#7357d8', '#237e95', '#a44962', '#6d768c'],
    revealDuration: 0.82, // animația de apariție a boxurilor, în secunde
    revealStagger: 0.003, // întârzierea dintre boxuri, în secunde
  },

  // ── Galerie (conținut implicit) ───────────────────────────────────────────
  // Pozele din images-src/ numite `sport-NN` (ex. fotbal-01.jpg) sunt distribuite
  // automat pe boxuri. slots.json este necesar doar pentru excepții.
  gallery: {
    autoAssign: true, // false = doar pozele setate manual în slots.json
    category: 'NetBet Sport', // textul mic de deasupra titlului din modal
    centerTitle: 'NetBet Sport', // titlul boxului central, dacă lipsește din slots.json
    emptyTitle: 'În curând', // boxurile care încă nu au poză
    // Textul din modal. {sport} este înlocuit cu numele sportului.
    modalBody: 'Descoperă cele mai importante evenimente de {sport} pe NetBet Sport.',
    // Buton în modal pentru toate boxurile automate. Lasă href gol ca să nu apară.
    // {sport} din href este înlocuit cu cheia sportului (ex. "fotbal").
    cta: { label: 'Vezi evenimentele', href: '' },
    // Numele afișate pentru fiecare sport (cheia = prima parte din numele fișierului).
    // Sporturile care lipsesc de aici sunt afișate cu majusculă: "darts" → "Darts".
    sportLabels: {
      fotbal: 'Fotbal',
      tenis: 'Tenis',
      baschet: 'Baschet',
      handbal: 'Handbal',
      volei: 'Volei',
      hochei: 'Hochei',
      rugby: 'Rugby',
      'fotbal-american': 'Fotbal american',
      baseball: 'Baseball',
      box: 'Box',
      mma: 'MMA',
      atletism: 'Atletism',
      inot: 'Înot',
      polo: 'Polo',
      ciclism: 'Ciclism',
      schi: 'Schi',
      snowboard: 'Snowboard',
      patinaj: 'Patinaj',
      f1: 'Formula 1',
      moto: 'Moto GP',
      golf: 'Golf',
      snooker: 'Snooker',
      darts: 'Darts',
      esports: 'eSports',
      canotaj: 'Canotaj',
      surf: 'Surf',
      scrima: 'Scrimă',
      judo: 'Judo',
      gimnastica: 'Gimnastică',
      echitatie: 'Echitație',
      cricket: 'Cricket',
      'tenis-de-masa': 'Tenis de masă',
    },
  },

  // ── Imagini ───────────────────────────────────────────────────────────────
  images: {
    // Imaginile se încarcă atunci când se află la această distanță de ecran
    // (120% = încă un ecran și ceva în fiecare direcție)…
    loadMargin: '120%',
    // …și sunt eliberate din memorie abia când ajung la această distanță.
    unloadMargin: '300%',
    // Folosite de `npm run images` (rulat automat la dev/build); se refac singure la modificare.
    widths: [400, 800, 1600, 2400],
    avifQuality: 50,
    webpQuality: 78,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modal: {
    closeDuration: 240, // ms, animația de închidere
  },
};
