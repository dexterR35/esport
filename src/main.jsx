import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SETTINGS } from './settings';
import './styles.css';

// Setările vizuale ale boxurilor ajung în CSS ca variabile.
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--tile-gap', `${SETTINGS.tiles.gap}px`);
rootStyle.setProperty('--tile-title-min', `${SETTINGS.tiles.titleMin}px`);
rootStyle.setProperty('--tile-title-max', `${SETTINGS.tiles.titleMax}px`);
rootStyle.setProperty('--tile-title-scale', String(SETTINGS.tiles.titleScale));
rootStyle.setProperty('--tile-logo-width', `${SETTINGS.tiles.logoWidth}%`);
rootStyle.setProperty('--tile-hover-parallax', `${SETTINGS.tiles.hoverParallax}px`);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
