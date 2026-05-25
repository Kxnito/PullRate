export default function ProfitBadge({ amount }: { amount: number }) {
  return (
    <span className={`font-bold ${amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
      ${amount.toFixed(2)}
    </span>
  );
}
