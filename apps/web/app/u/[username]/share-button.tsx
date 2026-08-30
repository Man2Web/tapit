"use client";

import { useState } from "react";

export function ShareButton({ username, displayName }: { username: string; displayName: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/u/${username}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: displayName, url });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 font-medium"
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
