---
name: build-2d-image-map
description: Build or refine a single full-screen hero with exactly two top buttons, a bounded draggable 2D image map, mixed-size clickable tiles, subtle zoom, and animated detail modals using React, Vite, and JavaScript. Use for spatial image-map heroes inspired by Palmer Dinnerware, rather than multi-section websites, geographic maps, or 3D scenes.
---

# Hero cu hartă de imagini 2D pentru React + Vite

## Rezultatul cerut

Construiește exclusiv un hero care ocupă întregul ecran, cu exact două butoane în partea de sus. Harta de imagini este conținutul principal al hero-ului: o suprafață 2D mai mare decât ecranul, explorată prin drag în stânga, dreapta, sus și jos, până la limite configurabile. Suprafața conține imagini în pătrate și dreptunghiuri de dimensiuni diferite. Click pe o imagine deschide un modal animat cu detaliile acelei imagini. Rotița mouse-ului permite un zoom discret. Închiderea modalului păstrează poziția și zoom-ul hărții.

Nu adăuga secțiuni sub hero, footer, sidebar, pagini secundare, navbar extins sau un bloc mare de titlu și CTA peste imagini fără o cerință explicită. Nu există scroll de document pentru navigare; deplasarea are loc în hartă. Modalurile se deschid peste același hero.

## Cele două butoane de sus

Păstrează exact două butoane globale vizibile în starea inițială, într-un overlay fix deasupra hărții, în afara transformării camerei. Acestea nu se deplasează și nu se scalează când utilizatorul explorează imaginile. Numărul două se referă la comenzile globale ale hero-ului; tile-urile clickabile și butonul de închidere al unui modal rămân necesare.

Păstrează textele și acțiunile celor două butoane într-o configurație separată, `heroActions`. Folosește denumirile și comportamentele oferite de utilizator. Dacă nu sunt precizate, folosește provizoriu „About” și „Contact”, fiecare deschizând un modal cu conținut demonstrativ clar, și menționează această presupunere. Nu inventa date de contact reale sau formulare care pretind că trimit mesaje.

Urmează poziționarea din capturi dacă există; altfel grupează discret cele două butoane în dreapta sus. Păstrează-le pe un singur rând și pe mobil, cu margini safe-area, ținte tactile adecvate și focus vizibil. Wrapper-ul transparent lasă gesturile să ajungă la hartă (`pointer-events: none`); numai butoanele primesc interacțiuni (`pointer-events: auto`). Butoanele nu declanșează drag.

Nu adăuga butoane separate pentru plus, minus, reset, meniu sau ajutor. Zoom-ul folosește scroll/pinch și tastele +/−; reset-ul folosește tasta 0 când harta are focus. Un indiciu textual discret pentru gesturi este permis, fără a deveni un al treilea buton.

