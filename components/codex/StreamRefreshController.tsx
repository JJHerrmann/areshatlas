"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STORAGE_KEY = "aresh-stream-refresh";
const REFRESH_INTERVAL_MS = 10_000;

function isEnabledValue(value: string | null) {
  return value === "1" || value === "true" || value === "on";
}

function isDisabledValue(value: string | null) {
  return value === "0" || value === "false" || value === "off";
}

export default function StreamRefreshController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const streamParam = searchParams.get("stream");
    if (isEnabledValue(streamParam)) {
      window.localStorage.setItem(STORAGE_KEY, "on");
      setEnabled(true);
      return;
    }
    if (isDisabledValue(streamParam)) {
      window.localStorage.removeItem(STORAGE_KEY);
      setEnabled(false);
      return;
    }
    setEnabled(window.localStorage.getItem(STORAGE_KEY) === "on");
  }, [searchParams]);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, router]);

  if (!enabled) return null;

  return (
    <div className="stream-refresh-badge">
      Stream mode: refreshing every 10s
    </div>
  );
}
