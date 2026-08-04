import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GuideContext = 'welcome' | 'pos' | 'pos_empty_cart' | 'pos_has_items' | 'dashboard' | 'inventory' | 'missions_complete';

export interface GuideTip {
  id: string;
  context: GuideContext;
  message: string;
  emoji?: string;
}

/**
 * Diálogos contextuais do Capitão Gelada.
 * Cada contexto pode ter múltiplas mensagens que avançam sequencialmente.
 */
export const GUIDE_DIALOGUES: GuideTip[] = [
  // ── Welcome (first visit) ──
  {
    id: 'welcome_1',
    context: 'welcome',
    message: 'Ahoy, marujo! 🍺 Eu sou o Capitão Gelada, e vou te guiar nessa navegação pelo PDV 7Bar! Bora conhecer tudo?',
    emoji: '👋',
  },
  {
    id: 'welcome_2',
    context: 'welcome',
    message: 'Aqui em cima 👆 você vê suas Missões — complete as 4 para dominar o sistema! Cada uma tem um passo a passo.',
    emoji: '🎯',
  },
  {
    id: 'welcome_3',
    context: 'welcome',
    message: 'Comece pela mais divertida: faça sua primeira venda! É só clicar nos produtos e mandar ver!',
    emoji: '🛒',
  },

  // ── POS - Carrinho vazio ──
  {
    id: 'pos_empty_1',
    context: 'pos_empty_cart',
    message: 'Tá vendo esses produtos aí? Clica em qualquer um pra jogar no carrinho. É rapidão!',
    emoji: '👆',
  },
  {
    id: 'pos_empty_2',
    context: 'pos_empty_cart',
    message: 'Dica de capitão: use a barra de busca no topo pra encontrar qualquer produto pelo nome ou código!',
    emoji: '🔍',
  },

  // ── POS - Com itens no carrinho ──
  {
    id: 'pos_items_1',
    context: 'pos_has_items',
    message: 'Boa! Já tem itens no carrinho! Agora clica em "Finalizar Venda (F12)" pra fechar a conta! 💰',
    emoji: '✅',
  },
  {
    id: 'pos_items_2',
    context: 'pos_has_items',
    message: 'Na hora do pagamento, escolha Dinheiro, Pix, Cartão... o sistema aceita até pagamento misto!',
    emoji: '💳',
  },

  // ── Dashboard ──
  {
    id: 'dash_1',
    context: 'dashboard',
    message: 'Bem-vindo ao Dashboard! Aqui você vê tudo: faturamento, ticket médio, vendas por hora... Dados é poder, marujo!',
    emoji: '📊',
  },
  {
    id: 'dash_2',
    context: 'dashboard',
    message: 'Explore o gráfico de Vendas por Hora e o Mix de Pagamentos. São insights valiosos pro seu negócio!',
    emoji: '📈',
  },

  // ── Estoque ──
  {
    id: 'inv_1',
    context: 'inventory',
    message: 'Aqui é o coração do estoque! Cadastre novos produtos clicando no botão verde "+ Novo Produto".',
    emoji: '📦',
  },
  {
    id: 'inv_2',
    context: 'inventory',
    message: 'Cada produto pode ter foto, código de barras, categoria e controle de estoque automático. Tudo integrado!',
    emoji: '🏷️',
  },

  // ── All missions complete ──
  {
    id: 'complete_1',
    context: 'missions_complete',
    message: '🎉 PARABÉNS, marujo! Você completou todas as missões! Agora imagina isso rodando na sua adega... Fala com nosso time!',
    emoji: '🏆',
  },
];

interface DemoGuideState {
  /** IDs dos tips já vistos pelo usuário */
  seenTips: string[];
  /** O guia está visível? */
  isVisible: boolean;
  /** O guia foi permanentemente fechado nesta sessão? */
  isDismissed: boolean;
  /** ID do tip atualmente exibido */
  currentTipId: string | null;

  // Actions
  showTipForContext: (ctx: GuideContext) => void;
  advanceTip: () => void;
  dismissGuide: () => void;
  showGuide: () => void;
  markSeen: (tipId: string) => void;
  reset: () => void;
}

export const useDemoGuideStore = create<DemoGuideState>()(
  persist(
    (set, get) => ({
      seenTips: [],
      isVisible: true,
      isDismissed: false,
      currentTipId: null,

      showTipForContext: (ctx: GuideContext) => {
        const state = get();
        if (state.isDismissed) return;

        // Find first unseen tip for this context
        const tipsForContext = GUIDE_DIALOGUES.filter(t => t.context === ctx);
        const unseenTip = tipsForContext.find(t => !state.seenTips.includes(t.id));

        if (unseenTip) {
          set({ currentTipId: unseenTip.id, isVisible: true });
        } else if (tipsForContext.length > 0) {
          // All seen, show last tip for context
          set({ currentTipId: tipsForContext[tipsForContext.length - 1].id, isVisible: true });
        }
      },

      advanceTip: () => {
        const state = get();
        if (!state.currentTipId) return;

        const currentTip = GUIDE_DIALOGUES.find(t => t.id === state.currentTipId);
        if (!currentTip) return;

        // Mark current as seen
        const newSeen = state.seenTips.includes(state.currentTipId)
          ? state.seenTips
          : [...state.seenTips, state.currentTipId];

        // Find next unseen tip in same context
        const contextTips = GUIDE_DIALOGUES.filter(t => t.context === currentTip.context);
        const currentIdx = contextTips.findIndex(t => t.id === state.currentTipId);
        const nextTip = contextTips[currentIdx + 1];

        if (nextTip) {
          set({ seenTips: newSeen, currentTipId: nextTip.id });
        } else {
          // No more tips in this context, hide balloon but keep guide visible
          set({ seenTips: newSeen, currentTipId: null });
        }
      },

      dismissGuide: () => {
        set({ isDismissed: true, isVisible: false, currentTipId: null });
      },

      showGuide: () => {
        set({ isDismissed: false, isVisible: true });
      },

      markSeen: (tipId: string) => {
        const state = get();
        if (!state.seenTips.includes(tipId)) {
          set({ seenTips: [...state.seenTips, tipId] });
        }
      },

      reset: () => {
        set({
          seenTips: [],
          isVisible: true,
          isDismissed: false,
          currentTipId: null,
        });
      },
    }),
    {
      name: '7bar_demo_guide_v1',
    }
  )
);
