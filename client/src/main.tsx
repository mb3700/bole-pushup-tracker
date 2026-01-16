import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from './App';
import "./index.css";
import { initializeCapacitor } from './lib/capacitor-init';

// Initialize Capacitor native features
initializeCapacitor().then(() => {
  console.log('Capacitor initialized');
}).catch((error) => {
  console.error('Capacitor initialization error:', error);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
