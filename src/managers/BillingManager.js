/**
 * BillingManager — Google Play Billing via @capacitor-community/in-app-purchases
 *
 * SETUP:
 *   npm install @capacitor-community/in-app-purchases
 *   npx cap sync android
 *
 *   En Google Play Console:
 *   - Crear suscripción con ID: "premium_monthly"
 *   - Precio: $0.99 USD / mes
 *
 * NOTA: Las compras SOLO funcionan en APK firmado subido a Google Play.
 * En desarrollo siempre retorna isPremium = false (o puedes forzarlo).
 */

import { Storage } from '../utils/Storage.js';

const SUBSCRIPTION_ID = 'premium_monthly';

let ready = false;

// Accede al plugin via el bridge de Capacitor (solo disponible en Android nativo).
// En web/dev retorna null sin errores.
function getPlugin() {
  try {
    return window?.Capacitor?.Plugins?.InAppPurchases ?? null;
  } catch {
    return null;
  }
}

export const BillingManager = {

  async initialize() {
    const plugin = getPlugin();
    if (!plugin) { console.log('[Billing] Web mode — IAP not available'); return; }
    try {
      await plugin.initialize();
      ready = true;
      // Restore purchases al iniciar
      await this.restorePurchases();
    } catch (e) { console.warn('[Billing] Init error:', e); }
  },

  /**
   * Inicia el flujo de compra de la suscripción mensual.
   * Retorna true si la compra fue exitosa.
   */
  async purchaseSubscription() {
    const plugin = getPlugin();
    if (!plugin || !ready) {
      // En web/dev: simulamos compra para testing
      console.log('[Billing] Simulating purchase in web mode');
      Storage.setPremium(true);
      return true;
    }
    try {
      const products = await plugin.getProducts({ productIds: [SUBSCRIPTION_ID] });
      if (!products?.products?.length) {
        console.warn('[Billing] Product not found:', SUBSCRIPTION_ID);
        return false;
      }
      const result = await plugin.purchaseProduct({ productId: SUBSCRIPTION_ID });
      if (result?.transactionId) {
        Storage.setPremium(true);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[Billing] Purchase error:', e);
      return false;
    }
  },

  /**
   * Restaura compras anteriores (ej. si el usuario reinstala la app).
   */
  async restorePurchases() {
    const plugin = getPlugin();
    if (!plugin || !ready) return;
    try {
      const result = await plugin.restorePurchases();
      const purchases = result?.purchases ?? [];
      const hasSub = purchases.some(p =>
        p.productId === SUBSCRIPTION_ID &&
        (p.state === 'purchased' || p.state === 'restored')
      );
      Storage.setPremium(hasSub);
      console.log('[Billing] Premium restored:', hasSub);
    } catch (e) { console.warn('[Billing] Restore error:', e); }
  },

  isPremium() { return Storage.isPremium(); },

  // Precio a mostrar en UI (puedes obtenerlo de la Play Store también)
  getSubscriptionPrice() { return '$0.99/mes'; },
};
