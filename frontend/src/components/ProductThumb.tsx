import { Package } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';
import { getFullUrl } from '@/lib/getFullUrl';

interface ProductThumbProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', { box: string; icon: string }> = {
  sm: { box: 'w-9 h-9 rounded-lg', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10 rounded-xl', icon: 'w-4 h-4' },
  lg: { box: 'w-12 h-12 rounded-xl', icon: 'w-5 h-5' },
};

/**
 * Miniatura de produto para tabelas e cards do módulo de Relatórios.
 * Usa LazyImage (IntersectionObserver) quando há URL válida e fallback discreto sem requisição extra quando vazio.
 */
export function ProductThumb({ src, alt, size = 'md', className = '' }: ProductThumbProps) {
  const { box, icon } = SIZE_CLASSES[size];
  const resolved = src && src.trim().length > 0 ? getFullUrl(src.trim()) : '';

  if (!resolved) {
    return (
      <div
        className={`${box} shrink-0 flex items-center justify-center bg-slate-900/90 border border-slate-800 text-slate-600 ${className}`}
        aria-hidden="true"
      >
        <Package className={icon} />
      </div>
    );
  }

  return (
    <div
      className={`${box} shrink-0 overflow-hidden bg-white/95 border border-slate-700/70 p-0.5 flex items-center justify-center shadow-sm ${className}`}
    >
      <LazyImage
        src={resolved}
        alt={alt}
        className="w-full h-full object-contain rounded-[6px]"
      />
    </div>
  );
}
