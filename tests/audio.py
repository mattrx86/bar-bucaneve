"""Audio dei livelli: quali musiche, sottofondi e voci partono davvero, e quando.
Usa il registro window.__audioLog (src/core/audio.ts) e controlla:
  STRADA    solo musica 'strada'; voci solo barista_femmina e gelataio_pepite (quando entrano i gelatai)
  BUCANEVE  la musica resta 'strada'; giova_ciao spesso ma mai a meno di 3 s; sottofondo 'giova' 3-4 volte
  CANTINA   musica di Ettore subito; ettore_intro, ettore_dunebuggy (moto), gelataio_pepite (rinforzi),
            ettore_muore una volta
  CHIESA    musica 'chiesa' poi 'chiesa_boss'; voci solo di Griso e Don Antonio; griso_morte una volta
Uso: python3 tests/audio.py [file html]"""
import sys, os, json
from playwright.sync_api import sync_playwright
HTML = sys.argv[1] if len(sys.argv) > 1 else 'dist/index.html'
G = "window.__game.scene.getScene('Game')"
ok = True
def esito(cond, msg):
    global ok
    ok &= bool(cond); print(('  OK   ' if cond else '  ERR  ') + msg)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1152, 'height': 648}); errs = []
    pg.add_init_script("window.__API_CLASSIFICA = window.__API_CLASSIFICA || 'http://127.0.0.1/api/'")   # server di prova (tests/LEGGIMI)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("window.__audioLog = []")
    pg.goto('file://' + os.path.abspath(HTML)); pg.wait_for_timeout(2500)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    log = lambda: pg.evaluate("window.__audioLog.splice(0)")
    imm = "(()=>{const g=%s; g.giocatori.forEach(q=>{q.invuln=5; q.vita=q.vitaMax;});})()" % G
    def avvia(fase, stato='null'):
        pg.evaluate(f"window.__game.scene.getScenes(true)[0].scene.start('Game',{{fase:'{fase}',stato:{stato},eroi:['marco']}})")
    def attendi(sec, ogni=0.25, extra=None):
        for _ in range(int(sec / ogni)):
            pg.evaluate(imm)
            if extra: pg.evaluate(extra)
            pg.wait_for_timeout(int(ogni * 1000))

    # ---------------- STRADA
    print('STRADA'); log(); avvia('strada'); attendi(4)
    uccidi = f"{G}.nemici.forEach(e=>{{if(e.x<{G}.camX+300) e.danno(99,1,false,0);}})"
    # prima ondata con sole gelataie (Math.random a 0 sceglie il primo foglio, vil_gelataia)
    pg.evaluate("window.__r = Math.random; Math.random = () => 0")
    pg.evaluate(f"{G}.giocatore.x = 200"); attendi(2.5)
    pg.evaluate("Math.random = window.__r"); attendi(3, extra=uccidi)
    L1 = log()
    # seconda ondata con gelatai maschi (Math.random a 0,5 -> vil_gelataio1)
    pg.evaluate("Math.random = () => 0.5")
    pg.evaluate(f"(()=>{{const g={G}; g.bloccoDx=Infinity; g.giocatore.x = 450;}})()"); attendi(2.5)
    pg.evaluate("Math.random = window.__r"); attendi(3, extra=uccidi)
    L2 = log()
    mus = [e['nome'] for e in L1 + L2 if e['tipo'] == 'musica']
    v1 = [e['nome'] for e in L1 if e['tipo'] == 'voce']; v2 = [e['nome'] for e in L2 if e['tipo'] == 'voce']
    esito(mus == ['strada'], f'musica: {mus}')
    esito('barista_femmina' in v1 and 'gelataio_pepite' not in v1, f'ondata di gelataie -> barista: {v1}')
    esito('gelataio_pepite' in v2 and 'barista_femmina' not in v2, f'ondata di gelatai -> gelataio: {v2}')

    # ---------------- BUCANEVE (Giovanni)
    print('BUCANEVE'); avvia('strada', "{tempo:0,crediti:3,checkpoint:'giova',g:[{vite:3,punti:0,arma:'pistola',munizioni:-1,bombe:10}]}")
    pg.wait_for_timeout(1500); log()
    for _ in range(30):
        pg.evaluate(f"(()=>{{const g={G}; if(!g.arena) g.giocatore.x += 40;}})()"); pg.wait_for_timeout(200)
        if pg.evaluate(f"!!{G}.boss"): break
    # 40 s di combattimento: la vita di Giovanni scende a gradini fino a 10%
    for k in range(160):
        pg.evaluate(imm)
        pg.evaluate(f"(()=>{{const bo={G}.boss; if(bo && bo.attivo && !bo.morto) bo.vita = Math.max(bo.vitaMax*0.1, bo.vita - bo.vitaMax*0.0058);}})()")
        pg.wait_for_timeout(250)
    L = log()
    mus = [e['nome'] for e in L if e['tipo'] == 'musica']; sott = [e for e in L if e['tipo'] == 'sottofondo']
    ciao = [e['t'] for e in L if e['tipo'] == 'voce' and e['nome'] == 'giova_ciao']
    gap = min((b2 - a2) for a2, b2 in zip(ciao, ciao[1:])) / 1000 if len(ciao) > 1 else 99
    esito(all(m == 'strada' for m in mus), f'musica (deve restare la strada): {mus}')
    esito(3 <= len(sott) <= 4, f'sottofondo di Giovanni: {len(sott)} volte')
    esito(len(ciao) >= 6 and gap >= 3, f'giova_ciao: {len(ciao)} volte in 40 s, distanza minima {gap:.1f} s')
    altre = sorted({e['nome'] for e in L if e['tipo'] == 'voce'} - {'giova_ciao', 'barista_femmina', 'gelataio_pepite'})
    esito(not altre, f'altre voci: {altre}')

    # ---------------- CANTINA (Ettore)
    print('CANTINA'); log(); avvia('cantina'); attendi(4)
    L = log()
    esito([e['nome'] for e in L if e['tipo'] == 'musica'][:1] == ['battaglia-ettore'], f"musica all'ingresso: {[e['nome'] for e in L if e['tipo'] == 'musica']}")
    esito('ettore_intro' in [e['nome'] for e in L if e['tipo'] == 'voce'], 'ettore_intro all\'entrata')
    for v in (0.7, 0.6, 0.5, 0.4):
        pg.evaluate(f"(()=>{{const bo={G}.boss; if(bo) bo.vita = bo.vitaMax*{v};}})()"); attendi(4)
    pg.evaluate(f"(()=>{{const bo={G}.boss; bo.danno(bo.vita+10, 0);}})()"); attendi(3)
    L = log(); voci = [e['nome'] for e in L if e['tipo'] == 'voce']
    esito('gelataio_pepite' in voci, f'gelataio con i rinforzi: {voci}')
    esito('ettore_dunebuggy' in voci, 'ettore_dunebuggy con la moto')
    esito(voci.count('ettore_muore') == 1, f"ettore_muore {voci.count('ettore_muore')} volta/e")

    # ---------------- CHIESA
    print('CHIESA'); log(); avvia('chiesa'); attendi(3)
    L = log(); esito([e['nome'] for e in L if e['tipo'] == 'musica'] == ['chiesa'], f"musica navata: {[e['nome'] for e in L if e['tipo'] == 'musica']}")
    avvia('chiesa', "{tempo:0,crediti:3,checkpoint:'altare',g:[{vite:3,punti:0,arma:'pistola',munizioni:-1,bombe:10}]}")
    pg.wait_for_timeout(1200); log()
    for _ in range(30):
        pg.evaluate(f"(()=>{{const g={G}; if(!g.arena) g.giocatore.x = g.camX + 200;}})()"); pg.wait_for_timeout(250)
        if pg.evaluate(f"!!({G}.boss && {G}.boss.attivo)"): break
    attendi(12)
    pg.evaluate(f"(()=>{{const bo={G}.boss; bo.vita = bo.vitaMax*0.45;}})()"); attendi(8)
    pg.evaluate(f"(()=>{{const bo={G}.boss; bo.danno(bo.vita+10, 0);}})()"); attendi(6)
    L = log(); voci = [e['nome'] for e in L if e['tipo'] == 'voce']; mus = [e['nome'] for e in L if e['tipo'] == 'musica']
    esito('chiesa_boss' in mus, f'musica arena: {mus}')
    esito(set(voci) <= {'griso_sisi', 'griso_voce', 'griso_morte', 'donantonio_dovesei', 'donantonio_cani_1', 'donantonio_cani_2'}, f'voci: {voci}')
    esito(voci.count('griso_morte') == 1, f"griso_morte {voci.count('griso_morte')} volta/e")
    esito('griso_voce' in voci or 'griso_sisi' in voci, 'voce di Griso in combattimento')
    esito(not errs, f'errori pagina: {errs[:3]}')
    print('ESITO', 'OK' if ok else 'ERRORE')
    b.close()
