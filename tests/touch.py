"""Prova automatica: comandi touch (emulazione telefono). Uso: python3 tests/touch.py dist/index.html /tmp/out"""
import sys, os
from playwright.sync_api import sync_playwright
HTML = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
G = "window.__game.scene.getScene('Game')"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    ctx = b.new_context(viewport={'width':844,'height':390}, has_touch=True, is_mobile=True, device_scale_factor=2)
    pg = ctx.new_page(); errs=[]
    pg.add_init_script("window.__API_CLASSIFICA = window.__API_CLASSIFICA || 'http://127.0.0.1/api/'")   # server di prova (tests/LEGGIMI)
    pg.add_init_script("if(!localStorage.getItem('bar-bucaneve-save'))localStorage.setItem('bar-bucaneve-save',JSON.stringify({v:1,charId:null,muted:false,record:[],nick:'TEST1',token:'',nick2:'TEST2',token2:''}))")   # nickname gia' scelti (niente finestra)
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://'+os.path.abspath(HTML)); pg.wait_for_timeout(2500)
    print('coarse', pg.evaluate("matchMedia('(pointer: coarse)').matches"))
    pg.screenshot(path=f'{OUT}/t1_titolo.png')
    pg.touchscreen.tap(300, 140); pg.wait_for_timeout(600)    # TOCCA PER INIZIARE
    r = pg.evaluate("(()=>{const c=document.querySelector('canvas').getBoundingClientRect(); return [c.left,c.top,c.width,c.height]})()")
    y1 = pg.evaluate("window.__game.scene.getScene('Title').voci[0].getBounds().centerY")
    pg.touchscreen.tap(r[0] + r[2] / 2, r[1] + y1 / 216 * r[3]); pg.wait_for_timeout(1200)   # 1 GIOCATORE (gia' scelta: un tocco conferma)
    print('scena dopo tap titolo', pg.evaluate("window.__game.scene.getScenes(true).map(s=>s.scene.key)"))
    pg.screenshot(path=f'{OUT}/t2_sel.png')
    # tocca il primo eroe, poi di nuovo per confermare
    pg.touchscreen.tap(422, 250); pg.wait_for_timeout(400); pg.touchscreen.tap(422, 250); pg.wait_for_timeout(2500)
    print('scena', pg.evaluate("window.__game.scene.getScenes(true).map(s=>s.scene.key)"))
    pg.screenshot(path=f'{OUT}/t3_gioco.png')
    print('overlay visibile', pg.evaluate("[...document.body.children].filter(e=>e.tagName==='DIV'&&e.style.zIndex==='20').map(e=>e.style.display)"))
    cdp = ctx.new_cdp_session(pg)
    def tocchi(pts): cdp.send('Input.dispatchTouchEvent', {'type':'touchStart' if pts else 'touchEnd','touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
    def muovi(pts): cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
    # posizioni reali dei controlli
    pos = pg.evaluate("""(()=>{const r=[...document.querySelectorAll('div')].filter(e=>e.textContent&&['SPARA','SALTA','BOMBA','PUGNO','II'].includes(e.textContent)&&e.children.length===0).map(e=>{const b=e.getBoundingClientRect();return [e.textContent,Math.round(b.left+b.width/2),Math.round(b.top+b.height/2),Math.round(b.width)]});
       const pad=[...document.querySelectorAll('div')].find(e=>e.style.width&&e.children.length===5);const b=pad.getBoundingClientRect(); r.push(['PAD',Math.round(b.left+b.width/2),Math.round(b.top+b.height/2),Math.round(b.width)]); return r})()""")
    print(pos)
    d = {n:(x,y) for n,x,y,w in pos}
    x0 = pg.evaluate(f"{G}.giocatore.x")
    # stick a destra + SPARA insieme (due dita)
    px,py = d['PAD']; fx,fy = d['SPARA']
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':px+55,'y':py,'id':1},{'x':fx,'y':fy,'id':2}]})
    pg.wait_for_timeout(1200)
    s = pg.evaluate(f"(()=>{{const g={G}; return {{x:Math.round(g.giocatore.x), proj:g.proiettili.length, fuoco:true}}}})()")
    print('x0', round(x0), s)
    pg.screenshot(path=f'{OUT}/t4_corre_spara.png')
    # salto: aggiungi un terzo dito
    sx,sy = d['SALTA']
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':px+55,'y':py,'id':1},{'x':fx,'y':fy,'id':2},{'x':sx,'y':sy,'id':3}]})
    pg.wait_for_timeout(150)
    print('y salto', pg.evaluate(f"Math.round({G}.giocatore.y)"))
    cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
    pg.wait_for_timeout(600)
    print('fermo dopo rilascio', pg.evaluate(f"(()=>{{const t={G}.giocatore; return Math.round(t.vx)}})()"))
    # bomba
    bx,by = d['BOMBA']; b0 = pg.evaluate(f"{G}.giocatore.bombe")
    pg.touchscreen.tap(bx, by); pg.wait_for_timeout(300)
    print('bombe', b0, '->', pg.evaluate(f"{G}.giocatore.bombe"))
    # pausa
    qx,qy = d['II']; pg.touchscreen.tap(qx, qy); pg.wait_for_timeout(300)
    print('pausa', pg.evaluate(f"{G}.pausa")); pg.screenshot(path=f'{OUT}/t5_pausa.png')
    pg.touchscreen.tap(qx, qy); pg.wait_for_timeout(300); print('pausa', pg.evaluate(f"{G}.pausa"))
    # portrait
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(500); pg.screenshot(path=f'{OUT}/t6_verticale.png')
    print('ERRORI', errs[:8])
    b.close()
