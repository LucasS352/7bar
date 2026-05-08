<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addErrorMiddleware(true, true, true);

// ─── GET /status — Health Check ───────────────────────────────────────────────
$app->get('/status', function (Request $req, Response $res) {
    $res->getBody()->write(json_encode([
        'status'  => 'online',
        'service' => '7bar NFC-e PHP Service',
        'version' => '1.0.0',
        'php'     => PHP_VERSION,
        'time'    => date('c'),
    ]));
    return $res->withHeader('Content-Type', 'application/json');
});

// ─── POST /emitir — Emissão de NFC-e ─────────────────────────────────────────
$app->post('/emitir', function (Request $req, Response $res) {
    $body = $req->getParsedBody();
    
    try {
        $service = new \App\NfceEmissor();
        $resultado = $service->emitir($body);

        $res->getBody()->write(json_encode($resultado));
        return $res->withHeader('Content-Type', 'application/json');
    } catch (\Throwable $e) {
        $res->getBody()->write(json_encode([
            'status'          => 'erro',
            'motivoRejeicao'  => $e->getMessage(),
        ]));
        return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
});

$app->run();
