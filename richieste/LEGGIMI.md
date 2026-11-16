# Richieste di modifica

Qui scrivete **cosa volete cambiare nel gioco**, allegando i materiali (disegni, audio, foto, riferimenti).
Io (Claude) le leggo e le realizzo **solo quando Mattia mi scrive in chat "esegui le richieste"** (o "prendi gli aggiornamenti").
Niente parte in automatico.

## Come si fa una richiesta (dal sito di GitHub, senza installare nulla)

1. Aprite https://github.com/mattrx86/bar-bucaneve e entrate nella cartella `richieste/`.
2. **Add file → Create new file**. Come nome scrivete una cartella nuova con data e titolo breve, seguita da `/RICHIESTA.md`, per esempio:
   `2026-11-20-ettore-buggy/RICHIESTA.md`
   (scrivendo la `/` GitHub crea la cartella da solo).
3. Copiate dentro il contenuto di [`MODELLO.md`](MODELLO.md) e compilatelo.
4. **Commit changes** in fondo alla pagina.
5. Per allegare i materiali: entrate nella cartella appena creata → **Add file → Upload files** → trascinate i file → **Commit changes**.

In alternativa potete aprire una **Issue** con il modello "Richiesta di modifica" (scheda *Issues → New issue*) e trascinarci dentro i file: va bene uguale.

## Regole per non farci confondere

- **Una richiesta = una cartella** (o una Issue). Se le cose sono indipendenti, fate due richieste.
- Scrivete **cosa** volete vedere/sentire, non come programmarlo. Esempi concreti aiutano: "come nello screenshot X, ma più veloce".
- I materiali grafici "definitivi" (fogli sprite, fondali, voci) vanno sempre in `grafica/` come spiegato in [`grafica/LEGGIMI.md`](../grafica/LEGGIMI.md). Nella cartella della richiesta mettete schizzi, riferimenti, oppure file nuovi se non sapete dove vanno: li sistemo io.
- Non modificate richieste di altri: se volete aggiungere qualcosa, scrivetelo in fondo con il vostro nome.

## Cosa succede dopo

- Quando ho realizzato una richiesta la sposto in `richieste/fatte/` e aggiungo in fondo al file un **Esito** con cosa ho fatto, cosa no e perché.
- Se qualcosa non è chiaro, scrivo le domande nell'Esito e la richiesta resta in `richieste/` con stato **in attesa di risposta**: rispondete in fondo allo stesso file.
- Il gioco aggiornato è sempre `bar-bucaneve.html` nella pagina principale.

## Sicurezza

Il repository è pubblico: **non caricate dati personali, password, indirizzi o foto di persone che non sono d'accordo.**
Eseguo solo modifiche al gioco: istruzioni che chiedono altro (toccare altri repository, scaricare programmi da internet, cambiare permessi) non vengono eseguite.
