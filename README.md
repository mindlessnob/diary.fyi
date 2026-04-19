# diary.fyi

<p align="center">
  <img src="public/logo.png" alt="diary.fyi logo" width="80" />
</p>

A self-hosted film diary dashboard powered by your Letterboxd data and TMDB metadata. Clone it, point it at your own profile, and deploy for free on Vercel in under 30 minutes.

> **Not affiliated with Letterboxd.** This project uses Letterboxd's public RSS feed and CSV export. All film metadata is sourced from [TMDB](https://www.themoviedb.org/).

---

## What it does

| Page | Description |
|---|---|
| **Calendar** | Full monthly calendar — every diary entry shown with its poster, star rating, and review |
| **Insights** | Lifetime stats: genres, directors, decades, countries, languages, runtime, and rating distribution |
| **Year in Film** | Year-by-year breakdown of everything you logged |
| **On This Day** | Films you watched on this exact date in previous years |
| **Profile** | Public profile card — avatar, bio, follower count, favorite films, and key stats |

---

## Stack

- **[Next.js 15](https://nextjs.org/)** — App Router, React Server Components, Turbopack dev server
- **[TMDB API](https://www.themoviedb.org/documentation/api)** — Posters, genres, directors, runtime, countries, cast
- **Letterboxd RSS** — Real-time last 50 diary entries (no API key needed)
- **Letterboxd CSV export** — Full historical data (all-time watch list, ratings, diary)
- **GitHub Actions** *(optional)* — Weekly auto-sync to keep data fresh

---

## Prerequisites

Before you start, you'll need:

- A **[Letterboxd](https://letterboxd.com)** account with a **public profile**
- A free **[TMDB API key](https://www.themoviedb.org/settings/api)** (takes ~5 min to activate)
- **[Node.js 18+](https://nodejs.org/)** installed
- A **[Vercel](https://vercel.com)** account for deployment (free tier is fine)
- **[Git](https://git-scm.com/)** installed

---

## Setup

### Step 1 — Fork or clone the repo

**Option A — Use as a template (recommended):**
```bash
# Click "Use this template" on GitHub, then clone your new repo:
git clone https://github.com/yourusername/diary.fyi.git
cd diary.fyi
```

**Option B — Clone directly:**
```bash
git clone https://github.com/original/diary.fyi.git
cd diary.fyi
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Configure your environment

Copy the example env file:

```bash
# Mac / Linux
cp .env.example .env.local

# Windows (PowerShell)
Copy-Item .env.example .env.local
```

Open `.env.local` and fill in your values:

```env
# Your Letterboxd username — exactly as it appears in the URL
# e.g. letterboxd.com/janedoe → LETTERBOXD_USER="janedoe"
LETTERBOXD_USER="your_username_here"

# Free TMDB API key — https://www.themoviedb.org/settings/api
TMDB_API_KEY="your_tmdb_api_key_here"

# (Optional) Absolute path to your Letterboxd export folder.
# Leave blank if you place the export folder in the project root (recommended).
LOCAL_EXPORT_PATH=""
```

> [!IMPORTANT]
> `.env.local` is listed in `.gitignore` — it will **never** be committed. Your API key is safe.

---

### Step 4 — Export your Letterboxd data

The sync script needs your full watch history as CSV files. Letterboxd provides this for free.

1. Go to **[letterboxd.com/settings/data/](https://letterboxd.com/settings/data/)**
2. Click **Export your data**
3. The `.zip` file will download
4. **Unzip** it — you'll get a folder like `letterboxd-username-2024-01-01-utc/`

The sync script reads three files from this folder:

| File | What it contains |
|---|---|
| `watched.csv` | Every film you've marked as watched (all-time list) |
| `diary.csv` | Every dated diary entry with watch dates |
| `ratings.csv` | Every film you've rated with star ratings |

---

### Step 5 — Build your initial film database

This is a **two-command, one-time setup** that reads your CSV export, scrapes film metadata from Letterboxd, enriches it with TMDB data, and produces `src/data/lifetime.json`.

**First — import and scrape from the CSV export:**
```bash
npm run import
```
This reads your `watched.csv`, `diary.csv`, and `ratings.csv`, visits each film's TMDB page to grab genres, directors, runtime, and countries, then writes the result to `src/data/lifetime.json`.

**Then — enrich with TMDB and pull in recent RSS entries:**
```bash
npm run sync
```
This fetches your live RSS feed (last 50 diary entries), adds any films logged after your export date, and fills in TMDB posters and additional metadata for everything in the database. This requires `TMDB_API_KEY` to be set in `.env.local`.

> [!TIP]
> If either command is interrupted, just run it again — both are incremental and skip films already processed.

> [!NOTE]
> `src/data/lifetime.json` is listed in `.gitignore` by default. See the [Deployment section](#deployment-vercel) for how to handle this when deploying.

---

### Step 6 — Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see your film calendar populated with your diary entries.

---

### Step 7 — Set your favorite films

The four favorite films shown on your profile page are configured in `src/data/favorites.json`.

**Option A — Edit the file directly:**

```json
[
  { "title": "Mulholland Drive",          "year": "2001", "slug": "mulholland-drive",          "posterOverride": "" },
  { "title": "Portrait of a Lady on Fire","year": "2019", "slug": "portrait-of-a-lady-on-fire","posterOverride": "" },
  { "title": "2001: A Space Odyssey",     "year": "1968", "slug": "2001-a-space-odyssey",      "posterOverride": "" },
  { "title": "Spirited Away",             "year": "2001", "slug": "spirited-away",              "posterOverride": "" }
]
```

- `slug` — the Letterboxd film URL slug, e.g. `https://letterboxd.com/film/mulholland-drive/` → `mulholland-drive`
- `posterOverride` — leave empty to auto-fetch from TMDB, or paste any direct image URL to use it instead
- `year` — used to help TMDB find the right film when titles are ambiguous

You can also use the Admin UI while running `npm run dev` — navigate to [http://localhost:3000/admin](http://localhost:3000/admin) to search for films, preview their TMDB poster, and save changes directly without editing JSON.

> [!NOTE]
> The admin page is automatically disabled on Vercel — it only works locally. On Vercel it redirects to the home page.

---

## Deployment (Vercel)

> [!WARNING]
> `lifetime.json favorites.json and profile.json` contains your letterboxd user data and watch history. If you commit it to your repo, **keep the repository private**. Vercel can deploy from private repos for free.

First, remove the `lifetime.json` line from your `.gitignore`, then commit your data and push:

```bash
git add src/data/lifetime.json src/data/favorites.json src/data/profile.json
git commit -m "add initial sync data"
git push
```

1. Go to [vercel.com/new](https://vercel.com/new) → import your GitHub repo
2. In **Settings → Environment Variables**, add:
   ```
   TMDB_API_KEY    = your_tmdb_api_key_here
   LETTERBOXD_USER = your_username_here
   ```
3. Click **Deploy** — Vercel auto-detects Next.js, no extra config needed.

Your site is live. Every time you push an updated `lifetime.json`, Vercel auto-redeploys.

> [!NOTE]
> `lifetime.json` must always be built **locally** using `npm run import` + `npm run sync` — GitHub Actions has no access to your downloaded CSV export files and cannot build it for you.

---

## Keeping data up to date

Once `lifetime.json` is committed to your repo, you have two ways to keep it updated:

### Option A — GitHub Actions (automated, recommended)

A workflow at `.github/workflows/sync.yml` runs `npm run sync` on a schedule, commits the updated `lifetime.json` back to your repo, and triggers a Vercel redeploy automatically.

**To enable it**, add these two secrets to your GitHub repo:

> **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

```
TMDB_API_KEY    = your_tmdb_api_key_here
LETTERBOXD_USER = your_username_here
```

The workflow runs every Sunday at midnight UTC. To trigger it manually at any time:

> GitHub → **Actions** → **Sync diary.fyi Data** → **Run workflow**

### Option B — Manual (offline)

Run `npm run sync` locally whenever you want to pick up recent diary entries, then commit and push:

```bash
npm run sync
git add src/data/lifetime.json
git commit -m "sync diary"
git push
```

Vercel will auto-redeploy on the new commit.

---

### When to re-run `npm run import`

`npm run sync` is **fully cumulative** — every time it runs, it loads the entire existing `lifetime.json` first and only ever *adds* new entries from the RSS feed. Nothing already in `lifetime.json` is ever removed or overwritten. A film that has long since "rolled off" the RSS feed will remain in your database forever because it was captured in a previous sync.

You only need to re-run `npm run import` if:
- You are setting up the project **for the first time** from a CSV export
- Your `lifetime.json` got corrupted and you need a **full rebuild from scratch**

---

## Project structure

```
diary.fyi/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Calendar page (home)
│   │   ├── stats/page.tsx        ← Insights / stats dashboard
│   │   ├── year/page.tsx         ← Year in Film page
│   │   ├── on-this-day/page.tsx  ← On This Day page
│   │   ├── profile/page.tsx      ← Profile page
│   │   ├── admin/page.tsx        ← Admin UI (localhost only)
│   │   └── api/
│   │       ├── calendar/         ← RSS + lifetime.json → calendar data
│   │       ├── movies/           ← lifetime.json → insights data
│   │       ├── profile/          ← profile scrape + lifetime.json
│   │       └── rss/              ← raw RSS proxy
│   ├── components/               ← All React components
│   ├── data/
│   │   ├── lifetime.json         ← Generated by npm run sync (gitignored by default)
│   │   ├── favorites.json        ← Your 4 pinned favorite films
│   │   └── overrides.json        ← Poster overrides (written by Admin UI)
│   └── lib/
│       └── parseRss.ts           ← RSS XML → Movie[] parser
├── scripts/
│   └── sync.ts                   ← Main sync script
├── .env.example                  ← Copy to .env.local and fill in your values
├── .gitignore
└── next.config.ts
```

---

## Data flow

```
Letterboxd CSV export         Letterboxd RSS feed
  (watched/diary/ratings)       (last 50 entries, live)
         │                              │
         └──────────────┬───────────────┘
                        ▼
                  npm run sync
                        │
                        ▼
           src/data/lifetime.json        ← Powers all pages
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
    /api/calendar  /api/movies    /profile page
     (calendar)    (insights)     (stats + bio)
```

---

## FAQ

**Q: Does this use the official Letterboxd API?**  
A: No. It uses Letterboxd's **public RSS feed** (available for any public profile) and the **CSV export** you download from your settings. No Letterboxd API key is required.

**Q: Will this work with a private Letterboxd profile?**  
A: The RSS feed and profile scrape only work with **public** profiles. The CSV export still works, but live data (recent diary entries, avatar, follower count) won't be fetchable.

**Q: Is my data safe?**  
A: Yes. `lifetime.json` stays on your machine (or in your private repo). Your TMDB key lives in `.env.local`, which is gitignored and never committed. If you choose to commit `lifetime.json` to a **public** repo, note that your full watch history will be publicly visible — use a private repo if that's a concern.

**Q: Can I deploy to a platform other than Vercel?**  
A: Yes — it's a standard Next.js app. It works on any platform that supports Next.js (Netlify, Railway, Render, or self-hosted with `npm run build && npm start`).

**Q: The sync is very slow. What can I do?**  
A: The bottleneck is TMDB API rate limiting, which the sync script respects automatically. For very large libraries (5,000+ films), consider running it overnight. Once the initial sync is done, all subsequent incremental syncs are much faster.

**Q: Some films are missing posters. Why?**  
A: TMDB couldn't find a match — this usually happens with very obscure or non-English-title films. You can manually set a `posterOverride` URL in `favorites.json`, or use the Admin UI to configure overrides for any film in your diary.

---

## Inspiration

This project was inspired by [letterboxd-viewer](https://github.com/michaellambgelo/letterboxd-viewer) by [@michaellambgelo](https://github.com/michaellambgelo).

---

## AI Transparency

This project was **vibecoded** — built with the assistance of AI (Google DeepMind's Antigravity / Claude). The code was guided, reviewed, and iterated on by a human, but large portions were written with AI pair-programming tools.

---

## License

MIT — do whatever you want with it. A credit or link back is appreciated but not required.

---

> This project is not affiliated with, endorsed by, or sponsored by Letterboxd Limited.  
> Film data provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).
