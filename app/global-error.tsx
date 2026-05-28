"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global error:", error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          fontFamily:
            "system-ui, -apple-system, sans-serif",
          padding: 48,
          textAlign: "center",
          color: "#1e293b",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>
          Something went wrong globally
        </h2>
        <p style={{ color: "#64748b", marginTop: 8 }}>
          {error.message ?? "Unknown error"}
        </p>
        {error.digest && (
          <p style={{ color: "#94a3b8", fontSize: 12 }}>
            ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            background: "#0f172a",
            color: "white",
            border: 0,
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
