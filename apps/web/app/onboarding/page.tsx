import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/session";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("owner_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (existing) {
    redirect("/dashboard");
  }

  return <OnboardingWizard userId={user.id} />;
}
