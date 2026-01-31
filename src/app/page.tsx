"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [timeOffset, setTimeOffset] = useState<number | null>(null);
  const [syncedUrl, setSyncedUrl] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 시스템 다크모드 감지 및 localStorage 저장
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) {
      setDarkMode(saved === "true");
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  // 실시간 동기화: offset을 기반으로 매 100ms마다 시간 업데이트
  useEffect(() => {
    if (timeOffset !== null) {
      intervalRef.current = setInterval(() => {
        const now = Date.now() + timeOffset;
        setServerTime(new Date(now).toISOString());
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeOffset]);

  const fetchServerTime = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/server-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch");
      }

      // 서버 시간과 로컬 시간의 차이(offset) 계산
      const offset = data.serverTime - Date.now();
      setTimeOffset(offset);
      setSyncedUrl(data.url);
      setServerTime(data.serverTimeISO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setTimeOffset(null);
      setSyncedUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      fetchServerTime();
    }
  };

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-8 transition-colors ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* 다크모드 토글 버튼 */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
          darkMode
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-gray-200 hover:bg-gray-300"
        }`}
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      <h1 className="text-3xl font-bold mb-8">Time Sync</h1>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="www.naver.com"
          className={`px-4 py-2 border rounded-lg w-80 ${
            darkMode
              ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              : "bg-white border-gray-300 text-black"
          }`}
        />
        <button
          onClick={fetchServerTime}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Sync"}
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {serverTime && (
        <div className="text-center">
          {syncedUrl && (
            <p className={`mb-2 text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
              {syncedUrl}
            </p>
          )}
          <p className={`mb-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Server Time:
          </p>
          <p className="text-4xl font-mono">{serverTime}</p>
          {timeOffset !== null && (
            <p className={`mt-4 text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
              Offset: {timeOffset > 0 ? "+" : ""}{timeOffset}ms
            </p>
          )}
        </div>
      )}
    </main>
  );
}
