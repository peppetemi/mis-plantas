# Setup

## Try it locally (demo, no Supabase)
```bash
python3 -m http.server 8123
```
Open http://localhost:8123 — with `js/config.js` empty the app runs in **demo** mode, using the sheet's data (`dev/demo-data.json`) and saving changes only in the browser. "Reset demo" goes back to the original data.

## 1. Supabase (≈10 minutes, done once)

The app lives in an **existing** Supabase project (the free plan allows 2), inside a separate schema called `piante`: its tables don't mix with the other app's.

1. **Allowed emails:** in `supabase/schema.sql` replace `EMAIL_1@esempio.it` and `EMAIL_2@esempio.it` with your two emails (lowercase).
2. **Database:** in the existing project open SQL Editor → New query. Paste and run all of `supabase/schema.sql`, then do the same with `supabase/seed.sql` (the history from the sheet: 15 plants, 603 events).
3. **Expose the schema to the API:** Project Settings → Data API → **Exposed schemas** → add `piante` → Save. (Without this step the app gets an error about schema "piante".)
4. **The two users:** Authentication → Users → **Add user → Create new user** with email + **password** for each of you (tick "Auto confirm user"). Login is email + password.
   *Don't* touch "Allow new users to sign up": that's a setting of the other app. Even if someone else signs up, they won't see the plants (only the emails in `piante.utenti` can get in).
5. **Keys** in `js/config.js`:
   - URL: Project Settings → Data API → *Project URL* — only `https://xxxx.supabase.co`, **without** `/rest/v1`.
   - Key: Project Settings → API Keys → the **publishable** key (`sb_publishable_…`). **Never** the secret key.

Adding or removing someone later: create the user in Authentication → Users, then SQL Editor → `insert into piante.utenti values ('new@email.it');` (or `delete from piante.utenti where email = '…';`).

Notes:
- **You log in only once per device:** the session is saved on the phone and renews itself. "Esci" logs out only that device.
- **iPhone:** install the app from Safari with *Share → Add to Home Screen*. If you only use it as a Safari tab, after a few weeks without opening it iOS can wipe the saved data and ask you to log in again; the installed app doesn't have that problem.
- The publishable key can be public: without logging in, and without an email on the list, Row Level Security shows nothing.
- The free plan pauses the project after 7 days with no activity across the whole project: between the two apps it's unlikely. If it happens: dashboard → *Restore project*.

## 2. Plant icons
1. Generate the icons following `icons/PROMPTS.md` and save the originals in `icons/originali/` (e.g. `calathea.png`).
2. Run:
   ```bash
   python3 scripts/prepara_icone.py icons/originali
   ```
   This creates `icons/<name>.webp` (512px, trimmed, transparent background). If an icon has a white background with "holes" (e.g. Monstera Monkey), process it separately with `--buchi` (not on plants with white flowers).

## 3. Publishing (GitHub Pages)
Coming in the next step: git repo → GitHub → Pages. Then open the address on your phone and "Add to Home Screen".

## Re-importing the sheet
```bash
pip install openpyxl
python3 scripts/import_sheet.py "Plant Watering.xlsx"
```
Regenerates `supabase/seed.sql` and `dev/demo-data.json`. The IDs are stable, but **don't** run the seed again on a database that already has the data (it would fail on duplicates).
