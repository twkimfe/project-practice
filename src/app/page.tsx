"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "darkMode:v1";

function getStoredDarkMode(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === "true" : null;
  } catch {
    return null;
  }
}

function setStoredDarkMode(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage unavailable (incognito, quota exceeded, etc.)
  }
}

// Date 객체를 yyyy-mm-dd hh:mm:ss.xxx 형식의 문자열로 변환하는 함수
function formatTime(date: Date): string {
  // 각 시간 요소를 추출하고 2자리(밀리초는 3자리)로 패딩
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0"); // 월은 0부터 시작하므로 +1
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0"); // 밀리초는 3자리

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const [timeOffset, setTimeOffset] = useState<number | null>(null);
  const [syncedUrl, setSyncedUrl] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 시스템 다크모드 감지 및 localStorage 저장
  useEffect(() => {
    const stored = getStoredDarkMode();
    if (stored !== null) {
      setDarkMode(stored);
    } else {
      setDarkMode(
        window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
    }
  }, []);

  useEffect(() => {
    if (darkMode !== null) {
      setStoredDarkMode(darkMode);
    }
  }, [darkMode]);

  // 실시간 동기화: offset을 기반으로 매 100ms마다 시간 업데이트
  useEffect(() => {
    if (timeOffset !== null) {
      intervalRef.current = setInterval(() => {
        const now = Date.now() + timeOffset;
        setServerTime(formatTime(new Date(now)));
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeOffset]);

  const fetchServerTime = useCallback(async () => {
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
      setServerTime(formatTime(new Date(data.serverTime)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setTimeOffset(null);
      setSyncedUrl(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !loading) {
        fetchServerTime();
      }
    },
    [loading, fetchServerTime],
  );

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // Hydration 완료 전에는 skeleton 표시
  if (darkMode === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </main>
    );
  }

  const isDark = darkMode;

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-8 transition-colors ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* 다크모드 토글 버튼 */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
          isDark
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-gray-200 hover:bg-gray-300"
        }`}
        aria-label={
          isDark ? "Switch to light mode" : "Switch to dark mode"
        }
      >
        {isDark ? "☀️" : "🌙"}
      </button>

      <h1 className="text-3xl font-bold mb-8">Time Sync</h1>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="사이트 주소를 입력하세요"
          className={`px-4 py-2 border rounded-lg w-80 ${
            isDark
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
            <p className="mb-2 text-sm text-gray-500">{syncedUrl}</p>
          )}
          <p
            className={`mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            Server Time:
          </p>
          <p className="text-4xl font-mono">{serverTime}</p>
          {timeOffset !== null && (
            <p className="mt-4 text-sm text-gray-500">
              Offset: {timeOffset > 0 ? "+" : ""}
              {timeOffset}ms
            </p>
          )}
        </div>
      )}
    </main>
  );
}
