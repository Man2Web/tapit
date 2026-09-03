import { useEffect } from "react";
import { router, Stack, useRootNavigationState } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function AuthLayout() {
  const rootNavigationState = useRootNavigationState();
  const { session, hasProfile, loading } = useAuth();

  useEffect(() => {
    if (!rootNavigationState?.key || loading) return;

    if (session && hasProfile) {
      router.replace("/");
    }
  }, [session, hasProfile, loading, rootNavigationState?.key]);

  if (!rootNavigationState?.key || loading || (session && hasProfile)) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
