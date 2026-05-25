import ProfitBadge from "@/components/ProfitBadge";

type Props = {
  product: any;
  onToggle?: (id: string, active: boolean) => void;
  onDelete?: (id: string) => void;
};

export default function ProductCard({ product, onToggle, onDelete }: Props) {
  return (
    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex items-center justify-between">
      <div>
        <p className="font-bold">{product.name}</p>
        <p className="text-zinc-500 text-sm">TCIN: {product.targetTcin ?? "—"}</p>
        <p className="text-zinc-400 text-sm">{product.sku ?? ""}</p>
      </div>

      <div className="flex flex-col items-end space-y-2">
        <div className="text-right">
          <p className="text-green-400 font-bold">${Number(product.retailPrice || 0).toFixed(2)}</p>
          <p className={product.active ? "text-blue-400 text-sm" : "text-zinc-500 text-sm"}>
            {product.active ? "Active" : "Inactive"}
          </p>
        </div>

        <div className="flex gap-2">
          {onToggle && (
            <button
              onClick={() => onToggle(product.id, !product.active)}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md text-sm"
            >
              {product.active ? "Disable" : "Enable"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(product.id)}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded-md text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
