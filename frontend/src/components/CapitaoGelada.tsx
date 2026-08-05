import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronRight, MessageCircle, Sparkles } from 'lucide-react';
import { useDemoGuideStore } from '@/store/demoGuide';
import { useDemoMissionsStore } from '@/store/demoMissions';
import { useCartStore } from '@/store/cart';

const CAPITAO_IMG = '/demo/capitao-gelada.jpg';

// ─── Humores e expressões do personagem ─────────────────────────────────────
type Mood = 'happy' | 'excited' | 'winking' | 'celebrating' | 'thinking';

interface MoodConfig {
  label: string;
  borderColor: string;
  glowColor: string;
  badgeBg: string;
  badgeText: string;
  emoji: string;
}

const MOODS: Record<Mood, MoodConfig> = {
  happy: {
    label: 'Cap. Gelada',
    borderColor: 'border-amber-400',
    glowColor: 'rgba(251,191,36,0.4)',
    badgeBg: 'from-amber-500 to-orange-500',
    badgeText: 'text-white',
    emoji: '😄',
  },
  excited: {
    label: '🔥 NOVIDADE!',
    borderColor: 'border-blue-400',
    glowColor: 'rgba(59,130,246,0.5)',
    badgeBg: 'from-blue-600 to-indigo-600',
    badgeText: 'text-white',
    emoji: '🤩',
  },
  winking: {
    label: 'Dica Secreta',
    borderColor: 'border-purple-400',
    glowColor: 'rgba(168,85,247,0.4)',
    badgeBg: 'from-purple-600 to-pink-600',
    badgeText: 'text-white',
    emoji: '😉',
  },
  celebrating: {
    label: '🏆 PARABÉNS!',
    borderColor: 'border-emerald-400',
    glowColor: 'rgba(16,185,129,0.5)',
    badgeBg: 'from-emerald-500 to-teal-500',
    badgeText: 'text-white',
    emoji: '🎉',
  },
  thinking: {
    label: 'Sabia que...',
    borderColor: 'border-zinc-400',
    glowColor: 'rgba(161,161,170,0.3)',
    badgeBg: 'from-zinc-600 to-zinc-700',
    badgeText: 'text-zinc-100',
    emoji: '🤔',
  },
};

// ─── Mensagens por contexto e humor ─────────────────────────────────────────
interface PopupMessage {
  text: string;
  mood: Mood;
  context?: string; // página ou situação onde aparece preferencialmente
}

const MESSAGES: PopupMessage[] = [
  // POS - carrinho vazio
  { text: 'Clica em qualquer produto aí pra jogar no carrinho! É só apertar!', mood: 'happy', context: 'pos' },
  { text: 'Dica: use a busca no topo pra achar qualquer bebida pelo nome ou código!', mood: 'winking', context: 'pos' },
  { text: 'Sabia que você pode dar entrada por quantidade? Clica no produto e segura!', mood: 'thinking', context: 'pos' },

  // POS - com itens no carrinho
  { text: 'Boa! Já tem produto no carrinho. Aperta F12 pra finalizar na hora!', mood: 'excited', context: 'pos_items' },
  { text: 'No checkout você pode misturar Pix + Dinheiro na mesma venda! Tá ligado?', mood: 'winking', context: 'pos_items' },
  { text: 'O atalho [*] no teclado numérico também abre o checkout rapidinho!', mood: 'thinking', context: 'pos_items' },

  // Dashboard
  { text: 'Aqui você vê o faturamento em tempo real! Que adega é essa!', mood: 'excited', context: 'dashboard' },
  { text: 'Analise o horário de pico pelo gráfico de Vendas por Hora. Dados valem ouro!', mood: 'thinking', context: 'dashboard' },
  { text: 'Mix de Pagamentos mostra quanto veio de Pix vs Dinheiro vs Crédito!', mood: 'happy', context: 'dashboard' },

  // Estoque
  { text: 'Clica em "+ Novo Produto" pra cadastrar com foto, código e estoque!', mood: 'happy', context: 'inventory' },
  { text: 'Você pode importar uma planilha Excel de produtos ou uma NF-e de fornecedor!', mood: 'winking', context: 'inventory' },

  // Missões completas
  { text: '🎉 PARABÉNS! Você dominou o sistema! Agora é só entrar em contato pra assinar!', mood: 'celebrating', context: 'complete' },

  // Genérico
  { text: 'O PDV 7Bar funciona offline também! Vende mesmo sem internet!', mood: 'winking' },
  { text: 'Cada turno de caixa tem relatório completo com sangria, suprimento e fechamento!', mood: 'thinking' },
  { text: 'A impressão de cupom não fiscal sai automática na finalização da venda!', mood: 'happy' },
  { text: 'Toda venda fica salva no histórico. É só filtrar por data!', mood: 'thinking' },
];

