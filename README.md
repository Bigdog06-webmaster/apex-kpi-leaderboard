# Apex Homes DXB — KPI Leaderboard

Live leaderboard + admin panel for the Apex incentive programme.
Built with React + Vite, Supabase, and deployed on Vercel.

---

## File structure

```
ApexApp.jsx          ← entire app (leaderboard + admin + all logic)
ApexMain.jsx         ← React entry point
ApexIndex.html       ← HTML shell
ApexVite.config.js   ← Vite config
vercel.json          ← SPA routing fix
package.json         ← dependencies
README.md
```

---

## Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) → create a free project
2. **SQL Editor** → paste the schema below → **Run**

```sql
create table if not exists public.agents (
  id         serial primary key,
  name       text not null,
  role       text not null,
  division   text not null check (division in ('Division 1','Division 2')),
  active     boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.monthly_kpis (
  id              serial primary key,
  agent_id        integer references public.agents(id) on delete cascade,
  month           text not null,
  commission_aed  numeric(12,2) default 0,
  deals           integer default 0,
  exclusives      integer default 0,
  great_listings  integer default 0,
  good_listings   integer default 0,
  bayut_stories   integer default 0,
  reviews         integer default 0,
  trubest         boolean default false,
  super_agent     boolean default false,
  updated_at      timestamptz default now(),
  unique(agent_id, month)
);

alter table public.agents enable row level security;
alter table public.monthly_kpis enable row level security;

create policy "public_read_agents" on public.agents for select using (true);
create policy "public_read_kpis"   on public.monthly_kpis for select using (true);
create policy "anon_write_kpis"    on public.monthly_kpis for all using (true) with check (true);
create policy "anon_insert_agents" on public.agents for insert with check (true);
create policy "anon_update_agents" on public.agents for update using (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger kpis_updated_at
  before update on public.monthly_kpis
  for each row execute procedure public.set_updated_at();

-- Insert all 41 agents
insert into public.agents (name, role, division) values
('Mahan Ebrahimi Seighali','Team Leader','Division 2'),
('Charlotte Roberts','Senior Consultant','Division 2'),
('Oliver Mollett','Team Leader','Division 2'),
('Teodora Adamović','Senior Consultant','Division 2'),
('Abi Cutler','Team Leader','Division 2'),
('Danielle Anderson','Senior Consultant','Division 2'),
('Myeth Mamac','Senior Consultant','Division 2'),
('Arlene Joksimovic','Senior Consultant','Division 2'),
('Callum Owen Les Penn','Senior Consultant','Division 2'),
('Vitalis Anozie','Senior Consultant','Division 2'),
('Hasnain Irshad','Senior Consultant','Division 2'),
('Callum Steedman','Senior Consultant','Division 2'),
('Nemanja Stevanović','Senior Consultant','Division 2'),
('Skye Powell','Team Leader','Division 2'),
('Karan Meyon','Team Leader','Division 2'),
('Declan Younger','Property Consultant','Division 1'),
('Dimitrije Vučurević','Property Consultant','Division 1'),
('Muhammad Anas','Property Consultant','Division 1'),
('Khalifa Benjamin','Property Consultant','Division 1'),
('Emaad Khatri','Associate Consultant','Division 1'),
('Michael Waterhouse','Property Consultant','Division 1'),
('Adam Abdul-Aziz','Associate Consultant','Division 1'),
('Korri Mclean','Associate Consultant','Division 1'),
('Aymen Elhassani','Associate Consultant','Division 1'),
('Ammar Ahmed Sheikh','Associate Consultant','Division 1'),
('Luke Meecham','Associate Consultant','Division 1'),
('Ivan Ilic','Property Consultant','Division 1'),
('Krisztiana Kolozsvari','Property Consultant','Division 1'),
('Samira Jama','Associate Consultant','Division 1'),
('Ali Al Jourani','Associate Consultant','Division 1'),
('Nikkita Welsh','Associate Consultant','Division 1'),
('Angela Gadaleta','Associate Consultant','Division 1'),
('Jay Richardson','Associate Consultant','Division 1'),
('Marion Grosman','Associate Consultant','Division 1'),
('Vera Kuznecova','Associate Consultant','Division 1'),
('Jake Treanor','Associate Consultant','Division 1'),
('Jovana Milutinovic','Associate Consultant','Division 1'),
('John Barry Maggott','Associate Consultant','Division 1'),
('Dina Jacobs','Associate Consultant','Division 1'),
('Mark Orfson-Offei','Associate Consultant','Division 1'),
('Aqib Ahmed','Associate Consultant','Division 1')
on conflict do nothing;
```

3. **Project Settings → API → Legacy keys** → copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

---

## Step 2 — GitHub

1. Create a new repo on [github.com](https://github.com)
2. Upload all 7 files (drag & drop into the repo)
3. Commit

---

## Step 3 — Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. Add **Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_ADMIN_PIN` | A PIN you choose (e.g. `1234`) |

3. Set **Root Directory** to `/` (default)
4. Set **Output Directory** to `dist`
5. Click **Deploy**

---

## Usage

**Leaderboard** — visit your Vercel URL
**Admin panel** — visit `your-url.vercel.app/admin` → enter your PIN → select month → enter KPIs → Save All

---

## Local dev

```bash
npm install
npm run dev
```

Create a `.env` file first:
```
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
VITE_ADMIN_PIN=1234
```
