"use client";

import { useEffect, useState, type ChangeEvent, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { IoCallOutline, IoMailOutline, IoPersonOutline } from "react-icons/io5";
import { createClient } from "@/lib/supabase/browser";

type ShareInfoSheetProps = {
  open: boolean;
  username: string;
  displayName: string;
  vcardUrl: string;
  onClose: () => void;
};

function IconField({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-11 pr-4 text-sm text-neutral-900 outline-none transition-colors focus:border-[var(--brand-color)] focus:bg-white"
      />
    </div>
  );
}

// The "Exchange Details" flow (PRODUCT.md §7.2): before the vCard actually downloads, offer
// the receiver a chance to share their own info back with the card owner. Skip or Share both
// still complete the download — this is an optional add-on to "Save Contact", not a gate.
export function ShareInfoSheet({ open, username, displayName, vcardUrl, onClose }: ShareInfoSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Portal to document.body rather than rendering in place: this component is a DOM
  // descendant of the fixed bottom bar, which has `backdrop-blur` on it — any ancestor with
  // backdrop-filter/filter/transform creates a new containing block for `position: fixed`
  // descendants, so without the portal this sheet's "fixed inset-0" backdrop was scoped to
  // that small bar's own box instead of the viewport (confirmed via getBoundingClientRect
  // live: a ~72px-tall rect pinned to the bottom, not the full screen) — invisible almost
  // everywhere, and a click anywhere above it did nothing. `mounted` guards against
  // `document` not existing during SSR.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // The vCard download and the lead submission both fire from here, inside a real click
  // handler (Skip/Share), not from the original "Save Contact" click — a JS-driven download
  // outside a direct user gesture is exactly what save-contact-button.tsx's own comment warns
  // iOS Safari mishandles. Fire-and-forget RPCs (not awaited) keep `window.location.href`
  // synchronous within the gesture. Tapping the backdrop is a plain dismiss (onClose only) —
  // no download, since the user didn't ask for the card, just to close the sheet.
  function proceedToDownload() {
    createClient()
      .rpc("log_profile_event", { p_username: username, p_event: "vcard_save" })
      .then(
        () => {},
        () => {},
      );
    onClose();
    window.location.href = vcardUrl;
  }

  function handleShare() {
    if (name.trim() || email.trim() || phone.trim()) {
      createClient()
        .rpc("submit_lead", { p_username: username, p_name: name, p_phone: phone, p_email: email })
        .then(
          () => {},
          () => {},
        );
    }
    proceedToDownload();
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {/* backdrop-blur is what actually shows the "difference" between the sheet and the
          page behind it — a plain darkened overlay alone reads as flat, this reads as focus.
          Pushed noticeably stronger than a typical iOS-style sheet backdrop (blur-sm/30 was
          too subtle to register at a glance) — blur-lg + 55% darken reads unmistakably. */}
      <div
        className={`fixed inset-0 z-40 bg-neutral-950/55 backdrop-blur-lg transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex h-[50dvh] flex-col rounded-t-2xl bg-white px-6 pb-6 pt-3 shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-neutral-200" />

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Share your information</h2>
            <p className="text-sm text-neutral-500">with {displayName}</p>
          </div>
          <button
            type="button"
            onClick={proceedToDownload}
            className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            Skip
          </button>
        </div>

        <div className="mt-5 flex flex-1 flex-col gap-3">
          <IconField icon={IoPersonOutline} type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <IconField icon={IoMailOutline} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <IconField icon={IoCallOutline} type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="rounded-xl px-4 py-3 text-center font-medium text-white shadow-md transition-transform active:scale-[0.98]"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          Share
        </button>
      </div>
    </>,
    document.body,
  );
}
