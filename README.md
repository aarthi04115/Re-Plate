# 🍱 RePlate — Premium Food Rescue Platform

<div align="center">

![RePlate Banner](https://img.shields.io/badge/RePlate-Premium_Food_Rescue-008C44?style=for-the-badge&logo=react&logoColor=white)
![Build Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Tech_Stack-React_19_|_Vite_8_|_Supabase-blue?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-Gemini_1.5_Flash-orange?style=for-the-badge)

**Connecting surplus food donors with NGOs and volunteers to fight hunger, one plate at a time.**

[Live Demo](https://re-plate-demo.vercel.app) • [View Workflow](#-smart-workflow) • [Tech Stack](#%EF%B8%8F-tech-stack)

</div>

---

## 🤖 Smart RePlate AI Bot (Omni-LLM)

RePlate features a state-of-the-art **Multimodal AI Assistant** powered by **Gemini 1.5 Flash**. It’s not just a chatbot—it’s the brain of the platform.

*   **👁️ Visual Intelligence**: Upload images of surplus food; the AI analyzes quantity, type, and freshness automatically.
*   **🎙️ Voice Navigation**: Full Speech-to-Text (STT) and Text-to-Speech (TTS) integration for hands-free operation.
*   **🌍 Hyper-Local & Multilingual**: Supports **English, Tamil, Hindi, and Telugu** to ensure accessibility for every local hero.
*   **🧠 Context-Aware**: Real-time access to the database allows the AI to suggest nearby food rescues and guide volunteers.

---

## ✨ Premium UI Features

RePlate isn't just functional—it's designed to feel like a **top-tier food-tech application**.

*   **🌑 Modern Dark Aesthetic**: A deep navy background (`#0B0F19`) with vibrant emerald accents (`#008C44`).
*   **🎭 Physics-Based Animations**: Powered by **Framer Motion**, every interaction feels fluid, responsive, and alive.
*   **💊 Modern Design System**: Uses the "Pill UI" language—curved inputs, soft glassmorphism, and high-impact badges.
*   **🗺️ Interactive Maps**: Dark-themed interactive maps (Leaflet) for real-time tracking of food pickups.
*   **📊 Impact Analytics**: Dynamic charts (Recharts) visualizing food waste reduction and lives touched.

---

## 📦 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19 (Mainline) + TypeScript |
| **Build Engine** | Vite 8 (Ultra-fast HMR) |
| **AI Engine** | Google Gemini 1.5 Flash (Multimodal) |
| **Real-Time DB** | Supabase (PostgreSQL + Realtime Subs) |
| **Auth** | Supabase Auth (Role-based security) |
| **Styling** | Tailwind CSS v4 + Framer Motion |
| **Mapping** | React-Leaflet + OpenStreetMap |
| **Analytics** | Recharts |

---

## 🔄 Smart Workflow

1.  **Post**: Donors (Restaurants/Events) post surplus food using the AI-assisted modal.
2.  **Claim**: NGOs and Receivers browse a real-time feed and claim food with race-condition safety.
3.  **Deliver**: Volunteers receive instant notifications and use the interactive map to track the pickup-to-delivery route.
4.  **Impact**: All data is aggregated into dynamic dashboards for transparency and reporting.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Supabase Account
*   Google Gemini API Key

### 1. Clone & Install
```bash
git clone https://github.com/aarthi04115/Re-Plate.git
cd Re-Plate
npm install
```

### 2. Environment Setup
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_GEMINI_API_KEY=your_gemini_key
```

### 3. Run Development
```bash
npm run dev
```

---

## 🛠️ Security & Scaling

*   **Row Level Security (RLS)**: Enforced at the database level via Supabase policies.
*   **Race-Condition Safety**: State guards prevent multiple users from claiming the same listing simultaneously.
*   **Multilingual Support**: Built-in voice and text translation for diverse regions.

---

## 👥 Contributors & Credits

*   **Supabase** — Backend & Real-time engine
*   **Google Gemini** — Multimodal AI Brain
*   **Leaflet** — Mapping services
*   **Vercel** — Production deployment

---

<div align="center">
  <h3><strong>RePlate</strong> — Because every plate matters. 🍽️</h3>
  <p>Built with ❤️ to fight food waste and hunger.</p>
</div>
