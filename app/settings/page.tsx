"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
    } catch (err) {
      console.error(err);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      {loading ? (
        <p className="text-zinc-400">Loading settings...</p>
      ) : (
        <>
          <label className="block mb-2">
            <span className="text-zinc-300">Notification Email</span>
            <input
              type="email"
              name="notificationEmail"
              value={settings.notificationEmail || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
            />
          </label>

          <label className="block mb-4">
            <span className="text-zinc-300">Alert Threshold (%)</span>
            <input
              type="number"
              name="alertThreshold"
              value={settings.alertThreshold || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
              min={0}
              max={100}
            />
          </label>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md text-white"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </>
      )}
    </div>
  );
}
