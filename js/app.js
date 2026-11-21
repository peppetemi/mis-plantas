import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { statsPianta, livello, isoOggi } from './stats.js';
import { ICONE, iconaHTML } from './icons.js';

const DEMO = !SUPABASE_URL || new URLSearchParams(location.search).has('demo');
const STORICO_INIZIALE = 15;

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
const $dialog = document.getElementById('dialog');

let db;
const state = {
  user: null,
  piante: [],
  tipi: [],
  eventi: [],
  errore: null,
  login: { email: '' },
  storicoCompleto: false,
  iconaScelta: 'generica',
};

// ---------- helpers ----------

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const eventiDi = (id) => state.eventi.filter((e) => e.pianta_id === id);

function quando(n) {
  if (n == null) return 'mai';
  if (n === 0) return 'oggi';
  if (n === 1) return 'ieri';
  return `${n} giorni fa`;
}

function quandoLungo(n) {
  if (n == null) return 'mai';
  if (n < 60) return quando(n);
  const mesi = Math.round(n / 30.4);
  return mesi < 24 ? `${mesi} mesi fa` : `${Math.round(n / 365)} anni fa`;
}

const ogni = (x) => (x == null ? '—' : `ogni ${Math.round(x)} gg`);

function stato(s) {
  if (s.giorniAcqua == null) return 'Mai annaffiata';
  const m = s.mancano;
  if (s.urgenza >= 1) return m < 0 ? `In ritardo di ${-m} gg` : 'Oggi';
  if (m <= 0) return 'Oggi';
  if (m === 1) return 'Domani';
  return `Tra ${m} gg`;
}

const fmtData = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const dataLeggibile = (iso) => fmtData.format(new Date(iso + 'T12:00:00'));

function autoreBreve(a) {
  if (!a) return '';
  if (a === 'import') return 'storico';
  return a.split('@')[0];
}

let toastTimer;
function toast(msg, azione) {
  clearTimeout(toastTimer);
  $toast.innerHTML = `<span>${esc(msg)}</span>${azione ? `<button type="button">${esc(azione.label)}</button>` : ''}`;
  $toast.hidden = false;
  if (azione) {
    $toast.querySelector('button').onclick = () => {
      $toast.hidden = true;
      azione.fn();
    };
  }
  toastTimer = setTimeout(() => ($toast.hidden = true), azione ? 6000 : 3000);
}

function errore(e) {
  console.error(e);
  toast('Errore: ' + (e?.message || e));
}

async function ricarica() {
  const d = await db.caricaTutto();
  state.piante = d.piante;
  state.tipi = d.tipi;
  state.eventi = d.eventi;
  state.errore = null;
}

// ---------- router ----------

