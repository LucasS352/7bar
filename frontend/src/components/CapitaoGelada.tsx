import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronRight, MessageCircle, Sparkles } from 'lucide-react';
import { useDemoGuideStore, GUIDE_DIALOGUES, type GuideContext } from '@/store/demoGuide';
import { useDemoMissionsStore } from '@/store/demoMissions';
import { useCartStore } from '@/store/cart';

const CAPITAO_IMG = '/demo/capitao-gelada.jpg';

/**
 * Determina o contexto atual baseado na rota, modais e estado da aplicação.
 */
function useCurrentContext(): GuideContext {
  const location = useLocation();
  const cartItemsCount = useCartStore((s) => s.items.length);
  const activeModal = useDemoGuideStore((s) => s.activeModal);
  
  // Modal active triggers highest priority context
  if (activeModal === 'payment') return 'payment_modal';
  if (activeModal === 'movement') return 'movement_modal';
  if (activeModal === 'close_register') return 'close_register_modal';

  // Select primitive booleans for missions
  const saleCompleted = useDemoMissionsStore((s) => s.saleCompleted);
  const movementCompleted = useDemoMissionsStore((s) => s.movementCompleted);
  const productCreated = useDemoMissionsStore((s) => s.productCreated);
  const dashboardVisited = useDemoMissionsStore((s) => s.dashboardVisited);
  const isAllCompleted = saleCompleted && movementCompleted && productCreated && dashboardVisited;

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
    if (cartItemsCount > 0) return 'pos_has_items';
    return 'pos_empty_cart';
  }

  return 'welcome';
}

export function CapitaoGelada() {
  const context = useCurrentContext();
  
  // Store primitives
  const activeModal = useDemoGuideStore((s) => s.activeModal);
  const isDismissed = useDemoGuideStore((s) => s.isDismissed);
  const currentTipId = useDemoGuideStore((s) => s.currentTipId);
  const advanceTip = useDemoGuideStore((s) => s.advanceTip);
  const dismissGuide = useDemoGuideStore((s) => s.dismissGuide);
  const showGuide = useDemoGuideStore((s) => s.showGuide);

  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [bounceEffect, setBounceEffect] = useState(false);
  const prevContextRef = useRef<GuideContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTip = currentTipId ? GUIDE_DIALOGUES.find((t) => t.id === currentTipId) : null;

  // Track context changes → trigger tip + jump animation
  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE !== 'demo') return;
    if (isDismissed) return;

    if (prevContextRef.current !== context) {
      prevContextRef.current = context;

      // Trigger spring bounce animation on context jump
      setBounceEffect(true);
      const bTimer = setTimeout(() => setBounceEffect(false), 1200);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        useDemoGuideStore.getState().showTipForContext(context);
        setIsBubbleVisible(true);
      }, 500);

      return () => clearTimeout(bTimer);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [context, isDismissed]);

  // Entry animation
  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE !== 'demo') return;

    const t = setTimeout(() => setIsAnimatingIn(true), 1200);
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
    const ctxTips = GUIDE_DIALOGUES.filter((t) => t.context === currentTip.context);
    const idx = ctxTips.findIndex((t) => t.id === currentTipId);
    return idx < ctxTips.length - 1;
  })();

  const isModalActive = activeModal !== null;

  // Dynamic Positioning & Styling classes
  // When a modal is open: jumps to middle-right of screen next to the modal
  // When no modal: stays at bottom-right
  const positionClasses = isModalActive
    ? 'fixed top-1/2 -translate-y-1/2 right-4 sm:right-8 md:right-12 z-[10000]'
    : 'fixed bottom-6 right-6 z-[9999]';

  // ── Minimized floating button (when dismissed) ──
  if (isDismissed) {
    return (
      <button
        onClick={() => {
          showGuide();
          useDemoGuideStore.getState().showTipForContext(context);
        }}
        className={`${positionClasses} group cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}
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
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-[#0b0f1a] animate-pulse" />
        </div>
      </button>
    );
  }

  return (
    <div
      className={`${positionClasses} flex flex-col items-end gap-3 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isAnimatingIn ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'
      } ${bounceEffect ? 'scale-110 -translate-y-2' : ''}`}
    >
      {/* ── Speech Bubble ── */}
      {isBubbleVisible && currentTip && (
        <div
          className={`relative max-w-[300px] sm:max-w-[340px] animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            isModalActive ? 'sm:max-w-[360px]' : ''
          }`}
        >
          {/* Bubble card */}
          <div
            className={`bg-[#0d121f]/95 backdrop-blur-2xl border rounded-2xl rounded-br-md shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-4 transition-all ${
              isModalActive
                ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.25)]'
                : 'border-zinc-700/60'
            }`}
          >
            {/* Header tag if modal active */}
            {isModalActive && (
              <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 mb-2">
                <Sparkles size={10} />
                Dica de Atalho & Checkout
              </div>
            )}

            {/* Close bubble button */}
            <button
              onClick={() => setIsBubbleVisible(false)}
              className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800 cursor-pointer"
              title="Fechar dica"
            >
              <X size={14} />
            </button>

            {/* Tip content */}
            <div className="pr-5">
              <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed font-medium">
                {currentTip.emoji && <span className="mr-1.5 text-base">{currentTip.emoji}</span>}
                {currentTip.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/80">
              <button
                onClick={dismissGuide}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Ocultar guia
              </button>

              {hasNextTip ? (
                <button
                  onClick={advanceTip}
                  className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-xl cursor-pointer border border-amber-400/20"
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
                  className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded-xl cursor-pointer border border-emerald-400/20"
                >
                  Entendi!
                </button>
              )}
            </div>
          </div>

          {/* Triangle pointer to avatar */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[#0d121f]/95 border-r border-b border-zinc-700/60 rotate-45" />
        </div>
      )}

      {/* ── Captain Avatar ── */}
      <button
        onClick={() => {
          if (isBubbleVisible) {
            setIsBubbleVisible(false);
          } else {
            useDemoGuideStore.getState().showTipForContext(context);
            setIsBubbleVisible(true);
          }
        }}
        className="group relative cursor-pointer"
        title="Capitão Gelada — Clique para falar com o guia"
      >
        {/* Glow ring - turns blue glowing when modal is active */}
        <div
          className={`absolute inset-0 rounded-full blur-lg group-hover:blur-xl transition-all scale-110 ${
            isModalActive
              ? 'bg-gradient-to-br from-blue-400/40 to-indigo-500/40 animate-pulse'
              : 'bg-gradient-to-br from-amber-400/30 to-orange-500/30 animate-pulse'
          }`}
        />

        {/* Avatar container */}
        <div
          className={`relative w-[72px] h-[72px] rounded-full overflow-hidden border-[3px] shadow-2xl transition-all group-hover:scale-110 ${
            isModalActive
              ? 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]'
              : 'border-amber-400/80 shadow-[0_4px_25px_rgba(251,191,36,0.35)]'
          }`}
        >
          <img
            src={CAPITAO_IMG}
            alt="Capitão Gelada"
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
        </div>

        {/* Name badge */}
        <div
          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg tracking-wider uppercase transition-colors ${
            isModalActive
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          }`}
        >
          {isModalActive ? '💡 DICA F12' : 'Cap. Gelada'}
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
