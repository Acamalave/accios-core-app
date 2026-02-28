/**
 * NFC Service — Capacitor native NFC reader
 *
 * Uses @capgo/capacitor-nfc plugin via Capacitor's native bridge.
 * Correct method names: startScanning / stopScanning
 * Correct event name: 'nfcEvent'
 *
 * On web: NFC is unavailable, isAvailable() returns false → fallback to QR.
 */

import { isNative } from './apiConfig.js';

const PLUGIN_NAME = 'CapacitorNfc';

class NfcService {
  constructor() {
    this._reading = false;
    this._listeners = [];
  }

  /**
   * Whether NFC hardware is available (only on native Capacitor with plugin)
   */
  isAvailable() {
    if (!isNative) return false;
    try {
      return window.Capacitor.isPluginAvailable(PLUGIN_NAME);
    } catch (_) {
      return false;
    }
  }

  /**
   * Call a native plugin method via Capacitor bridge
   */
  _call(method, data = {}) {
    return new Promise((resolve, reject) => {
      try {
        window.Capacitor.nativeCallback(
          PLUGIN_NAME,
          method,
          data,
          (result) => {
            if (result && result.error) {
              reject(new Error(result.error.message || result.error));
            } else {
              resolve(result);
            }
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Start listening for NFC tags
   * @param {Function} onTagRead - called with parsed tag data
   * @param {Function} onError   - called on error
   * @returns {Promise<boolean>} true if scanning started
   */
  async startReading(onTagRead, onError) {
    if (!this.isAvailable()) {
      onError?.('NFC no disponible en esta plataforma');
      return false;
    }

    try {
      // Listen for ALL NFC event types from @capgo/capacitor-nfc
      const events = ['nfcEvent', 'tagDiscovered', 'ndefDiscovered', 'ndefMimeDiscovered', 'ndefFormatableDiscovered'];

      for (const eventName of events) {
        try {
          const listener = window.Capacitor.addListener(
            PLUGIN_NAME,
            eventName,
            (event) => {
              console.log('[NFC] Event received:', eventName, JSON.stringify(event));
              onTagRead?.(this._parseTagData(event));
            }
          );
          if (listener && typeof listener.then === 'function') {
            // If addListener returns a promise, await it
            const resolved = await listener;
            this._listeners.push(resolved);
          } else {
            this._listeners.push(listener);
          }
        } catch (e) {
          console.warn('[NFC] Could not add listener for', eventName, e);
        }
      }

      // Start scanning with @capgo/capacitor-nfc correct method name
      await this._call('startScanning', {
        invalidateAfterFirstRead: false,
        alertMessage: 'Acerca la tarjeta al dispositivo'
      });

      console.log('[NFC] Scanning started successfully');
      this._reading = true;
      return true;
    } catch (err) {
      console.error('[NFC] Error starting scan:', err);
      onError?.(err.message || 'Error iniciando NFC');
      return false;
    }
  }

  /**
   * Stop NFC scan session and clean up
   */
  async stopReading() {
    if (this._reading) {
      try {
        await this._call('stopScanning');
        console.log('[NFC] Scanning stopped');
      } catch (_) {
        // ignore stop errors
      }
    }

    this._listeners.forEach(l => {
      try {
        if (l && typeof l.remove === 'function') l.remove();
      } catch (_) {}
    });
    this._listeners = [];
    this._reading = false;
  }

  /**
   * Parse raw NFC event into a normalized structure.
   * @capgo/capacitor-nfc sends: { type: 'tag'|'ndef'|..., tag: { id, techTypes, ndefMessage, ... } }
   */
  _parseTagData(event) {
    const tag = event.tag || event;
    const id = tag.id
      ? (Array.isArray(tag.id) ? tag.id.map(b => b.toString(16).padStart(2, '0')).join(':') : tag.id)
      : null;

    return {
      id: id,
      type: event.type || tag.type || tag.techTypes?.[0] || 'unknown',
      techTypes: tag.techTypes || [],
      ndefMessage: tag.ndefMessage || [],
      maxSize: tag.maxSize || null,
      isWritable: tag.isWritable || false,
      raw: event,
    };
  }
}

const nfcService = new NfcService();
export default nfcService;