// ─── Posições de pop-up na tela ──────────────────────────────────────────────
interface PopupPosition {
  bottom?: string; top?: string;
  right?: string; left?: string;
  label: string;
}

const POSITIONS: PopupPosition[] = [
  { bottom: '24px', right: '24px', label: 'bottom-right' },
  { bottom: '24px', left: '24px', label: 'bottom-left' },
  { top: '80px', right: '24px', label: 'top-right' },
  { bottom: '120px', right: '480px', label: 'center-right' },
  { bottom: '200px', left: '24px', label: 'mid-left' },
];

// ─── Hook de contexto atual ───────────────────────────────────────────────────
function useCurrentContext() {
  const location = useLocation();
  const cartCount = useCartStore(s => s.items.length);
  const saleCompleted = useDemoMissionsStore(s => s.saleCompleted);
  const movementCompleted = useDemoMissionsStore(s => s.movementCompleted);
  const productCreated = useDemoMissionsStore(s => s.productCreated);
  const dashboardVisited = useDemoMissionsStore(s => s.dashboardVisited);
  const allDone = saleCompleted && movementCompleted && productCreated && dashboardVisited;

  if (allDone) return 'complete';
  const path = location.pathname;
  if (path.startsWith('/dashboard/inventory')) return 'inventory';
  if (path.startsWith('/dashboard')) return 'dashboard';
  if (path === '/') return cartCount > 0 ? 'pos_items' : 'pos';
  return 'pos';
}

