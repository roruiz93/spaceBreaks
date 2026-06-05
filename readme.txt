================================================================================
  ASTEROIDS — Requisitos y guia de desarrollo
================================================================================

REQUISITOS PREVIOS
------------------
  - Node.js       >= 18.x   (https://nodejs.org)
  - npm           >= 9.x    (incluido con Node)
  - Android Studio (solo para compilar APK/AAB para Android)
  - JDK 17+        (requerido por Android Studio)


DEPENDENCIAS PRINCIPALES
-------------------------
  Framework de juego:
    - phaser 3.60.0

  Build tool:
    - vite 5.x

  Empaquetado nativo (Android):
    - @capacitor/core 5.x
    - @capacitor/android 5.x
    - @capacitor/cli 5.x

  Plugins nativos (opcionales en web, activos en APK):
    - @capacitor-community/admob       (banners, interstitials, rewarded)
    - @capacitor-community/google-play-billing  (suscripcion premium)


INSTALACION
-----------
  1. Clonar / descomprimir el proyecto.

  2. Instalar dependencias:
       npm install

  3. Iniciar servidor de desarrollo:
       npm run dev

  4. Abrir en el navegador:
       http://localhost:5173


SCRIPTS DISPONIBLES
--------------------
  npm run dev       — servidor de desarrollo con hot-reload (Vite)
  npm run build     — genera el bundle de produccion en /dist
  npm run preview   — sirve el bundle de /dist localmente
  npm run cap:add   — agrega la plataforma Android a Capacitor
  npm run cap:sync  — sincroniza /dist con el proyecto Android
  npm run cap:open  — abre el proyecto en Android Studio
  npm run cap:run   — compila y ejecuta en dispositivo/emulador Android


COMPILAR PARA ANDROID
----------------------
  1. Generar bundle de produccion:
       npm run build

  2. Sincronizar con Capacitor:
       npm run cap:sync

  3. Abrir en Android Studio:
       npm run cap:open

  4. Desde Android Studio: Build > Generate Signed Bundle / APK


CONFIGURACION ADMOB
--------------------
  Editar capacitor.config.json y reemplazar el App ID de AdMob:
    "AdMob": {
      "appId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
    }

  Reemplazar tambien los adUnitId de banner, interstitial y rewarded
  en src/managers/AdMobManager.js con los IDs de tu cuenta de AdMob.

  IDs de prueba disponibles en SETUP.md (no generar ingresos reales).


CONFIGURACION GOOGLE PLAY BILLING
-----------------------------------
  En src/managers/BillingManager.js, verificar el productId:
    const PRODUCT_ID = 'premium_monthly';
  Debe coincidir con el producto creado en Google Play Console.
  El precio es configurable desde la consola de Google Play.


ESTRUCTURA DEL PROYECTO
------------------------
  src/
    main.js                  — entry point, config de Phaser
    scenes/
      BootScene.js           — generacion procedural de texturas + loading
      MenuScene.js           — pantalla principal, tienda, premium
      GameScene.js           — gameplay principal, HUD, controles
      GameOverScene.js       — resultados, revivir, anuncios
    objects/
      Player.js              — nave del jugador (fisicas, armas, skins)
      Asteroid.js            — asteroides con comportamiento de division
      Enemy.js               — enemigo OVNI con IA de movimiento y disparo
      Bullet.js              — pool de proyectiles
    managers/
      AdMobManager.js        — wrapper AdMob (banner/interstitial/rewarded)
      BillingManager.js      — wrapper Google Play Billing
      CoinManager.js         — economia de monedas, skins, power-ups
    utils/
      Storage.js             — wrapper de localStorage
  android/                   — proyecto Android generado por Capacitor
  capacitor.config.json      — configuracion de Capacitor y AdMob
  vite.config.js             — configuracion de Vite
  index.html                 — HTML raiz
  SETUP.md                   — guia detallada de configuracion Android/AdMob


NOTAS DE COMPATIBILIDAD
------------------------
  - El juego no necesita archivos de imagen; todas las texturas se generan
    proceduralmente en BootScene al iniciar.
  - En el navegador, AdMob y Billing funcionan en modo mock automaticamente
    (sin errores, sin crashes).
  - La suscripcion premium puede simularse en web desde la consola:
      window.__game.registry.get('billing').isPremium = true
  - En modo web el interstitial no se muestra, pero el rewarded simula
    un retardo de 2s antes de otorgar la recompensa.

================================================================================
