/**
 * API Configuration for Capacitor native / web hybrid
 *
 * When running inside Capacitor (native Android), fetch('/api/...') would
 * hit capacitor://localhost which has no backend. We prefix with the
 * Vercel production URL so API calls reach the serverless functions.
 *
 * On web (Vercel), the prefix is empty so relative URLs work as usual.
 */

const isNative = typeof window !== 'undefined'
  && window.Capacitor
  && window.Capacitor.isNativePlatform();

const API_BASE = isNative ? 'https://accios-core.vercel.app' : '';

export function apiUrl(path) {
  return API_BASE + path;
}
