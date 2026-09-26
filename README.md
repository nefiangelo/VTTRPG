<h1 align="center">
  <br>
  VTTRPG
  <br>
</h1>

<h4 align="center">
  A feature-rich <strong>Virtual Tabletop RPG</strong> platform built for players and game masters — <em>play your way, host your own.</em>
</h4>

<p align="center">
  <!-- <img alt="License" src="https://img.shields.io/github/license/nefiangelo/VTTRPG?color=7c3aed&style=for-the-badge" /> -->
  <img alt="Status" src="https://img.shields.io/badge/status-in%20development-f59e0b?style=for-the-badge" />
  <br>
  <img alt="Electron" src="https://img.shields.io/badge/Electron-39-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <br>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <br>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

<p align="center">
  <a href="#-about">About</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-roadmap">Roadmap</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

---

## 🧙 About

**VTTRPG** is an open-source, self-hostable virtual tabletop platform designed to bring your tabletop RPG sessions to life — no subscriptions, no data on third-party servers, just you and your party.

Whether you're a **Game Master** crafting an epic campaign or a **player** rolling dice at the edge of your seat, VTTRPG gives you the tools to play any RPG system, anywhere, fully under your control.

> 🚧 **This project is in early development.** Features are being actively built. Star the repo to follow progress!

---

## ✨ Features

VTTRPG is being built around the experience players and GMs actually need:

| Feature | Description |
|---|---|
| 🎙️ **Voice & Video** | Real-time voice chat and webcam support built into the table |
| 📋 **Character Sheets** | Fully managed, editable character sheets for any system |
| 🗺️ **Virtual Tabletop** | Interactive maps with token movement and grid support |
| 🎲 **Integrated Dice** | Roll any dice combination, right inside the interface |
| 💬 **Text Chat** | In-session messaging for out-of-character notes and story narration |
| 🎵 **Ambience & Music** | Background soundscapes to set the mood at the table |
| 🖥️ **Self-Hosted Sessions** | Run your own server — your data stays yours |
| 🔧 **Multi-System Support** | Built to adapt to D&D, Pathfinder, Call of Cthulhu, and beyond |

---

## 🛠️ Tech Stack

VTTRPG is a cross-platform **desktop application** powered by:

- **[Electron](https://www.electronjs.org/)** — native desktop shell (Windows, macOS, Linux)
- **[React 19](https://react.dev/)** — component-driven UI
- **[TypeScript 5](https://www.typescriptlang.org/)** — type-safe codebase
- **[electron-vite](https://electron-vite.org/)** — fast dev server and build tooling
- **[electron-builder](https://www.electron.build/)** — cross-platform packaging and distribution

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [npm](https://www.npmjs.com/) >= 9

### Installation

```bash
# Clone the repository
git clone https://github.com/nefiangelo/VTTRPG.git
cd VTTRPG/app

# Install dependencies
npm install
```

### Development

```bash
# Start the app in development mode with hot reload
npm run dev
```

### Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

---

## 🗺️ Roadmap

This project is just getting started. Here's what's coming:

- [ ] Core application window & navigation
- [ ] Session creation and management
- [ ] Character sheet framework
- [ ] Real-time voice/video via WebRTC
- [ ] Interactive virtual tabletop (maps + tokens)
- [ ] Integrated dice roller
- [ ] Self-hosted server setup guide
- [ ] Plugin/theme system for multi-system support

---

## 🤝 Contributing

Contributions are welcome and encouraged! This project is in its early stages, so there's plenty of room to shape its direction.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please follow conventional commits where possible.

---

## 👥 Authors

- **Néfi Ângelo**
- **Lucas Rock**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for the tabletop community
</p>
