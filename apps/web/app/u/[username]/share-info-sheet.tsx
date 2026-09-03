"use client";

import { useEffect, useState, type ChangeEvent, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { IoBriefcaseOutline, IoCallOutline, IoChatboxOutline, IoMailOutline, IoPersonOutline } from "react-icons/io5";
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

// Two-way Contact Exchange Sheet (PRODUCT.md §7.2): before the vCard downloads, allow the receiver
// to share their contact details (name, email, phone, company, notes) with the card owner.
export function ShareInfoSheet({ open, username, displayName, vcardUrl, onClose }: ShareInfoSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");

  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

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
    if (name.trim() || email.trim() || phone.trim() || company.trim()) {
      createClient()
        .rpc("submit_lead", {
          p_username: username,
          p_name: name,
          p_phone: phone,
          p_email: email,
          p_company: company,
          p_notes: notes,
          p_source: "form",
        })
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
      <div
        className={`fixed inset-0 z-40 bg-neutral-950/55 backdrop-blur-lg transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-3xl bg-white px-6 pb-6 pt-3 shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-neutral-200" />

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Exchange Contacts</h2>
            <p className="text-xs text-neutral-500">Share your details back with {displayName}</p>
          </div>
          <button
            type="button"
            onClick={proceedToDownload}
            className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            Skip & Download
          </button>
        </div>

        <div className="mt-5 flex flex-1 flex-col gap-2.5">
          <IconField icon={IoPersonOutline} type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <IconField icon={IoMailOutline} type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <IconField icon={IoCallOutline} type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <IconField icon={IoBriefcaseOutline} type="text" placeholder="Company / Title" value={company} onChange={(e) => setCompany(e.target.value)} />
          <IconField icon={IoChatboxOutline} type="text" placeholder="Note or Message (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="mt-5 rounded-xl px-4 py-3.5 text-center text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98]"
          style={{ backgroundColor: "var(--brand-color)" }}
        >
          Exchange & Save Contact
        </button>
      </div>
    </>,
    document.body,
  );
}
