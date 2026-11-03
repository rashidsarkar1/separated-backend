import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.tsx';
import './index.css';

// Prevent mouse wheel from changing values in number inputs
window.addEventListener(
  'wheel',
  () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === 'number') {
      active.blur();
    }
  },
  { passive: true }
);

document.addEventListener(
  'wheel',
  (e) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === 'number') {
      target.blur();
    }
  },
  { passive: true, capture: true }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
