import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './content/defs';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { SelectScene } from './scenes/SelectScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0a0a10',
  pixelArt: true,
  roundPixels: true,
  input: { gamepad: true },
  scale: { mode: Phaser.Scale.NONE },
  scene: [BootScene, TitleScene, SelectScene, GameScene, ResultScene],
});
(window as any).__game = game;

// ---------------------------------------------------------------------------
// Scala a pixel interi (x2, x3, x4, x5...): ogni pixel del gioco diventa un quadrato
// esatto di pixel dello schermo, niente pixel "storti". Su schermi piccoli scala libera.
// ---------------------------------------------------------------------------
function adatta(): void {
  const c = game.canvas; if (!c) return;
  let k = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  if (k >= 1) k = Math.floor(k);
  c.style.width = `${Math.round(VIEW_W * k)}px`;
  c.style.height = `${Math.round(VIEW_H * k)}px`;
  game.scale.refresh();
}
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
