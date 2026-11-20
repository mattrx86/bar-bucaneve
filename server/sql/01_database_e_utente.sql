-- BUCA SLUG - classifica generale. Da eseguire UNA volta in phpMyAdmin come amministratore (root).
-- 1) Sostituite CAMBIAMI_CON_UNA_PASSWORD_LUNGA con una password lunga e casuale (la stessa che metterete
--    in DB_PASS nel file .env). 2) Eseguite tutto. 3) Eseguite 02_tabelle.sql.
-- L'utente vede SOLO il database bucaslug e puo' solo leggere, aggiungere e cancellare righe:
-- niente modifica della struttura, niente accesso agli altri database (MediCare, ecc.).
-- '172.%' = la rete interna di Docker sul NAS (i container si collegano da indirizzi 172.x.x.x).
CREATE DATABASE IF NOT EXISTS bucaslug CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'bucaslug'@'172.%' IDENTIFIED BY 'CAMBIAMI_CON_UNA_PASSWORD_LUNGA';
GRANT SELECT, INSERT, DELETE ON bucaslug.* TO 'bucaslug'@'172.%';
FLUSH PRIVILEGES;
