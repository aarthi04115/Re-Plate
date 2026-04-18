# 🍱 Re-Plate — Food Rescue Platform

> **Connecting surplus food donors with NGOs and volunteers to fight hunger, one plate at a time.**

Re-Plate is a real-time food rescue web application built for a hackathon. It enables donors to post surplus food, NGO receivers to claim it, and volunteers to pick up and deliver — all tracked live with Supabase Realtime.

---

## 🌐 Live Demo

> Deployed on [Vercel / Netlify] *(add your link here)*

---

## 📸 Screenshots

| Donor Dashboard | Receiver Hub | Volunteer Hub |
|---|---|---|
| Post surplus food | Browse & claim donations | Accept and deliver pickups |

---

## ✨ Features

### 🧑‍🍳 Donor
- Post surplus food with details: food type, quantity, servings, freshness hours, pickup location, description
- Real-time status notifications when food is:
  - 📬 Requested by a receiver
  - 🚴 Picked up by a volunteer
  - 🎉 Successfully delivered
- Live dashboard showing all posted listings with status badges

### 🏢 Receiver (NGO)
- Browse all available food donations in real-time
- Filter donations by location (text-based match)
- **Claim Food** with race-condition safety (only one receiver can claim at a time)
- Track claimed food through Pending → In Delivery tabs

### 🛵 Volunteer
- View all claimed (pending pickup) food donations
- Auto-detect GPS location or enter manually
- Filter nearby pickups by location text
- **Accept Pickup** with race-condition safety
- **Mark as Delivered** to complete the rescue chain
- Interactive map view (OpenStreetMap / dark mode Carto)

### ⚡ Real-Time
- All dashboards auto-refresh via **Supabase Realtime** subscriptions
- No manual refresh needed — changes propagate instantly

### 🔔 Toast Notifications
- Success / error toasts for every action (claim, pickup, deliver, post)

---

## 🔄 Status Flow

```
available ──► pending_receiver ──► in_delivery ──► completed
   (Donor       (Receiver claims)   (Volunteer      (Delivered)
   posts food)                       accepts)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | TailwindCSS v4 + Vanilla CSS |
| Backend / DB | Supabase (PostgreSQL) |
| Real-Time | Supabase Realtime (Postgres Changes) |
| Auth | Supabase Auth |
| Maps | React-Leaflet + OpenStreetMap |
| Charts | Recharts |
| Routing | React Router DOM v7 |
| Icons | Lucide React |

---

## 🗃️ Database Schema

### `users` table
| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Supabase Auth user ID |
| `name` | text | Full name |
| `email` | text | Email address |
| `phone` | text | Phone number |
| `address` | text | Default address |
| `role` | text | `donor` / `receiver` / `volunteer` |

### `donations` table
| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `donor_id` | uuid (FK) | References `users.id` |
| `food_type` | text | Type of food |
| `quantity` | text | e.g. "2 large trays" |
| `servings` | integer | Estimated servings |
| `freshness_hours` | integer | Hours food stays fresh |
| `pickup_location` | text | Pickup address |
| `phone` | text | Contact number |
| `description` | text | Additional notes |
| `status` | text | `available` / `pending_receiver` / `in_delivery` / `completed` |
| `accepted_by_receiver_id` | uuid | Receiver who claimed it |
| `claimed_by_volunteer_id` | uuid | Volunteer who picked it up |
| `created_at` | timestamp | Auto-generated |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone the repo
```bash
git clone https://github.com/rthi4115/Re-Plate.git
cd Re-Plate
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Find these in your Supabase project: **Settings → API**

### 4. Set up Supabase tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Users table
create table users (
  id uuid primary key references auth.users(id),
  name text,
  email text,
  phone text,
  address text,
  role text check (role in ('donor', 'receiver', 'volunteer'))
);

-- Donations table
create table donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references users(id),
  food_type text not null,
  quantity text,
  servings integer,
  freshness_hours integer,
  pickup_location text,
  phone text,
  description text,
  status text default 'available' check (status in ('available', 'pending_receiver', 'in_delivery', 'completed')),
  accepted_by_receiver_id uuid references users(id),
  claimed_by_volunteer_id uuid references users(id),
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table users enable row level security;
alter table donations enable row level security;

-- RLS Policies (allow authenticated users to read/write)
create policy "Allow all for authenticated" on users for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on donations for all using (auth.role() = 'authenticated');

-- Enable Realtime
alter publication supabase_realtime add table donations;
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── AnalyticsChart.tsx   # Recharts analytics graphs
│   ├── ChatBot.tsx          # AI chat assistant
│   ├── Icons.tsx            # SVG icon components
│   ├── PostFoodModal.tsx    # Donor food posting modal
│   ├── RealtimeSidebar.tsx  # Live feed sidebar
│   ├── Shared.tsx           # Navigation, ListingCard, shared UI
│   └── Toast.tsx            # Toast notification system
├── context/
│   ├── AuthContext.tsx      # Supabase Auth context
│   ├── DonationContext.tsx  # Demo donation context
│   └── ThemeContext.tsx     # Dark/Light theme context
├── pages/
│   ├── Login.tsx            # Login page
│   ├── SignUp.tsx           # Sign up page
│   ├── DonorDashboard.tsx   # Donor workflow
│   ├── ReceiverDashboard.tsx# Receiver/NGO workflow
│   ├── VolunteerDashboard.tsx # Volunteer workflow
│   ├── ImpactDashboard.tsx  # Impact analytics
│   ├── VolunteerImpactDashboard.tsx
│   └── VolunteerLogin.tsx
├── services/
│   └── supabaseClient.ts    # Supabase client init
├── types/
│   └── index.ts             # TypeScript interfaces
├── App.tsx                  # Routing
├── main.tsx                 # Entry point
└── index.css                # Global styles & design tokens
```

---

## 👥 User Roles

| Role | Description |
|---|---|
| **Donor** | Restaurants, households, events with surplus food |
| **Receiver** | NGOs, shelters, food banks that need food |
| **Volunteer** | Individuals who pick up and deliver food |

---

## 🔒 Data Safety

- **Multiple claim prevention**: Receiver claim uses `.eq('status', 'available')` guard — only the first claimant succeeds
- **Multiple pickup prevention**: Volunteer accept uses `.eq('status', 'pending_receiver')` guard
- **Double-tap prevention**: UI buttons are disabled while requests are in flight
- **Auth protection**: All Supabase queries require authenticated session

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- [Supabase](https://supabase.com) — Backend & Realtime
- [OpenStreetMap](https://www.openstreetmap.org) — Map tiles
- [Leaflet](https://leafletjs.com) — Interactive maps
- [Recharts](https://recharts.org) — Analytics charts
- Built with ❤️ for a hackathon to fight food waste

---

<div align="center">
  <strong>Re-Plate</strong> — Because every plate matters. 🍽️
</div>
