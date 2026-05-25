"use client";
import { useEffect, useState } from 'react';

export default function WatchlistPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(setProducts);
  }, []);

  return (
    <div className="p-8 text-white">
      <h2 className="text-3xl font-bold mb-6">Tracked Products</h2>
      <div className="grid gap-4">
        {products.map((p: any) => (
          <div key={p.id} className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between">
            <div>
              <p className="font-bold">{p.name}</p>
              <p className="text-zinc-500 text-sm">TCIN: {p.targetTcin}</p>
            </div>
            <div className="text-right">
              <p className="text-green-400">${p.retailPrice}</p>
              <p className={p.active ? "text-blue-400" : "text-zinc-500"}>
                {p.active ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
