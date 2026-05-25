"use client";
import { useEffect, useState } from "react";

type Drop = {
  id: string;
  productName: string;
  price: number;
  timestamp: string;
};

export default function AlertFeed() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDrops() {
      setLoading(true);
      try {
        const res = await fetch("/api/drops");
        if (!res.ok) throw new Error("Failed to fetch drops");
        const data = await res.json();
        setDrops(data);
      } catch (error) {
        console.error(error);
        setDrops([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDrops();
  }, []);

  return (
    <div className="bg-zinc-900 p-4 rounded border border-zinc-800 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-3">Recent Drops</h3>
      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : drops.length === 0 ? (
        <p className="text-zinc-500">No recent drops.</p>
      ) : (
        <ul className="space-y-2">
          {drops.map((drop) => (
            <li key={drop.id} className="border-b border-zinc-800 pb-2">
              <p className="font-medium">{drop.productName}</p>
              <p className="text-sm text-green-400">${drop.price.toFixed(2)}</p>
              <p className="text-xs text-zinc-500">{new Date(drop.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
