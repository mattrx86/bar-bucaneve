"""Colori dei proiettili: 7 eroi x 4 armi + bomba. Controlla la texture usata e la tinta dominante dei pixel colorati.
Uso: python3 tests/colori.py [cartella]"""
import sys, os, json
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/colori'
os.makedirs(OUT, exist_ok=True)
G = "window.__game.scene.getScene('Game')"
ATTESI = {'vero': (278, 'viola'), 'michela': (328, 'rosa'), 'roberto': (196, 'azzurro'), 'marco': (125, 'verde'), 'daniele': (18, 'arancione'), 'paolo': (0, 'rosso'), 'mattia': (None, 'originale')}
JS = """(()=>{const g=%s, q=g.giocatore; q.prendiArma('%s'); q.invuln=999; q.munizioni=99; q.cadenzaT=0;
  const n0=g.proiettili.length; if('%s'==='bomba'){q.bombe=5;q.lanciaBomba();} else q.spara();
  const b=g.proiettili[g.proiettili.length-1]; if(!b||g.proiettili.length===n0) return null;
  const tx=b.sprite.texture, im=tx.getSourceImage(); const c=document.createElement('canvas'); c.width=im.width;c.height=im.height;
  const cx=c.getContext('2d'); cx.drawImage(im,0,0); const d=cx.getImageData(0,0,c.width,c.height).data; let sx=0,sy=0,n=0;
  for(let i=0;i<d.length;i+=4){ if(d[i+3]<200) continue; const r=d[i]/255,gg=d[i+1]/255,bb=d[i+2]/255; const mx=Math.max(r,gg,bb), mn=Math.min(r,gg,bb), df=mx-mn; if(mx<0.3||df/mx<0.3) continue;
    let h=df? (mx===r? ((gg-bb)/df)%%6 : mx===gg? (bb-r)/df+2 : (r-gg)/df+4):0; h=(h*60+360)%%360; const a=h*Math.PI/180; sx+=Math.cos(a); sy+=Math.sin(a); n++; }
  const hue=n? (Math.atan2(sy,sx)*180/Math.PI+360)%%360 : null; g.proiettili.forEach(p=>p.distruggi()); g.proiettili=[]; return {key:tx.key, hue:hue&&Math.round(hue), n}})()"""
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1152, 'height': 648}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('dist/index.html')); pg.wait_for_timeout(2500)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    for eroe, (h0, nome) in ATTESI.items():
        pg.evaluate(f"(()=>{{const gs=window.__game.scene; gs.stop('Game'); gs.start('Game',{{fase:'strada',stato:null,eroi:['{eroe}']}});}})()")
        pg.wait_for_timeout(1500)
        for arma in ['pistola', 'mitragliatrice', 'fucile', 'lanciarazzi', 'bomba']:
            r = pg.evaluate(JS % (G, 'pistola' if arma == 'bomba' else arma, arma))
            if not r: print('NESSUN PROIETTILE', eroe, arma); bad += 1; continue
            ok = (h0 is None and '__' not in r['key']) or (h0 is not None and r['key'].endswith('__' + eroe) and r['hue'] is not None and min(abs(r['hue'] - h0), 360 - abs(r['hue'] - h0)) < 12)
            if arma == 'fucile' and h0 is not None: pass
            print(f"{eroe:8s} {arma:15s} {r['key']:28s} tinta {r['hue']} (attesa {nome}) {'OK' if ok else 'ERRORE'}"); bad += 0 if ok else 1
    print('ERRORI JS', errs[:3], '| problemi:', bad); b.close(); sys.exit(1 if bad or errs else 0)
