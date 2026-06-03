"use client";
import { useEffect } from "react";

export default function SuppressHydrationWarning() {
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("bis_skin_checked")) return;
      originalError(...args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}