# Swasthya Setu 🏥

> **"Swasthya Setu"** — a multilingual AI command center that gives every PHC/CHC and its district officer real-time visibility into stock, beds, staff, and demand — with AI predicting shortages before they happen.

**Event:** Build with AI: Code for Communities | **Track:** AI-Driven Health Center & Supply Chain Management

---

## 🚀 Live Demo

```
npm run dev     # starts at http://localhost:5173
```

**Demo Roles:**
| Role | Access |
|------|--------|
| 🏛️ District Health Officer | Full AI dashboard, alerts, redistribution management |
| 🏥 PHC Staff (ANM/Pharmacist) | Voice/photo stock entry, bed & attendance updates |
| 👤 Citizen | Medicine availability search before travelling |

---

## 🧠 AI Features (Prompt §3)

### §3a — Stock-out Prediction (Cloud Function: `stockPrediction`)
- Runs **daily** per PHC per medicine
- Computes `avgDailyConsumption` via 30-day moving average
- Predicts `daysUntilStockout = currentQty / avgDailyConsumption`
- **Critical** < 3 days, **Warning** 3-7 days
- Calls **Gemini API** for a plain-language one-liner recommendation

### §3b — Smart Redistribution (Cloud Function: `smartRedistribution`)
- Triggered when a stockout alert is created
- Queries all district PHCs for the same medicine surplus
- Calls **Google Maps Distance Matrix API** for real travel time
- Re-ranks by combined urgency + distance score
- Gemini drafts justification → "Approve Transfer" card in dashboard

### §3c — PHC Health Score (Cloud Function: `phcHealthScore`)
- Runs **weekly** per PHC
- Scores 0–100: stockout frequency (35%) + attendance (30%) + bed util (20%) + footfall (15%)
- PHCs below 50 get a Gemini-generated explanation + intervention suggestions

### §3d — Multimodal Stock Verification
- Pharmacist photographs the medicine shelf
- Gemini counts visible boxes/strips by type
- Flags discrepancies > 15% for manual audit

---

## 🗣️ Inclusivity (Prompt §4)

| Feature | Implementation |
|---------|----------------|
| **Language toggle** | Hindi / English / Marathi |
| **Voice entry** | Browser Speech API → Gemini extraction → TTS confirmation |
| **Low-literacy UI** | Icon-heavy, large tap targets, color-coded severity |
| **Offline mode** | Firestore offline persistence (automatic) |
| **SMS fallback** | Twilio webhook → `smsWebhook` Cloud Function → Gemini parse |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite PWA)            │
│  District Officer Dashboard │ Staff Portal │ Citizen App │
└─────────────────┬────────────────────────────────────────┘
                  │ Firestore (real-time)
┌─────────────────▼────────────────────────────────────────┐
│            Firebase (Auth + Firestore + Hosting)          │
└─────────────────┬────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│              Cloud Functions (Node.js)                    │
│  stockPrediction │ smartRedistribution │ phcHealthScore  │
│  smsWebhook                                              │
└──────┬───────────────────┬─────────────────────┬─────────┘
       │                   │                     │
  Gemini API          Maps Distance          BigQuery
  (Vertex AI)         Matrix API          (Analytics)
```

---

## 📁 Project Structure

```
GoogleCloud-H2S/
├── frontend/                    # React + Vite + Zustand PWA
│   ├── src/
│   │   ├── components/          # AlertFeed, DistrictMap, VoiceInput, PhotoStockVerifier…
│   │   ├── pages/               # DistrictDashboard, AlertsPage, PHCsPage, StaffDashboard…
│   │   ├── services/geminiService.js   # Gemini API calls
│   │   ├── store/appStore.js    # Zustand global state
│   │   └── data/seedData.js     # 5 mock PHCs seed data
│   └── vite.config.js
├── functions/
│   └── src/index.js             # All 4 Cloud Functions
├── firestore.rules
├── firebase.json
└── README.md
```

---

## ⚡ Quick Start & Development Setup

### 📋 Prerequisites
- **Node.js** version 18 or higher.
- **Firebase CLI** installed globally (`npm install -g firebase-tools`).
- A Firebase Project on the **Blaze Plan** (required for Cloud Functions).

### 📥 Cloning the Repository
To get started with the project locally, run the following commands in your terminal:
```bash
# Clone the repository
git clone https://github.com/RAGHURAJ09/swasthya-setu.git

# Move into the project directory
cd swasthya-setu
```

### 🛠️ Local Environment Configuration


#### 1. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Create a `.env` file in `frontend/` containing your Firebase Web Configuration keys:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
   ```
3. Install dependencies and start the local development server:
   ```bash
   npm install
   npm run dev
   ```

#### 2. Cloud Functions Setup
1. Install tools in the functions directory:
   ```bash
   cd functions
   npm install
   ```
2. Set configuration variables for production:
   ```bash
   firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY" maps.key="YOUR_MAPS_API_KEY"
   ```
3. (Optional) Run the local emulator suite for debugging functions:
   ```bash
   firebase emulators:start --only functions
   ```

### 🚀 Production Deployment
To deploy the database rules, index specifications, built frontend, and Cloud Functions to the cloud:
1. Build the production build of the React app:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
2. Deploy using the Firebase CLI:
   ```bash
   firebase deploy
   ```


---

## 💰 Cost Estimate (Prompt §5)

| Service | Usage | Cost/Month |
|---------|-------|-----------|
| Firebase Firestore | ~20 PHCs × 30 days writes | Free tier |
| Cloud Functions | Daily + weekly crons | ~₹200 |
| Gemini API | ~200 calls/day | ~₹1,500 |
| Maps Distance Matrix | ~100 calls/day | ~₹800 |
| Cloud Run (backend) | Pay-per-use | ~₹1,200 |
| Firebase Hosting | Static PWA | Free |
| **Total** | **~20 PHCs** | **< ₹4,000/month** |

Well within the ₹5,000/month target for a pilot district.

---

## 📊 Impact (Prompt §6)

- **Pune District:** 5 PHCs × ~80 patients/day = **400+ citizens/day** potentially affected by stockouts
- **Scale-up:** A typical district has 20-30 PHCs → **1,600–2,400 citizens/day**
- **Before:** Manual paper register — stockout discovered after patient turned away
- **After:** AI alert 4+ days before stockout → auto-redistribution suggested

---

## 🔑 Environment Variables

```bash
# Firebase Functions config
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
firebase functions:config:set maps.key="YOUR_MAPS_API_KEY"

# Or .env for local
GEMINI_API_KEY=your_key
MAPS_API_KEY=your_key
```

---

## 📋 Submission Checklist

- [x] Problem-Solution Fit (20%) — PHC supply chain crisis, AI-driven fix
- [x] AI/Technical Execution (25%) — Gemini stock prediction + redistribution + multimodal
- [x] Deployability & Scalability (25%) — Multi-tenant, Cloud Run, BigQuery ready
- [x] Inclusivity & Accessibility (15%) — Hindi/Marathi voice + SMS fallback
- [x] Impact Potential (10%) — Quantified citizen impact, cited issue
- [x] Presentation & Clarity (5%) — 5-min demo script in spec

---

*Built with ❤️ for rural India's primary healthcare workers.*
