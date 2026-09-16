# Poze pentru galerie

Pune aici pozele originale, la calitate mare. Formatele acceptate sunt JPG, PNG, WebP, AVIF și TIFF.
Pozele se procesează automat la `npm run dev` / `npm run build` (sau manual cu `npm run images`).

## Numele fișierelor

```
sport-număr.jpg
```

| Fișier                 | Titlu pe box      |
|------------------------|-------------------|
| `fotbal-01.jpg`        | Fotbal            |
| `tenis-07.png`         | Tenis             |
| `f1-02.jpg`            | Formula 1         |
| `tenis-de-masa-01.jpg` | Tenis de masă     |

- Folosește doar litere mici fără diacritice, cifre și `-`.
- Numele afișate (cu diacritice) se setează în `src/settings.js` → `gallery.sportLabels`.
- Pozele **se distribuie singure** pe boxuri: cele late în boxurile late, cele verticale în boxurile înalte,
  fără același sport în două boxuri vecine. Dacă sunt mai puține poze decât boxuri, pozele se repetă, dar nu una lângă alta.
- Dacă adaugi sau ștergi poze, distribuția se recalculează.

## Poze fixate manual

- `001.jpg` este poza boxului central (NetBet). Este setată în `src/data/slots.json`.
- Orice nume fără format `sport-număr` poate fi fixat într-un box din `slots.json`:
  `"045": { "image": "finala-cupei" }`. O poză fixată nu mai intră în distribuirea automată.
- `…-detail.jpg` = poză diferită doar pentru modal: `"045": { "modal": { "image": "finala-cupei-detail" } }`.
