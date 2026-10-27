# SideQuest ⚡ — Web3 Event Discovery & Social Planning Platform

> **Discover, schedule, and coordinate Web3 side events, hackathons, and builder meetups across Mumbai’s crypto ecosystem.**

SideQuest consolidates events across fragmented calendars — starting with **India Blockchain Week (IBW)** and **Devcon side events** — into a single unified discovery and scheduling platform. Available as both a responsive web application and a cross-platform mobile application.

---

## 🧭 Table of Contents

- [Overview & Objectives](#-overview--objectives)
- [Architecture & Monorepo Structure](#-architecture--monorepo-structure)
- [Key Features](#-key-features)
  - [Web Application (`apps/web`)](#1-responsive-web-application-appsweb)
  - [Mobile Application (`apps/mobile`)](#2-cross-platform-mobile-application-appsmobile)
  - [Data Ingestion Engine](#3-data-ingestion-engine-appsweblibingestion)
- [Database Schema & Security](#-database-schema--security)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#step-by-step-installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup](#database-setup)
- [Running Locally](#-running-locally)
- [API Reference](#-api-reference)
- [Ingestion Strategy (No-Cost Structured Data)](#-ingestion-strategy-no-cost-structured-data)
- [Free-Tier Economics & Limits](#-free-tier-economics--limits)
- [Project Verification & Testing](#-project-verification--testing)
- [License](#-license)

---

## 🎯 Overview & Objectives

Attendees of major Web3 conferences face severe schedule fragmentation:
- **Scattered listings**: Events are hosted across multiple Luma calendars (`https://lu.ma/ibw`, `https://lu.ma/Devcon8`), Telegram channels, and Twitter threads.
- **Schedule collisions**: Multiple overlapping events occurring across different Mumbai tech hubs (BKC, Lower Parel, Bandra, Juhu).
- **Network friction**: Coordinating attendance with team members, co-founders, and friends requires constant messaging.

**SideQuest solves this by:**
1. Ingesting public events from Luma calendars using standards-compliant Schema.org JSON-LD structured data.
2. Deduplicating cross-listed events and normalizing venue, organizer, and time data into **Indian Standard Time (IST / UTC+5:30)**.
3. Providing real-time overlap warnings and personalized schedule planning.
4. Offering social features with **private-by-default visibility controls**.

---

## 🏛️ Architecture & Monorepo Structure

SideQuest is configured as an **npm workspaces monorepo**:

```
sidequest/
├── apps/
│   ├── web/                        # Next.js 16 (App Router) + Tailwind CSS + TypeScript
│   │   ├── app/                    # App Router routes & API endpoints
│   │   │   ├── page.tsx            # Discover & Event Feed
│   │   │   ├── events/[id]/        # Event details & direct registration
│   │   │   ├── schedule/           # Personal schedule & conflict detection
│   │   │   ├── friends/            # Friend graphs & shared itineraries
│   │   │   ├── profile/            # User profile & privacy settings
│   │   │   └── api/                # REST endpoints (/events, /user-events, /ingest)
│   │   ├── components/             # Reusable UI components (EventCard, Navigation, etc.)
│   │   └── lib/                    # Supabase clients & Ingestion engine
│   └── mobile/                     # Expo (React Native) + TypeScript
│       ├── App.tsx                 # Full-featured tabbed mobile application
│       ├── app.json                # Expo configuration
│       └── tsconfig.json           # React Native TypeScript config
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql # Core tables, indexes, full-text search, triggers
│       └── 0002_rls_policies.sql   # Row-Level Security policies
├── .env.example                    # Environment variable template
├── .gitignore                      # Monorepo git ignore rules
├── package.json                    # Monorepo workspaces definition
└── README.md                       # Documentation
```

---

## ✨ Key Features

### 1. Responsive Web Application (`apps/web`)
- **Rich Dark Theme**: Custom glassmorphism UI built with Tailwind CSS, neon accents (`#6c8df8`, `#10b981`, `#a78bfa`), and modern typography.
- **Instant Search & Multi-Filters**: Filter by category (`⚡ Hackathon`, `🛠️ Workshop`, `🎤 Talk`, `🏛️ Conference`, `🤝 Networking`, `🎉 Social`) and blockchain ecosystem (`Ethereum`, `Solana`, `Polygon`, `DeFi`, `ZK`, `AI x Web3`).
- **Deep Event Metadata**: Verified organizer status, venue coordinates, time relative badges ("Today", "Tomorrow", "In 3 days"), and calendar exports (.ics).
- **Conflict-Aware Schedule**: Dynamic visual conflict banners alert users when two saved events overlap in time.
- **Social Circles**: Send friend requests and share itineraries with mutual connections.

### 2. Cross-Platform Mobile Application (`apps/mobile`)
- **Native Expo / React Native App**: Built for iOS and Android with high-performance responsive layout.
- **Offline-Ready Dataset**: Ships with seed events from IBW and Devcon8, enabling instant discovery without initial network delay.
- **Explore & Filter Chips**: Horizontal scrollable categories and ecosystem pills for rapid mobile triage.
- **My Quests Tab**: Dedicated mobile schedule with one-tap attendance status changes (`Attending`, `Interested`, `Planning`).
- **Mumbai Web3 City Hub**: Curated local guide breaking down event clusters:
  - **BKC (Bandra Kurla Complex)**: Main conference venues & investor summits.
  - **Lower Parel**: High-end institutional dinners & DeFi panels.
  - **Bandra & Juhu**: Beachfront mixers, founder dinners, and community afterparties.

### 3. Data Ingestion Engine (`apps/web/lib/ingestion`)
- **Schema.org JSON-LD Parsing**: Directly parses Schema.org `ItemList` and `Event` microdata embedded in public Luma calendar pages.
- **Zero API Key Requirement**: Eliminates dependence on paid scraper SaaS or private API tokens.
- **Intelligent Deduplication**: Uses canonical URL cleaning (stripping tracking query params like `utm_*`, `ref`) to merge cross-listed events.
- **Audit Trails**: Every ingestion run records fetched, created, updated, and skipped counts in the `ingestion_runs` table.

---

## 🗄️ Database Schema & Security

The platform runs on **PostgreSQL (Supabase)** with strict Row-Level Security:

| Table | Purpose | RLS Policy |
|---|---|---|
| `profiles` | User profiles, display name, avatars, handles | Public profile info readable; edit restricted to owner |
| `events` | Canonical event directory with FTS & tags | Public read access; write restricted to service role |
| `event_sources` | Registered calendars (e.g. `lu.ma/ibw`) | Public read; write restricted to service role |
| `event_source_listings` | Cross-listing relationship between source & event | Public read; write restricted to service role |
| `user_events` | User's saved events, attendance status, and notes | Private by default; accessible to friends if visibility set to `friends` |
| `friend_requests` | Bidirectional connection requests | Only visible to sender and receiver |
| `groups` | Curated groups and shared itineraries | Visible to group members |
| `ingestion_runs` | Sync execution logs and error telemetry | Restricted to service role |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Supabase Account**: Free tier (https://supabase.com)

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url> sidequest
   cd sidequest
   ```

2. **Install all workspace dependencies:**
   ```bash
   npm install
   ```

### Environment Configuration

1. Create the web app environment file:
   ```bash
   cp .env.example apps/web/.env.local
   ```

2. Fill in your Supabase project keys in `apps/web/.env.local`:
   ```env
   # Public Supabase URL & Anon Key (Client-side safe)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # Service Role Secret (Server-side ONLY for ingestion engine)
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Base URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Database Setup

Open your project's **SQL Editor** in the Supabase Dashboard and run the migration scripts in order:
1. [`supabase/migrations/0001_initial_schema.sql`](file:///Users/manas/Desktop/sidequest/supabase/migrations/0001_initial_schema.sql) — Core tables, triggers, indexes.
2. [`supabase/migrations/0002_rls_policies.sql`](file:///Users/manas/Desktop/sidequest/supabase/migrations/0002_rls_policies.sql) — Security rules & friend visibility policies.

---

## 💻 Running Locally

### 1. Web Application (Next.js)

```bash
# Run Next.js in development mode with Turbopack
npm run dev:web

# Or from workspace root
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

To create a production build:
```bash
npm run build:web
```

### 2. Mobile Application (Expo)

```bash
# Start the Expo development server
npm run start:mobile
```
From the interactive terminal:
- Press **`i`** to launch on iOS Simulator (macOS + Xcode required).
- Press **`a`** to launch on Android Emulator (Android Studio required).
- Scan the printed QR code using the **Expo Go** app on your physical iOS or Android device.

---

## 🔌 API Reference

### Public Event Listing
```http
GET /api/events?category=hackathon&ecosystem=ethereum&search=mumbai&limit=20
```
Returns a paginated list of verified events matching search parameters.

### User Event Tracking
```http
POST /api/user-events
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "event_id": "uuid-here",
  "status": "planning_to_attend",
  "visibility": "friends",
  "notes": "Joining the morning builder session"
}
```

### Ingestion Trigger (Service-Role Protected)
```http
POST /api/ingest
Content-Type: application/json
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

{
  "source_slug": "ibw"
}
```

---

## 🔎 Ingestion Strategy (No-Cost Structured Data)

Luma calendar pages (e.g. `https://lu.ma/ibw` and `https://lu.ma/Devcon8`) embed Schema.org `ItemList` objects inside `<script type="application/ld+json">` tags in the HTML `<head>`.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Event",
        "name": "ETH Mumbai Hackathon",
        "startDate": "2025-12-04T09:00:00+05:30",
        "location": {
          "@type": "Place",
          "name": "Jio World Convention Centre",
          "address": "Bandra Kurla Complex, Mumbai"
        }
      }
    }
  ]
}
</script>
```

SideQuest's ingestion engine parses this standards-compliant structured data directly, converting each event into a strongly-typed normalized record without relying on private API endpoints or browser automation workarounds.

---

## 💡 Free-Tier Economics & Limits

| Layer | Service | Free Tier Allowance | SideQuest Usage |
|---|---|---|---|
| **Database & Auth** | Supabase | 500 MB PostgreSQL, 50,000 Monthly Active Users | 500 MB stores >100,000 events + indexes; 50k MAU easily covers conference attendees. |
| **Web Hosting** | Vercel | 100 GB Bandwidth / month | Static assets cached at Edge; lightweight SSR routes. |
| **Mobile Builds** | Expo EAS | Free local builds via standard React Native toolchain | Zero cloud cost using local simulator/emulator or Expo Go. |
| **Data Ingestion** | Self-hosted Next.js Edge / Node | No external scraper subscription required | Fully executed via scheduled public JSON-LD fetch jobs. |

---

## 🧪 Project Verification & Testing

Both workspaces are configured with automated type-checking and build validation:

```bash
# Verify Web TypeScript types
cd apps/web && npx tsc --noEmit

# Verify Web Production Build
cd apps/web && npm run build

# Verify Mobile TypeScript types
cd apps/mobile && npx tsc --noEmit
```

All commands execute cleanly with **0 errors**.

---

## 📄 License

MIT License &copy; 2025–2026 SideQuest Contributors. Free for open-source and Web3 community use.
