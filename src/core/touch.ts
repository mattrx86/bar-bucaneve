// ============================================================================
// Comandi touch: croce direzionale a sinistra, pulsanti a destra, sovrapposti al gioco.
// Sono elementi HTML (non oggetti Phaser) perche' il multi-touch dei browser funziona
// meglio cosi': si puo' tenere premuto SPARA mentre si muove la croce e si salta.
//
// Compaiono solo dove servono: su telefoni/tablet (puntatore "coarse") subito, su un
// computer con schermo tattile alla prima dita sullo schermo; spariscono se poi si
// preme un tasto della tastiera. Si vedono solo durante la partita (GameScene).
// ============================================================================

export type TouchTap = 'salto' | 'bomba' | 'melee' | 'pausa';

/** Stato condiviso: lo scrive il pannello, lo legge Controls. */
export const touch = {
  sx: false, dx: false, su: false, giu: false, fuoco: false,
  taps: new Set<TouchTap>(),
  /** Il dispositivo e' touch (o lo e' diventato): se false il pannello resta nascosto. */
  attivo: false,
};

let radice: HTMLDivElement | null = null;
let inPartita = false;
let pad: HTMLDivElement, manopola: HTMLDivElement;
const bottoni: { el: HTMLDivElement }[] = [];
let barra: HTMLDivElement[] = [];
/** Pulsante "schermo intero" dei menu (in partita c'e' quello della barra in alto a destra). */
let tastoMenu: HTMLDivElement | null = null;
/** Il browser permette lo schermo intero? (Android e computer si; iPhone no: li' si usa "Aggiungi alla
 *  schermata Home", che apre il gioco gia' senza barre) */
export const schermoInteroPossibile = (): boolean => !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen;
export function schermoIntero(): void {
  if (document.fullscreenElement) { void document.exitFullscreen(); return; }
  void document.documentElement.requestFullscreen?.()
    .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
    .catch(() => { /* il browser puo' rifiutare */ });
}

function azzera(): void {
  touch.sx = touch.dx = touch.su = touch.giu = touch.fuoco = false;
  touch.taps.clear();
  if (manopola) manopola.style.transform = 'translate(0px,0px)';
}

function aggiorna(): void {
  if (!radice) return;
  const mostra = inPartita && touch.attivo;
  radice.style.display = mostra ? 'block' : 'none';
  if (tastoMenu) tastoMenu.style.display = !inPartita && touch.attivo && schermoInteroPossibile() && !document.fullscreenElement ? 'flex' : 'none';
  if (mostra) disponi(); else azzera();
}

/** La scena di gioco chiede di mostrare (true) o nascondere (false) il pannello. */
export function mostraTouch(on: boolean): void { inPartita = on; aggiorna(); }

/** Posiziona e dimensiona tutto in base alla finestra. `u` e' l'altezza che avrebbe il gioco a
 *  schermo; in orizzontale coincide con l'altezza della finestra. */
function disponi(): void {
  if (!radice) return;
  const W = window.innerWidth, H = window.innerHeight;
  const u = Math.min(H, W * 9 / 16);
  const m = Math.round(u * 0.05);
  // croce
  const D = Math.round(u * 0.46);
  Object.assign(pad.style, { width: `${D}px`, height: `${D}px`, left: `${m}px`, bottom: `${m}px` });
  const Dm = Math.round(D * 0.38);
  Object.assign(manopola.style, { width: `${Dm}px`, height: `${Dm}px`, left: `${(D - Dm) / 2}px`, top: `${(D - Dm) / 2}px` });
  // pulsanti: centri misurati dall'angolo in basso a destra, in unita' di u
  const pos: [number, number, number][] = [[0.17, 0.17, 0.13], [0.42, 0.12, 0.10], [0.13, 0.43, 0.09], [0.35, 0.37, 0.085]];
  bottoni.forEach((b, i) => {
    const [px, py, pr] = pos[i];
    const d = Math.round(u * pr * 2);
    Object.assign(b.el.style, {
      width: `${d}px`, height: `${d}px`, right: `${Math.round(u * px - d / 2) + m / 2}px`, bottom: `${Math.round(u * py - d / 2) + m / 2}px`,
      fontSize: `${Math.max(9, Math.round(u * (i === 0 ? 0.045 : 0.036)))}px`,
    });
  });
  // pausa e schermo intero: piccoli, in alto a destra sotto la fascia dell'HUD
  const s = Math.round(u * 0.11);
  barra.forEach((el, i) => Object.assign(el.style, {
    width: `${s}px`, height: `${s}px`, right: `${m + i * (s + Math.round(u * 0.03))}px`, top: `${Math.round(u * 0.2)}px`,
    fontSize: `${Math.max(9, Math.round(u * 0.04))}px`,
  }));
}

function crea(css: Partial<CSSStyleDeclaration>, testo = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.textContent = testo;
  Object.assign(el.style, {
    position: 'absolute', boxSizing: 'border-box', borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    background: 'rgba(20,24,40,0.38)', border: '2px solid rgba(255,255,255,0.45)',
    color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', fontWeight: 'bold',
    pointerEvents: 'auto', touchAction: 'none', userSelect: 'none', webkitUserSelect: 'none',
    webkitTapHighlightColor: 'transparent',
  } as Partial<CSSStyleDeclaration>, css);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return el;
}

