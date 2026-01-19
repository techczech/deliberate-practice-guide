import * as ReactPkg from 'react';
import * as ReactDOMClientPkg from 'react-dom/client';
import App from './App';

// Safe resolution of default vs named exports for CDN compatibility
const React = (ReactPkg as any).default || ReactPkg;
const ReactDOMClient = (ReactDOMClientPkg as any).default || ReactDOMClientPkg;
const createRoot = ReactDOMClient.createRoot || (ReactDOMClient as any).default?.createRoot;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if (!createRoot) {
    throw new Error("Failed to resolve createRoot from react-dom/client");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
