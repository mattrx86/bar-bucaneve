# BUCA SLUG — classifica generale sul NAS (Synology DS224+)

Il **gioco** sta su GitHub Pages: https://mattrx86.github.io/bar-bucaneve/ e si aggiorna da solo.
Sul **NAS** gira solo questo piccolo servizio, che riceve e restituisce i punteggi:

```
browser (gioco su GitHub Pages)
   │ HTTPS
   ▼
Fritz!Box / ZTE (porta 443 già inoltrata al NAS)
   ▼
reverse proxy di DSM  bucaslug.mattiariccadonna.synology.me  →  http://localhost:18896
   ▼
container "bucaslug-api" (PHP 8.3 + Apache, sola lettura, privilegi minimi)
   ▼
MariaDB 10 di Synology, database "bucaslug", utente con soli permessi su quel database
```

## Sicurezza: cosa viene esposto

| Cosa | Esposto a internet? |
|---|---|
| I 3 file dell'API (`giocatore.php`, `punteggio.php`, `classifica.php`) | sì, solo in HTTPS tramite il reverse proxy |
| Tutto il resto del container (cartelle, file, `lib/`) | no: Apache risponde 403 |
| La porta 18896 del container | no: ascolta solo su 127.0.0.1 del NAS (né internet né LAN) |
| MariaDB, phpMyAdmin, DSM | no: restano come sono (LAN/WireGuard) |
| Password del database | solo nel file `.env` sul NAS, mai su GitHub |

- **Container:** file system in sola lettura, capacità Linux ridotte al minimo, `no-new-privileges`, 128 MB di RAM, nessun programma esterno eseguibile da PHP.
- **Utente del database:** vede solo il database `bucaslug` e può solo leggere, aggiungere e cancellare righe. Non può modificare la struttura né vedere MediCare o gli altri database.
- **Indirizzi IP:** non vengono salvati. Si salva solo un'impronta cifrata, usata per i limiti anti-abuso.
- **Limiti anti-abuso:**
  - 6 nickname nuovi all'ora per indirizzo;
  - 30 partite ogni 10 minuti per indirizzo e 4 al minuto per nickname;
  - punteggi impossibili rifiutati.
- **Cosa resta possibile:** il gioco gira nel browser, quindi una persona esperta può sempre inventarsi un punteggio plausibile e inviarlo. Si rimedia da phpMyAdmin (vedi "Moderare").

## Installazione (una volta sola, circa 20 minuti)

### Prerequisiti
- DSM con **MariaDB 10**, **phpMyAdmin** (che usate già) e **Container Manager**.
- Il certificato HTTPS per i sottodomini di `mattiariccadonna.synology.me`, come per `visite.`.
- Accesso SSH al NAS (lo avete già usato), oppure solo l'interfaccia di DSM.

### 1. Database (phpMyAdmin, da LAN o WireGuard)
1. Aprite phpMyAdmin come amministratore.
2. Scheda **SQL**: incollate `sql/01_database_e_utente.sql`.
3. Sostituite `CAMBIAMI_CON_UNA_PASSWORD_LUNGA` con una password lunga e casuale. Per generarla: Bitwarden → generatore, 32 caratteri senza simboli strani.
4. Eseguite. Dovete vedere 4 messaggi verdi.
5. Selezionate il database **bucaslug** a sinistra, scheda **SQL**, incollate `sql/02_tabelle.sql` ed eseguite. Compaiono le tabelle `giocatori`, `partite` e `limiti`.

Possibili errori:
- **"Access denied" all'avvio del container:** la password del `.env` è diversa da quella dello script.
- **La rete Docker non inizia per `172.`:** in SSH controllate con `docker network inspect bridge | grep Subnet`.

### 2. Controllo di MariaDB 10
DSM → **MariaDB 10**: annotate la **porta** (di solito 3307) e verificate che **"Abilita connessione TCP/IP"** sia attivo.
La porta **non** va inoltrata sul router: il container ci arriva da dentro il NAS.

### 3. File sul NAS
1. **File Station**: create la cartella `/volume1/docker/bucaslug`.
2. Copiateci il contenuto della cartella `server/` del repository:
   - `Dockerfile`, `docker-compose.yml`, `php-bucaslug.ini`, `apache-bucaslug.conf`;
   - le cartelle `lib/`, `www/`, `sql/`.

   Per prenderli: GitHub → **Code → Download ZIP**, oppure in SSH:
   ```bash
   cd /volume1/docker
   git clone --depth 1 https://github.com/mattrx86/bar-bucaneve.git /tmp/bb && cp -r /tmp/bb/server bucaslug && rm -rf /tmp/bb
   ```
3. Copiate `.env.esempio` come **`.env`** e compilatelo:
   - `DB_PASS` = la password del punto 1;
   - `DB_PORT` = la porta del punto 2;
   - `PEPE` = 64 caratteri casuali (in SSH: `openssl rand -hex 32`).
