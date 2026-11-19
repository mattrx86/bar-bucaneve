"""Mitragliatrice in mano e punto di sparo: 7 eroi x pose x due versi. Salva una tavola per eroe e stampa gli scostamenti.
Uso: python3 tests/arma_mano.py [cartella] [arma]"""
import sys, os, json
from playwright.sync_api import sync_playwright
from PIL import Image
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/armamano'
ARMA = sys.argv[2] if len(sys.argv) > 2 else 'mitragliatrice'
os.makedirs(OUT, exist_ok=True)
G = "window.__game.scene.getScene('Game')"
EROI = ['daniele', 'marco', 'paolo', 'michela', 'roberto', 'vero', 'mattia']
POSE = ['idle', 'run_01', 'run_03', 'run_05', 'shoot', 'shoot_up', 'crouch_shoot', 'jump_shoot', 'melee_02', 'hit']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1152, 'height': 648}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('dist/index.html')); pg.wait_for_timeout(2500)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    for eroe in EROI:
        pg.evaluate(f"""(()=>{{const gs=window.__game.scene; gs.stop('Game'); gs.start('Game',{{fase:'strada',stato:null,eroi:['{eroe}']}});}})()""")
        pg.wait_for_timeout(1500)
        pg.evaluate(f"(()=>{{const g={G}, q=g.giocatore; q.prendiArma('{ARMA}'); g.pausa=true; q.invuln=0;}})()")
        tavola = Image.new('RGB', (len(POSE) * 150, 2 * 215))
        for r, dx in enumerate([True, False]):
            for c, pz in enumerate(POSE):
                info = pg.evaluate(f"""(()=>{{const g={G}, q=g.giocatore; q.guardaDx={str(dx).lower()}; q.su={str(pz=='shoot_up').lower()};
                  q.x=120; q.y=g.giocatore.y; q.mostra('{pz}'); const bc=q.bocca(); g.camX=0;
                  if(window.__pt) window.__pt.destroy(); window.__pt=g.add.rectangle(bc.x,bc.y,2,2,0xff00ff).setDepth(99);
                  return {{bx:bc.x-q.x, by:bc.y-q.y, vis:q.armaSprite?q.armaSprite.visible:false}}}})()""")
                pg.wait_for_timeout(120)
                pg.screenshot(path=f'{OUT}/_t.png', clip={'x': 120 * 3 - 75, 'y': 335, 'width': 150, 'height': 215})
                tavola.paste(Image.open(f'{OUT}/_t.png'), (c * 150, r * 215))
                if r == 0: print(eroe, pz, 'bocca dx', round(info['bx'], 1), round(info['by'], 1), 'arma visibile' if info['vis'] else '-')
        tavola.save(f'{OUT}/{eroe}.png')
    print('ERRORI', errs[:5]); b.close()
