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
  // Já é URL absoluta (ex: http://...) — retorna como está
  if (url.startsWith('http')) return url;
  // Caminho relativo: constrói URL absoluta usando a base do backend
  const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3520/api';
  const base = apiBase.replace(/\/api$/, '');
  return base + url;
}
