import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { debugLogger } from './utils/DebugLogger'

window.addEventListener('error', (event) => {
  debugLogger.error(0, 'SYSTEM', `Uncaught error: ${event.message}`, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  debugLogger.error(0, 'SYSTEM', `Unhandled rejection: ${reason}`, {
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
