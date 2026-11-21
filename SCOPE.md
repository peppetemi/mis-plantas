# Mis Plantas — Scope v1

A simple PWA, in Italian, for logging watering, fertilizing and repotting for the apartment's plants. Shared between 2 people.

## Stack
- **Frontend:** plain HTML/CSS/JS, no build step. PWA via `manifest.json` and a service worker (app shell cached; logging needs a connection).
- **Hosting:** GitHub Pages.
- **Backend:** Supabase (Postgres + Auth), free tier.
- **Login:** email magic link. Only 2 allowed emails; everyone logged in sees and edits everything (shared household).
- Free-tier note: the project pauses after 7 days with no activity. Normal use (weekly watering) keeps it awake.

## Data model

```sql
piante
  id          uuid pk
  nome        text not null
  icona       text            -- key from the icon set, e.g. 'monstera'
  archiviata  bool default false
  creata_il   timestamptz default now()

tipi_azione                    -- lookup table: a new kind of event = a new row here
  codice      text pk          -- 'acqua' | 'concime' | 'rinvaso'
  nome        text             -- 'Annaffiatura' | 'Concimazione' | 'Rinvaso'
  emoji       text             -- 💧 | 🌱 | 🪴
  ordine      int

eventi
  id          uuid pk
  pianta_id   uuid → piante
  data        date not null
  nota        text
  creato_da   uuid → auth.users   -- who logged it
  creato_il   timestamptz default now()

evento_azioni
  evento_id   uuid → eventi (on delete cascade)
  azione      text → tipi_azione
  pk (evento_id, azione)
```

| Button | Saved as |
|---|---|
| 💧 Annaffia | 1 event: `acqua` |
| 🌱 Concima | 1 event: `acqua` + `concime` |
| 🪴 Rinvaso (small link) | 1 event: `rinvaso` (doesn't count as watering) |

## Screens

### 1. Home: "Le mie piante"
- A card per plant with its icon, name, "💧 X giorni fa", and a colored dot.
- **Sorting by urgency:** `giorni_da_ultima_acqua ÷ media_acqua_stagione_corrente`, highest first.
  - ≥ 1.0 → 🔴 "in ritardo di N gg"
  - 0.7–1.0 → 🟠 "a breve"
  - < 0.7 → 🟢
  - No average for the current season → use the other season's; no history at all → 7 days.
- Archived plants are hidden (shown in a collapsible section at the bottom).
- "＋ Aggiungi pianta" button.

### 2. Aggiungi pianta
- A grid of 3D emoji-style icons, plus a "Nome" field and a "Salva" button.

### 3. Plant screen (log and manage)
- Large icon and name.
- Two big buttons: **💧 Annaffia** and **🌱 Concima**. The date defaults to today and can be changed.
- Small secondary link: "🪴 Rinvaso".
- **Stats:**
  - Ultima annaffiatura: X giorni fa · Ultima concimazione: Y giorni fa · Ultimo rinvaso: Z mesi fa
  - Frequenza media annaffiatura: ☀️ Estate ogni N gg · ❄️ Inverno ogni M gg
  - Frequenza media concimazione: ☀️ Estate ogni N gg · ❄️ Inverno ogni M gg
- **History:** latest events (date, action emoji, who logged it), each with a delete button.
- ⋯ menu: Rinomina, Cambia icona, Archivia.

## Stats rules
- **Seasons:** Estate = April to September, Inverno = October to March.
- **Watering:** the gap in days between consecutive events that include `acqua` (with or without fertilizer). Each gap is assigned to the season of the later date.
- **Fertilizer:** the gap between consecutive events that include `concime`.
- **Outliers:** gaps over 60 days (water) or over 120 days (fertilizer) are excluded. Fertilizing in winter is naturally rarer; with a 60-day cap the real gaps would get thrown away.
- **Shown values:** averages rounded to whole days. "—" when there's no data.
- **Where it's computed:** client-side. About 600 events, so no SQL views needed.

## Importing the history
Source: the `export` tab of the "Plant Watering" Google Sheet.
- **Layout:** one row per plant, one column per day (2024-09-16 → 2027-01-31, with future columns left blank).
- **Cells:** `AQ` = water, `CM` = fertilizer. Empty = nothing.
- **Content:** 603 events (361 AQ, 242 CM) from 2024-09-17 to 2026-11-14. The 15 plant names match the list exactly.
- **Mapping:** `AQ` → event `[acqua]`, `CM` → event `[acqua, concime]`.
- **How:** a one-time Python script reads the `.xlsx` and generates `seed.sql`, which gets pasted into the Supabase SQL editor. The sheet stays as an archive.
- Things noticed in the data:
  - *Stella di Natale* has no fertilizing logged, and 39 days since the last watering. Seasonal? It could be archived.
  - *Spatafillo* has 40 days since the last watering. A forgotten log, or something going on?

Average-watering preview (Estate / Inverno, in days) from the current data:

| Pianta | Acqua ☀️ | Acqua ❄️ | Concime ☀️ | Concime ❄️ |
|---|---|---|---|---|
| Sterlizia | 12 | 15 | 23 | 33 |
| Monstera | 20 | 22 | 23 | 29 |
| Monstera Monkey | 12 | 16 | 25 | 32 |
| Ficus Elastica | 20 | 22 | 28 | 37 |
| Calathea | 10 | 16 | 22 | 32 |
| Tradescantia (camera) | 13 | 15 | 26 | 36 |
| Tradescantia (salotto) | 13 | 16 | 26 | 41 |
| Spatafillo | 12 | 12 | 33 | 20 |
| Calla | 13 | 16 | 23 | 19 |
| Pilea | 14 | 15 | 26 | 40 |
| Potho | 15 | 23 | 31 | 44 |
| Stella di Natale | 18 | 17 | — | — |
| Pachira | 12 | 16 | 31 | 27 |
| Cactussino | 22 | 30 | 38 | 22 |
| Giglio Leopardo | 15 | 18 | 41 | 19 |

*(The fertilizer figures were computed with the 60-day cap; they'll change slightly with the 120-day cap.)*

## Icons
- **Style:** 3D emoji (glossy, soft lighting, terracotta pot), in the style of Microsoft Fluent Emoji 3D (MIT).
- **Plants:** 1 custom SVG icon per plant (14 icons; the two Tradescantias share one): sterlizia, monstera, monstera-monkey, ficus-elastica, calathea, tradescantia, spatafillo, calla, pilea, potho, stella-di-natale, pachira, cactus, giglio-leopardo.
- **Generics for new plants:** 🪴 🌿 🌱 🌵 🌴, from the Fluent 3D set.
- **Step 0:** a sample page with 3–4 icons to approve the style before drawing the rest.

## Out of scope for v1
Notifications/reminders, photos, care tips, charts, offline logging (the offline queue), per-plant custom seasons.

## Build phases
0. Icon sample (3–4 plants) → style approval
1. Supabase setup: schema, RLS, auth with 2 emails
2. Import script → `seed.sql`
3. PWA: home, plant screen, add plant
4. All icons
5. Deploy on GitHub Pages + install on both phones
