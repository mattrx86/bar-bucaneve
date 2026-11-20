"""Ettore: evento della moto CRE (una sola volta, anche con danno enorme), velocita' x2, ritorno alla normalita'.
Uso: python3 tests/ettore_moto.py [cartella]   (richiede dist/index.html: sh tools/build_all.sh)"""
import sys, os, json
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/moto'
os.makedirs(OUT, exist_ok=True)
G = "window.__game.scene.getScene('Game')"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1152, 'height': 648}); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('dist/index.html')); pg.wait_for_timeout(2500)
    pg.keyboard.press('Space'); pg.wait_for_timeout(500)   # schermata PREMI UN TASTO
    pg.keyboard.press('Enter'); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
    pg.evaluate(f"(()=>{{const g={G}; g.onda=99; g.giocatore.x=g.larghezza-440; g.camX=g.larghezza-600;}})()")
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(600); pg.keyboard.up('ArrowRight')
    for i in range(60):
        pg.wait_for_timeout(250)
        if pg.evaluate(f"(()=>{{const g={G}; return !!(g.boss&&g.boss.attivo)}})()"): break
    pg.evaluate(f"(()=>{{const g={G}; g.giocatore.invuln=999; g.boss.danno(999999,0);}})()")
    pg.keyboard.down('ArrowRight')
    for i in range(80):
        pg.wait_for_timeout(250); g = pg.evaluate(f"{G}.fase")
        pg.evaluate(f"(()=>{{const g={G}; if(g.giocatore) g.giocatore.invuln=999}})()")
        if g == 'cantina': break
    pg.keyboard.up('ArrowRight'); print('fase', g)
    for i in range(60):
        pg.wait_for_timeout(250)
        if pg.evaluate(f"(()=>{{const g={G}; return !!(g.boss&&g.boss.attivo)}})()"): break
    # contatori: quante volte parte la moto, quante volte i giocatori vengono colpiti dalla moto
    pg.evaluate(f"""(()=>{{const g={G}, b=g.boss; window.__n={{lanci:0,mot:0}};
      const o=b.lanciaMoto.bind(b); b.lanciaMoto=()=>{{window.__n.lanci++; o();}};
      const i=b.iniziaMoto.bind(b); b.iniziaMoto=()=>{{window.__n.mot++; i();}};
      g.giocatore.invuln=0; b.vita=b.vitaMax; }})()""")
    # velocita' di camminata misurata
    pg.evaluate(f"(()=>{{const g={G}; g.giocatore.x=g.boss.x-300;}})()")
    xs = []
    for k in range(8):
        pg.wait_for_timeout(120); xs.append(pg.evaluate(f"{G}.boss.x"))
    print('x boss in cammino', [round(v) for v in xs])
    # danno ENORME in un colpo solo: dal 100% allo 10% (deve far partire la moto una volta, e basta)
    pg.evaluate(f"(()=>{{const g={G}, b=g.boss; g.giocatore.invuln=0; b.vita=b.vitaMax*0.10;}})()")
    seen = []; vita0 = pg.evaluate(f"{G}.giocatore.vita")
    for i in range(70):
        pg.wait_for_timeout(100)
        info = pg.evaluate(f"(()=>{{const g={G}, b=g.boss; return {{st:b.st, fase:b.fase, n:window.__n, pv:g.giocatore.vita, m:!!b.motoProj, mx:b.motoProj?Math.round(b.motoProj.x):null, px:Math.round(g.giocatore.x)}}}})()")
        seen.append(info)
        if i % 7 == 0: pg.screenshot(path=f'{OUT}/m_{i:03d}.png')
        pg.evaluate(f"(()=>{{const g={G}; if(g.boss.motoProj) g.giocatore.x=g.boss.motoProj.x}})()") if i == 28 else None
    print(json.dumps(seen[::6]))
    fin = seen[-1]; print('FINALE', fin)
    ok = fin['n']['mot'] == 1 and fin['n']['lanci'] == 1 and fin['st'] != 'moto'
    print('MOTO UNA SOLA VOLTA E FINITA:', ok, '| danno al giocatore:', vita0 - fin['pv'])
    print('ERRORI', errs[:8]); b.close()
    sys.exit(0 if ok and not errs else 1)
