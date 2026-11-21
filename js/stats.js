// Stats calculations. Pure functions: no DOM, no network.
// Dates are always 'YYYY-MM-DD' strings (local day).

export const CAP_GIORNI = { acqua: 60, concime: 120 }; // longer gaps = outliers
export const MEDIA_DEFAULT = 7;                         // plants with no history
export const SOGLIA_ARANCIO = 0.7;

export function isoOggi(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

const utc = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const giorniTra = (da, a) => Math.round((utc(a) - utc(da)) / 86400000);

// Estate = April to September, Inverno = October to March
export const stagione = (iso) => {
  const m = Number(iso.slice(5, 7));
  return m >= 4 && m <= 9 ? 'estate' : 'inverno';
};

function dateCon(eventi, azione, oggi) {
  const set = new Set();
  for (const e of eventi) if (e.data <= oggi && e.azioni.includes(azione)) set.add(e.data);
  return [...set].sort();
}

// Average gap between consecutive dates, split by the season of the later date.
function medie(date, cap) {
  const gap = { estate: [], inverno: [] };
  for (let i = 1; i < date.length; i++) {
    const g = giorniTra(date[i - 1], date[i]);
    if (g > 0 && g <= cap) gap[stagione(date[i])].push(g);
  }
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  return { estate: avg(gap.estate), inverno: avg(gap.inverno) };
}

export function statsPianta(eventi, oggi = isoOggi()) {
  const acqua = dateCon(eventi, 'acqua', oggi);
  const concime = dateCon(eventi, 'concime', oggi);
  const rinvaso = dateCon(eventi, 'rinvaso', oggi);
  const ultima = (a) => (a.length ? a[a.length - 1] : null);
  const da = (d) => (d ? giorniTra(d, oggi) : null);

  const mediaAcqua = medie(acqua, CAP_GIORNI.acqua);
  const mediaConcime = medie(concime, CAP_GIORNI.concime);

  const s = stagione(oggi);
  const altra = s === 'estate' ? 'inverno' : 'estate';
  const mediaCorrente = mediaAcqua[s] ?? mediaAcqua[altra] ?? MEDIA_DEFAULT;

  const giorniAcqua = da(ultima(acqua));
  // urgency = days since the last watering ÷ this season's average
  const urgenza = giorniAcqua == null ? 1 : giorniAcqua / mediaCorrente;
  const mancano = giorniAcqua == null ? 0 : Math.round(mediaCorrente) - giorniAcqua;

  return {
    stagione: s,
    giorniAcqua,
    giorniConcime: da(ultima(concime)),
    giorniRinvaso: da(ultima(rinvaso)),
    mediaAcqua,
    mediaConcime,
    mediaCorrente,
    urgenza,
    mancano,
  };
}

export function livello(urgenza) {
  if (urgenza >= 1) return 'rosso';
  if (urgenza >= SOGLIA_ARANCIO) return 'arancio';
  return 'verde';
}