// ─── Componente principal ────────────────────────────────────────────────────
export function CapitaoGelada() {
  const ctx = useCurrentContext();
  const isDismissed = useDemoGuideStore(s => s.isDismissed);
  const dismissGuide = useDemoGuideStore(s => s.dismissGuide);
  const showGuide = useDemoGuideStore(s => s.showGuide);

  const [visible, setVisible] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [currentMsg, setCurrentMsg] = useState<PopupMessage>(MESSAGES[0]);
  const [currentPos, setCurrentPos] = useState<PopupPosition>(POSITIONS[0]);
  const [tiltDeg, setTiltDeg] = useState(0);
  const [bounceKey, setBounceKey] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCtxRef = useRef<string>('');

  const pickAndShow = useCallback((context: string) => {
    // Pick a message relevant to current context
    const ctxMessages = MESSAGES.filter(m => !m.context || m.context === context);
    const pool = ctxMessages.length > 0 ? ctxMessages : MESSAGES;
    const picked = pool[Math.floor(Math.random() * pool.length)];

    // Pick a random screen position
    const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];

    // Random slight tilt (-6 to +6 degrees)
    const tilt = (Math.random() - 0.5) * 12;

    setCurrentMsg(picked);
    setCurrentPos(pos);
    setTiltDeg(tilt);
    setBounceKey(k => k + 1);

    // Pop-in
    setVisible(true);
    setBubbleVisible(false);

    // Show bubble with delay after pop-in
    setTimeout(() => setBubbleVisible(true), 600);

    // Auto-hide after 12 seconds
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    schedulerRef.current = setTimeout(() => {
      setBubbleVisible(false);
      setTimeout(() => setVisible(false), 400);
    }, 12000);
  }, []);

  const scheduleNext = useCallback((context: string, delay: number) => {
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    schedulerRef.current = setTimeout(() => {
      pickAndShow(context);
    }, delay);
  }, [pickAndShow]);

  // On context change → show immediately
  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE !== 'demo') return;
    if (isDismissed) return;
    if (prevCtxRef.current === ctx) return;
    prevCtxRef.current = ctx;

    // Slight delay after route change
    const t = setTimeout(() => pickAndShow(ctx), 1500);
    return () => clearTimeout(t);
  }, [ctx, isDismissed, pickAndShow]);

  // Periodic re-show every 35–55 seconds
  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE !== 'demo') return;
    if (isDismissed) return;

    const interval = setInterval(() => {
      if (!visible) {
        pickAndShow(ctx);
      }
    }, 40000 + Math.random() * 15000);

    return () => clearInterval(interval);
  }, [ctx, isDismissed, visible, pickAndShow]);

  // First appear after 2s
  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE !== 'demo') return;
    if (isDismissed) return;
    const t = setTimeout(() => pickAndShow(ctx), 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNextMessage = () => {
    setBubbleVisible(false);
    setTimeout(() => {
      const next = (msgIndex + 1) % MESSAGES.length;
      setMsgIndex(next);
      setCurrentMsg(MESSAGES[next]);
      setBubbleVisible(true);
    }, 200);
    // Reset auto-hide
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    schedulerRef.current = setTimeout(() => {
      setBubbleVisible(false);
      setTimeout(() => setVisible(false), 400);
    }, 12000);
  };

  const handleClose = () => {
    setBubbleVisible(false);
    setTimeout(() => setVisible(false), 350);
  };

  if (import.meta.env.VITE_APP_MODE !== 'demo') return null;

  const mood = MOODS[currentMsg.mood];

  // ── Minimized avatar (when dismissed) ──
  if (isDismissed) {
    return (
      <button
        onClick={() => { showGuide(); pickAndShow(ctx); }}
        title="Chamar o Capitão Gelada"
        className="fixed bottom-6 right-6 z-[9999] group cursor-pointer"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.3)] group-hover:scale-110 group-hover:border-amber-400 transition-all">
            <img src={CAPITAO_IMG} alt="Capitão Gelada" className="w-full h-full object-cover object-top" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-[#0b0f1a] animate-pulse" />
        </div>
      </button>
    );
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed z-[9999] flex flex-col items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{
        bottom: currentPos.bottom,
        top: currentPos.top,
        right: currentPos.right,
        left: currentPos.left,
        transform: `rotate(${tiltDeg}deg)`,
        pointerEvents: 'auto',
      }}
    >
      {/* ── Speech Bubble ── */}
      {bubbleVisible && (
        <div
          className="relative max-w-[280px] sm:max-w-[320px] pointer-events-auto"
          style={{
            animation: 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            // counter-rotate so bubble stays readable
            transform: `rotate(${-tiltDeg}deg)`,
          }}
        >
          <div className={`bg-[#0d121f]/96 backdrop-blur-xl border rounded-2xl rounded-bl-sm shadow-[0_10px_40px_rgba(0,0,0,0.7)] p-3.5 ${mood.borderColor.replace('border-', 'border border-')}`}>
            {/* Header with mood label */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r ${mood.badgeBg} ${mood.badgeText} flex items-center gap-1`}>
                <Sparkles size={8} />
                {mood.label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNextMessage}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer rounded"
                  title="Próxima dica"
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer rounded"
                  title="Fechar"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Message */}
            <p className="text-xs text-zinc-100 leading-relaxed font-medium">
              <span className="mr-1 text-sm">{mood.emoji}</span>
              {currentMsg.text}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-800/70">
              <button
                onClick={() => { dismissGuide(); handleClose(); }}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
              >
                Não mostrar mais
              </button>
              <button
                onClick={handleNextMessage}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r ${mood.badgeBg} text-white cursor-pointer transition-all hover:scale-105`}
              >
                Próxima dica →
              </button>
            </div>
          </div>

          {/* Bubble triangle pointing down to avatar */}
          <div
            className={`absolute -bottom-1.5 left-8 w-3 h-3 bg-[#0d121f]/96 border-r border-b ${mood.borderColor} rotate-45`}
          />
        </div>
      )}

      {/* ── Avatar ── */}
      <button
        key={bounceKey}
        onClick={() => {
          if (bubbleVisible) setBubbleVisible(false);
          else setBubbleVisible(true);
        }}
        className="group relative cursor-pointer"
        title="Capitão Gelada"
        style={{ animation: 'capitao-bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-full blur-xl transition-all scale-125 animate-pulse"
          style={{ background: `radial-gradient(circle, ${mood.glowColor}, transparent 70%)` }}
        />

        {/* Avatar */}
        <div className={`relative w-16 h-16 rounded-full overflow-hidden border-[3px] ${mood.borderColor} shadow-2xl transition-all group-hover:scale-110`}
          style={{ boxShadow: `0 4px 25px ${mood.glowColor}` }}
        >
          <img
            src={CAPITAO_IMG}
            alt="Capitão Gelada"
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
        </div>

        {/* Notification ping */}
        {!bubbleVisible && (
          <span className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-[#0b0f1a] items-center justify-center">
              <MessageCircle size={7} className="text-white" />
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
