# Brainrot TD — Veröffentlichung für Android (Play Store) & iOS (App Store)

Das Spiel ist ein reines Web-Spiel (HTML/JS/Canvas, keine Server-Abhängigkeit) und wird
mit **Capacitor** als native App verpackt. Alles Nötige ist im Repo vorbereitet:

- `capacitor.config.json` — App-ID `de.nickbaumbach.brainrottd`, App-Name „Brainrot TD"
- `package.json` — Capacitor-Abhängigkeiten + fertige Scripts
- `build-www.mjs` — kopiert die Spieldateien in ein sauberes `www/`-Bundle
- `manifest.webmanifest` + `icons/` — PWA-Manifest und App-Icons (512/192/180 px)
- Das Spiel selbst ist mobile-tauglich: skaliert auf jede Bildschirmgröße (Landscape),
  volle Touch-Steuerung, Portrait zeigt einen „Bitte drehen"-Hinweis.

---

## Voraussetzungen

| Was | Wofür | Kosten |
|---|---|---|
| [Node.js](https://nodejs.org) ≥ 18 | Capacitor CLI | kostenlos |
| [Android Studio](https://developer.android.com/studio) | Android-Build | kostenlos |
| macOS + [Xcode](https://developer.apple.com/xcode/) | iOS-Build (nur auf einem Mac möglich!) | kostenlos |
| [Google Play Console](https://play.google.com/console)-Konto | Play-Store-Veröffentlichung | 25 $ einmalig |
| [Apple Developer Program](https://developer.apple.com/programs/) | App-Store-Veröffentlichung | 99 $/Jahr |

---

## Schritt 1: Projekt einrichten (einmalig)

```bash
git clone <dieses-repo> && cd TD
npm install
```

## Schritt 2: Android

```bash
npm run cap:add:android     # baut www/ und erzeugt den android/-Ordner
npm run cap:open:android    # öffnet das Projekt in Android Studio
```

Dann in Android Studio / im `android/`-Ordner:

1. **Querformat erzwingen**: In `android/app/src/main/AndroidManifest.xml` bei der
   `<activity>` ergänzen:
   ```xml
   android:screenOrientation="sensorLandscape"
   ```
2. **App-Icon**: In Android Studio → Rechtsklick auf `res` → *New → Image Asset* →
   `icons/icon-512.png` als Vorlage wählen (erzeugt alle Dichten automatisch).
3. **Signieren & bauen**: *Build → Generate Signed Bundle/APK → Android App Bundle (AAB)*.
   Beim ersten Mal einen neuen Keystore anlegen — **Keystore-Datei und Passwörter sicher
   aufbewahren** (ohne sie sind keine Updates mehr möglich!).
4. **Play Console**: Neue App anlegen → AAB unter *Produktion → Neue Version* hochladen →
   Store-Eintrag ausfüllen (Screenshots im Querformat, Kurz-/Langbeschreibung,
   Feature-Grafik 1024×500) → Inhaltsfragebogen (Content-Rating) → Datenschutzerklärung
   verlinken (Pflicht; das Spiel sammelt keine Daten — ein einfacher Einzeiler auf einer
   eigenen Webseite genügt) → zur Prüfung einreichen.

## Schritt 3: iOS (nur auf einem Mac)

```bash
npm run cap:add:ios
npm run cap:open:ios        # öffnet das Projekt in Xcode
```

Dann in Xcode:

1. **Team & Bundle-ID**: Unter *Signing & Capabilities* dein Apple-Developer-Team wählen;
   Bundle-ID `de.nickbaumbach.brainrottd` bestätigen.
2. **Querformat erzwingen**: Unter *General → Deployment Info* nur
   *Landscape Left/Right* anhaken (iPhone und iPad).
3. **App-Icon**: `Assets.xcassets → AppIcon` — `icons/icon-512.png` z. B. mit
   https://appicon.co in alle Größen umwandeln und einfügen.
4. **Archivieren**: Echtes Gerät oder *Any iOS Device* wählen → *Product → Archive* →
   *Distribute App → App Store Connect*.
5. **App Store Connect**: App anlegen, Screenshots (Querformat, 6,7"- und 13"-Pflichtgrößen),
   Beschreibung, Support-URL, Datenschutzerklärung → zur Prüfung einreichen.
   - Review-Hinweis: Reine Webview-„Wrapper" lehnt Apple gern ab (Guideline 4.2 Minimum
     Functionality). Ein vollwertiges Spiel wie dieses ist davon normalerweise nicht
     betroffen.

## Updates veröffentlichen

Nach jeder Code-Änderung:

```bash
npm run cap:sync   # baut www/ neu und kopiert es in android/ + ios/
```

Dann in Android Studio/Xcode Versionsnummer (`versionCode`/`Build`) erhöhen und neu
bauen + hochladen.

---

## ⚠️ Rechtliches (bitte vor der Einreichung lesen)

1. **Bloons-TD-Nähe**: Spielmechaniken sind nicht schutzfähig — ein „TD im Stil von
   Bloons" ist grundsätzlich okay. Die riskanten Ninja-Kiwi-Begriffe wurden bereits
   entfernt (MOAB/BFB → „Blimp"/„Mega Blimp", „Nike" → „Sneaker"). Wichtig bleibt:
   in Store-Texten **nicht** mit „Bloons" werben.
2. **Brainrot-Charaktere**: Namen wie Tung Tung Tung Sahur etc. sind virale
   Internet-Memes ohne klaren Rechteinhaber; die Grafiken hier sind Eigenkreationen.
   Ein Restrisiko (z. B. Markenanmeldungen Dritter) bleibt — im Zweifel anwaltlich
   prüfen lassen.
3. **Datenschutz**: Das Spiel läuft komplett offline und sammelt keinerlei Daten —
   das macht die Datenschutzerklärung und die Store-Formulare („keine Datenerhebung")
   sehr einfach.
