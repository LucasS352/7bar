import { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoBalloonProps {
  title: string;
  description: string;
  formula?: string;
  align?: 'left' | 'right' | 'center';
}

export function InfoBalloon({
  title,
  description,
  formula,
  align = 'right',
}: InfoBalloonProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const isOpen = pinned || hovered;

  useEffect(() => {
    if (!pinned) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPinned(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [pinned]);

  const positionClass =
    align === 'left'
      ? 'left-0'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'right-0';

  const arrowPositionClass =
    align === 'left'
      ? 'left-2.5'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'right-2.5';

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={`Explicação sobre ${title}`}
        aria-expanded={pinned}
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setPinned((prev) => !prev);
        }}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition cursor-pointer ${
          isOpen
            ? 'text-blue-300 bg-blue-500/20 ring-1 ring-blue-400/40'
            : 'text-zinc-500 hover:text-blue-300 hover:bg-zinc-800/80'
        }`}
      >
        <HelpCircle size={13.5} />
      </button>

      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute bottom-full mb-2.5 ${positionClass} w-56 sm:w-72 p-3 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-zinc-700/90 shadow-2xl shadow-black/70 text-left z-50 pointer-events-auto`}
        >
          <p className="text-xs font-bold text-blue-300 mb-1">{title}</p>
          <p className="text-[11.5px] leading-relaxed text-zinc-200">{description}</p>
          {formula && (
            <p className="mt-2 pt-1.5 border-t border-zinc-800 text-[10.5px] font-mono text-zinc-400">
              {formula}
            </p>
          )}
          <span
            aria-hidden="true"
            className={`absolute top-full -mt-px ${arrowPositionClass} w-2.5 h-2.5 rotate-45 bg-zinc-950 border-r border-b border-zinc-700/90`}
          />
        </div>
      )}
    </div>
  );
}
