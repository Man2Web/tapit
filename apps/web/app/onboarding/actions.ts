"use server";

import { redirect } from "next/navigation";
import { usernameSchema, profileSchema } from "@tapit/types";
import { createClient } from "@/lib/supabase/session";

export async function checkUsername(
  username: string,
): Promise<{ available: boolean; reason?: string }> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    return { available: false, reason: parsed.error.issues[0]?.message ?? "Invalid username" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_username_available", {
    check_username: parsed.data,
  });

  if (error) {
    return { available: false, reason: "Couldn't check right now — try again." };
  }
  return { available: data === true };
}

export type OnboardingLink = {
  kind: "phone" | "whatsapp" | "email" | "website" | "social";
  platform?: string;
  label: string;
  value: string;
};

export type OnboardingInput = {
  username: string;
  displayName: string;
  designation?: string;
  company?: string;
  avatarUrl?: string | null;
  links: OnboardingLink[];
};

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = profileSchema.safeParse({
    username: input.username,
    display_name: input.displayName,
    designation: input.designation || null,
    company: input.company || null,
    avatar_url: input.avatarUrl || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      owner_id: user.id,
      username: parsed.data.username,
      display_name: parsed.data.display_name,
      designation: parsed.data.designation,
      company: parsed.data.company,
      avatar_url: parsed.data.avatar_url,
    })
    .select()
    .single();

  if (profileError) {
    if (profileError.code === "23505") {
      return { error: "That username was just taken — go back and try another." };
    }
    return { error: profileError.message };
  }

  if (input.links.length > 0) {
    const { error: linksError } = await supabase.from("profile_links").insert(
      input.links.map((link, position) => ({
        profile_id: profile.id,
        kind: link.kind,
        platform: link.platform ?? null,
        label: link.label,
        value: link.value,
        position,
      })),
    );
    if (linksError) {
      return { error: linksError.message };
    }
  }

  await supabase
    .from("user_profiles")
    .update({ onboarding_done: true, full_name: parsed.data.display_name })
    .eq("id", user.id);

  redirect("/dashboard");
}
