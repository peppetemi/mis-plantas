// Icon set. Plant icons are icons/<key>.webp files; until a file
// exists (or if it fails to load) the emoji is shown.

export const ICONE = [
  { key: 'monstera', nome: 'Monstera', emoji: '🪴' },
  { key: 'monstera-monkey', nome: 'Monstera Monkey', emoji: '🪴' },
  { key: 'sterlizia', nome: 'Sterlizia', emoji: '🌿' },
  { key: 'ficus-elastica', nome: 'Ficus Elastica', emoji: '🪴' },
  { key: 'calathea', nome: 'Calathea', emoji: '🌿' },
  { key: 'tradescantia', nome: 'Tradescantia', emoji: '🌿' },
  { key: 'spatafillo', nome: 'Spatafillo', emoji: '🌷' },
  { key: 'calla', nome: 'Calla', emoji: '🌷' },
  { key: 'pilea', nome: 'Pilea', emoji: '🌱' },
  { key: 'potho', nome: 'Potho', emoji: '🌿' },
  { key: 'stella-di-natale', nome: 'Stella di Natale', emoji: '🌺' },
  { key: 'pachira', nome: 'Pachira', emoji: '🌳' },
  { key: 'cactus', nome: 'Cactus', emoji: '🌵' },
  { key: 'giglio-leopardo', nome: 'Giglio Leopardo', emoji: '🌸' },
  // generic (emoji only)
  { key: 'generica', nome: 'Pianta', emoji: '🪴', soloEmoji: true },
  { key: 'erba', nome: 'Erbe', emoji: '🌿', soloEmoji: true },
  { key: 'germoglio', nome: 'Germoglio', emoji: '🌱', soloEmoji: true },
  { key: 'fiore', nome: 'Fiore', emoji: '🌷', soloEmoji: true },
  { key: 'palma', nome: 'Palma', emoji: '🌴', soloEmoji: true },
];

const PER_KEY = Object.fromEntries(ICONE.map((i) => [i.key, i]));

// Icons that failed to load: from the next render on, the emoji goes straight in
// (no request or flash on every re-render).
const mancanti = (window.__iconeMancanti = new Set());

export function iconaHTML(key, size = 56) {
  const i = PER_KEY[key] || PER_KEY.generica;
  const stile = `style="--s:${size}px"`;
  if (i.soloEmoji || mancanti.has(i.key)) {
    return `<span class="icona fallback" ${stile}><span class="icona-emoji">${i.emoji}</span></span>`;
  }
  return `<span class="icona" ${stile}><img src="icons/${i.key}.webp" alt=""
    onerror="__iconeMancanti.add('${i.key}');this.parentNode.classList.add('fallback');this.remove()"><span class="icona-emoji">${i.emoji}</span></span>`;
}
