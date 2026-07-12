import { useEffect, useRef, useState, memo } from 'react';

/**
 * Componente de imagem otimizado para o PDV:
 * - Usa Intersection Observer para carregar imagens APENAS quando entram na tela
 * - Cache via Map global para não recarregar imagens já vistas na mesma sessão
 * - Mostra placeholder de baixa qualidade (skeleton) enquanto carrega
 * - Evita múltiplas requisições para a mesma imagem
 */

// Cache de URLs já carregadas na sessão (evita re-requisição ao voltar da busca)
const loadedImages = new Set<string>();

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const LazyImage = memo(({ src, alt, className }: LazyImageProps) => {
  const [loaded, setLoaded] = useState(() => loadedImages.has(src));
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(() => loadedImages.has(src));
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadedImages.has(src)) {
      setInView(true);
      setLoaded(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Começa a carregar 100px antes de entrar na tela
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  const handleLoad = () => {
    loadedImages.add(src);
    setLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setLoaded(true);
  };

  if (error) return null;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Skeleton enquanto não carregou */}
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse rounded-lg" />
      )}
      {inView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
          decoding="async"
          fetchPriority="low"
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
