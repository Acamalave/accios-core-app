/**
 * API Configuration for Capacitor native / web hybrid
 *
 * API serverless functions live on Vercel (accios-core-acamalave.vercel.app).
 * accioscore.com currently points to Firebase Hosting (not Vercel),
 * so we always use the Vercel subdomain for API calls unless we're
 * already ON a Vercel domain where relative URLs work.
 */

const VERCEL_API = 'https://accios-core-acamalave.vercel.app';

function detectNative() {
  try {
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
      return window.Capacitor.isNativePlatform();
    }
    if (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
      return window.Capacitor.getPlatform() !== 'web';
    }
  } catch (_) {}
  return false;
}

const isNative = detectNative();

// Detect if we're on a Vercel domain (where relative API URLs work)
const isVercel = !isNative && (
  window.location.hostname.includes('vercel.app')
);

// On Vercel: relative URLs. Everywhere else: full Vercel URL
const API_BASE = isVercel ? '' : VERCEL_API;

export function apiUrl(path) {
  return API_BASE + path;
}

export { isNative };
