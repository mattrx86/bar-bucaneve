# BUCA SLUG — Pixel Pipeline v1 (candidate)

Stato: candidato da verificare in build e gameplay. Non unire prima della revisione delle anteprime.

## Vincolo di contenuto

I PNG originali in `grafica/` non vengono ridisegnati né sovrascritti. La pipeline lavora sui fotogrammi estratti e ne migliora esclusivamente il trattamento dei bordi: fattezze, capelli, volto, abiti, accessori, armi, palette interna, posa, proporzioni e silhouette originale restano quelli del disegno sorgente. Non vengono inserite nuove parti nel personaggio.

## Modifiche della pipeline

### Sprite di personaggi, nemici e boss
- Dopo la riduzione a pixel netti, viene aggiunto un contorno esterno nero molto scuro (1 pixel della texture), con profilo a gradini tramite una dilatazione a 4-neighbour.
- La funzione `peel()` continua a rimuovere gli aloni chiari/sporchi presenti sul bordo dei fogli originali; il nuovo contorno chiude la silhouette dopo il ridimensionamento.
- Il trattamento è applicato a tutti gli sprite riconosciuti dalla pipeline: eroi, gelatai, ubriachi, Giova ed Ettore.
- Il contorno è esterno: non sostituisce i pixel interni e non cambia occhi, capelli, lineamenti, vestiti, accessori o armi.
- Le dimensioni delle celle, la baseline, il pivot, l'ordine e il numero dei fotogrammi restano gestiti dalla pipeline originale.

### Sprite e oggetti: ridimensionamento
- Sostituito il ridimensionamento `BOX` con `NEAREST` nelle funzioni `to_small()` di `tools/build_assets.py` e `tools/build_extra.py`.
- La dimensione di output resta quella calcolata dalla pipeline.
- La maschera alpha viene binarizzata; non si introducono colori mediati dall'interpolazione.
- Le casse arma mantengono larghezze uniformate a 30 pixel logici, compresi i frame di apertura.

### Fondali
Prima del ridimensionamento, `tools/build_assets.py` applica un grading leggero ai soli fondali:
- saturazione: 0,84;
- contrasto: 0,92;
- luminosità: 0,99.

Il grading attenua leggermente i colori per separare i personaggi dal fondale. Non viene applicato blur o trasparenza alpha globale; la composizione, gli edifici e gli oggetti disegnati restano invariati.

## Cosa verificare

1. Confrontare Mattia, Marco, Daniele e Paolo con i sorgenti per confermare identità e dettagli.
2. Verificare tutte le pose dei gelatai: contorno continuo, nessuno sporco residuo, nessun pixel isolato indesiderato.
3. Controllare che il profilo a gradini non faccia variare lo spessore percepito tra i fotogrammi.
4. Verificare baseline, pivot e punti di uscita dei proiettili.
5. Confrontare il fondale graded con l'originale alla scala effettiva di gioco.
6. Eseguire build e test di gioco prima del merge.

## Limiti noti

I fondali della strada sono immagini appiattite: edifici, vegetazione e sfondo non sono forniti come livelli separati. Per questo questa versione li desatura ma non inserisce ancora una parallasse montana automatica, che richiederebbe una separazione affidabile dei piani per non disegnare le montagne sopra i tetti o danneggiare i dettagli originali.

## Reversibilità

La modifica dello stile è confinata agli script di generazione. Per tornare al risultato precedente basta ripristinare `tools/build_assets.py` e `tools/build_extra.py`; i PNG originali in `grafica/` non sono stati sovrascritti.
