<?php
// POST {"nick": "SGAN"} -> {"nick": "SGAN", "token": "..."}  registra un nickname nuovo.
// Il token si vede SOLO qui: il gioco lo salva nel browser e lo manda con ogni punteggio.
// Nickname gia' preso da un altro -> 409.
declare(strict_types=1);
require __DIR__ . '/../../lib/comune.php';
intestazioni(['POST']);
$d = corpo();
$nick = nick_valido($d['nick'] ?? null);
limita(impronta_ip(), 'registra', 6, 3600);   // al massimo 6 nickname nuovi all'ora per indirizzo
$token = bin2hex(random_bytes(32));
try {
    db()->prepare('INSERT INTO giocatori (nick, token_hash) VALUES (?, ?)')->execute([$nick, hash('sha256', $token)]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') errore(409, 'preso', 'Nickname gia\' usato, scegline un altro');
    error_log('bucaslug: registra: ' . $e->getMessage());
    errore(500, 'db', 'Errore del server');
}
rispondi(201, ['nick' => $nick, 'token' => $token]);
