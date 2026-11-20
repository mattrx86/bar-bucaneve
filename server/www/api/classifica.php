<?php
// GET ?modo=completo&n=10 -> {"classifica": [{"pos":1,"nick":"SGAN","punti":51230,"personaggio":"mattia",
//                                              "livello":"finito","tempo":731,"data":"2026-11-20"}, ...]}
// Il miglior punteggio di ogni nickname; a pari punti vince chi l'ha fatto prima.
declare(strict_types=1);
require __DIR__ . '/../../lib/comune.php';
intestazioni(['GET']);
$modo = $_GET['modo'] ?? 'completo';
if (!in_array($modo, MODI, true)) errore(400, 'modo', 'Modo non valido');
$n = intero($_GET['n'] ?? 10, 1, 50, 'n');
limita(impronta_ip(), 'leggi', 120, 60);
$q = db()->prepare(
    'SELECT nick, punti, personaggio, livello, tempo_s, creato FROM (
        SELECT g.nick, p.punti, p.personaggio, p.livello, p.tempo_s, p.creato,
               ROW_NUMBER() OVER (PARTITION BY p.giocatore_id ORDER BY p.punti DESC, p.creato ASC) AS rn
        FROM partite p JOIN giocatori g ON g.id = p.giocatore_id
        WHERE p.modo = ? AND p.nascosto = 0
     ) t WHERE rn = 1 ORDER BY punti DESC, creato ASC LIMIT ?');
$q->bindValue(1, $modo); $q->bindValue(2, $n, PDO::PARAM_INT);
$q->execute();
$out = [];
foreach ($q->fetchAll() as $i => $r) {
    $out[] = ['pos' => $i + 1, 'nick' => $r['nick'], 'punti' => (int)$r['punti'], 'personaggio' => $r['personaggio'],
              'livello' => $r['livello'], 'tempo' => (int)$r['tempo_s'], 'data' => substr($r['creato'], 0, 10)];
}
header('Cache-Control: public, max-age=15');
rispondi(200, ['classifica' => $out]);
