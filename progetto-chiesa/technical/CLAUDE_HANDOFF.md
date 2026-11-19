# Istruzioni per Claude — Chiesa Gotica

Questo dossier è il riferimento del lavoro ambientale. Prima di scrivere codice, leggi:
1. `README.md`
2. `art-direction/ART_DIRECTION.md`
3. `technical/INTEGRATION_PLAN.md`
4. `asset-manifest/ASSET_MANIFEST.md`

Poi analizza il repository e confronta queste specifiche con lo stato reale del codice, senza presumere che il piano sia già implementato.

## Richiesta operativa
Realizza la sostituzione ambientale della cantina con la chiesa gotica. Mantieni intatti i sistemi di gameplay e conserva gli asset preesistenti. Prepara un ambiente modulare a scorrimento orizzontale con ingresso, navata e arena dell'altare. Implementa layer di parallasse, candele animate e luce colorata della vetrata con sistemi compatibili con Phaser 4.2.1.

## Vincolo sui boss
Griso e Don Antonio non sono ancora stati caricati. Non inventare sprite, silhouette definitive, animazioni, hitbox o dimensioni. Predisponi soltanto il punto d'integrazione e attendi i file originali.

## Criteri di completamento
Non chiamare "completo" un asset sheet composito: gli elementi devono essere file separati, trasparenti dove richiesto e pronti per il loader del gioco. Non dichiarare integrazione o test se non sono stati effettivamente eseguiti. Elenca file modificati, comandi eseguiti, risultati dei test e limitazioni residue.
