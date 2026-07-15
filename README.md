# CincoScribe Monorepo

CincoScribe is a free, open-source transcription and TTS application. This repository is a monorepo containing the desktop app, web app, and shared packages.

---

## Repository Contents

```
├── packages/
│   ├── core/             # Core transcription logic
│   ├── desktop/          # Electron desktop application
│   ├── ui/               # Shared UI components
│   └── web/              # Next.js web application frontend
├── package.json          # Monorepo configuration
├── AUDIT.md              # npm audit justification
├── LICENSE
└── README.md
```

---

## Prerequisites

- Node.js 18+
- npm

---

## Install Dependencies

```bash
npm install
```

---

## Run in Development

**Desktop App:**
```bash
npm run dev:desktop
```
Launches the Electron window.

**Web App:**
```bash
npm run dev:web
```
Runs the Next.js dev server on port 3000.

---

## Build

**Desktop Installer (Windows):**
```bash
npm run build:desktop
```
Produces an NSIS installer in `packages/desktop/dist/`. Configuration is in `packages/desktop/electron-builder.yml`.

**Web App:**
```bash
npm run build:web
```

---

## License

See [LICENSE](./LICENSE).
