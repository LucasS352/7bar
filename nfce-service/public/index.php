<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();
$app->addBodyParsingMiddleware();

// ─── Helper: Resposta JSON ─────────────────────────────────────────────────────
$jsonResponse = function (Response $res, array $data, int $status = 200): Response {
    $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
    return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
};

// ─── Middleware: Log de CorrelationId ──────────────────────────────────────────
$app->add(function (Request $req, $handler) {
    $correlationId = $req->getHeaderLine('X-Correlation-ID') ?: ('php_' . uniqid());
    error_log("[{$correlationId}] {$req->getMethod()} {$req->getUri()->getPath()}");
    return $handler->handle($req);
});

// ─── Middleware: Autenticação interna (X-Internal-Secret) ─────────────────────
$app->add(function (Request $req, $handler) use ($jsonResponse, $app) {
    if ($req->getUri()->getPath() !== '/status') {
        $expectedSecret = getenv('NFCE_INTERNAL_SECRET') ?: '';
        if ($expectedSecret !== '') {
            $provided = $req->getHeaderLine('X-Internal-Secret');
            if (!hash_equals($expectedSecret, $provided)) {
                $res = $app->getResponseFactory()->createResponse();
                return $jsonResponse($res, ['status' => 'erro', 'mensagem' => 'Acesso não autorizado.'], 401);
            }
        }
    }
    return $handler->handle($req);
});

$debug = getenv('APP_DEBUG') === 'true';
$app->addErrorMiddleware($debug, true, true);

// ─── GET /status — Health Check ───────────────────────────────────────────────
$app->get('/status', function (Request $req, Response $res) use ($jsonResponse) {
    return $jsonResponse($res, [
        'status'  => 'online',
        'service' => '7bar-nfce',
        'time'    => date('c'),
    ]);
});

// ─── POST /emitir — Emissão de NFC-e ─────────────────────────────────────────
$app->post('/emitir', function (Request $req, Response $res) use ($jsonResponse) {
    $body = $req->getParsedBody();
    try {
        $service   = new \App\NfceEmissor();
        $resultado = $service->emitir($body);
        return $jsonResponse($res, $resultado);
    } catch (\Throwable $e) {
        error_log('[NfceEmissor] Erro: ' . $e->getMessage());
        return $jsonResponse($res, ['status' => 'erro', 'motivoRejeicao' => $e->getMessage()], 500);
    }
});

// ─── POST /cancelar — Cancelamento de NFC-e ───────────────────────────────────
$app->post('/cancelar', function (Request $req, Response $res) use ($jsonResponse) {
    $body = $req->getParsedBody();
    try {
        $service   = new \App\NfceCancelador();
        $resultado = $service->cancelar($body);
        return $jsonResponse($res, $resultado);
    } catch (\InvalidArgumentException $e) {
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 400);
    } catch (\Throwable $e) {
        error_log('[NfceCancelador] Erro: ' . $e->getMessage());
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 500);
    }
});

// ─── POST /consultar-status — Consulta status de NFC-e ───────────────────────
$app->post('/consultar-status', function (Request $req, Response $res) use ($jsonResponse) {
    $body = $req->getParsedBody();
    try {
        $service   = new \App\NfceConsultor();
        $resultado = $service->consultarStatus($body);
        return $jsonResponse($res, $resultado);
    } catch (\InvalidArgumentException $e) {
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 400);
    } catch (\Throwable $e) {
        error_log('[NfceConsultor] Erro: ' . $e->getMessage());
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 500);
    }
});

// ─── POST /distribuicao-dfe — Busca NF-es destinadas ao CNPJ (DF-e) ───────────
$app->post('/distribuicao-dfe', function (Request $req, Response $res) use ($jsonResponse) {
    $body = $req->getParsedBody();
    $body['correlationId'] = $req->getHeaderLine('X-Correlation-ID') ?: null;
    try {
        $service   = new \App\NfceDistribuidor();
        $resultado = $service->consultarNsU($body);
        return $jsonResponse($res, $resultado);
    } catch (\Throwable $e) {
        error_log('[NfceDistribuidor] Erro DF-e: ' . $e->getMessage());
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 500);
    }
});

// Alias para o endpoint esperado pelo NestJS
$app->post('/nfe/distribuicao/nsu', function (Request $req, Response $res) use ($jsonResponse) {
    $body = $req->getParsedBody();
    $body['correlationId'] = $req->getHeaderLine('X-Correlation-ID') ?: null;
    try {
        $service   = new \App\NfceDistribuidor();
        $resultado = $service->consultarNsU($body);
        return $jsonResponse($res, $resultado);
    } catch (\Throwable $e) {
        error_log('[NfceDistribuidor] Erro DF-e (nsu): ' . $e->getMessage());
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 500);
    }
});

// ─── POST /download-xml — Baixa XML de NF-e pelo chave de acesso ─────────────
$app->post('/download-xml', function (Request $req, Response $res) use ($jsonResponse) {
    $body = $req->getParsedBody();
    try {
        $service   = new \App\NfceDistribuidor();
        $resultado = $service->downloadXml($body);
        return $jsonResponse($res, $resultado);
    } catch (\InvalidArgumentException $e) {
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 400);
    } catch (\Throwable $e) {
        error_log('[NfceDistribuidor] Erro Download: ' . $e->getMessage());
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 500);
    }
});

// ─── POST /gerar-danfe — Gera PDF do DANFE de uma NF-e ───────────────────────
$app->post('/gerar-danfe', function (Request $req, Response $res) use ($jsonResponse) {
    $body = $req->getParsedBody();
    try {
        $service   = new \App\DanfeGenerator();
        $resultado = $service->gerar($body);
        return $jsonResponse($res, $resultado);
    } catch (\InvalidArgumentException $e) {
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 400);
    } catch (\Throwable $e) {
        error_log('[DanfeGenerator] Erro: ' . $e->getMessage());
        return $jsonResponse($res, ['status' => 'erro', 'mensagem' => $e->getMessage()], 500);
    }
});

$app->run();