function route() {
  return (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
}

function render() {
  if (!state.user) return renderLogin();
  if (state.errore) return renderErrore();
  const [a, b, c] = route();
  if (a === 'pianta' && b && c === 'icona') return renderScegliIcona(b);
  if (a === 'pianta' && b) return renderPianta(b);
  if (a === 'nuova') return renderNuova();
  return renderHome();
}

// ---------- screens ----------

function renderErrore() {
  $app.innerHTML = `
    <section class="vuoto">
      <p class="grande">🥀</p>
      <p>Non riesco a caricare i dati.</p>
      <p class="sub">${esc(state.errore)}</p>
      <button class="btn" data-azione="riprova">Riprova</button>
      <button class="link" data-azione="esci-subito">Esci</button>
    </section>`;
}

function renderLogin() {
  $app.innerHTML = `
    <section class="login">
      <p class="grande">🪴</p>
      <h1>Le mie piante</h1>
      <form id="form-login">
        <label>Email<input type="email" name="email" required autocomplete="username" value="${esc(state.login.email)}"></label>
        <label>Password<input type="password" name="password" required autocomplete="current-password"></label>
        <button class="btn" type="submit">Entra</button>
      </form>
    </section>`;
}

function renderHome() {
  const oggi = isoOggi();
  const voci = state.piante.map((p) => ({ p, s: statsPianta(eventiDi(p.id), oggi) }));
  const attive = voci
    .filter((v) => !v.p.archiviata)
    .sort((a, b) => b.s.urgenza - a.s.urgenza || a.p.nome.localeCompare(b.p.nome));
  const archiviate = voci.filter((v) => v.p.archiviata).sort((a, b) => a.p.nome.localeCompare(b.p.nome));
  const daFare = attive.filter((v) => v.s.urgenza >= 1).length;

  $app.innerHTML = `
    <header class="top">
      <div>
        <h1>Le mie piante</h1>
        <p class="sub">${
          attive.length === 0 ? 'Aggiungi la tua prima pianta' : daFare ? `${daFare} da annaffiare` : 'Tutte a posto 🌿'
        }${DEMO ? ' · <b>demo</b>' : ''}</p>
      </div>
      <button class="text-btn" data-azione="esci">${DEMO ? 'Reset demo' : 'Esci'}</button>
    </header>
    <ul class="lista">${attive.map(card).join('')}</ul>
    ${
      archiviate.length
        ? `<details class="archivio"><summary>Archiviate (${archiviate.length})</summary>
             <ul class="lista">${archiviate.map(card).join('')}</ul></details>`
        : ''
    }
    <a class="fab" href="#/nuova">＋ Aggiungi pianta</a>`;
}

function card({ p, s }) {
  const lv = p.archiviata ? 'grigio' : livello(s.urgenza);
  return `
    <li><a class="card" href="#/pianta/${p.id}">
      ${iconaHTML(p.icona, 56)}
      <div class="card-body">
        <div class="nome">${esc(p.nome)}</div>
        <div class="meta"><span>💧 ${quando(s.giorniAcqua)}</span> · <span>${ogni(s.mediaCorrente)}</span></div>
      </div>
      ${p.archiviata ? '' : `<span class="pill ${lv}">${stato(s)}</span>`}
    </a></li>`;
}

function renderPianta(id) {
  const p = state.piante.find((x) => x.id === id);
  if (!p) return (location.hash = '#/');
  const oggi = isoOggi();
  const ev = eventiDi(id).sort((a, b) => b.data.localeCompare(a.data) || (b.creato_il || '').localeCompare(a.creato_il || ''));
  const s = statsPianta(ev, oggi);
  const emoji = Object.fromEntries(state.tipi.map((t) => [t.codice, t.emoji]));
  const visibili = state.storicoCompleto ? ev : ev.slice(0, STORICO_INIZIALE);
  const ora = (stag) => (s.stagione === stag ? ' class="ora"' : '');

  $app.innerHTML = `
    <header class="top">
      <a class="icon-btn" href="#/" aria-label="Indietro">‹</a>
      <button class="icon-btn" data-azione="menu" data-id="${p.id}" aria-label="Opzioni">⋯</button>
    </header>

    <section class="hero">
      ${iconaHTML(p.icona, 150)}
      <h1>${esc(p.nome)}</h1>
      ${
        p.archiviata
          ? '<span class="pill grigio">Archiviata</span>'
          : `<span class="pill ${livello(s.urgenza)}">${stato(s)}</span>`
      }
    </section>

    <section class="azioni">
      <label class="data">Data <input type="date" id="data" value="${oggi}" max="${oggi}"></label>
      <div class="bottoni">
        <button class="big acqua" data-log="acqua" data-id="${p.id}">💧 Annaffia</button>
        <button class="big concime" data-log="acqua,concime" data-id="${p.id}">🌱 Concima</button>
      </div>
      <button class="link piccolo" data-log="rinvaso" data-id="${p.id}">🪴 Segna rinvaso</button>
    </section>

    <section class="box">
      <h2>Ultime cure</h2>
      <div class="riga"><span>💧 Annaffiatura</span><b>${quando(s.giorniAcqua)}</b></div>
      <div class="riga"><span>🌱 Concimazione</span><b>${quando(s.giorniConcime)}</b></div>
      ${s.giorniRinvaso != null ? `<div class="riga"><span>🪴 Rinvaso</span><b>${quandoLungo(s.giorniRinvaso)}</b></div>` : ''}
    </section>

    <section class="box">
      <h2>Frequenza media</h2>
      <table class="freq">
        <thead><tr><th></th><th${ora('estate')}>☀️ Estate</th><th${ora('inverno')}>❄️ Inverno</th></tr></thead>
        <tbody>
          <tr><th>💧 Acqua</th><td${ora('estate')}>${ogni(s.mediaAcqua.estate)}</td><td${ora('inverno')}>${ogni(s.mediaAcqua.inverno)}</td></tr>
          <tr><th>🌱 Concime</th><td${ora('estate')}>${ogni(s.mediaConcime.estate)}</td><td${ora('inverno')}>${ogni(s.mediaConcime.inverno)}</td></tr>
        </tbody>
      </table>
      <p class="nota">Estate: apr–set · Inverno: ott–mar</p>
    </section>

    <section class="box">
      <h2>Storico <span class="conta">${ev.length}</span></h2>
      ${
        ev.length
          ? `<ul class="storico">${visibili
              .map(
                (e) => `
            <li>
              <span class="em">${e.azioni.map((a) => emoji[a] || '•').join('')}</span>
              <span class="quando">${dataLeggibile(e.data)}${e.nota ? `<small>${esc(e.nota)}</small>` : ''}</span>
              <span class="chi">${esc(autoreBreve(e.autore))}</span>
              <button class="icon-btn mini" data-elimina="${e.id}" aria-label="Elimina">✕</button>
            </li>`
              )
              .join('')}</ul>
             ${ev.length > visibili.length ? `<button class="link" data-azione="storico-completo">Mostra tutto (${ev.length})</button>` : ''}`
          : '<p class="sub">Ancora nessuna cura registrata.</p>'
      }
    </section>`;
}

function grigliaIcone(selezionata) {
  return `<div class="griglia">${ICONE.map(
    (i) => `
      <button type="button" class="pick${i.key === selezionata ? ' sel' : ''}" data-icona="${i.key}" aria-label="${esc(i.nome)}" aria-pressed="${i.key === selezionata}">
        ${iconaHTML(i.key, 64)}<span>${esc(i.nome)}</span>
      </button>`
  ).join('')}</div>`;
}

function renderNuova() {
  $app.innerHTML = `
    <header class="top">
      <a class="icon-btn" href="#/" aria-label="Indietro">‹</a>
      <h1 class="titolo">Nuova pianta</h1>
      <span class="icon-btn vuoto"></span>
    </header>
    <form id="form-nuova" class="form">
      <label>Nome<input name="nome" required maxlength="60" placeholder="es. Monstera salotto" autocomplete="off"></label>
      <p class="etichetta">Icona</p>
      ${grigliaIcone(state.iconaScelta)}
      <button class="btn sticky" type="submit">Salva</button>
    </form>`;
}

function renderScegliIcona(id) {
  const p = state.piante.find((x) => x.id === id);
  if (!p) return (location.hash = '#/');
  $app.innerHTML = `
    <header class="top">
      <a class="icon-btn" href="#/pianta/${p.id}" aria-label="Indietro">‹</a>
      <h1 class="titolo">Icona di ${esc(p.nome)}</h1>
      <span class="icon-btn vuoto"></span>
    </header>
    <div data-cambia-icona="${p.id}">${grigliaIcone(p.icona)}</div>`;
}

// ---------- actions ----------

async function registra(btn) {
  const piantaId = btn.dataset.id;
  const azioni = btn.dataset.log.split(',');
  const data = document.getElementById('data')?.value || isoOggi();
  if (data > isoOggi()) return toast('La data non può essere nel futuro');
  document.querySelectorAll('[data-log]').forEach((b) => (b.disabled = true));
  try {
    const id = await db.registraEvento(piantaId, data, azioni);
    state.eventi.push({
      id,
      pianta_id: piantaId,
      data,
      nota: null,
      autore: state.user.email,
      creato_il: new Date().toISOString(),
      azioni,
    });
    render();
    const msg = azioni.includes('concime')
      ? 'Concimata e annaffiata ✓'
      : azioni.includes('rinvaso')
        ? 'Rinvaso registrato ✓'
        : 'Annaffiata ✓';
    toast(msg, { label: 'Annulla', fn: () => elimina(id, true) });
  } catch (e) {
    errore(e);
    render();
  }
}

async function elimina(id, silenzioso = false) {
  if (!silenzioso && !confirm('Eliminare questa registrazione?')) return;
  try {
    await db.eliminaEvento(id);
    state.eventi = state.eventi.filter((e) => e.id !== id);
    render();
    if (silenzioso) toast('Annullato');
  } catch (e) {
    errore(e);
  }
}

function apriMenu(id) {
  const p = state.piante.find((x) => x.id === id);
  $dialog.innerHTML = `
    <form method="dialog" class="sheet">
      <div class="gruppo">
        <p class="sheet-titolo">${esc(p.nome)}</p>
        <button value="rinomina">✏️ Rinomina</button>
        <button value="icona">🖼️ Cambia icona</button>
        <button value="archivia">${p.archiviata ? '♻️ Ripristina' : '📦 Archivia'}</button>
      </div>
      <button value="" class="annulla">Annulla</button>
    </form>`;
  $dialog.onclose = async () => {
    const scelta = $dialog.returnValue;
    $dialog.returnValue = '';
    try {
      if (scelta === 'rinomina') {
        const nome = prompt('Nuovo nome', p.nome)?.trim();
        if (nome && nome !== p.nome) {
          await db.aggiornaPianta(p.id, { nome });
          p.nome = nome;
        }
      } else if (scelta === 'icona') {
        location.hash = `#/pianta/${p.id}/icona`;
        return;
      } else if (scelta === 'archivia') {
        await db.aggiornaPianta(p.id, { archiviata: !p.archiviata });
        p.archiviata = !p.archiviata;
        toast(p.archiviata ? 'Pianta archiviata' : 'Pianta ripristinata');
      }
      render();
    } catch (e) {
      errore(e);
    }
  };
  $dialog.showModal();
}

// ---------- events (delegation) ----------

$app.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, [data-icona]');
  if (!t) return;

  if (t.dataset.log) return registra(t);
  if (t.dataset.elimina) return elimina(t.dataset.elimina);

  if (t.dataset.icona) {
    const contenitore = t.closest('[data-cambia-icona]');
    if (contenitore) {
      const id = contenitore.dataset.cambiaIcona;
      try {
        await db.aggiornaPianta(id, { icona: t.dataset.icona });
        state.piante.find((p) => p.id === id).icona = t.dataset.icona;
        location.hash = `#/pianta/${id}`;
      } catch (e) {
        errore(e);
      }
    } else {
      state.iconaScelta = t.dataset.icona;
      document.querySelectorAll('.pick').forEach((b) => {
        b.classList.toggle('sel', b === t);
        b.setAttribute('aria-pressed', b === t);
      });
    }
    return;
  }

  switch (t.dataset.azione) {
    case 'menu':
      return apriMenu(t.dataset.id);
    case 'storico-completo':
      state.storicoCompleto = true;
      return render();
    case 'riprova':
      try {
        await ricarica();
      } catch (e) {
        state.errore = e.message || String(e);
      }
      return render();
    case 'esci':
    case 'esci-subito':
      if (t.dataset.azione === 'esci' && !confirm(DEMO ? 'Ripristinare i dati demo?' : 'Uscire?')) return;
      await db.esci();
      state.errore = null;
      state.user = DEMO ? await db.getUser() : null;
      if (state.user) await ricarica();
      return render();
  }
});

