import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronRight, MessageCircle } from 'lucide-react';
import { useDemoGuideStore, GUIDE_DIALOGUES, type GuideContext } from '@/store/demoGuide';
import { useDemoMissionsStore } from '@/store/demoMissions';
import { useCartStore } from '@/store/cart';

const CAPITAO_IMG = '/demo/capitao-gelada.jpg';

/**
 * Determina o contexto atual baseado na rota e estado da aplicação.
 */
function useCurrentContext(): GuideContext {
  const location = useLocation();
  const cartItems = useCartStore(s => s.items);
  const { isAllCompleted } = useDemoMissionsStore(s => s.getProgress());

  if (isAllCompleted) return 'missions_complete';

  const path = location.pathname;

  if (path.startsWith('/dashboard/inventory') || path.startsWith('/dashboard/estoque')) {
    return 'inventory';
  }
  if (path.startsWith('/dashboard')) {
    return 'dashboard';
  }
  // POS page (root)
  if (path === '/' || path === '') {
    if (cartItems.length > 0) return 'pos_has_items';
    return 'pos_empty_cart';
  }

  return 'welcome';
}

export function CapitaoGelada() {
  const context = useCurrentContext();
  const {
    isVisible,
    isDismissed,
    currentTipId,
    showTipForContext,
    advanceTip,
    dismissGuide,
    showGuide,
  } = useDemoGuideStore();

  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const prevContextRef = useRef<GuideContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTip = currentTipId ? GUIDE_DIALOGUES.find(t => t.id === currentTipId) : null;

  // Track context changes → show relevant tip
  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE !== 'demo') return;
    if (isDismissed) return;

    // Only trigger on context change or first load
    if (prevContextRef.current !== context) {
      prevContextRef.current = context;

      // Small delay for smooth context switch
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        showTipForContext(context);
        setIsBubbleVisible(true);
      }, 800);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [context, isDismissed, showTipForContext]);

  // Entry animation
  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE !== 'demo') return;

    const t = setTimeout(() => setIsAnimatingIn(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Auto-show bubble when tip changes
  useEffect(() => {
    if (currentTipId) {
      setIsBubbleVisible(true);
    }
  }, [currentTipId]);

  if (import.meta.env.VITE_APP_MODE !== 'demo') return null;

  // Check if there's a next tip in current context
  const hasNextTip = (() => {
    if (!currentTip) return false;
    const ctxTips = GUIDE_DIALOGUES.filter(t => t.context === currentTip.context);
    const idx = ctxTips.findIndex(t => t.id === currentTipId);
    return idx < ctxTips.length - 1;
  })();

  // ── Minimized floating button (when dismissed) ──
  if (isDismissed) {
    return (
      <button
        onClick={() => {
          showGuide();
          showTipForContext(context);
        }}
        className="fixed bottom-6 right-6 z-[9999] group cursor-pointer"
        title="Chamar o Capitão Gelada"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] group-hover:border-amber-400">
            <img
              src={CAPITAO_IMG}
              alt="Capitão Gelada"
              className="w-full h-full object-cover object-top"
            />
          </div>
          {/* Notification dot */}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-[#0b0f1a] animate-pulse" />
        </div>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 transition-all duration-700 ${
        isAnimatingIn ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      {/* ── Speech Bubble ── */}
      {isBubbleVisible && currentTip && (
        <div
          className="relative max-w-[320px] sm:max-w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Bubble card */}
          <div className="bg-[#111827]/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl rounded-br-md shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-4">
            {/* Close bubble button */}
            <button
              onClick={() => setIsBubbleVisible(false)}
              className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800 cursor-pointer"
              title="Fechar dica"
            >
              <X size={14} />
            </button>

            {/* Tip content */}
            <div className="pr-6">
              <p className="text-sm text-zinc-100 leading-relaxed font-medium">
                {currentTip.emoji && <span className="mr-1.5">{currentTip.emoji}</span>}
                {currentTip.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/80">
              <button
                onClick={dismissGuide}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Não mostrar mais
              </button>

              {hasNextTip ? (
                <button
                  onClick={advanceTip}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Próxima dica
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    advanceTip();
                    setIsBubbleVisible(false);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Entendi!
                </button>
              )}
            </div>
          </div>

          {/* Triangle pointer to avatar */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[#111827]/95 border-r border-b border-zinc-700/60 rotate-45" />
        </div>
      )}

      {/* ── Captain Avatar ── */}
      <button
        onClick={() => {
          if (isBubbleVisible) {
            setIsBubbleVisible(false);
          } else {
            showTipForContext(context);
            setIsBubbleVisible(true);
          }
        }}
        className="group relative cursor-pointer"
        title="Capitão Gelada — Seu guia no PDV"
      >
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/30 blur-lg group-hover:blur-xl transition-all scale-110 animate-pulse" />

        {/* Avatar container */}
        <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden border-[3px] border-amber-400/70 shadow-[0_4px_25px_rgba(251,191,36,0.35)] group-hover:shadow-[0_4px_35px_rgba(251,191,36,0.55)] transition-all group-hover:scale-105 group-hover:border-amber-400">
          <img
            src={CAPITAO_IMG}
            alt="Capitão Gelada"
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
        </div>

        {/* Name badge */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg tracking-wider uppercase">
          Cap. Gelada
        </div>

        {/* Pulse ping when bubble is hidden */}
        {!isBubbleVisible && (
          <span className="absolute top-0 right-0 w-4 h-4">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-[#0b0f1a] items-center justify-center">
              <MessageCircle size={8} className="text-white" />
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
