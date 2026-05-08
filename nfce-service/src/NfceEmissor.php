<?php
declare(strict_types=1);

namespace App;

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;

/**
 * NfceEmissor — Encapsula toda a lógica de montagem e envio da NFC-e via sped-nfe.
 *
 * Referências:
 *  - SEFAZ-SP Nota Técnica NFC-e
 *  - nfephp-org/sped-nfe (https://github.com/nfephp-org/sped-nfe)
 *  - Tabela CSOSN (Simples Nacional)
 *  - Tabela tPag SEFAZ (5.4)
 */
class NfceEmissor
{
    public function emitir(array $payload): array
    {
        $empresa = $payload['empresa'];
        $nota    = $payload['nota'];
        $certB64 = $payload['certPfxBase64']  ?? '';
        $senha   = $payload['certSenha']       ?? '';
        $amb     = (int) ($empresa['ambiente'] ?? 2); // 1=Prod, 2=Homo

        // ── Proteção: nunca emitir em produção se não houver certificado ──────
        if ($amb === 1 && empty($certB64)) {
            throw new \RuntimeException('Certificado obrigatório para ambiente de produção.');
        }

        // ── Configuração do sped-nfe ──────────────────────────────────────────
        $config = $this->buildConfig($empresa, $amb);
        $certPfx = base64_decode($certB64);

        $certificate = Certificate::readPfx($certPfx, $senha);
        $tools = new Tools($config, $certificate);
        $tools->model(65); // NFC-e

        // ── Montagem do XML ───────────────────────────────────────────────────
        $make = new Make();
        $this->montarInfNFe($make, $empresa, $nota, $amb);

        $xml = $make->getXML();

        // ── Assinar ───────────────────────────────────────────────────────────
        $xmlAssinado = $tools->signNFe($xml);

        // ── Enviar à SEFAZ (indSinc = 1 para envio síncrono, exigido para lote de 1 nota) ──
        $response = $tools->sefazEnviaLote([$xmlAssinado], (string) $nota['numero'], 1);
        $responseArr = $this->parseResponse($response);

        // ── Processar retorno ─────────────────────────────────────────────────
        if (($responseArr['cStat'] ?? '') === '104' || ($responseArr['cStat'] ?? '') === '100') {
            $chave = $responseArr['chNFe'] ?? '';
            $nProt = $responseArr['nProt'] ?? '';
            
            // Monta o XML autorizado anexando o protocolo ao XML assinado
            try {
                $xmlAutorizado = \NFePHP\NFe\Complements::toAuthorize($xmlAssinado, $response);
            } catch (\Exception $e) {
                // Fallback se falhar
                $xmlAutorizado = $xmlAssinado;
            }

            // Gerar QR Code (URL SEFAZ-SP NFC-e)
            $qrcode = $this->gerarQrCodeUrl($make, $empresa, $nota, $nProt, $amb);

            return [
                'status'     => 'autorizada',
                'chave'      => $chave,
                'protocolo'  => $nProt,
                'numero'     => (int) $nota['numero'],
                'xml'        => $xmlAutorizado,
                'qrcode'     => $qrcode,
            ];
        }

        // Rejeitada
        return [
            'status'          => 'rejeitada',
            'codRejeicao'     => $responseArr['cStat']  ?? '999',
            'motivoRejeicao'  => $responseArr['xMotivo'] ?? 'Rejeição desconhecida',
        ];
    }

    // ─── Configuração JSON para o sped-nfe ──────────────────────────────────
    private function buildConfig(array $empresa, int $amb): string
    {
        return json_encode([
            "atualizacao"   => date('Y-m-d H:i:s'),
            "tpAmb"         => $amb,
            "razaosocial"   => $empresa['razaoSocial']  ?? '',
            "cnpj"          => preg_replace('/\D/', '', $empresa['cnpj'] ?? ''),
            "siglaUF"       => $empresa['endereco']['uf'] ?? 'SP',
            "schemes"       => "PL_009_V4",
            "versao"        => "4.00",
            "tokenIBPT"     => "",
            "CSC"           => $empresa['csc']   ?? '',
            "CSCid"         => $empresa['idCsc'] ?? '',
        ]);
    }

