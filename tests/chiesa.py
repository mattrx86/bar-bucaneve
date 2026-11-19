"""HOLY SLUG: partita completa nella chiesa, giocata da un "bot" (il giocatore e' reso invulnerabile).
Ingresso -> navata con tutte le ondate -> arena -> Griso -> Don Antonio -> schermata finale.
Uso: python3 tests/chiesa.py [file html] [cartella screenshot]"""
import sys, os, json
from playwright.sync_api import sync_playwright
HTML = sys.argv[1] if len(sys.argv) > 1 else 'dist/index.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/chiesa'
os.makedirs(OUT, exist_ok=True)
G = "window.__game.scene.getScene('Game')"
STATO = f"""(()=>{{const g={G}; if(!g||!g.giocatore||!g.sys.isActive()) return null; const p=g.giocatore; p.invuln=5; p.vita=p.vitaMax;
  const vivi=g.nemici.filter(e=>!e.morto); const bb=[g.boss,g.boss2].filter(Boolean);
  const bers=[...vivi.map(e=>e.x), ...bb.filter(b=>!b.morto&&b.attivo).map(b=>b.x)];
  const vicino=bers.length? bers.reduce((a,b)=>Math.abs(b-p.x)<Math.abs(a-p.x)?b:a):null;
  return {{fase:g.fase, px:Math.round(p.x), cam:Math.round(g.camX), onda:g.onda, nem:vivi.length, vicino, blocco:g.bloccoDx!==Infinity,
    arena:!!g.arena, boss:bb.map(b=>({{n:b.nome, v:Math.round(b.vita), st:b.st, m:b.morto}})), finito:g.finito, punti:g.st.g[0].punti}}}})()"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1152, 'height': 648}); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath(HTML)); pg.wait_for_timeout(2500)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    pg.evaluate("window.__game.scene.getScene('Title').scene.start('Game',{fase:'chiesa',stato:null,eroi:['marco']})")
    pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/00_ingresso_porta.png')
    pg.wait_for_timeout(1500); pg.screenshot(path=f'{OUT}/01_ingresso_aperta.png')
    shot = 0; ultima = None; vittoria = False; visti = set()
    for i in range(1400):
        s = pg.evaluate(STATO)
        if s is None:
            if pg.evaluate("window.__game.scene.isActive('Result')"): vittoria = True; break
            pg.wait_for_timeout(200); continue
        for k in ('ArrowLeft', 'ArrowRight', 'KeyJ'): pg.keyboard.up(k)
        if s['vicino'] is not None:
            d = s['vicino'] - s['px']
            # si gira verso il bersaglio; se e' lontano si avvicina, se e' troppo vicino arretra
            if abs(d) > 150: pg.keyboard.down('ArrowRight' if d > 0 else 'ArrowLeft')
            elif abs(d) < 40: pg.keyboard.down('ArrowLeft' if d > 0 else 'ArrowRight'); pg.wait_for_timeout(30); pg.keyboard.up('ArrowLeft'); pg.keyboard.up('ArrowRight'); pg.keyboard.down('ArrowRight' if d > 0 else 'ArrowLeft')
            else: pg.keyboard.down('ArrowRight' if d > 0 else 'ArrowLeft'); pg.wait_for_timeout(25); pg.keyboard.up('ArrowRight'); pg.keyboard.up('ArrowLeft')
            pg.keyboard.down('KeyJ')
        elif not s['blocco']:
            pg.keyboard.down('ArrowRight')
        if i % 9 == 0: pg.keyboard.press('KeyK')
        pg.wait_for_timeout(120)
        chiave = (s['onda'], s['arena'], len(s['boss']), tuple(x['m'] for x in s['boss']))
        if chiave not in visti or i % 60 == 0:
            visti.add(chiave); pg.screenshot(path=f'{OUT}/{10 + shot:02d}_{s["px"]}.png'); shot += 1
            print(json.dumps(s))
        ultima = s
    pg.wait_for_timeout(1500); pg.screenshot(path=f'{OUT}/99_fine.png')
    print('VITTORIA (schermata finale):', vittoria or pg.evaluate("window.__game.scene.isActive('Result')"))
    print('ultimo stato:', json.dumps(ultima))
    print('ERRORI', errs[:10])
    b.close()
