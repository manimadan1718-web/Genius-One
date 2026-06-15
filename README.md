# GeniusOne Typing Portal

Full-stack property title search typing portal.

**Stack:** Node.js · Express · Supabase (PostgreSQL) · Vanilla JS · Vercel

---

## Project Structure

```
geniusone-portal/
├── api/
│   ├── index.js              ← Express app entry point
│   ├── lib/
│   │   └── supabase.js       ← Supabase client
│   ├── middleware/
│   │   └── auth.js           ← JWT auth + admin guard
│   └── routes/
│       ├── auth.js           ← Login, register, user management
│       └── records.js        ← Property records CRUD
├── public/
│   ├── index.html            ← Single-page app shell
│   ├── css/
│   │   └── app.css           ← All styles
│   └── js/
│       └── app.js            ← Frontend logic
├── supabase-schema.sql       ← Run this once in Supabase SQL Editor
├── .env.example              ← Copy to .env and fill in
├── package.json
├── vercel.json               ← Vercel deployment config
└── README.md
```

---

## Setup in 5 Steps

### 1. Create Supabase Project
- Go to https://supabase.com → New Project
- Copy your **Project URL** and **Service Role Key** (Settings → API → service_role)

### 2. Run Database Schema
- Supabase Dashboard → SQL Editor → New Query
- Paste the full contents of `supabase-schema.sql` → Run

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=<generate below>
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```
Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Install & Run Locally
```bash
npm install
npm run dev
```
Open → http://localhost:3000

**Default login:**
- Email: `admin@geniusonesolutions.com`
- Password: `Admin@123`
- ⚠️ Change this immediately after first login!

### 5. Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```
In Vercel Dashboard → Project → Settings → Environment Variables, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `FRONTEND_URL` (your vercel URL, e.g. `https://your-app.vercel.app`)
- `NODE_ENV=production`

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/auth/me | JWT | Get current user |
| POST | /api/auth/register | Admin | Create user |
| GET | /api/auth/users | Admin | List all users |
| PATCH | /api/auth/users/:id | Admin | Update user (role, active) |
| POST | /api/auth/change-password | JWT | Change own password |
| GET | /api/records | JWT | List records (search/filter/page) |
| GET | /api/records/:id | JWT | Full record with all child rows |
| POST | /api/records | JWT | Create record |
| PUT | /api/records/:id | JWT | Update record |
| PATCH | /api/records/:id/status | JWT | Update status only |
| DELETE | /api/records/:id | Admin | Delete record |
| GET | /api/records/stats/summary | JWT | Dashboard stats |

---

## Roles
- **admin** — full access, manages users, can delete any record, sees all records
- **typist** — creates/edits their own records only

## Database Tables
- `users` — portal users
- `property_records` — main record (order info, property, assessment, plat, legal)
- `tax_entries` — tax rows per record
- `vesting_deeds` — deed blocks
- `open_mortgages` — mortgage blocks with modification + lis pendens subsections
- `satellite_documents` — assignments, releases, etc.
- `liens_judgements` — judgment and lien entries
- `rows_ccrs_easements` — ROWs, CCRs, easements
- `divorce_probate` — divorce/probate documents
- `misc_docs` — miscellaneous documents