    // ─── Montagem dos elementos do XML NFC-e ──────────────────────────────────
    private function montarInfNFe(Make $make, array $empresa, array $nota, int $amb): void
    {
        $end = $empresa['endereco'];
        $numero = (int) $nota['numero'];
        $serie  = (int) ($empresa['serie'] ?? 1);
        $crt    = (int) ($empresa['crt']   ?? 1);
        $cnpj   = preg_replace('/\D/', '', $empresa['cnpj'] ?? '');

        // INFNFE
        $make->taginfNFe((object) [
            'versao' => '4.00',
            'Id'     => '',
            'pk_nItem' => null,
        ]);

        $cMun = $end['codMunicipio'] ?? '3506003';
        $cUF = substr($cMun, 0, 2);

        // IDE
        $ide = $make->tagide((object) [
            'cUF'     => $cUF,
            'cNF'     => str_pad((string) rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
            'natOp'   => 'VENDA A CONSUMIDOR',
            'mod'     => '65',  // NFC-e
            'serie'   => $serie,
            'nNF'     => $numero,
            'dhEmi'   => date('Y-m-d\TH:i:sP'),
            'tpNF'    => '1',   // Saída
            'idDest'  => '1',   // Operação interna
            'cMunFG'  => $end['codMunicipio'] ?? '3506003',
            'tpImp'   => '4',   // DANFE NFC-e (4)
            'tpEmis'  => $nota['tpEmis'] ?? '1',
            'cDV'     => '0',
            'tpAmb'   => $amb,
            'finNFe'  => '1',
            'indFinal'=> '1',   // Consumidor final
            'indPres' => '1',   // Operação presencial
            'procEmi' => '0',
            'verProc' => '7bar-1.0',
        ]);

        // EMIT (Emitente)
        $make->tagemit((object) [
            'CNPJ'     => $cnpj,
            'xNome'    => $empresa['razaoSocial']  ?? '',
            'xFant'    => $empresa['nomeFantasia'] ?? '',
            'IE'       => preg_replace('/\D/', '', $empresa['ie'] ?? ''),
            'CRT'      => $crt,
        ]);

        $make->tagenderEmit((object) [
            'xLgr'    => $end['logradouro']   ?? '',
            'nro'     => $end['numero']        ?? 'S/N',
            'xBairro' => $end['bairro']        ?? '',
            'cMun'    => $end['codMunicipio']  ?? '3506003',
            'xMun'    => $end['municipio']     ?? '',
            'UF'      => $end['uf']            ?? 'SP',
            'CEP'     => preg_replace('/\D/', '', $end['cep'] ?? ''),
            'cPais'   => '1058',
            'xPais'   => 'Brasil',
            'fone'    => preg_replace('/\D/', '', $end['telefone'] ?? ''),
        ]);

        // DEST (Consumidor — anônimo por padrão em NFC-e)
        $cpf = $nota['consumidor']['cpf'] ?? '';
        if ($cpf) {
            $make->tagdest((object) [
                'CPF'     => preg_replace('/\D/', '', $cpf),
                'xNome'   => $nota['consumidor']['nome'] ?? 'CONSUMIDOR',
                'indIEDest' => '9',
            ]);
        }

        // ITENS
        $totalProd = 0;
        foreach ($nota['itens'] as $idx => $item) {
            $itemNum = $idx + 1;
            $subtotal = round((float) $item['quantidade'] * (float) $item['valorUnit'], 2);
            $totalProd += $subtotal;

            $make->tagprod((object) [
                'item'     => $itemNum,
                'cProd'    => $item['produtoId'] ?? "PROD{$itemNum}",
                'cEAN'     => 'SEM GTIN',
                'xProd'    => mb_substr($item['xProd'], 0, 120),
                'NCM'      => preg_replace('/\D/', '', $item['ncm'] ?? '22030000'),
                'CEST'     => $item['cest'] ?? null,
                'CFOP'     => $item['cfop'] ?? '5102',
                'uCom'     => $item['unit'] ?? 'UN',
                'qCom'     => number_format((float) $item['quantidade'], 4, '.', ''),
                'vUnCom'   => number_format((float) $item['valorUnit'], 4, '.', ''),
                'vProd'    => number_format($subtotal, 2, '.', ''),
                'cEANTrib' => 'SEM GTIN',
                'uTrib'    => $item['unit'] ?? 'UN',
                'qTrib'    => number_format((float) $item['quantidade'], 4, '.', ''),
                'vUnTrib'  => number_format((float) $item['valorUnit'], 4, '.', ''),
                'indTot'   => '1',
            ]);

            // Imposto — ICMS (Simples Nacional)
            if ($crt === 1 || $crt === 2) {
                $make->tagICMSSN((object) [
                    'item'  => $itemNum,
                    'orig'  => (string) ($item['origem'] ?? '0'),
                    'CSOSN' => $item['csosn'] ?? '102',
                ]);
            } else {
                // Regime Normal
                $make->tagICMS((object) [
                    'item'  => $itemNum,
                    'orig'  => (string) ($item['origem'] ?? '0'),
                    'CST'   => $item['cstIcms'] ?? '00',
                    'modBC' => '3',
                    'vBC'   => number_format($subtotal, 2, '.', ''),
                    'pICMS' => number_format((float) ($item['aliqIcms'] ?? 0), 2, '.', ''),
                    'vICMS' => number_format($subtotal * ($item['aliqIcms'] ?? 0) / 100, 2, '.', ''),
                ]);
            }

            // PIS
            $make->tagPIS((object) [
                'item'  => $itemNum,
                'CST'   => $item['cstPis'] ?? '99',
                'vBC'   => '0.00', 'pPIS' => '0.00', 'vPIS' => '0.00',
            ]);

            // COFINS
            $make->tagCOFINS((object) [
                'item'  => $itemNum,
                'CST'   => $item['cstCofins'] ?? '99',
                'vBC'   => '0.00', 'pCOFINS' => '0.00', 'vCOFINS' => '0.00',
            ]);
        }

        // TOTAL
        $totalDesc = (float) ($nota['desconto'] ?? 0);
        $totalNota = round($totalProd - $totalDesc, 2);

        $make->tagICMSTot((object) [
            'vBC' => '0.00', 'vICMS' => '0.00', 'vICMSDeson' => '0.00',
            'vFCP' => '0.00', 'vBCST' => '0.00', 'vST' => '0.00', 'vFCPST' => '0.00',
            'vFCPSTRet' => '0.00', 'vProd' => number_format($totalProd, 2, '.', ''),
            'vFrete' => '0.00', 'vSeg' => '0.00', 'vDesc' => number_format($totalDesc, 2, '.', ''),
            'vII' => '0.00', 'vIPI' => '0.00', 'vIPIDevol' => '0.00',
            'vPIS' => '0.00', 'vCOFINS' => '0.00', 'vOutro' => '0.00',
            'vNF' => number_format($totalNota, 2, '.', ''),
        ]);

        // TRANSPORTE (sem frete — venda balcão)
        $make->tagtransp((object) ['modFrete' => '9']);

        // PAGAMENTOS
        $totalPago = 0;
        foreach ($nota['pagamentos'] as $pag) {
            $vPag = (float) $pag['valor'];
            $totalPago += $vPag;
            
            $detPag = [
                'tPag' => $pag['tPag'],
                'vPag' => number_format($vPag, 2, '.', ''),
            ];

            // SEFAZ exige grupo de cartões para Crédito (03) e Débito (04)
            // tpIntegra = 2 significa "Pagamento não integrado com o sistema de automação (POS)"
            if (in_array($pag['tPag'], ['03', '04'], true)) {
                $detPag['tpIntegra'] = 2; // NFePHP construirá a tag <card> automaticamente
            }

            $make->tagdetPag((object) $detPag);
        }

        // Troco
        $troco = max(0, $totalPago - $totalNota);
        $make->tagpag((object) ['vTroco' => number_format($troco, 2, '.', '')]);

        // INFORMAÇÕES ADICIONAIS (obrigatório Simples Nacional)
        if ($crt === 1) {
            $make->taginfAdic((object) ['infCpl' => 'Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de ICMS, de ISS e de IPI.']);
        }
    }

    private function gerarQrCodeUrl(Make $make, array $empresa, array $nota, string $nProt, int $amb): string
    {
        // A URL do QR Code NFC-e é gerada pela biblioteca sped-nfe automaticamente
        // via $make->getQRCode() após a assinatura — aqui retornamos a URL base SEFAZ-SP
        $base = $amb === 1
            ? 'https://www.nfce.fazenda.sp.gov.br/consulta'
            : 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta';

        return $base . '?chNFe=' . ($nota['chave'] ?? '');
    }

    private function parseResponse(string $response): array
    {
        // Extrai o conteúdo relevante (retEnviNFe) ignorando o envelope SOAP
        if (preg_match('/<retEnviNFe[^>]*>(.*?)<\/retEnviNFe>/s', $response, $matches)) {
            $innerXml = '<retEnviNFe>' . $matches[1] . '</retEnviNFe>';
            $xml = simplexml_load_string($innerXml);
        } else {
            $xml = simplexml_load_string($response);
        }

        if ($xml === false) {
            $snippet = mb_substr(strip_tags($response), 0, 150);
            return ['cStat' => '999', 'xMotivo' => 'Resposta inválida da SEFAZ. Detalhe: ' . ($snippet ?: 'Vazio')];
        }

        // Se houver protNFe, o verdadeiro status da nota está dentro de infProt
        if (isset($xml->protNFe->infProt)) {
            $cStat = (string) $xml->protNFe->infProt->cStat;
            $xMotivo = (string) $xml->protNFe->infProt->xMotivo;
            $chNFe = (string) $xml->protNFe->infProt->chNFe;
            $nProt = (string) $xml->protNFe->infProt->nProt;
        } else {
            // Caso de erro no lote
            $cStat = (string) ($xml->cStat ?? '999');
            $xMotivo = (string) ($xml->xMotivo ?? 'Erro desconhecido');
            $chNFe = '';
            $nProt = '';
        }

        return [
            'cStat'  => $cStat,
            'xMotivo' => $xMotivo,
            'chNFe'   => $chNFe,
            'nProt'   => $nProt,
        ];
    }

    private function parseProtocolo(string $consulta): array
    {
        $xml = simplexml_load_string($consulta);
        if (!$xml) return ['nProt' => ''];

        return [
            'nProt' => (string) ($xml->protNFe->infProt->nProt ?? ''),
            'cStat' => (string) ($xml->protNFe->infProt->cStat ?? ''),
        ];
    }
}
