'use client';
import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useShift } from '@/contexts/ShiftContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { saveOfflineSale } from '@/lib/db';
import type { OfflineSaleItemSnapshot, OfflineSalePayment } from '@/lib/db';
import {
  CreditCard, Banknote, QrCode, X, Loader2, Plus, Trash2,
  ShoppingBag, Receipt, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, User, WifiOff, Tag, Lock, Printer,
} from 'lucide-react';

type PayMode = 'simple' | 'nfce';
type NfceStatus = 'pendente' | 'autorizada' | 'rejeitada' | 'nao_emitida' | null;

const METHOD_CONFIG = [
  { id: 'dinheiro', icon: Banknote,   label: 'Dinheiro', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ring-emerald-500 hover:border-emerald-500' },
  { id: 'pix',     icon: QrCode,     label: 'Pix',      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20 ring-teal-500 hover:border-teal-500' },
  { id: 'credito', icon: CreditCard, label: 'Crédito',  color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 ring-indigo-500 hover:border-indigo-500' },
  { id: 'debito',  icon: CreditCard, label: 'Débito',   color: 'bg-sky-500/10 text-sky-400 border-sky-500/20 ring-sky-500 hover:border-sky-500' },
  { id: 'consumo_funcionario', icon: User, label: 'Consumo Colaborador', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 ring-amber-500 hover:border-amber-500' }
];

const METHOD_NAMES: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Crédito', debito: 'Débito', consumo_funcionario: 'Consumo Colaborador' };

const TPAG_MAP: Record<string, string> = { dinheiro: '01', credito: '03', debito: '04', pix: '17', consumo_funcionario: '99', outros: '99' };

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onPendingCountChange?: () => void;
  tenantConfig?: any;
}

export function PaymentModal({ isOpen, onClose, isOnline, onPendingCountChange, tenantConfig }: PaymentModalProps) {
  const { total, items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { cashRegister, operator } = useShift();

  const modules = (() => {
    try {
      if (tenantConfig?.modulos) {
        return typeof tenantConfig.modulos === 'string' ? JSON.parse(tenantConfig.modulos) : tenantConfig.modulos;
      }
    } catch (e) {
      console.error("Erro ao ler módulos no PaymentModal:", e);
    }
    return { estoque: true, nfce: true, dashboardMobile: true };
  })();

  const isNfceEnabled = modules.nfce !== false;

  const [payments, setPayments] = useState<{ id: string; method: string; value: number; given: number }[]>([]);
  const [method, setMethod] = useState<'dinheiro' | 'pix' | 'credito' | 'debito' | 'consumo_funcionario'>('dinheiro');
  const [operatorsList, setOperatorsList] = useState<{ id: string; name: string }[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>('simple');
  const [showConsumerForm, setShowConsumerForm] = useState(false);
  const [customerCpf, setCustomerCpf] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saleResult, setSaleResult] = useState<Record<string, unknown> | null>(null);
  const [nfcePolling, setNfcePolling] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  // --- Desconto via PIN ---
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountPinInput, setDiscountPinInput] = useState('');
  const [discountValue, setDiscountValue] = useState(0); // valor de desconto em R$
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pendingDiscountStr, setPendingDiscountStr] = useState('');

  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0);
  const effectiveTotal = Math.max(0, total - discountValue);
  const remaining = Math.max(0, Math.round((effectiveTotal - totalPaid) * 100) / 100);
  const change = payments.filter(p => p.method === 'dinheiro').reduce((acc, p) => acc + (p.given - p.value), 0);

  const [autoNfce, setAutoNfce] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('7bar_auto_nfce') === 'true';
    return false;
  });

  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('7bar_auto_print') === 'true';
    return false;
  });

  // ── Impressão de cupom 80mm ────────────────────────────────────────────
  const printReceipt = (saleData: Record<string, unknown>) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const companyName = tenantConfig?.name || tenantConfig?.razaoSocial || 'Estabelecimento';
    const cnpj        = tenantConfig?.cnpj  || '';
    const address     = tenantConfig?.address || tenantConfig?.endereco || '';
    const phone       = tenantConfig?.phone  || tenantConfig?.telefone  || '';
    const footerMsg   = tenantConfig?.receiptFooter || 'Obrigado pela preferência! Volte sempre!';

    const itemsHtml = items.map((item, idx) => `
      <div class="item">
        <div class="item-header">
          <span class="item-num">${String(idx + 1).padStart(2, '0')}</span>
          <span class="item-name">${item.name}</span>
          <span class="item-total">R$ ${item.subtotal.toFixed(2)}</span>
        </div>
        <div class="item-detail">
          ${item.quantity} UN x R$ ${Number(item.priceSell).toFixed(2)}
        </div>
      </div>
    `).join('');

    const paymentsHtml = payments.map(p => `
      <div class="payment-row">
        <span>${{ dinheiro: 'DINHEIRO', pix: 'PIX', credito: 'CRÉDITO', debito: 'DÉBITO' }[p.method] || p.method}</span>
        <span>R$ ${p.value.toFixed(2)}</span>
      </div>
    `).join('');

    const changeVal = payments
      .filter(p => p.method === 'dinheiro')
      .reduce((acc, p) => acc + (p.given - p.value), 0);

    const receiptHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Cupom</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 80mm auto; margin: 4mm 3mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: 74mm;
      color: #000;
      background: #fff;
    }
    .center  { text-align: center; }
    .bold    { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .header  { text-align: center; margin-bottom: 6px; }
    .header .company { font-size: 14px; font-weight: bold; text-transform: uppercase; }
    .header .subtitle { font-size: 10px; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; margin: 3px 0; }
    .label-row { text-align: center; font-weight: bold; font-size: 12px; margin: 4px 0; letter-spacing: 1px; }
    .item { margin: 4px 0; }
    .item-header { display: flex; justify-content: space-between; font-weight: bold; }
    .item-num   { min-width: 18px; }
    .item-name  { flex: 1; margin: 0 4px; word-break: break-word; }
    .item-total { white-space: nowrap; }
    .item-detail { font-size: 10px; color: #555; padding-left: 22px; margin-top: 1px; }
    .totals { margin-top: 4px; }
    .totals-row { display: flex; justify-content: space-between; margin: 2px 0; }
    .totals-row.grand { font-size: 14px; font-weight: bold; margin-top: 4px; }
    .payment-row { display: flex; justify-content: space-between; margin: 2px 0; }
    .change-row  { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 3px; }
    .footer { text-align: center; font-size: 10px; margin-top: 8px; line-height: 1.5; }
    @media print {
      html, body { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">${companyName}</div>
    ${cnpj    ? `<div class="subtitle">CNPJ: ${cnpj}</div>` : ''}
    ${address ? `<div class="subtitle">${address}</div>`  : ''}
    ${phone   ? `<div class="subtitle">Tel: ${phone}</div>` : ''}
  </div>
  <div class="divider"></div>
  <div class="label-row">CUPOM NÃO FISCAL</div>
  <div class="meta"><span>${dateStr} ${timeStr}</span><span>Venda #${saleData.id || '—'}</span></div>
  <div class="meta"><span>Operador: ${ (operator?.name || user?.name || 'Operador') }</span></div>
  <div class="divider"></div>
  ${itemsHtml}
  <div class="divider"></div>
  <div class="totals">
    <div class="totals-row"><span>SUBTOTAL:</span><span>R$ ${total.toFixed(2)}</span></div>
    ${ effectiveTotal < total ? `<div class="totals-row"><span>DESCONTO:</span><span>-R$ ${discountValue.toFixed(2)}</span></div>` : '' }
    <div class="totals-row grand"><span>TOTAL:</span><span>R$ ${effectiveTotal.toFixed(2)}</span></div>
  </div>
  <div class="divider"></div>
  ${paymentsHtml}
  ${ changeVal > 0 ? `<div class="change-row"><span>TROCO:</span><span>R$ ${changeVal.toFixed(2)}</span></div>` : '' }
  <div class="divider"></div>
  <div class="footer">${footerMsg}</div>
  <br/><br/>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=340,height=600,toolbar=0,menubar=0,scrollbars=0');
    if (!printWin) { toast.error('Popup bloqueado. Permita pop-ups para imprimir.'); return; }
    printWin.document.open();
    printWin.document.write(receiptHtml);
    printWin.document.close();
    printWin.onload = () => {
      setTimeout(() => {
        printWin.print();
        setTimeout(() => printWin.close(), 800);
      }, 300);
    };
  };



  useEffect(() => {
    if (isOpen) {
      setPayments([]); setMethod('dinheiro'); setInputValue(effectiveTotal.toFixed(2));
      setPayMode('simple'); setShowConsumerForm(false); setCustomerCpf(''); setCustomerName('');
      setSaleResult(null); setNfcePolling(false); setSavedOffline(false);
      setDiscountValue(0); setDiscountPinInput(''); setPinVerified(false); setPendingDiscountStr('');
      setSelectedOperatorId('');
      
      api.get('/operators')
        .then(res => setOperatorsList(res.data || []))
        .catch(console.error);

      // Remove focus from the background search bar to prevent accidental typing
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 10);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  useEffect(() => { setInputValue(remaining > 0 ? remaining.toFixed(2) : ''); }, [remaining]);

  useEffect(() => {
    if (isOpen && (saleResult || savedOffline) && !nfcePolling) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [isOpen, saleResult, savedOffline, nfcePolling, onClose]);

  useEffect(() => {
    if (!isOpen || saleResult || savedOffline) return;
    const handler = (e: KeyboardEvent) => {
      const activeIsInput = document.activeElement?.tagName.toLowerCase() === 'input';
      
      if (!activeIsInput) {
        if (e.key === '1') { e.preventDefault(); setMethod('dinheiro'); document.getElementById('value-input')?.focus(); }
        if (e.key === '2') { e.preventDefault(); setMethod('pix'); document.getElementById('value-input')?.focus(); }
        if (e.key === '3') { e.preventDefault(); setMethod('credito'); document.getElementById('value-input')?.focus(); }
        if (e.key === '4') { e.preventDefault(); setMethod('debito'); document.getElementById('value-input')?.focus(); }
      }

      if (e.key === 'Enter' && remaining <= 0) {
        e.preventDefault();
        if (isOnline) handleConfirm(isNfceEnabled && autoNfce ? 'nfce' : 'simple');
        else handleSaveOffline();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, remaining, saleResult, savedOffline, isOnline, autoNfce, isNfceEnabled]);

  useEffect(() => {
    if (!nfcePolling || !saleResult?.id) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/sales/${saleResult.id}/nfce-status`);
        const status: NfceStatus = res.data.nfceStatus as NfceStatus;
        setSaleResult(prev => ({ ...prev, ...res.data }));
        if (status === 'autorizada' || status === 'rejeitada' || status === 'nao_emitida' || attempts >= 15) {
          clearInterval(interval); setNfcePolling(false);
        }
      } catch { /* continua */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [nfcePolling, saleResult?.id]);

  const handleAddPayment = () => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) { toast.error('Digite um valor válido.'); return; }
    if (remaining <= 0) { toast.error('Total já atingido.'); return; }
    if (method !== 'dinheiro' && val > remaining) { toast.error('Cartão/Pix: valor não pode exceder o saldo devedor.'); return; }
    const actualValue = method === 'dinheiro' && val > remaining ? remaining : val;
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    setPayments([...payments, { id, method, value: actualValue, given: val }]);
  };

  // ── Salva venda offline no IndexedDB (OFFLINE_CONTINGENCY) ──────────────
  const handleSaveOffline = async () => {
    if (remaining > 0) { toast.error(`Falta R$ ${remaining.toFixed(2)} para finalizar.`); return; }
    setLoading(true);
    try {
      // Monta snapshot fiscal dos itens a partir do carrinho
      // (dados fiscais completos viriam do cache — aqui usamos defaults seguros)
      const saleItems: OfflineSaleItemSnapshot[] = items.map(item => ({
        productId:   item.id,
        productName: item.name,
        unit:        'UN',
        quantity:    item.quantity,
        priceUnit:   Number(item.priceSell),
        discount:    0,
        subtotal:    item.subtotal,
        // Snapshot fiscal — será completado pelo backend no sync
        ncm: null, cest: null, cfop: '5102', origem: 0,
        csosn: null, cstIcms: null,
        aliqIcms: 0, valorIcms: 0,
        cstPis: '99', aliqPis: 0, valorPis: 0,
        cstCofins: '99', aliqCofins: 0, valorCofins: 0,
      }));

      const salePayments: OfflineSalePayment[] = payments.map(p => ({
        method: p.method as OfflineSalePayment['method'],
        tPag:   TPAG_MAP[p.method] ?? '99',
        value:  p.value,
        troco:  Math.max(0, p.given - p.value),
      }));

      const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
      const discount = 0;

      await saveOfflineSale({
        localId:     Math.random().toString(36).substring(2) + Date.now().toString(36),
        createdAt:   new Date().toISOString(),
        operatorId:  operator?.id ?? user?.id ?? 'unknown',
        tenantId:    user?.tenant ?? 'unknown',
        cashRegisterId: cashRegister?.id,
        subtotal,
        discount,
        total,
        items:       saleItems,
        payments:    salePayments,
        customerCpf:  customerCpf || undefined,
        customerName: customerName || undefined,
        emitirNfce:  false,
        syncStatus:  'PENDING',
      });

      clearCart();
      setSavedOffline(true);
      toast.success('Venda salva localmente! Será sincronizada ao reconectar.', { duration: 5000 });
      onPendingCountChange?.();
    } catch (err) {
      toast.error('Erro ao salvar venda offline.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDiscountPin = async () => {
    if (!discountPinInput) { toast.error('Digite o PIN.'); return; }
    setVerifyingPin(true);
    try {
      await api.post('/tenants/me/verify-discount-pin', { pin: discountPinInput });
      setPinVerified(true);
      setDiscountPinInput('');
    } catch {
      toast.error('PIN incorreto. Tente novamente.');
      setDiscountPinInput('');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(pendingDiscountStr);
    if (isNaN(val) || val < 0) { toast.error('Valor inválido.'); return; }
    if (val >= total) { toast.error('Desconto não pode ser igual ou maior que o total.'); return; }
    setDiscountValue(val);
    setPayments([]);
    setInputValue((total - val).toFixed(2));
    setDiscountModalOpen(false);
    setPinVerified(false);
    setPendingDiscountStr('');
    toast.success(`Desconto de R$ ${val.toFixed(2)} aplicado!`);
  };

  const handleConfirm = async (mode: PayMode) => {
    if (remaining > 0) { toast.error(`Falta R$ ${remaining.toFixed(2)} para finalizar.`); return; }
    
    const isConsumo = payments.some(p => p.method === 'consumo_funcionario');
    if (isConsumo && !selectedOperatorId) {
      toast.error('Por favor, selecione o funcionário que está consumindo.');
      return;
    }

    setLoading(true);
    const actualMode = isConsumo ? 'simple' : (isNfceEnabled ? mode : 'simple');
    setPayMode(actualMode);
    try {
      const body = {
        items: items.map(i => ({ 
          productId: i.id, 
          quantity: i.quantity, 
          priceUnit: i.effectivePriceSell ?? i.priceSell,
          modifiers: i.modifiers ? i.modifiers.map(m => ({
            optionId: m.optionId,
            componentProductId: m.componentProductId,
          })) : undefined
        })),
        payments: payments.map(p => ({ method: p.method, value: p.value, troco: Math.max(0, p.given - p.value) })),
        discount: discountValue,
        cashRegisterId: cashRegister?.id,
        operatorId: operator?.id ?? user?.id,
        consumedByOperatorId: isConsumo ? selectedOperatorId : undefined,
        emitirNfce: isConsumo ? false : (actualMode === 'nfce'),
        ...(actualMode === 'nfce' ? { customerCpf: customerCpf || undefined, customerName: customerName || undefined } : {}),
      };
      const res = await api.post('/sales/checkout', body);
      setSaleResult(res.data); clearCart();
      if (actualMode === 'nfce') { toast.info('NFC-e em processamento...', { duration: 3000 }); setNfcePolling(true); }
      else toast.success('Venda finalizada!');
      // Impressão automática do cupom
      if (autoPrint) {
        setTimeout(() => printReceipt(res.data), 300);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao finalizar venda.';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  // ── Modal de desconto via PIN ────────────────────────────────────────────
  const DiscountModal = discountModalOpen ? (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xs shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Tag size={18} className="text-amber-400" />
          </div>
          <div>
            <h4 className="font-bold text-white">Aplicar Desconto</h4>
            <p className="text-xs text-zinc-500">{pinVerified ? 'Digite o valor do desconto' : 'Digite o PIN de autorização'}</p>
          </div>
          <button onClick={() => setDiscountModalOpen(false)} className="ml-auto text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        {!pinVerified ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 justify-center text-zinc-400 text-sm">
              <Lock size={14} /> PIN do Gerente necessário
            </div>
            <input
              type="password"
              value={discountPinInput}
              onChange={e => setDiscountPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && handleVerifyDiscountPin()}
              placeholder="••••"
              autoFocus
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              maxLength={8}
            />
            <button
              onClick={handleVerifyDiscountPin}
              disabled={verifyingPin || !discountPinInput}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold transition active:scale-95"
            >
              {verifyingPin ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmar PIN'}
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 justify-center text-emerald-400 text-sm font-semibold">
              <CheckCircle2 size={14} /> PIN correto! Autorizado.
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
              <input
                type="number"
                value={pendingDiscountStr}
                onChange={e => setPendingDiscountStr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApplyDiscount()}
                placeholder="0,00"
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-xl font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <p className="text-xs text-zinc-500 text-center">
              Total atual: <strong className="text-white">R$ {total.toFixed(2)}</strong>
            </p>
            <button
              onClick={handleApplyDiscount}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition active:scale-95"
            >
              Aplicar Desconto
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;


  // ── Tela: Venda salva offline ────────────────────────────────────────────
  if (savedOffline) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mx-auto">
              <WifiOff className="text-orange-400" size={36} />
            </div>
            <h3 className="text-2xl font-bold text-white">Venda em Contingência!</h3>
            <p className="text-zinc-400 text-sm">Salva localmente. Será sincronizada automaticamente quando a conexão retornar.</p>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <p className="text-orange-400 font-bold text-xl">R$ {total.toFixed(2)}</p>
              <p className="text-orange-400/70 text-xs mt-1">OFFLINE_CONTINGENCY</p>
            </div>
          </div>
          <div className="p-6 border-t border-zinc-800">
            <button onClick={onClose} className="w-full py-3.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition active:scale-95 relative">
              Nova Venda
              <span className="absolute top-1/2 -translate-y-1/2 right-4 text-[10px] font-mono bg-black/20 text-blue-200 px-1.5 py-0.5 rounded">Enter</span>
            </button>
          </div>
        </div>
      </div>
    );
  }


  // ── Tela: Resultado online ───────────────────────────────────────────────
  if (saleResult) {
    const status = saleResult.nfceStatus as NfceStatus;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-8 text-center">
            {saleResult.emitirNfce ? (
              <>
                {status === 'pendente' && (
                  <div className="space-y-4">
                    <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto"><Clock className="text-amber-400 animate-pulse" size={36} /></div>
                    <h3 className="text-2xl font-bold text-white">Aguardando SEFAZ...</h3>
                    <div className="flex gap-1 justify-center">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                  </div>
                )}
                {status === 'autorizada' && (
                  <div className="space-y-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto"><CheckCircle2 className="text-emerald-400" size={40} /></div>
                    <h3 className="text-2xl font-bold text-emerald-400">NFC-e Autorizada! ✓</h3>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-left space-y-2">
                      <p className="text-xs text-zinc-500 font-mono break-all"><span className="text-zinc-400 font-semibold">Chave: </span>{saleResult.nfceChave as string}</p>
                      <p className="text-xs text-zinc-500 font-mono"><span className="text-zinc-400 font-semibold">Protocolo: </span>{saleResult.nfceProtocolo as string}</p>
                    </div>
                  </div>
                )}
                {status === 'rejeitada' && (
                  <div className="space-y-4">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto"><XCircle className="text-red-400" size={40} /></div>
                    <h3 className="text-2xl font-bold text-red-400">NFC-e Rejeitada</h3>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"><p className="text-red-400 font-mono text-sm">{saleResult.nfceMotivoRejeicao as string}</p></div>
                  </div>
                )}
                {status === 'nao_emitida' && (
                  <div className="space-y-4">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center mx-auto"><Receipt className="text-zinc-400" size={36} /></div>
                    <h3 className="text-2xl font-bold text-zinc-300">NFC-e não emitida</h3>
                    <p className="text-zinc-400 text-sm">Configure o certificado em Configurações → Empresa.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto"><CheckCircle2 className="text-emerald-400" size={40} /></div>
                <h3 className="text-2xl font-bold text-white">Venda Finalizada!</h3>
                <p className="text-zinc-400">Total cobrado: <span className="text-white font-bold">R$ {Number(saleResult.total).toFixed(2)}</span></p>
                {change > 0 && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4"><p className="text-emerald-400 font-bold text-xl">Troco: R$ {change.toFixed(2)}</p></div>}
              </div>
            )}
          </div>
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
            <button onClick={onClose} disabled={nfcePolling} className="w-full py-3.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition active:scale-95 flex items-center justify-center gap-2 relative">
              {nfcePolling ? <><Loader2 className="animate-spin" size={18} /> Aguardando...</> : (
                <>
                  Nova Venda
                  <span className="absolute top-1/2 -translate-y-1/2 right-4 text-[10px] font-mono bg-black/20 text-blue-200 px-1.5 py-0.5 rounded">Enter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tela principal ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Finalizar Pagamento</h2>
            {!isOnline && (
              <p className="text-orange-400 text-xs font-semibold flex items-center gap-1 mt-1">
                <WifiOff size={12} /> Modo offline — venda será salva localmente
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Painel Esquerdo */}
          <div className="space-y-5">
            <div>
              <span className="text-zinc-400 font-medium block mb-3 text-sm">Selecione o Método</span>
              <div className="grid grid-cols-2 gap-2">
                {METHOD_CONFIG.map((m, index) => (
                  <button key={m.id} onClick={() => { setMethod(m.id as typeof method); document.getElementById('value-input')?.focus(); }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-sm relative overflow-hidden ${method === m.id ? `${m.color} ring-2 ring-offset-2 ring-offset-zinc-900` : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}>
                    <div className="absolute top-0 right-0 bg-zinc-800/50 px-1.5 py-0.5 rounded-bl-lg text-[10px] font-bold text-zinc-500">{index + 1}</div>
                    <m.icon size={18} /><span className="font-semibold">{m.label}</span>
                  </button>
                ))}
              </div>

              {method === 'consumo_funcionario' && (
                <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-zinc-400 text-xs font-semibold block">Qual colaborador está consumindo?</label>
                  <select
                    value={selectedOperatorId}
                    onChange={e => setSelectedOperatorId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Selecione o colaborador...</option>
                    {operatorsList.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="text-zinc-400 text-sm font-medium mb-2 block">Deseja passar qual valor?</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                  <input type="number" id="value-input"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-xl font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00" value={inputValue} onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddPayment()} disabled={remaining <= 0}
                  />
                </div>
                <button onClick={handleAddPayment} disabled={remaining <= 0} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white p-3.5 rounded-xl transition flex-shrink-0"><Plus size={22} /></button>
                <button
                  onClick={() => { setDiscountModalOpen(true); setPinVerified(false); setDiscountPinInput(''); }}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 p-3.5 rounded-xl transition flex-shrink-0"
                  title="Aplicar desconto (requer PIN)"
                >
                  <Tag size={20} />
                </button>
              </div>
              {method === 'dinheiro' && parseFloat(inputValue) > remaining && remaining > 0 && (
                <p className="text-emerald-400/80 text-xs mt-2 italic">Troco a devolver: R$ {(parseFloat(inputValue) - remaining).toFixed(2)}</p>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <button onClick={() => setShowConsumerForm(!showConsumerForm)}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition w-full">
                <User size={15} /><span>Identificar consumidor (CPF/Nome)</span>
                {showConsumerForm ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
              </button>
              {showConsumerForm && (
                <div className="mt-3 space-y-3">
                  <input className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500" placeholder="CPF (opcional)" value={customerCpf} onChange={e => setCustomerCpf(e.target.value)} maxLength={14} />
                  <input className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Nome do consumidor (opcional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* Painel Direito: Resumo */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-zinc-400 font-medium">Total da Venda</span>
                  {discountValue > 0 && (
                    <p className="text-xs text-zinc-500 line-through">R$ {total.toFixed(2)}</p>
                  )}
                </div>
                <div className="text-right">
                  {discountValue > 0 && (
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded mr-2">-R$ {discountValue.toFixed(2)}</span>
                  )}
                  <span className="text-2xl font-black text-white">R$ {effectiveTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                {payments.length === 0 && <p className="text-zinc-600 text-sm text-center py-4 border border-dashed border-zinc-800 rounded-lg">Nenhum pagamento lançado</p>}
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm group">
                    <span className="font-semibold text-zinc-300 flex items-center gap-2">
                      {p.method === 'dinheiro' ? <Banknote size={14} className="text-emerald-500" /> :
                       p.method === 'consumo_funcionario' ? <User size={14} className="text-amber-400" /> :
                       <CreditCard size={14} className="text-blue-500" />}
                      {METHOD_NAMES[p.method]}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">R$ {p.value.toFixed(2)}</span>
                      <button onClick={() => setPayments(payments.filter(x => x.id !== p.id))} className="text-zinc-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              {change > 0 && (
                <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-medium text-sm">Troco</span>
                  <span className="text-xl font-black text-emerald-400">R$ {change.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end">
                <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Falta Pagar</span>
                <span className={`text-4xl font-black ${remaining > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>R$ {remaining.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 flex flex-col gap-2">
             {isNfceEnabled && (
               <label className={`flex items-center gap-2 font-medium transition ${isOnline ? 'cursor-pointer text-zinc-300 hover:text-white' : 'cursor-not-allowed text-zinc-600'}`}>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-950 text-blue-500 focus:ring-blue-500 accent-blue-600 disabled:opacity-50" 
                    checked={autoNfce} 
                    onChange={(e) => {
                       setAutoNfce(e.target.checked);
                       localStorage.setItem('7bar_auto_nfce', String(e.target.checked));
                    }} 
                    disabled={!isOnline}
                  />
                  Emitir NFC-e automaticamente
               </label>
             )}
             <label className="flex items-center gap-2 font-medium cursor-pointer text-zinc-300 hover:text-white transition">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 accent-emerald-600" 
                  checked={autoPrint} 
                  onChange={(e) => {
                     setAutoPrint(e.target.checked);
                     localStorage.setItem('7bar_auto_print', String(e.target.checked));
                  }} 
                />
                <Printer size={15} className="text-emerald-400" />
                Imprimir Cupom automaticamente
             </label>
             {!isOnline && isNfceEnabled && <span className="text-xs text-orange-400 font-bold bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg w-fit">NFC-e Indisponível Offline</span>}
          </div>
          
          <div className="w-full sm:w-auto">
            {isOnline ? (
              <button onClick={() => handleConfirm(isNfceEnabled && autoNfce ? 'nfce' : 'simple')} disabled={loading || remaining > 0}
                className="w-full sm:w-64 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:shadow-none relative">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <ShoppingBag size={20} />}
                Finalizar Venda
                <span className="absolute top-1.5 right-2 text-[10px] font-mono bg-black/20 text-blue-200 px-1.5 py-0.5 rounded">Enter</span>
              </button>
            ) : (
              <button onClick={handleSaveOffline} disabled={loading || remaining > 0}
                className="w-full sm:w-64 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,88,12,0.2)] disabled:shadow-none relative">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <ShoppingBag size={20} />}
                Salvar Offline
                <span className="absolute top-1.5 right-2 text-[10px] font-mono bg-black/20 text-orange-200 px-1.5 py-0.5 rounded">Enter</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {DiscountModal}
    </div>
  );
}


