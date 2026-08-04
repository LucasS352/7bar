import { useState, useEffect } from 'react';
import { X, ChevronRight, Sparkles, Snowflake, Volume2 } from 'lucide-react';
import { ColdFogCanvas } from './ColdFogCanvas';

const CAPITAO_IMG = '/demo/capitao-gelada.jpg';

export interface CapitaoGeladaCartGuideProps {
  /** Se o guia está ativo e visível */
  isVisible?: boolean;
  /** Texto dinâmico exibido no balão de fala */
  dialogueText?: string;
  /** Emoji opcional de destaque */
  emoji?: string;
  /** Tag/Título opcional no topo do balão */
  titleTag?: string;
  /** Callback para avançar a conversa */
  onNext?: () => void;
  /** Callback para fechar/ocultar o guia */
  onDismiss?: () => void;
  /** Se possui próxima fala na sequência */
  hasNext?: boolean;
  /** Rótulo do botão principal */
  actionLabel?: string;
}

export function CapitaoGeladaCartGuide({
  isVisible = true,
  dialogueText = 'Ahoy! Adicione um produto ao carrinho ou pressione F12 para finalizar a venda!',
  emoji = '🍺',
  titleTag = 'CAPITÃO GELADA',
  onNext,
  onDismiss,
  hasNext = true,
  actionLabel,
}: CapitaoGeladaCartGuideProps) {
  const [stepState, setStepState] = useState<'emerging' | 'idle' | 'closed'>('emerging');
  const [showFog, setShowFog] = useState(true);

  // Trigger step-out animation on mount / visibility change
  useEffect(() => {
    if (!isVisible) {
      setStepState('closed');
      return;
    }

    setStepState('emerging');
    setShowFog(true);

    // After 900ms step-out transition, settle into idle breathing
    const timer = setTimeout(() => {
      setStepState('idle');
    }, 900);

    // Fade intense fog down after 3 seconds, keep light mist
    const fogTimer = setTimeout(() => {
      // Keep light fog
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(fogTimer);
    };
  }, [isVisible]);

  if (!isVisible || stepState === 'closed') return null;

  return (
    <div className="relative w-full pointer-events-none z-30 select-none">
      {/* ── VFX: Cold Fog / Ice Smoke Canvas ── */}
      <ColdFogCanvas active={showFog} intensity={stepState === 'emerging' ? 'high' : 'medium'} />

      {/* ── Frost Door-Opening Border Flash ── */}
      <div
        className={`absolute inset-0 pointer-events-none border-2 border-cyan-400/40 rounded-3xl transition-all duration-1000 ${
          stepState === 'emerging' ? 'shadow-[0_0_50px_rgba(56,189,248,0.4)] opacity-100' : 'opacity-20'
        }`}
      />

      {/* ── Main Character & Speech Container ── */}
      <div className="relative flex flex-col items-center sm:items-end p-4 pt-2">
        
        {/* ── Frosted Glass Speech Bubble ── */}
        <div
          className={`pointer-events-auto max-w-[340px] mb-3 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            stepState === 'emerging'
              ? 'translate-y-4 opacity-0 scale-90'
              : 'translate-y-0 opacity-100 scale-100'
          }`}
        >
          <div className="relative bg-[#090e1a]/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl rounded-br-sm p-4 shadow-[0_8px_32px_rgba(0,0,0,0.8)] shadow-cyan-500/10">
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400">
                <Snowflake size={12} className="animate-spin text-cyan-300" style={{ animationDuration: '8s' }} />
                <span>{titleTag}</span>
              </div>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dynamic Text */}
            <p className="text-xs sm:text-sm text-zinc-100 font-medium leading-relaxed">
              {emoji && <span className="mr-1.5 text-base">{emoji}</span>}
              {dialogueText}
            </p>

            {/* Actions Bar */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/80 text-xs">
              <span className="text-[10px] font-mono text-cyan-400/70 flex items-center gap-1">
                <Sparkles size={10} /> 7Bar Demo Guide
              </span>

              {onNext && (
                <button
                  onClick={onNext}
                  className="flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  {actionLabel || (hasNext ? 'Próxima Dica' : 'Entendi!')}
                  <ChevronRight size={14} />
                </button>
              )}
            </div>

            {/* Pointer Tail */}
            <div className="absolute -bottom-2 right-10 w-4 h-4 bg-[#090e1a]/95 border-r border-b border-cyan-500/40 rotate-45" />
          </div>
        </div>

        {/* ── 3D Mascot Character (Step Out + Idle Breathing) ── */}
        <div
          className={`pointer-events-auto relative group cursor-pointer transition-all duration-900 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            stepState === 'emerging'
              ? 'scale-50 translate-z-[-100px] opacity-0 rotate-y-30 translate-y-10'
              : 'scale-100 translate-z-0 opacity-100 rotate-y-0 translate-y-0'
          }`}
          onClick={onNext}
        >
          {/* Outer Frost Aura Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/30 via-blue-500/20 to-amber-400/30 blur-xl scale-125 group-hover:scale-140 transition-transform animate-pulse" />

          {/* Character Image Container with Floating Breath Effect */}
          <div
            className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-cyan-400/90 shadow-[0_0_35px_rgba(56,189,248,0.5)] group-hover:border-cyan-300 transition-all ${
              stepState === 'idle' ? 'animate-float' : ''
            }`}
          >
            <img
              src={CAPITAO_IMG}
              alt="Capitão Gelada"
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
              draggable={false}
            />
          </div>

          {/* Ice Badge */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 text-[9px] font-black text-white px-2.5 py-0.5 rounded-full shadow-lg border border-cyan-300/40 whitespace-nowrap tracking-wider uppercase">
            🧊 CAPITÃO GELADA
          </div>
        </div>

      </div>

      {/* Inline styles for custom floating keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