4. Proteggete il file .env (SSH): `chmod 600 /volume1/docker/bucaslug/.env`.

### 4. Avvio del container
**Container Manager → Progetto → Crea**:
- **Nome:** `bucaslug`;
- **Percorso:** `/volume1/docker/bucaslug`;
- **Origine:** "Usa docker-compose.yml esistente";
- poi **Avanti**, **Fatto**.

La prima volta costruisce l'immagine e ci mette 1–2 minuti.
Oppure in SSH: `cd /volume1/docker/bucaslug && sudo docker compose up -d --build`.

**Verifica sul NAS** (SSH):
```bash
curl -s http://127.0.0.1:18896/api/classifica.php
```
Risposta attesa: `{"classifica":[]}`.

Se esce un errore:
- `{"errore":"db"...}`: database non raggiungibile. Controllate porta, password e "connessione TCP/IP". I dettagli sono nei log: `sudo docker logs bucaslug-api`.
- Se il container si riavvia di continuo, togliete da `docker-compose.yml` il blocco `cap_drop`/`cap_add` e segnalatemelo: l'immagine non l'ho potuta avviare qui, solo la stessa configurazione di Apache e PHP.

### 4-bis. In alternativa: con Portainer (al posto del punto 4)
1. **Portainer → Images → Build a new image**
   - Name: `bucaslug-api:1`
   - Build method: **Web editor**, incollate:
     ```
     FROM php:8.3-apache
     RUN docker-php-ext-install pdo_mysql && a2enmod headers && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && rm -rf /var/www/html/*
     ```
   - **Build the image** (2–4 minuti; alla fine "Image successfully built").
2. **Stacks → Add stack** → Name `bucaslug` → **Web editor**: incollate tutto `server/portainer-stack.yml`.
3. Sotto, **Environment variables → Load variables from .env file**: caricate il vostro `.env` (le 6 variabili compaiono nell'elenco).
4. **Deploy the stack**. Verifica come al punto 4 (`curl` in SSH).

### 5. Reverse proxy (HTTPS)
DSM → **Pannello di controllo → Portale di login → Avanzate → Proxy inverso → Crea**:
- **Origine:** HTTPS, nome host `bucaslug.mattiariccadonna.synology.me`, porta 443, HSTS attivo.
- **Destinazione:** HTTP, `localhost`, porta `18896`.
- **Intestazione personalizzata → Crea → X-Real-IP**, valore `$remote_addr`. Serve ai limiti anti-abuso; senza, tutti sembrano lo stesso utente.

Poi **Sicurezza → Certificato**: assegnate al nuovo servizio lo stesso certificato di `visite.mattiariccadonna.synology.me`.
Se è un certificato senza sottodomini jolly, aggiungete `bucaslug.mattiariccadonna.synology.me` ai nomi alternativi e rinnovatelo.

**Verifica da fuori** (telefono con il Wi-Fi spento): https://bucaslug.mattiariccadonna.synology.me/api/classifica.php → `{"classifica":[]}`.
Lo stesso indirizzo senza `/api/classifica.php` deve dare **403**.

### 6. Fatto
Aprite https://mattrx86.github.io/bar-bucaneve/ e giocate: alla prima partita il gioco chiede il nickname.

## Uso quotidiano

- **Nickname:** si sceglie alla prima partita e resta in quel browser. Si cambia dal menu con **N**, o toccando la scritta in alto a sinistra.
  - Su un altro dispositivo serve un nickname diverso: chi registra un nickname ne diventa il "proprietario".
  - Per liberarne uno: phpMyAdmin → tabella `giocatori` → cancellate la riga. Le partite di quel nickname spariscono insieme.
- **Classifiche:** due separate, la partita **completa** e **solo ultimo livello**. Conta il miglior punteggio di ogni nickname.
- **Moderare:** phpMyAdmin → `partite` → nella riga del punteggio truccato mettete `nascosto` a `1`. Sparisce dalla classifica ma resta salvato.
- **Backup:** aggiungete il database `bucaslug` al vostro backup notturno di MariaDB / Hyper Backup.
- **Aggiornare PHP:** in `Dockerfile` cambiate `php:8.3-apache`, poi Container Manager → Progetto → **Ricostruisci**. Watchtower non tocca questo container: l'immagine è costruita sul NAS.
- **Spegnere la classifica:** fermate il progetto in Container Manager. Il gioco continua a funzionare e mostra la classifica locale.

## API (per chi vuole curiosare)
| Metodo | Indirizzo | Cosa fa |
|---|---|---|
| POST | `/api/giocatore.php` `{"nick"}` | registra un nickname, risponde con il token |
| POST | `/api/punteggio.php` `{"nick","token","punti","personaggio","livello","tempo","modo","giocatori"}` | salva una partita |
| GET | `/api/classifica.php?modo=completo&n=10` | miglior punteggio di ogni nickname |
