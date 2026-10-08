import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { applyTheme, useTheme } from './theme/store';
import './styles/app.css';

// The look and mode go on <html> before the first render, so nothing flashes in the wrong colours.
applyTheme();
useTheme.subscribe((s) => applyTheme(s));

// No long-press menus or link previews (patterns.md §10), except on text that's meant to be selected.
document.addEventListener('contextmenu', (e) => {
  const t = e.target as Element | null;
  if (!t?.closest('input, textarea, [contenteditable], .selectable')) e.preventDefault();
});

const root = document.getElementById('root');
if (!root) throw new Error('No #root in index.html');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