Referință de experiență: [Palmer Dinnerware](https://www.palmer-dinnerware.com/). Textul public al paginii include invitații la explorare prin drag și un control reset. Cerințele de mai sus provin din brief; nu afirma că ai verificat vizual animațiile sau tehnologia internă a site-ului dacă nu ai făcut-o efectiv.

Interpretează „hartă” ca o compoziție editorială de imagini într-un plan 2D finit. Cardurile rămân fixate în coordonatele lor; utilizatorul deplasează perspectiva asupra întregii compoziții. Nu implementează mutarea individuală a cardurilor, repetarea infinită sau navigarea geografică decât la cerere.

Dacă utilizatorul oferă capturi, adaptează proporțiile, spațierea, densitatea și stilul la ele. Dacă lipsesc, continuă cu o compoziție demonstrativă coerentă și declară această presupunere. Folosește imaginile utilizatorului sau imagini demonstrative cu drepturi de utilizare; nu copia automat fotografiile ori brandingul referinței.

## Alegerea tehnologiei

Folosește implicit **React + Vite + JavaScript/JSX + CSS + Pointer Events**. Randează cardurile ca elemente HTML și aplică o singură transformare CSS containerului lor. Pentru această cerință, un motor Canvas sau WebGL nu este necesar.

| Opțiune | Când are sens |
| --- | --- |
| DOM + CSS transforms | Alegerea inițială: fotografii, texte, butoane, pan, zoom și modal accesibil. |
| Three.js | Numai dacă brief-ul adaugă obiecte 3D, perspectivă reală, iluminare sau efecte shader ce justifică un motor 3D. |
| PixiJS | Dacă măsurătorile arată că o scenă 2D foarte densă ori efectele grafice depășesc rezonabil implementarea DOM. |
| Konva | Dacă produsul devine un editor Canvas cu selecție, redimensionare, rotire sau manipulare individuală de forme. |

Nu combina aceste motoare preventiv. Numărul de imagini singur nu decide arhitectura: contează dimensiunile, memoria, efectele și dispozitivele țintă. Pentru animația modalului sunt suficiente CSS sau Web Animations API. Refolosește o bibliotecă de animație existentă dacă proiectul o are deja.

## Flux de implementare

1. Inspectează proiectul existent și păstrează convențiile lui. Pentru un proiect nou, inițializează Vite cu template React JavaScript și verifică cerințele Node ale versiunii instalate.
2. Definește datele, coordonatele cardurilor și configurația camerei separat de UI.
3. Implementează întâi pan, limite, click versus drag și zoom ancorat. Adaugă apoi modalul și finisajele vizuale.
4. Verifică pe desktop și pe un viewport mobil. Livrează codul complet și instrucțiunile reale de pornire, nu doar un mockup sau pseudocod.

În lipsa altor indicații, folosește o demonstrație cu aproximativ 24 de carduri, imagini variate și un card principal vizibil imediat. Aceste valori sunt puncte de plecare, nu constrângeri universale.

## Structura aplicației

Separă responsabilitățile, de exemplu:

- `MapViewport`: măsurarea viewport-ului și gesturile.
- `MapWorld`: suprafața transformată și cardurile poziționate absolut.
- `ImageTile`: buton cu imagine, titlu accesibil și feedback de hover/focus.
- `DetailModal`: overlay separat de suprafața transformată.
- `HeroTopActions`: exact cele două butoane fixe din `heroActions`.
- `MapHint`: opțional, un indiciu textual discret pentru gesturi și taste, fără butoane suplimentare.
- `useMapCamera`: coordonate, zoom, limite și ciclul de actualizare.
- `items.js`, `mapConfig.js`, `cameraMath.js`: conținut, configurație și funcții geometrice pure.

Nu adăuga router, backend, autentificare, bază de date sau state manager global pentru această singură pagină dacă brief-ul nu le cere.

Datele unui card pot avea forma:

```js
{
  id: 'collection-01',
  title: 'Colecția 01',
  category: 'Ceramică',
  image: '/images/collection-01.webp',
  alt: 'Vase din ceramică pe o masă deschisă la culoare',
  description: 'Textul detaliilor pentru această colecție.',
  x: 320, y: 240, width: 360, height: 460,
  objectPosition: '50% 50%'
}
```

Folosește ID-uri stabile. Păstrează proporțiile și pozițiile deterministe, nu aleatoare la fiecare render. Câmpurile opționale, precum o galerie secundară sau un link, apar numai dacă există conținut.

## Compoziție și viewport

Construiește un mozaic aerisit cu pătrate, imagini portrait și landscape, dimensiuni mici și mari, aliniamente intenționate și spații libere controlate. Toate tile-urile trebuie să fie accesibile prin navigare, fără suprapuneri accidentale.

Hero-ul și viewport-ul ocupă ecranul (`100dvh`, cu fallback adecvat), ascund overflow-ul și folosesc `position: relative` unde este necesar. Documentul nu are secțiuni suplimentare și nu trebuie să producă scrollbars din cauza suprafeței mari. Plasează cele două butoane de sus într-un strat fix în afara transformării. Pe mobil respectă safe areas. Scroll-ul intern este permis pentru conținutul lung al modalurilor.

Un punct de plecare este un world de `3200 × 2200` unități, cu un conținut centrat util la deschidere. Calculează ori validează dimensiunile world-ului în raport cu cardurile; niciun card nu trebuie să rămână în afara limitelor accesibile.

## Modelul camerei

Folosește aceeași convenție în toată implementarea:

- `tx`, `ty`: translație în pixeli CSS ai viewport-ului.
- `scale`: factor fără unitate, strict pozitiv.
- `x`, `y`: coordonate ale unui card în world.
- Coordonate pe ecran: `screenX = tx + x * scale`, analog pentru Y.

```css
.map-world {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  /* Valorile sunt actualizate de controllerul camerei. */
  transform: translate3d(var(--tx), var(--ty), 0) scale(var(--scale));
}
```

`translate3d` este aici o transformare CSS; nu presupune o scenă Three.js. Un singur mecanism trebuie să dețină transformarea camerei. Evită ca React, un motor de gesturi și o animație separată să scrie simultan pe aceeași proprietate.

Păstrează valorile frecvent schimbate în refs și aplică actualizările cel mult o dată per `requestAnimationFrame`. Actualizează starea React pentru selecție, modal și controale fără a reranda toate cardurile la fiecare pointermove. Curăță listeners și frame-uri la unmount, inclusiv în React Strict Mode.

## Drag, tap și click
- referinta imaginile si fiecare patralex extre construit in react
  prin js an aloorithm to generate each box a div,

- Folosește Pointer Events pentru mouse, touch și stylus. Inițiază pan cu butonul principal al mouse-ului.
- La pointerdown, memorează pointerul, poziția inițială, camera inițială și ID-ul tile-ului apăsat. Oprește animația de deplasare existentă, dacă există.
- Consideră gestul drag după aproximativ `6 px` deplasare în coordonate de ecran. Pragul trebuie să rămână independent de zoom.
- Pentru un drag, calculează `tx = startTx + currentX - startX`, analog pentru Y, apoi aplică limitele. Nu împărți acest delta la scale.
- Folosește pointer capture astfel încât gestul să continue în afara cardului. Gestionează pointerup, pointercancel și lostpointercapture fără stări blocate.
- La finalul unui drag sau pinch nu deschide modalul. Suprimă click-ul generat de acel gest, fără a bloca următorul click valid.
- Atenție: pointer capture poate schimba ținta evenimentelor. Identifică explicit tile-ul inițial și asigură o singură cale de activare pentru tap; evită deschiderea dublă din pointerup și click. Păstrează separat activarea semantică din tastatură.
- Un click sau tap valid pe un tile deschide detaliile sale; un click pe fundal nu deschide nimic.
- Folosește cursor grab/grabbing, `draggable={false}` pe imagini și dezactivează selecția accidentală a textului pe suprafața de navigare.
- Exclude controalele și modalul din inițierea gesturilor hărții.

## Limite finite

Pentru o axă, cu viewport `V`, world `W` și factor `s`, folosește:

```js
function clampAxis(t, V, W, s, padding = 32) {
  const contentSize = W * s;
  if (contentSize <= V - 2 * padding) {
    return (V - contentSize) / 2;
  }
  const min = V - padding - contentSize;
  const max = padding;
  return Math.min(max, Math.max(min, t));
}
```

Aplică separat pe X și Y după drag, zoom, resize, reset și orice animație. Când suprafața încape pe o axă, centreaz-o; nu aplica un clamp cu limite inversate. Padding-ul este exprimat în pixeli de ecran și permite o margine discretă la extremități.

Implicit folosește oprire fermă la limite. Inerția este opțională: dacă o adaugi, fă-o discretă, dependentă de timpul dintre frame-uri, oprește viteza pe axa blocată și întrerupe-o imediat la un nou gest sau la deschiderea modalului.

## Zoom discret și ancorat

Configurează explicit un interval moderat, de exemplu `minScale = 0.75`, `initialScale = 1`, `maxScale = 1.25`. Ajustează-l după dimensiunile reale ale imaginilor și viewport-ului. Reset revine la vederea inițială utilă, nu obligatoriu la fit-all.

Pentru scroll obișnuit în interiorul hărții, normalizează `WheelEvent.deltaMode` înainte de sensibilitate. Un exemplu este `nextScale = clamp(scale * exp(-normalizedDeltaY * sensitivity), minScale, maxScale)`.

Menține punctul de sub cursor stabil, cu cursorul convertit în coordonate locale ale viewport-ului:

```js
const worldX = (pointerX - tx) / scale;
const worldY = (pointerY - ty) / scale;
const nextTx = pointerX - worldX * nextScale;
const nextTy = pointerY - worldY * nextScale;
```

Aplică apoi limitele. Lângă margini, limitele au prioritate față de ancora perfectă. Dacă netezești zoom-ul, păstrează relația dintre translație și scară pe fiecare frame, nu doar la destinație.

Atașează listenerul wheel nepasiv numai viewport-ului și apelează preventDefault numai pentru evenimentele preluate de hartă. Nu intercepta scroll-ul modalului. Lasă Ctrl/Cmd + wheel pentru zoom-ul browserului; trackpad pinch care emite Ctrl+wheel urmează aceeași regulă. Nu dezactiva zoom-ul browserului în meta viewport.

Oferă tastele +/− pentru zoom ancorat în centrul viewport-ului și 0 pentru reset, numai când regiunea hărții are focus. Respectă limitele scalei. Nu intercepta tastele în modaluri, câmpuri de text sau combinații cu Ctrl/Cmd și nu afișa un toolbar de zoom.

## Touch și resize

Pe suprafața hărții folosește `touch-action: none` pentru gesturile implementate; nu aplica această regulă modalului ori întregii pagini fără motiv.

Implementează pan cu un deget și pinch cu două degete. Pentru pinch, memorează distanța inițială și punctul world de sub mijlocul celor două degete. Calculează noua scară din raportul distanțelor și translația din noul mijloc; astfel pinch-ul permite și deplasare. Un gest devenit pinch nu poate activa un tile. La trecerea de la două degete la unul, recalculează baza pan-ului pentru a evita saltul.

Folosește ResizeObserver pentru dimensiunile viewport-ului. La resize/orientation change păstrează pe cât posibil punctul world din centrul vederii, apoi aplică limitele. Nu reseta poziția la fiecare resize și nu micșora întregul world până când cardurile devin ilizibile pe telefon.

## Modal și animație

Randează modalul într-un portal către document.body sau într-un strat echivalent, în afara world-ului transformat. Include imagine, titlu, categorie dacă există, descriere și buton de închidere vizibil. Pe mobil permite o prezentare aproape full-screen și scroll intern pentru conținut lung.

Deschide cu o animație scurtă de opacity și scale sau translate, aproximativ `220–320 ms`, cu easing calm. La închidere păstrează componenta montată până se termină animația de ieșire. Previne deschiderile concurente și gestionează rapid open/close fără overlay blocat.

O tranziție de la imaginea apăsată spre imaginea din modal este un finisaj opțional: măsoară getBoundingClientRect în coordonate viewport și animă un duplicat în stratul fix. Nu presupune că transformările world-ului și portalului au același sistem de coordonate.

În timpul modalului, oprește gesturile și orice inerție a hărții, păstrează camera și permite selectarea textului și scroll-ul detaliilor. Închide prin buton, Escape și click pe backdrop; un click în conținut nu trebuie să închidă modalul.

Asigură un dialog accesibil cu titlu asociat, focus mutat în interior, focus trap și fundal inert cât timp e deschis. La închidere restaurează focusul pe elementul care l-a deschis: tile-ul inițial sau unul dintre cele două butoane de sus. Aplică aceleași reguli modalurilor About/Contact dacă sunt folosite. Poți folosi un dialog nativ sau implementarea accesibilă existentă în proiect.

## Accesibilitate și performanță

Folosește butoane reale pentru tile-uri, denumiri accesibile și focus vizibil. Enter/Space deschid detaliile. Oferă o cale de navigare fără drag: taste săgeți, +/− pentru zoom și 0 pentru reset când regiunea hărții are focus. Fă regiunea focusabilă și asociază-i instrucțiuni accesibile. Cele două butoane de sus rămân accesibile prin Tab. Când Tab ajunge la un tile în afara cadrului, adu-l în vedere prin camera hărții; nu te baza pe scrollIntoView pentru un world transformat.

Respectă prefers-reduced-motion: elimină inerția și mișcările ample, păstrând navigarea directă. Nu anunța fiecare pixel deplasat într-o regiune aria-live.

Folosește dimensiuni explicite ale imaginilor, variante optimizate, object-fit și object-position potrivite fiecărui cadru. Preîncarcă imaginile inițial vizibile și încarcă progresiv restul. Verifică efectiv lazy loading-ul într-un container transformat; adaugă observare cu overscan dacă tile-urile apar goale în timpul deplasării.

Nu introduce virtualizare pentru o galerie mică. Dacă este necesară după măsurători, păstrează accesibilitatea tastaturii și tile-ul care deține focusul. Evită filtre blur mari sau animații de layout la fiecare frame. Țintește o mișcare fluidă și raportează doar performanța măsurată.

## Verificare și livrare

Verifică următoarele comportamente, folosind browserul disponibil și teste de geometrie acolo unde ajută:

- La deschidere există un singur hero full-screen și exact două butoane globale sus; nu există secțiuni sub hero, footer sau toolbar suplimentar.
- Cele două butoane rămân fixe la pan/zoom, funcționează și pe mobil, iar activarea lor nu declanșează drag.
- Drag funcționează pe ambele axe și se oprește la toate cele patru margini.
- Un drag pornit pe imagine nu deschide modalul; următorul click valid îl deschide o singură dată.
- Zoom-ul respectă limitele și ancora, inclusiv când ajunge la o margine.
- Un world mai mic decât viewport-ul este centrat corect pe fiecare axă.
- Pinch, anularea gestului și trecerea de la două degete la unul nu produc salturi sau click-uri false.
- Modalul arată datele tile-ului selectat, are scroll propriu și păstrează camera la închidere.
- Escape, focus trap, revenirea focusului și navigarea din tastatură funcționează.
- Resize și reduced motion păstrează aplicația utilizabilă.
- Imaginile se încarcă fără layout shift și fără tile-uri inaccesibile la extremități.
- Build-ul proiectului se termină cu succes, iar verificările disponibile nu raportează erori relevante.

Livrează fișierele implementate, comenzile reale de instalare/pornire/build, locul în care se schimbă imaginile și parametrii camerei, plus limitările efectiv rămase. Nu afirma că ai testat gesturi pe dispozitiv fizic dacă ai folosit doar emulare. Publicarea se face numai dacă utilizatorul o cere.

## Referințe tehnice

- [CSS transform — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)
- [Pointer Events — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [Three.js](https://threejs.org/)
- [Introducere PixiJS](https://pixijs.com/8.x/guides/getting-started/intro)
- [Konva overview](https://konvajs.org/docs/overview.html)
- [Skills în Claude Code](https://code.claude.com/docs/en/skills)

Acesta este un skill autonom pentru implementare. În Claude Code poate fi salvat ca `.claude/skills/build-2d-image-map/SKILL.md` în proiect și invocat prin `/build-2d-image-map`.
