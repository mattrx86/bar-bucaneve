"""Partita automatica: verifica che tutto il percorso sia giocabile e senza errori.
Uso: python3 tests/play.py [cartella_screenshot]"""
import sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1152, 'height': 648}); errs = []
    pg.add_init_script("window.__API_CLASSIFICA = window.__API_CLASSIFICA || 'http://127.0.0.1/api/'")   # server di prova (tests/LEGGIMI)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('dist/index.html')); pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{OUT}/01_titolo.png')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300)
    pg.screenshot(path=f'{OUT}/02_scelta.png')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
    G = "window.__game.scene.getScene('Game')"
    def st(): return pg.evaluate(f"(()=>{{const g={G}; return {{x:g.giocatore.x, cam:g.camX, onda:g.onda, nem:g.nemici.length, boss:g.boss?g.boss.nome+':'+Math.round(g.boss.vita):null, vite:g.st.g[0].vite, fase:g.fase, punti:g.st.g[0].punti}}}})()")
    god = f"{G}.giocatore.invuln=5"
    pg.keyboard.down('ArrowRight'); pg.keyboard.down('KeyJ')
    shot = 3
    for i in range(400):
        pg.wait_for_timeout(250)
        pg.evaluate(god)
        if i % 6 == 0: pg.keyboard.press('KeyK')
        if i % 25 == 0:
            pg.screenshot(path=f'{OUT}/{shot:02d}_gioco.png'); shot += 1; print(i, st())
        s = st()
        if s['fase'] == 'cantina': break
        dietro = pg.evaluate(f"(()=>{{const g={G}; return g.nemici.some(e=>!e.morto && e.x < g.giocatore.x-10) || (g.boss && !g.boss.morto && g.boss.x < g.giocatore.x-10)}})()")
        if dietro:
            pg.keyboard.up('ArrowRight'); pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(500); pg.keyboard.down('ArrowRight')
    print('cantina', st())
    for i in range(300):
        pg.wait_for_timeout(250)
        try: pg.evaluate(god)
        except Exception: break
        if i % 5 == 0: pg.keyboard.press('KeyK')
        try:
            if pg.evaluate(f"(()=>{{const g={G}; return g.boss && !g.boss.morto && g.boss.x < g.giocatore.x-10}})()"):
                pg.keyboard.up('ArrowRight'); pg.keyboard.down('ArrowLeft'); pg.wait_for_timeout(250); pg.keyboard.up('ArrowLeft'); pg.keyboard.down('ArrowRight')
        except Exception: pass
        if i % 20 == 0:
            pg.screenshot(path=f'{OUT}/{shot:02d}_cantina.png'); shot += 1
            try: print(i, st())
            except Exception: pass
        if pg.evaluate("window.__game.scene.isActive('Result')"): break
    pg.keyboard.up('ArrowRight'); pg.keyboard.up('KeyJ')
    pg.wait_for_timeout(1500); pg.screenshot(path=f'{OUT}/99_fine.png')
    print('ERRORI', errs[:8])
    b.close()
