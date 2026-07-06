# Contributing to Swasthya Setu 🏥

Thank you for helping improve rural healthcare with AI! Here's how to contribute effectively.

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project ([create one free](https://console.firebase.google.com))
- A Gemini API key ([get one free](https://aistudio.google.com))

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/swasthya-setu.git
cd swasthya-setu

# 2. Setup frontend
cd frontend
cp .env.example .env          # fill in your API keys
npm install
npm run dev                   # → http://localhost:5173

# 3. Setup Cloud Functions (optional)
cd ../functions
cp .env.example .env
npm install
firebase emulators:start --only functions
```

---

## 🌿 Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — auto-deployed to Firebase |
| `develop` | Integration branch — merge features here |
| `feature/xxx` | New features |
| `fix/xxx` | Bug fixes |
| `docs/xxx` | Documentation updates |

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# After your work
git push origin feature/your-feature-name
# → open a Pull Request to develop
```

---

## 📐 Code Style

- **CSS:** Use CSS variables from `index.css` — never hardcode colors
- **Components:** One component per file, named exports
- **State:** All global state goes through `useAppStore` (Zustand)
- **AI calls:** Always go through `src/services/geminiService.js`
- **Secrets:** ALWAYS use `.env` — never commit raw API keys

---

## 🔒 Security Rules

- **Never commit:** `.env`, `.runtimeconfig.json`, `*service-account*.json`
- **API keys:** Use `VITE_` prefix for frontend, Firebase Functions config for backend
- Always check `.gitignore` before pushing

---

## 💬 Commit Message Format

```
type(scope): short description

# Examples:
feat(dashboard): add real-time bed utilization chart
fix(voice): correct Hindi TTS pronunciation for medicine names
docs(readme): update cost estimate table
chore(ci): add Node 18 cache to GitHub Actions
```

Types: `feat` · `fix` · `docs` · `style` · `refactor` · `test` · `chore`

---

## 🧪 Before Submitting a PR

```bash
# Build must pass
cd frontend && npm run build

# Test all 3 roles manually
# 1. Officer → Dashboard → Alerts → Redistribution
# 2. Staff → Voice Entry → Photo Verify
# 3. Citizen → Medicine search
```

---

## ❓ Questions?

Open an [Issue](../../issues) with the label `question`.
