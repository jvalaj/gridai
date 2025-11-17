import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import faviconUrl from './gridailogo.png'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Set favicon to app logo (works even when asset lives in src/)
const ensureFavicon = (href: string) => {
  const head = document.head || document.getElementsByTagName('head')[0];
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = href;
};

ensureFavicon(faviconUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)


