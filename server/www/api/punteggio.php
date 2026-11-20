<?php
// POST {"nick","token","punti","personaggio","livello","tempo","modo","giocatori"}
//   -> {"ok": true, "posizione": 3, "record": true}
// Salva una partita. In classifica conta il miglior punteggio di ogni nickname.
declare(strict_types=1);
require __DIR__ . '/../../lib/comune.php';
intestazioni(['POST']);
$d = corpo();
$g = autentica($d['nick'] ?? null, $d['token'] ?? null);
$ip = impronta_ip();
limita($ip, 'partita', 30, 600);              // 30 partite ogni 10 minuti per indirizzo
limita('g' . $g['id'], 'partita', 4, 60);     // 4 al minuto per nickname

$punti = intero($d['punti'] ?? null, 1, PUNTI_MAX, 'punti');
$tempo = intero($d['tempo'] ?? null, 1, 7200, 'tempo');
$giocatori = intero($d['giocatori'] ?? 1, 1, 2, 'giocatori');
$pers = $d['personaggio'] ?? '';
if (!is_string($pers) || !preg_match('/^[a-z0-9_]{1,20}$/', $pers)) errore(400, 'personaggio', 'Personaggio non valido');
$livello = $d['livello'] ?? '';
if (!in_array($livello, LIVELLI, true)) errore(400, 'livello', 'Livello non valido');
$modo = $d['modo'] ?? 'completo';
if (!in_array($modo, MODI, true)) errore(400, 'modo', 'Modo non valido');
if ($punti > PUNTI_AL_SECONDO_MAX * $tempo + 20000) errore(422, 'sospetto', 'Punteggio non plausibile');

$pdo = db();
$q = $pdo->prepare('SELECT COALESCE(MAX(punti), 0) FROM partite WHERE giocatore_id = ? AND modo = ? AND nascosto = 0');
$q->execute([$g['id'], $modo]);
$prima = (int)$q->fetchColumn();
$pdo->prepare('INSERT INTO partite (giocatore_id, punti, personaggio, livello, tempo_s, modo, giocatori) VALUES (?, ?, ?, ?, ?, ?, ?)')
    ->execute([$g['id'], $punti, $pers, $livello, $tempo, $modo, $giocatori]);
$migliore = max($prima, $punti);
// posizione del miglior punteggio di questo nickname tra i migliori di tutti
$q = $pdo->prepare('SELECT COUNT(*) FROM (SELECT giocatore_id, MAX(punti) AS m FROM partite WHERE modo = ? AND nascosto = 0 GROUP BY giocatore_id) t WHERE t.m > ?');
$q->execute([$modo, $migliore]);
rispondi(201, ['ok' => true, 'posizione' => (int)$q->fetchColumn() + 1, 'record' => $punti > $prima]);
