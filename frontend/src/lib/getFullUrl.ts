/**
 * Converte um caminho relativo de imagem/upload para URL absoluta.
 * Necessário em Docker: o frontend (nginx:3521) e o backend (NestJS:3520)
 * são containers separados. Sem isso, o browser pede /api/... no frontend
 * e não encontra o arquivo.
 *
 * Equivalente ao getFullUrl() implementado na Haubitz.
 */
export function getFullUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  // Ao invés de tentar descobrir a VITE_API_URL, simplesmente retornamos o caminho relativo.
  // Como o frontend e backend rodam sob o mesmo domínio (ou via Nginx Proxy),
  // o browser vai buscar a imagem na mesma origem (ex: https://pdv.smartek.com.br/uploads/...)
  return url.startsWith('/') ? url : '/' + url;
}
