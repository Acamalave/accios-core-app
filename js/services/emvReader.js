/**
 * EMV Card Reader - Reads payment card data via NFC IsoDep/APDU
 * Uses custom native Android plugin (EmvReaderPlugin.java)
 *
 * Flow: NFC tap → APDU commands → PAN + Expiry + CardType → auto-charge
 */

class EmvReaderService {
  constructor() {
    this._plugin = null;
    this._available = false;
    this._init();
  }

  _init() {
    // Check if we're on native platform with the EmvReader plugin
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        const plugins = window.Capacitor.Plugins;
        if (plugins && plugins.EmvReader) {
          this._plugin = plugins.EmvReader;
          this._available = true;
          console.log('[EMV] EmvReader plugin available');
        } else {
          console.log('[EMV] EmvReader plugin not found in Capacitor.Plugins');
        }
      } else {
        console.log('[EMV] Not on native platform');
      }
    } catch (e) {
      console.log('[EMV] Init error:', e.message);
    }
  }

  /**
   * Check if EMV reading is available (native Android with NFC)
   */
  isAvailable() {
    return this._available;
  }

  /**
   * Start reading an EMV card. Returns a Promise that resolves with card data.
   *
   * @param {number} timeout - Max wait time in ms (default 30s)
   * @returns {Promise<{pan: string, expMonth: string, expYear: string, name: string, cardType: string, last4: string, appLabel: string}>}
   */
  async readCard(timeout = 30000) {
    if (!this._available) {
      throw new Error('EMV reader not available');
    }

    console.log('[EMV] Starting card read...');
    try {
      const result = await this._plugin.readCard({ timeout });
      console.log('[EMV] Card read result:', JSON.stringify({
        cardType: result.cardType,
        last4: result.last4,
        expMonth: result.expMonth,
        expYear: result.expYear,
        name: result.name || '',
        appLabel: result.appLabel || ''
      }));
      return result;
    } catch (e) {
      console.error('[EMV] Read error:', e);
      throw e;
    }
  }

  /**
   * Stop any active card reading
   */
  async stopReading() {
    if (!this._available) return;
    try {
      await this._plugin.stopReading();
    } catch (e) {
      console.log('[EMV] Stop error:', e.message);
    }
  }
}

// Export singleton
const emvReader = new EmvReaderService();
export default emvReader;
