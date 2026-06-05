# Asteroids — Guía de Setup para Android + AdMob

## 1. Instalar dependencias

```bash
cd juegos/asteroids
npm install
```

---

## 2. Probar en web (desarrollo)

```bash
npm run dev
# Abre http://localhost:3000
```

---

## 3. Build de producción

```bash
npm run build
# Genera la carpeta /dist
```

---

## 4. Setup de Capacitor + Android

### 4.1 Inicializar Capacitor

```bash
npx cap add android
npx cap sync android
```

### 4.2 Abrir en Android Studio

```bash
npx cap open android
```

---

## 5. Configurar AdMob REAL

### 5.1 Reemplazar IDs en `src/managers/AdMobManager.js`

```js
const AD_UNITS = {
  banner:       'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',  // tu ID real
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',  // tu ID real
  rewarded:     'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',  // tu ID real
};
```

### 5.2 Reemplazar appId en `capacitor.config.json`

```json
{
  "plugins": {
    "AdMob": {
      "appId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"   // tu App ID de AdMob
    }
  }
}
```

### 5.3 Agregar en `android/app/src/main/AndroidManifest.xml`

```xml
<application ...>
  <!-- AdMob App ID -->
  <meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"/>
</application>
```

### 5.4 Agregar en `android/app/build.gradle`

```groovy
dependencies {
    implementation 'com.google.android.gms:play-services-ads:22.6.0'
}
```

---

## 6. Configurar Google Play Billing (Suscripción)

### 6.1 Instalar el plugin

```bash
npm install @capacitor-community/in-app-purchases
npx cap sync android
```

### 6.2 Agregar en `android/app/build.gradle`

```groovy
dependencies {
    implementation 'com.android.billingclient:billing:6.1.0'
}
```

### 6.3 Crear el producto en Google Play Console

1. Ir a Google Play Console → tu app → Monetización → Suscripciones
2. Crear suscripción:
   - **ID**: `premium_monthly`
   - **Precio**: $0.99 USD / mes
   - **Período de gracia**: 3 días
3. Publicar la app en al menos "Internal Testing" antes de testear compras

### 6.4 Reemplazar el ID en `capacitor.config.json`

```json
{
  "appId": "com.tuempresa.asteroids"   // debe coincidir con Google Play Console
}
```

---

## 7. IDs de TEST para desarrollo (AdMob)

Usar estos IDs mientras desarrollas (no generan ingresos reales pero evitan bans):

```
App ID test:       ca-app-pub-3940256099942544~3347511713
Banner:            ca-app-pub-3940256099942544/6300978111
Interstitial:      ca-app-pub-3940256099942544/1033173712
Rewarded:          ca-app-pub-3940256099942544/5224354917
```

En `AdMobManager.js` descomentar los IDs de test y comentar los reales.

---

## 8. Firmar el APK para producción

```bash
# Generar keystore
keytool -genkey -v -keystore release.keystore -alias key0 -keyalg RSA -keysize 2048 -validity 10000

# Build release
cd android
./gradlew assembleRelease
```

El APK firmado queda en: `android/app/build/outputs/apk/release/`

---

## 9. Estructura del proyecto

```
asteroids/
├── index.html
├── package.json
├── vite.config.js
├── capacitor.config.json
├── src/
│   ├── main.js                    ← Config Phaser + escenas
│   ├── scenes/
│   │   ├── BootScene.js           ← Genera texturas, pantalla de carga
│   │   ├── MenuScene.js           ← Menú principal + tienda
│   │   ├── GameScene.js           ← Loop principal del juego
│   │   └── GameOverScene.js       ← Game over + revivir + anuncios
│   ├── objects/
│   │   ├── Player.js              ← Nave, vidas, escudo, tiro
│   │   ├── Asteroid.js            ← Asteroides (grande/medio/chico)
│   │   ├── Enemy.js               ← OVNI enemigo
│   │   └── Bullet.js              ← Proyectiles
│   ├── managers/
│   │   ├── AdMobManager.js        ← Banner, Interstitial, Rewarded
│   │   ├── BillingManager.js      ← Suscripción Google Play
│   │   └── CoinManager.js         ← Monedas, skins, power-ups
│   └── utils/
│       └── Storage.js             ← localStorage persistencia
└── SETUP.md
```

---

## 10. Gameplay

| Elemento       | Puntos | Notas                         |
|---------------|--------|-------------------------------|
| Asteroide chico | +10  | Combo multiplica              |
| Asteroide mediano | +20 |                             |
| Asteroide grande | +30 |                              |
| Enemigo (OVNI) | +50   | 2 HP, dispara al jugador      |
| Combo x2       | doble | 2+ kills sin recibir daño    |
| Combo x3       | triple| 4+ kills                      |
| Combo x4       | x4    | 8+ kills                      |
| Premium bonus  | +20%  | Score multiplicado             |

### Controles

**Desktop:** ← → rotar | ↑ propulsar | Espacio disparar

**Mobile:** Botones táctiles en pantalla (◀ ▶ ▲ 🔥)

---

## 11. Monetización

| Tipo            | Cuándo                     | Beneficio               |
|----------------|----------------------------|-------------------------|
| Banner          | Durante el juego (no premium) | Ingresos pasivos      |
| Interstitial    | Cada 3 partidas (no premium) | Ingresos por sesión    |
| Rewarded        | Game Over → Revivir         | Jugador elige verlo    |
| Premium $0.99/mes | Compra en-app           | Sin ads + revivir gratis + +20% score |
