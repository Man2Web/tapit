"use client";

import { useEffect, useRef, useState } from "react";
import { STARTER_LINKS, suggestUsername } from "@tapit/core";
import { createClient } from "@/lib/supabase/browser";
import { checkUsername, completeOnboarding, type OnboardingLink } from "./actions";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function OnboardingWizard({ userId }: { userId: string }) {
  const [step, setStep] = useState(1);

  // Step 1
  const [displayName, setDisplayName] = useState("");
  const [designation, setDesignation] = useState("");
  const [company, setCompany] = useState("");

  // Step 2
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Step 3
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameReason, setUsernameReason] = useState<string | null>(null);

  // Step 4
  const [enabledLinks, setEnabledLinks] = useState<Record<string, boolean>>({});
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkSeq = useRef(0);

  useEffect(() => {
    if (!usernameTouched && displayName) {
      setUsername(suggestUsername(displayName));
    }
  }, [displayName, usernameTouched]);

  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const seq = ++checkSeq.current;
    const timeout = setTimeout(async () => {
      const result = await checkUsername(username);
      if (checkSeq.current !== seq) return; // stale response
      if (!result.available) {
        setUsernameStatus(result.reason ? "invalid" : "taken");
        setUsernameReason(result.reason ?? "That username is taken.");
      } else {
        setUsernameStatus("available");
        setUsernameReason(null);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [username]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return null;
    setAvatarUploading(true);
    const supabase = createClient();
    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, {
      upsert: true,
    });
    setAvatarUploading(false);
    if (error) {
      setSubmitError(`Photo upload failed: ${error.message}`);
      return null;
    }
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function handleFinish() {
    setSubmitting(true);
    setSubmitError(null);

    const avatarUrl = await uploadAvatar();

    const links: OnboardingLink[] = STARTER_LINKS.filter((l) => enabledLinks[l.key])
      .map((l): OnboardingLink | null => {
        const raw = linkValues[l.key];
        if (!raw?.trim()) return null;
        return {
          kind: l.kind === "custom" ? "website" : (l.kind as OnboardingLink["kind"]),
          platform: l.platform,
          label: l.label,
          value: l.formatValue(raw),
        };
      })
      .filter((l): l is OnboardingLink => l !== null);

    const result = await completeOnboarding({
      username,
      displayName,
      designation,
      company,
      avatarUrl,
      links,
    });

    setSubmitting(false);
    if (result?.error) {
      setSubmitError(result.error);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center text-xs font-medium text-neutral-400">Step {step} of 4</div>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <h1 className="text-center text-xl font-semibold">Tell us about you</h1>
          <input
            autoFocus
            placeholder="Full name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-neutral-200 px-4 py-3"
          />
          <input
            placeholder="Designation (e.g. Realtor)"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="rounded-lg border border-neutral-200 px-4 py-3"
          />
          <input
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="rounded-lg border border-neutral-200 px-4 py-3"
          />
          <button
            disabled={!displayName.trim()}
            onClick={() => setStep(2)}
            className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-center text-xl font-semibold">Add a photo</h1>
          <label className="cursor-pointer">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt=""
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100 text-sm text-neutral-400">
                Upload
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
          <div className="flex w-full gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-neutral-200 px-4 py-3"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white"
            >
              {avatarFile ? "Continue" : "Skip for now"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <h1 className="text-center text-xl font-semibold">Pick your link</h1>
          <div className="flex items-center rounded-lg border border-neutral-200 px-4 py-3">
            <span className="text-neutral-400">tapit.in/u/</span>
            <input
              value={username}
              onChange={(e) => {
                setUsernameTouched(true);
                setUsername(e.target.value.toLowerCase());
              }}
              className="flex-1 outline-none"
            />
          </div>
          <p className="text-sm text-neutral-600">
            {usernameStatus === "checking" && "Checking…"}
            {usernameStatus === "available" && <span className="text-green-600">Available</span>}
            {(usernameStatus === "taken" || usernameStatus === "invalid") && (
              <span className="text-red-600">{usernameReason}</span>
            )}
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-neutral-200 px-4 py-3"
            >
              Back
            </button>
            <button
              disabled={usernameStatus !== "available"}
              onClick={() => setStep(4)}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3">
          <h1 className="text-center text-xl font-semibold">Add your links</h1>
          {STARTER_LINKS.map((link) => (
            <div key={link.key} className="rounded-lg border border-neutral-200 p-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!enabledLinks[link.key]}
                  onChange={(e) =>
                    setEnabledLinks((prev) => ({ ...prev, [link.key]: e.target.checked }))
                  }
                />
                <span className="font-medium">{link.label}</span>
              </label>
              {enabledLinks[link.key] && (
                <input
                  type={link.inputType}
                  placeholder={link.placeholder}
                  value={linkValues[link.key] ?? ""}
                  onChange={(e) =>
                    setLinkValues((prev) => ({ ...prev, [link.key]: e.target.value }))
                  }
                  className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex w-full gap-3">
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg border border-neutral-200 px-4 py-3"
            >
              Back
            </button>
            <button
              disabled={submitting || avatarUploading}
              onClick={handleFinish}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Creating your card…" : "Done"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
