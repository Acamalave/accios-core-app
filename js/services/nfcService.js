/**
 * NFC Service — Capacitor native NFC reader
 *
 * On native Android: reads NFC tags / contactless cards via @capgo/capacitor-nfc
 * On web: NFC is unavailable, isAvailable() returns false → fallback to QR code
 */

class NfcService {
  constructor() {
    this._plugin = null;
    this._reading = false;
    this._listeners = [];
  }

  /**
   * Whether NFC hardware is available (only on native Capacitor)
   */
  isAvailable() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform());
  }

  /**
   * Lazy-load the NFC plugin through Capacitor bridge
   */
  _getPlugin() {
    if (!this._plugin && window.Capacitor?.registerPlugin) {
      this._plugin = window.Capacitor.registerPlugin('CapacitorNfc');
    }
    return this._plugin;
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

    const plugin = this._getPlugin();
    if (!plugin) {
      onError?.('Plugin NFC no cargado');
      return false;
    }

    try {
      // Check / request NFC permissions
      let perms = await plugin.checkPermissions();
      if (!perms.nfc || perms.nfc !== 'granted') {
        perms = await plugin.requestPermissions();
        if (!perms.nfc || perms.nfc !== 'granted') {
          onError?.('Permiso NFC denegado');
          return false;
        }
      }

      // Start scan session
      await plugin.startScanSession();

      // Listen for tag reads
      const listener = await plugin.addListener('nfcTagScanned', (event) => {
        onTagRead?.(this._parseTagData(event));
      });
      this._listeners.push(listener);

      this._reading = true;
      return true;
    } catch (err) {
      onError?.(err.message || 'Error iniciando NFC');
      return false;
    }
  }

  /**
   * Stop NFC scan session and clean up
   */
  async stopReading() {
    const plugin = this._getPlugin();
    if (plugin && this._reading) {
      try {
        await plugin.stopScanSession();
      } catch (_) {
        // ignore stop errors
      }
    }

    this._listeners.forEach(l => l.remove?.());
    this._listeners = [];
    this._reading = false;
  }

  /**
   * Parse raw NFC event into a normalized structure
   */
  _parseTagData(event) {
    return {
      id: event.id || event.serialNumber || null,
      type: event.type || event.techTypes?.[0] || 'unknown',
      records: event.records || event.messages || [],
      raw: event,
    };
  }
}

const nfcService = new NfcService();
export default nfcService;
