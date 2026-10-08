import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { applyTheme, useTheme } from './theme/store';
import './styles/app.css';

// The look and mode go on <html> before the first render, so nothing flashes in the wrong colours.
applyTheme();
useTheme.subscribe((s) => applyTheme(s));

const root = document.getElementById('root');
if (!root) throw new Error('No #root in index.html');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
