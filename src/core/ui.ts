import Phaser from 'phaser';
import { PixelText, stileDaColore } from './font';
export { PixelText };
import { ZOOM } from '../content/defs';
/** Telecamera ingrandita: coordinate in pixel di gioco (384x216), disegno a ZOOM volte. */
export function zoomCamera(sc: Phaser.Scene): void { sc.cameras.main.setZoom(ZOOM).setOrigin(0, 0); }
/** Testo in stile arcade (carattere pixel). `size` sceglie la scala: <12 = 1x, <20 = 2x, altrimenti 3x. */
export function txt(sc: Phaser.Scene, x: number, y: number, s: string, size = 10, color = '#ffffff', _stroke = 3): PixelText {
  const scala = size < 12 ? 1 : size < 20 ? 2 : 3;
  return new PixelText(sc, x, y, s, stileDaColore(color), scala);
}
