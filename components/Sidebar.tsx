import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col">
      <h1 className="text-2xl font-bold text-white mb-10">PullRate</h1>
      <nav className="space-y-4">
        <Link href="/" className="block text-zinc-400 hover:text-white">Overview</Link>
        <Link href="/watchlist" className="block text-zinc-400 hover:text-white">Watchlist</Link>
        <Link href="/history" className="block text-zinc-400 hover:text-white">History</Link>
        <Link href="/settings" className="block text-zinc-400 hover:text-white">Settings</Link>
      </nav>
    </aside>
  );
}
