'use client';
import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ModifierOption {
  id: string;
  name: string;
  componentProductId: string;
  quantity: number;
  priceAdjustment: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  minSelected: number;
  maxSelected: number;
  options: ModifierOption[];
}

interface CompositeProduct {
  id: string;
  name: string;
  priceSell: number;
  modifierGroups: ModifierGroup[];
}

interface CompositeModifierModalProps {
  product: CompositeProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (product: CompositeProduct, selectedModifiers: { group: ModifierGroup; option: ModifierOption }[]) => void;
}

export function CompositeModifierModal({ product, isOpen, onClose, onConfirm }: CompositeModifierModalProps) {
  // Map de groupId → optionId selecionado
  const [selections, setSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !product) return;

    // Auto-selecionar quando cada grupo tiver apenas 1 opção
    const autoSelections: Record<string, string> = {};
    let allAutoResolved = true;

    for (const group of product.modifierGroups) {
      if (group.options.length === 1) {
        autoSelections[group.id] = group.options[0].id;
      } else {
        allAutoResolved = false;
      }
    }

    setSelections(autoSelections);

    // Se todos os grupos têm apenas 1 opção, confirmar automaticamente sem abrir o modal
    if (allAutoResolved && product.modifierGroups.length > 0) {
      const resolvedModifiers = product.modifierGroups.map(group => ({
        group,
        option: group.options[0],
      }));
      onConfirm(product, resolvedModifiers);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Verificar se o modal já foi auto-resolvido
  const allGroupsHaveSingleOption = product.modifierGroups.every(g => g.options.length === 1);
  if (allGroupsHaveSingleOption && product.modifierGroups.length > 0) return null;

  const handleSelect = (groupId: string, optionId: string) => {
    setSelections(prev => ({ ...prev, [groupId]: optionId }));
  };

  const isComplete = product.modifierGroups.every(g => selections[g.id]);

  const handleConfirm = () => {
    if (!isComplete) return;

    const selectedModifiers = product.modifierGroups.map(group => {
      const selectedOptionId = selections[group.id];
      const option = group.options.find(o => o.id === selectedOptionId)!;
      return { group, option };
    });

    onConfirm(product, selectedModifiers);
    setSelections({});
  };

  const handleClose = () => {
    setSelections({});
    onClose();
  };

  // Calcular preço final com adicionais
  const totalPriceAdjustment = product.modifierGroups.reduce((acc, group) => {
    const selectedOptionId = selections[group.id];
    const option = group.options.find(o => o.id === selectedOptionId);
    return acc + (option ? Number(option.priceAdjustment) : 0);
  }, 0);
  const finalPrice = Number(product.priceSell) + totalPriceAdjustment;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-black text-white leading-tight">{product.name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Selecione os adicionais</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full transition text-zinc-400 hover:text-white ml-3 shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Grupos */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {product.modifierGroups.map(group => (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-zinc-300 uppercase tracking-wider">{group.name}</span>
                {selections[group.id] ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Obrigatório
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {group.options.map(option => {
                  const isSelected = selections[group.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(group.id, option.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-150 text-left ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="text-sm font-semibold">{option.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {Number(option.priceAdjustment) > 0 && (
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            +R$ {Number(option.priceAdjustment).toFixed(2)}
                          </span>
                        )}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-zinc-800 space-y-2">
          {!isComplete && (
            <div className="flex items-center gap-1.5 text-amber-500 text-xs font-medium">
              <AlertCircle size={13} />
              <span>Selecione uma opção em cada grupo para continuar.</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-500">Total:</span>
              <span className="text-lg font-black text-emerald-400 ml-1.5">
                R$ {finalPrice.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={!isComplete}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95 text-sm shadow-[0_0_15px_rgba(59,130,246,0.25)]"
            >
              Adicionar ao Carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