/** Collega un elemento a due azioni: giu() quando lo si tocca, su() quando si lascia. */
function premibile(el: HTMLDivElement, giu: () => void, su: () => void): void {
  const sollevato = (e: PointerEvent) => { if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId); su(); el.style.background = 'rgba(20,24,40,0.38)'; };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); el.setPointerCapture?.(e.pointerId);
    el.style.background = 'rgba(255,224,102,0.45)'; giu();
  });
  el.addEventListener('pointerup', sollevato);
  el.addEventListener('pointercancel', sollevato);
}

function leggiCroce(e: PointerEvent): void {
  const r = pad.getBoundingClientRect();
  const R = r.width / 2;
  let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
  const mod = Math.hypot(dx, dy); if (mod > 1) { dx /= mod; dy /= mod; }
  touch.sx = dx < -0.28; touch.dx = dx > 0.28;
  touch.su = dy < -0.4; touch.giu = dy > 0.4;
  manopola.style.transform = `translate(${Math.round(dx * R * 0.5)}px,${Math.round(dy * R * 0.5)}px)`;
}

/** Da chiamare una volta all'avvio (main.ts). Crea il pannello, nascosto. */
export function iniziaTouch(): void {
  if (radice) return;
  touch.attivo = !!window.matchMedia?.('(pointer: coarse)').matches;
  radice = document.createElement('div');
  Object.assign(radice.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '20', display: 'none', pointerEvents: 'none', touchAction: 'none' });
  document.body.appendChild(radice);

  pad = crea({ borderRadius: '50%', background: 'rgba(20,24,40,0.30)' });
  // frecce disegnate con il testo: niente immagini da caricare
  const freccia = (t: string, css: Partial<CSSStyleDeclaration>) => { const a = document.createElement('div'); a.textContent = t; Object.assign(a.style, { position: 'absolute', color: 'rgba(255,255,255,0.55)', fontSize: '18px', pointerEvents: 'none' }, css); pad.appendChild(a); };
  freccia('◀', { left: '8%', top: '44%' }); freccia('▶', { right: '8%', top: '44%' });
  freccia('▲', { top: '6%', left: '45%' }); freccia('▼', { bottom: '6%', left: '45%' });
  manopola = crea({ background: 'rgba(255,255,255,0.35)' });
  manopola.style.pointerEvents = 'none';
  pad.appendChild(manopola);
  let dito: number | null = null;
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); dito = e.pointerId; pad.setPointerCapture?.(e.pointerId); leggiCroce(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === dito) leggiCroce(e); });
  const fine = (e: PointerEvent) => { if (e.pointerId !== dito) return; dito = null; touch.sx = touch.dx = touch.su = touch.giu = false; manopola.style.transform = 'translate(0px,0px)'; };
  pad.addEventListener('pointerup', fine); pad.addEventListener('pointercancel', fine);
  radice.appendChild(pad);

  const definizioni: [string, () => void, () => void][] = [
    ['SPARA', () => { touch.fuoco = true; }, () => { touch.fuoco = false; }],
    ['SALTA', () => touch.taps.add('salto'), () => {}],
    ['BOMBA', () => touch.taps.add('bomba'), () => {}],
    ['PUGNO', () => touch.taps.add('melee'), () => {}],
  ];
  definizioni.forEach(([t, g, s]) => {
    const el = crea({}, t); premibile(el, g, s); radice!.appendChild(el);
    bottoni.push({ el });
  });
  const pausa = crea({ borderRadius: '12px' }, 'II'); premibile(pausa, () => touch.taps.add('pausa'), () => {});
  const intero = crea({ borderRadius: '12px' }, '⛶');
  premibile(intero, schermoIntero, () => {});
  if (!schermoInteroPossibile()) intero.style.visibility = 'hidden';
  // nei menu: pulsante grande in alto a destra, sparisce a schermo intero
  tastoMenu = crea({ position: 'fixed', top: '8px', right: '8px', width: '46px', height: '46px', borderRadius: '10px',
    fontSize: '26px', zIndex: '21', background: 'rgba(20,24,40,0.7)', border: '2px solid #ffe066', color: '#ffe066' }, '⛶');
  tastoMenu.title = 'Schermo intero';
  premibile(tastoMenu, schermoIntero, () => {});
  document.body.appendChild(tastoMenu);
  document.addEventListener('fullscreenchange', aggiorna);
  barra = [pausa, intero];
  barra.forEach((el) => radice!.appendChild(el));

  // Su un portatile con schermo tattile il pannello compare alla prima dita e sparisce
  // appena si usa di nuovo la tastiera (il tasto F del gioco continua a funzionare).
  window.addEventListener('touchstart', () => { if (!touch.attivo) { touch.attivo = true; aggiorna(); } }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (!touch.attivo || e.repeat || window.matchMedia?.('(pointer: coarse)').matches) return;
    touch.attivo = false; aggiorna();
  });
  window.addEventListener('resize', () => { if (inPartita && touch.attivo) disponi(); });
  window.addEventListener('blur', azzera);
  document.addEventListener('visibilitychange', () => { if (document.hidden) azzera(); });
}
