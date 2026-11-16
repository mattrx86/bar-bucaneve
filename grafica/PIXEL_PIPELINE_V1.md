# BUCA SLUG — Pixel Pipeline v1 (candidate)

Stato: candidato da verificare in build e gameplay. Non unire prima della revisione delle anteprime.

## Vincolo di contenuto

Questa modifica non cambia i disegni e non rigenera personaggi, nemici, boss, fondali o oggetti. I PNG originali in `grafica/` restano invariati. I ritocchi manuali restano opzionali in `grafica/ritocchi/` e devono rispettare la tela degli estratti.

## Modifiche della pipeline

### Sprite, oggetti ed effetti
- Sostituito il ridimensionamento `BOX` con `NEAREST` nelle funzioni `to_small()` di `tools/build_assets.py` e `tools/build_extra.py`.
- La dimensione di output resta quella calcolata dalla pipeline.
- La maschera alpha viene binarizzata alla soglia già usata dal processo.
- I colori vengono selezionati dai pixel sorgente; non si introducono colori mediati dall'interpolazione.
- Il post-trattamento `ink()` esistente resta invariato.
- Nessuna modifica a tela, pivot, baseline, frame, ordine delle pose o silhouette.

### Fondali
Prima del ridimensionamento, `tools/build_assets.py` applica un grading leggero ai soli fondali:
- saturazione: 0,91;
- contrasto: 0,94;
- luminosità: 0,98.

Non viene applicata trasparenza alpha globale, blur o modifica della composizione. Il ridimensionamento LANCZOS e la codifica JPEG del fondale restano invariati.

### Casse delle armi
In `tools/build_extra.py` la larghezza di output delle cinque casse arma e dei sei frame di apertura passa a 30 pixel logici (da 22–26). I frame di apertura sono portati alla stessa larghezza per evitare salti di scala durante l'animazione. Nessuna modifica a munizioni, icone, proiettili o collisioni.

## Cosa verificare

1. Confrontare i quattro eroi originali alla scala effettiva di gioco.
2. Verificare che le animazioni non presentino flicker o variazioni indesiderate tra frame.
3. Controllare i punti di uscita dei proiettili: il ridimensionamento non deve spostare la posa o la muzzle map.
4. Verificare che le casse ingrandite non coprano eccessivamente i personaggi e restino allineate al terreno.
5. Confrontare i fondali graded con gli originali e confermare che il livello di slavatura sia sufficiente ma non eccessivo.
6. Eseguire build e test di gioco prima del merge.

## Reversibilità

Per annullare le modifiche di stile basta ripristinare le versioni precedenti di `to_small()`, rimuovere il grading in `pezzo()` e riportare le larghezze delle casse ai valori originali. I PNG sorgente non sono mai stati sovrascritti.
