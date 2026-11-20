"""Griso: lancio della Bibbia e del rosario, voci di combattimento e di morte.
Forza piu' volte ogni attacco, segue i proiettili fotogramma per fotogramma e controlla che:
partano dalla mano, si muovano, colpiscano il giocatore e spariscano; il boss torni a camminare;
la voce di morte parta una volta sola.
Uso: python3 tests/griso.py [file html] [cartella screenshot]"""
import sys, os, json
from playwright.sync_api import sync_playwright
HTML = sys.argv[1] if len(sys.argv) > 1 else 'dist/index.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/griso'
os.makedirs(OUT, exist_ok=True)
G = "window.__game.scene.getScene('Game')"
# registra ogni suono che parte (durata del buffer), per riconoscere le voci
SPIA = """(() => { window.__suoni = []; const o = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer) window.__suoni.push({ d: +this.buffer.duration.toFixed(2), t: performance.now() }); return o.apply(this, a); }; })()"""
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1152, 'height': 648}); errs = []
    pg.add_init_script("window.__API_CLASSIFICA = window.__API_CLASSIFICA || 'http://127.0.0.1/api/'")   # server di prova (tests/LEGGIMI)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(SPIA); pg.add_init_script("window.__audioLog = []")
    pg.goto('file://' + os.path.abspath(HTML)); pg.wait_for_timeout(2500)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(400)   # sblocca l'audio
    pg.evaluate("window.__game.scene.getScene('Title').scene.start('Game',{fase:'chiesa',stato:{tempo:0,crediti:3,checkpoint:'altare',g:[{vite:3,punti:0,arma:'pistola',munizioni:-1,bombe:10}]},eroi:['marco']})")
    pg.wait_for_timeout(800)
    for _ in range(40):
        pg.evaluate(f"(()=>{{const g={G}; if(!g.arena) {{ g.giocatore.x = g.camX + 200; }} }})()")
        pg.wait_for_timeout(250)
        if pg.evaluate(f"!!({G}.boss && {G}.boss.st==='cammina')"): break
    for attacco in ['rosario', 'bibbia', 'rosario', 'bibbia', 'rosario', 'bibbia']:
        # giocatore a 130 px da Griso, fermo a terra; vita piena per contare i colpi
        pg.evaluate(f"""(()=>{{const g={G}, q=g.giocatore, bo=g.boss; q.x=bo.x-130; q.vita=q.vitaMax; q.invuln=0; q.vy=0;
            bo.st='{attacco}'; bo.t=0; bo.colpito=false; bo.lanci=1; bo.guardaDx=false;}})()""")
        traccia = []; colpito = False; vita0 = pg.evaluate(f"{G}.giocatore.vita")
        for i in range(30):
            s = pg.evaluate(f"""(()=>{{const g={G}; const bo=g.boss; const q=g.giocatore;
                return {{st:bo.st, t:+bo.t.toFixed(2), f:bo.sprite.frame.name, bx:Math.round(bo.x), vita:q.vita,
                  pr:g.proiettili.filter(b=>b.o.ostile && (b.o.disegno==='bibbia'||b.o.disegno==='rosario_griso')).map(b=>({{d:b.o.disegno,x:Math.round(b.sprite.x),y:Math.round(b.sprite.y),r:+b.sprite.rotation.toFixed(1)}}))}}}})()""")
            traccia.append(s)
            if i in (4, 7, 10): pg.screenshot(path=f'{OUT}/{attacco}_{len(os.listdir(OUT)):02d}.png')
            pg.wait_for_timeout(100)
        # si segue il primo oggetto lanciato: dal primo campione in cui c'e' a quello in cui sparisce
        i0 = next((i for i, s in enumerate(traccia) if s['pr']), None)
        prs = []; sparito = False
        if i0 is not None:
            for s in traccia[i0:]:
                if not s['pr']: sparito = True; break
                prs.append(s['pr'][0])
        mosso = len({(pr['x'], pr['y']) for pr in prs}) >= 2
        torna = any(s['st'] in ('cammina', 'recupero') for s in traccia[10:])
        colpito = min(s['vita'] for s in traccia) < vita0
        esito = 'OK' if (prs and mosso and sparito and torna and colpito) else 'ERRORE'
        ok &= esito == 'OK'
        print(f"{attacco:8s} {esito}: in volo per {len(prs)} campioni da 0,1 s, si muove={mosso}, colpisce={colpito}, sparito={sparito}, boss torna a camminare={torna}")
        print('   partenza:', prs[0] if prs else None, ' ultimo:', prs[-1] if prs else None)
        pg.wait_for_timeout(600)
    # morte: la voce di morte (circa 4 s) deve partire una volta sola
    pg.evaluate("window.__suoni = []; window.__audioLog.length = 0")
    pg.evaluate(f"(()=>{{const bo={G}.boss; bo.danno(bo.vita + 10, 0);}})()")
    pg.wait_for_timeout(5000)
    print('stato boss dopo il colpo:', pg.evaluate(f"(()=>{{const b={G}.boss; return {{morto:b.morto, vita:b.vita, mortoT:b.mortoT, st:b.st, voceMorte:b.voceMorte}}}})()"))
    print('voci dopo la morte:', pg.evaluate("(window.__audioLog||[]).map(e=>e.tipo+':'+e.nome)"))
    suoni = pg.evaluate("window.__suoni")
    lunghi = [v for v in pg.evaluate("(window.__audioLog||[]).map(e=>e.nome)") if v == 'griso_morte']   # registro del gioco
    print('suoni partiti dopo la morte (durate s):', [s['d'] for s in suoni])
    print('voce di morte partita', len(lunghi), 'volta/e')
    ok &= len(lunghi) == 1
    pg.screenshot(path=f'{OUT}/zz_morte.png')
    print('ERRORI', errs)
    print('ok', ok, 'errs', errs)
    print('ESITO', 'OK' if ok and not errs else 'ERRORE')
    b.close()
