"use client";
import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

export default function HistoryPage() {
  const [drops, setDrops] = useState<any[]>([]);
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Drop History</h2>
      {loading ? (
        <p className="text-zinc-400">Loading drop history...</p>
      ) : drops.length === 0 ? (
        <p className="text-zinc-500">No drop history available.</p>
      ) : (
        <ul className="space-y-4">
          {drops.map((drop) => (
            <li key={drop.id} className="bg-zinc-900 p-4 rounded border border-zinc-800">
              <p className="font-semibold">{drop.productName}</p>
              <p className="text-sm text-zinc-400">
                Dropped to ${drop.price.toFixed(2)} on {new Date(drop.timestamp).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