$app.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const btn = f.querySelector('[type=submit]');
  btn.disabled = true;
  try {
    if (f.id === 'form-login') {
      state.login.email = f.email.value.trim().toLowerCase();
      try {
        state.user = await db.accedi(state.login.email, f.password.value);
      } catch (e) {
        toast(/invalid/i.test(e?.message) ? 'Email o password errate' : 'Errore: ' + (e?.message || e));
        return;
      }
      try {
        await ricarica();
      } catch (e) {
        state.errore = e.message || String(e);
      }
      location.hash = '#/';
      render();
    } else if (f.id === 'form-nuova') {
      const nome = f.nome.value.trim();
      if (!nome) return;
      const p = await db.aggiungiPianta({ nome, icona: state.iconaScelta });
      state.piante.push(p);
      state.iconaScelta = 'generica';
      location.hash = `#/pianta/${p.id}`;
    }
  } catch (e) {
    errore(e);
  } finally {
    btn.disabled = false;
  }
});

window.addEventListener('hashchange', () => {
  state.storicoCompleto = false;
  render();
  window.scrollTo(0, 0);
});

// Partner changes: reload when the app comes back to the foreground
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !state.user) return;
  try {
    await ricarica();
    // redraw only the list: elsewhere we'd lose a name being typed or a chosen date
    if (route().length === 0 && !document.querySelector('dialog[open]')) render();
  } catch {
    /* offline: keep the data we already have */
  }
});

// ---------- start ----------

async function init() {
  db = DEMO
    ? (await import('./db-demo.js')).createDemoDb()
    : (await import('./db-supabase.js')).createSupabaseDb(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    state.user = await db.getUser();
    if (state.user) await ricarica();
  } catch (e) {
    state.errore = e.message || String(e);
  }
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  // ask the browser not to wipe the saved data (and with it the login)
  navigator.storage?.persist?.().catch(() => {});
}

init();
