<?php
// =============================================================================
// BUCA SLUG - classifica generale: funzioni comuni (database, risposte, limiti, validazioni).
// Questa cartella NON e' raggiungibile dal web: la includono solo i file in www/api/.
// =============================================================================
declare(strict_types=1);

const NICK_MIN = 3;
const NICK_MAX = 12;
const PUNTI_MAX = 400000;          // nessuna partita vera arriva vicino a questo valore
const PUNTI_AL_SECONDO_MAX = 1500; // piu' punti al secondo di cosi' non sono umani
const LIVELLI = ['strada', 'bucaneve', 'cantina', 'chiesa', 'finito'];
const MODI = ['completo', 'ultimo'];
// Parole rifiutate nei nickname (minuscole, si cerca la parola dentro il nickname). Aggiungetene pure.
const PAROLE_VIETATE = ['cazz', 'merd', 'stronz', 'troi', 'puttan', 'vaffa', 'nazi', 'hitler', 'porco', 'fuck', 'shit'];

/** Risposta JSON e fine. Niente dettagli tecnici verso l'esterno. */
function rispondi(int $codice, array $dati): never {
    http_response_code($codice);
    echo json_encode($dati, JSON_UNESCAPED_UNICODE);
    exit;
}
function errore(int $codice, string $sigla, string $messaggio): never {
    rispondi($codice, ['errore' => $sigla, 'messaggio' => $messaggio]);
}

/** Intestazioni di sicurezza e CORS. Il gioco gira su GitHub Pages (altro dominio): niente cookie e
 *  niente credenziali, l'autorizzazione e' il token nel corpo della richiesta, quindi '*' e' corretto. */
function intestazioni(array $metodi): void {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    header('Referrer-Policy: no-referrer');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: ' . implode(', ', array_merge($metodi, ['OPTIONS'])));
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($m === 'OPTIONS') { http_response_code(204); exit; }
    if (!in_array($m, $metodi, true)) errore(405, 'metodo', 'Metodo non permesso');
}

function config(string $chiave, ?string $predefinito = null): string {
    $v = getenv($chiave);
    if ($v === false || $v === '') {
        if ($predefinito === null) { error_log("bucaslug: manca la variabile $chiave"); errore(500, 'config', 'Servizio non configurato'); }
        return $predefinito;
    }
    return $v;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', config('DB_HOST'), config('DB_PORT', '3307'), config('DB_NAME', 'bucaslug'));
        $pdo = new PDO($dsn, config('DB_USER'), config('DB_PASS'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
        ]);
    } catch (Throwable $e) {
        error_log('bucaslug: database non raggiungibile: ' . $e->getMessage());
        errore(503, 'db', 'Classifica momentaneamente non disponibile');
    }
    return $pdo;
}

/** Corpo JSON della richiesta, al massimo 2 KB. */
function corpo(): array {
    $raw = file_get_contents('php://input', false, null, 0, 2049);
    if ($raw === false || strlen($raw) > 2048) errore(413, 'troppo', 'Richiesta troppo grande');
    $d = json_decode($raw, true);
    if (!is_array($d)) errore(400, 'json', 'Richiesta non valida');
    return $d;
}

/** IP del visitatore. Dietro il reverse proxy di DSM l'indirizzo diretto e' quello del proxy (privato):
 *  solo in quel caso ci si fida di X-Real-IP / X-Forwarded-For. Si salva solo un'impronta (SHA-256 con
 *  un segreto), mai l'indirizzo in chiaro. */
function impronta_ip(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $privato = !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    if ($privato) {
        $vero = $_SERVER['HTTP_X_REAL_IP'] ?? '';
        if (!$vero && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $lista = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']));
            $vero = end($lista);
        }
        if (filter_var($vero, FILTER_VALIDATE_IP)) $ip = $vero;
    }
    return hash_hmac('sha256', $ip, config('PEPE'));
}

/** Limite di richieste: al massimo $max azioni di quel tipo nella finestra di $secondi, per chiave. */
function limita(string $chiave, string $azione, int $max, int $secondi): void {
    $pdo = db();
    if (random_int(1, 50) === 1) $pdo->exec("DELETE FROM limiti WHERE t < NOW() - INTERVAL 1 DAY");
    $q = $pdo->prepare('SELECT COUNT(*) FROM limiti WHERE chiave = ? AND azione = ? AND t > NOW() - INTERVAL ? SECOND');
    $q->execute([$chiave, $azione, $secondi]);
    if ((int)$q->fetchColumn() >= $max) errore(429, 'limite', 'Troppe richieste, riprova tra poco');
    $pdo->prepare('INSERT INTO limiti (chiave, azione, t) VALUES (?, ?, NOW())')->execute([$chiave, $azione]);
}

/** Nickname: maiuscolo, 3-12 caratteri tra A-Z 0-9 _ - . (quelli che il font del gioco sa scrivere). */
function nick_valido(mixed $n): string {
    if (!is_string($n)) errore(400, 'nick', 'Nickname mancante');
    $n = strtoupper(trim($n));
    if (!preg_match('/^[A-Z0-9_.\-]{' . NICK_MIN . ',' . NICK_MAX . '}$/', $n)) errore(400, 'nick', 'Nickname: da 3 a 12 tra lettere, numeri e _ - .');
    $basso = strtolower(str_replace(['0', '1', '3', '4', '5', '_', '-', '.'], ['o', 'i', 'e', 'a', 's', '', '', ''], $n));
    foreach (PAROLE_VIETATE as $p) if (str_contains($basso, $p)) errore(400, 'nick', 'Nickname non ammesso');
    return $n;
}

/** Giocatore dal nickname + token (il token e' quello rilasciato alla registrazione). */
function autentica(mixed $nick, mixed $token): array {
    $nick = nick_valido($nick);
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) errore(401, 'token', 'Nickname non registrato su questo dispositivo');
    $q = db()->prepare('SELECT id, nick, token_hash FROM giocatori WHERE nick = ?');
    $q->execute([$nick]);
    $g = $q->fetch();
    if (!$g || !hash_equals($g['token_hash'], hash('sha256', $token))) errore(401, 'token', 'Nickname non registrato su questo dispositivo');
    return $g;
}

function intero(mixed $v, int $min, int $max, string $nome): int {
    if (!is_int($v) && !(is_string($v) && ctype_digit($v))) errore(400, $nome, "Valore non valido: $nome");
    $v = (int)$v;
    if ($v < $min || $v > $max) errore(400, $nome, "Valore fuori intervallo: $nome");
    return $v;
}
