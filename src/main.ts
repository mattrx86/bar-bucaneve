import Phaser from 'phaser';
// HOLY SLUG: unisce fogli, disegni, musica e voci della chiesa ai cataloghi del gioco (prima delle scene)
import './content/holy';
import { VIEW_W, VIEW_H, ZOOM } from './content/defs';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { SelectScene } from './scenes/SelectScene';
import { GameScene } from './scenes/GameScene';
import { ClassificaScene } from './scenes/ClassificaScene';
import { ResultScene } from './scenes/ResultScene';
import { iniziaTouch } from './core/touch';
import { unlockAudio } from './core/audio';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W * ZOOM,
  height: VIEW_H * ZOOM,
  backgroundColor: '#0a0a10',
  pixelArt: true,
  roundPixels: true,
  input: { gamepad: true },
  scale: { mode: Phaser.Scale.NONE },
  scene: [BootScene, TitleScene, SelectScene, GameScene, ResultScene, ClassificaScene],
});
(window as any).__game = game;

// ---------------------------------------------------------------------------
// Il disegno (1152x648) viene adattato alla finestra mantenendo le proporzioni.
// ---------------------------------------------------------------------------
function adatta(): void {
  const c = game.canvas; if (!c) return;
  const k = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  c.style.width = `${Math.round(VIEW_W * k)}px`;
  c.style.height = `${Math.round(VIEW_H * k)}px`;
  game.scale.refresh();
}
iniziaTouch();
// Su telefono l'audio si sblocca solo dopo un gesto: il primo tocco (rilascio) lo attiva.
window.addEventListener('pointerup', () => unlockAudio());
// Si prepara l'audio subito: i browser lo tengono "sospeso" fino al primo tasto, clic o tocco sulla pagina
// (regola dei browser, non aggirabile), ma cosi' la musica del menu parte nell'istante stesso del primo tasto.
// Se il browser permette l'audio senza gesto (sito gia' usato spesso), parte direttamente.
unlockAudio();
for (const ev of ['keydown', 'pointerdown', 'touchstart']) window.addEventListener(ev, () => unlockAudio(), { capture: true });
window.addEventListener('resize', adatta);
document.addEventListener('fullscreenchange', () => setTimeout(adatta, 50));
game.events.once('ready', adatta);
setTimeout(adatta, 300);

// F = schermo intero (anche durante la partita)
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyF' || e.repeat) return;
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => { /* il browser può rifiutare */ });
});
