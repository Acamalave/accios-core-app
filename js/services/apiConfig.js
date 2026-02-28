/**
 * API Configuration for Capacitor native / web hybrid
 *
 * When running inside Capacitor (native Android), fetch('/api/...') would
 * hit https://localhost which has no backend. We prefix with the
 * Vercel production URL so API calls reach the serverless functions.
 *
 * On web (Vercel), the prefix is empty so relative URLs work as usual.
 */

function detectNative() {
  try {
    // Capacitor bridge sets isNativePlatform as a function that returns true
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
      return window.Capacitor.isNativePlatform();
    }
    // Fallback: check if Capacitor object exists with getPlatform
    if (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
      return window.Capacitor.getPlatform() !== 'web';
    }
    // Last resort: check if we're on https://localhost (Capacitor's default)
    if (window.location.protocol === 'https:' && window.location.hostname === 'localhost') {
      return true;
    }
  } catch (_) {}
  return false;
}

const isNative = detectNative();
const API_BASE = isNative ? 'https://accios-core.vercel.app' : '';

// Debug logging for native app troubleshooting
if (isNative) {
  console.log('[ACCIOS] Running in native mode, API_BASE:', API_BASE);
} else {
  console.log('[ACCIOS] Running in web mode');
}

export function apiUrl(path) {
  const url = API_BASE + path;
  if (isNative) {
    console.log('[ACCIOS] API call:', url);
  }
  return url;
}

export { isNative };
