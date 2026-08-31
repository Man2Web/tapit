"use client";

import { useState, type MouseEvent } from "react";
import { IoPersonAddOutline } from "react-icons/io5";
import { ShareInfoSheet } from "./share-info-sheet";

// The button itself no longer downloads directly — it opens the ShareInfoSheet, which fires
// the actual vCard download (and the vcard_save event log) once the receiver skips or shares
// their own info. Kept as a real <a href> regardless (see ShareInfoSheet's own comment on
// why the eventual download navigation needs to stay inside a direct click handler).
export function SaveContactButton({ username, displayName }: { username: string; displayName: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const vcardUrl = `/api/vcard/${username}`;

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setSheetOpen(true);
  }

  return (
    <>
      <a
        href={vcardUrl}
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.98]"
        style={{ backgroundColor: "var(--brand-color)" }}
      >
        <IoPersonAddOutline size={20} />
        Save Contact
      </a>
      <ShareInfoSheet
        open={sheetOpen}
        username={username}
        displayName={displayName}
        vcardUrl={vcardUrl}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
