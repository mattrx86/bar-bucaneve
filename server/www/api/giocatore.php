<?php
// POST {"nick": "SGAN", "token": "<64 esadecimali>"} -> {"nick": "SGAN", "token": "..."}  registra un nickname.
//
// Il token lo genera il gioco (casuale, 256 bit) e lo manda qui: il server ne salva solo l'impronta SHA-256.
// Cosi' la registrazione si puo' RIPETERE senza danni: se la prima risposta si perde (rete lenta, telefono
// che cambia antenna) il gioco riprova con lo stesso token e il server risponde "ok, e' gia' tuo" invece di
// "nickname gia' usato". Chi non conosce il token di quel nickname riceve sempre 409.
// Le versioni vecchie del gioco non mandano il token: in quel caso lo genera il server, come prima.
declare(strict_types=1);
require __DIR__ . '/../../lib/comune.php';
intestazioni(['POST']);
$d = corpo();
$nick = nick_valido($d['nick'] ?? null);

$token = $d['token'] ?? null;
if ($token !== null && (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token))) errore(400, 'token', 'Richiesta non valida');

if ($token !== null) {
    // stesso nickname, stesso token: e' una ripetizione della registrazione gia' fatta da questo dispositivo
    $q = db()->prepare('SELECT token_hash FROM giocatori WHERE nick = ?');
    $q->execute([$nick]);
    $h = $q->fetchColumn();
    if ($h !== false) {
        if (hash_equals((string)$h, hash('sha256', $token))) rispondi(200, ['nick' => $nick, 'token' => $token]);
        errore(409, 'preso', 'Nickname gia\' usato da un altro giocatore, scegline un altro');
    }
} else {
    $token = bin2hex(random_bytes(32));
}

limita(impronta_ip(), 'registra', 6, 3600);   // al massimo 6 nickname nuovi all'ora per indirizzo
try {
    db()->prepare('INSERT INTO giocatori (nick, token_hash) VALUES (?, ?)')->execute([$nick, hash('sha256', $token)]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        // due richieste uguali arrivate insieme (doppio tocco): la seconda trova gia' la riga della prima
        $q = db()->prepare('SELECT token_hash FROM giocatori WHERE nick = ?');
        $q->execute([$nick]);
        $h = $q->fetchColumn();
        if ($h !== false && hash_equals((string)$h, hash('sha256', $token))) rispondi(200, ['nick' => $nick, 'token' => $token]);
        errore(409, 'preso', 'Nickname gia\' usato da un altro giocatore, scegline un altro');
    }
    error_log('bucaslug: registra: ' . $e->getMessage());
    errore(500, 'db', 'Errore del server');
}
rispondi(201, ['nick' => $nick, 'token' => $token]);
