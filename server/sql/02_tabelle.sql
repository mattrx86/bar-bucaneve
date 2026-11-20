-- BUCA SLUG - tabelle della classifica (eseguire dopo 01, con il database bucaslug selezionato).
USE bucaslug;

-- Un nickname per riga. Del token si salva solo l'impronta SHA-256: anche chi leggesse il database
-- non potrebbe usare i nickname degli altri.
CREATE TABLE IF NOT EXISTS giocatori (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nick       VARCHAR(12)  NOT NULL,
  token_hash CHAR(64)     NOT NULL,
  creato     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_nick (nick)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Una riga per partita. "nascosto" = 1 toglie la partita dalla classifica senza cancellarla
-- (per i punteggi truccati: si cambia da phpMyAdmin).
CREATE TABLE IF NOT EXISTS partite (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  giocatore_id INT UNSIGNED NOT NULL,
  punti        INT UNSIGNED NOT NULL,
  personaggio  VARCHAR(20)  NOT NULL,
  livello      VARCHAR(10)  NOT NULL,
  tempo_s      INT UNSIGNED NOT NULL,
  modo         ENUM('completo','ultimo') NOT NULL DEFAULT 'completo',
  giocatori    TINYINT UNSIGNED NOT NULL DEFAULT 1,
  nascosto     TINYINT(1)   NOT NULL DEFAULT 0,
  creato       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY k_classifica (modo, nascosto, punti),
  KEY k_giocatore (giocatore_id),
  CONSTRAINT fk_partite_giocatore FOREIGN KEY (giocatore_id) REFERENCES giocatori (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Limiti anti-abuso: impronta dell'indirizzo (non l'IP in chiaro), azione, ora. Si svuota da sola dopo un giorno.
CREATE TABLE IF NOT EXISTS limiti (
  chiave CHAR(64)    NOT NULL,
  azione VARCHAR(12) NOT NULL,
  t      DATETIME    NOT NULL,
  KEY k_limiti (chiave, azione, t)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
