import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { detectImageFormat } from './lib/images';
import { SETTINGS } from './settings';
import './styles.css';

// Setările vizuale ale boxurilor ajung în CSS ca variabile.
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--tile-title-size', `${SETTINGS.tiles.titleSize}px`);
rootStyle.setProperty('--tile-title-size-small', `${SETTINGS.tiles.titleSizeSmall}px`);
rootStyle.setProperty('--tile-title-size-center', `${SETTINGS.tiles.titleSizeCenter}px`);
rootStyle.setProperty('--tile-logo-width', `${SETTINGS.tiles.logoWidth}%`);

// Verificarea AVIF durează câteva milisecunde; o așteptăm ca toate imaginile
// să folosească de la început același format.
detectImageFormat().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
