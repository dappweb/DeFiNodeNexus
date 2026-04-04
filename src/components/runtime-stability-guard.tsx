"use client";

import { useEffect } from "react";

const RELOAD_ONCE_KEY = "runtime-stability-reloaded";

const KNOWN_STALE_VERSION_PATTERNS = [
  "Failed to find Server Action",
  "Loading chunk",
  "ChunkLoadError",
  "dynamically imported module",
  "Importing a module script failed",
];

function toMessage(errorLike: unknown): string {
  if (typeof errorLike === "string") return errorLike;
  if (errorLike && typeof errorLike === "object" && "message" in errorLike) {
    const maybeMessage = (errorLike as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "";
}

function shouldHandleAsVersionMismatch(message: string): boolean {
  return KNOWN_STALE_VERSION_PATTERNS.some((pattern) => message.includes(pattern));
}

function reloadOnce() {
  if (typeof window === "undefined") return;
  const alreadyReloaded = window.sessionStorage.getItem(RELOAD_ONCE_KEY) === "1";
  if (alreadyReloaded) return;
  window.sessionStorage.setItem(RELOAD_ONCE_KEY, "1");
  window.location.reload();
}

export function RuntimeStabilityGuard() {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      const message = `${toMessage(event.error)} ${event.message ?? ""}`;
      if (shouldHandleAsVersionMismatch(message)) {
        reloadOnce();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = toMessage(event.reason);
      if (shouldHandleAsVersionMismatch(message)) {
        reloadOnce();
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
