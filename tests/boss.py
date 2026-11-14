"""Prova rapida dei due boss (salta la strada). Uso: python3 tests/boss.py [cartella]"""
import sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/boss'
os.makedirs(OUT, exist_ok=True)
G = "window.__game.scene.getScene('Game')"
def bot(pg, nome, n, every=12):
    pg.keyboard.down('KeyJ')
    for i in range(n):
        pg.wait_for_timeout(250)
        info = pg.evaluate(f"(()=>{{const g={G}; if(!g||!g.giocatore) return null; g.giocatore.invuln=5; const b=g.boss; return {{px:g.giocatore.x, bx:b?b.x:null, vita:b?Math.round(b.vita):null, st:b?b.st:null, fase:g.fase, morto:b?b.morto:null, nem:g.nemici.length}}}})()")
        if info is None: break
        if info['bx'] is not None:
            for k in ('ArrowLeft', 'ArrowRight'): pg.keyboard.up(k)
            pg.keyboard.down('ArrowRight' if info['bx'] > info['px'] else 'ArrowLeft'); pg.wait_for_timeout(60)
            pg.keyboard.up('ArrowRight'); pg.keyboard.up('ArrowLeft')
        if i % 4 == 0: pg.keyboard.press('KeyK')
        if i % every == 0:
            pg.screenshot(path=f'{OUT}/{nome}_{i:03d}.png'); print(nome, i, info)
        if info.get('morto') and info['fase'] == 'cantina' and pg.evaluate("window.__game.scene.isActive('Result')"): break
        if nome == 'giova' and info['fase'] == 'cantina': print('passato in cantina'); break
    pg.keyboard.up('KeyJ')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1152, 'height': 648}); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('dist/index.html')); pg.wait_for_timeout(2500)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
    # salta alla fine della strada
    pg.evaluate(f"(()=>{{const g={G}; g.onda=99; g.giocatore.x=g.larghezza-440; g.camX=g.larghezza-600;}})()")
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(600); pg.keyboard.up('ArrowRight')
    bot(pg, 'giova', 260)
    # dopo Giova: vai a destra fino alla cantina
    pg.keyboard.down('ArrowRight')
    for i in range(40):
        pg.wait_for_timeout(250)
        if pg.evaluate(f"{G}.fase") == 'cantina': break
    pg.keyboard.up('ArrowRight'); print('fase', pg.evaluate(f"{G}.fase"))
    pg.wait_for_timeout(1200); pg.screenshot(path=f'{OUT}/intro_ettore.png')
    pg.wait_for_timeout(2500)
    bot(pg, 'ettore', 400, every=16)
    pg.wait_for_timeout(5000); pg.screenshot(path=f'{OUT}/zz_risultato.png')
    print('Result attivo:', pg.evaluate("window.__game.scene.isActive('Result')"))
    print('ERRORI', errs[:8])
    b.close()
