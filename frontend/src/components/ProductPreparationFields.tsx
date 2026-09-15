type Preparation = {
  requiresKitchen: boolean;
  requiresBar: boolean;
  preparationIngredients: string;
};

export function ProductPreparationFields({
  value,
  onChange,
}: {
  value: Preparation;
  onChange: (value: Preparation) => void;
}) {
  return (
    <fieldset className="my-4 rounded-xl border border-orange-500/25 bg-orange-500/5 p-4 space-y-3">
      <legend className="px-2 text-sm font-bold text-orange-300">
        Preparo · Cozinha e bar
      </legend>
      <p className="text-xs text-zinc-400">
        Ao lançar na comanda, enviar automaticamente para:
      </p>
      <div className="flex flex-wrap gap-5 text-sm text-white">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.requiresKitchen}
            onChange={(e) =>
              onChange({
                ...value,
                requiresKitchen: e.target.checked,
                requiresBar: false,
              })
            }
          />{' '}
          Cozinha
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.requiresBar}
            onChange={(e) =>
              onChange({
                ...value,
                requiresBar: e.target.checked,
                requiresKitchen: false,
              })
            }
          />{' '}
          Bar
        </label>
      </div>
      {(value.requiresKitchen || value.requiresBar) && (
        <label className="block text-xs text-zinc-300">
          Ingredientes (opcional)
          <textarea
            maxLength={5000}
            rows={3}
            value={value.preparationIngredients}
            onChange={(e) =>
              onChange({ ...value, preparationIngredients: e.target.value })
            }
            placeholder="Ex.: massa, queijo, tomate e manjericão"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white"
          />
          <span className="block text-zinc-500">
            Descrição da receita. Para baixa de ingredientes no estoque, use a
            composição do produto.
          </span>
        </label>
      )}
    </fieldset>
  );
}
