import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function TabsLayout() {
  const { session, hasProfile } = useAuth();

  if (!session) {
    return <Redirect href="/login" />;
  }
  if (hasProfile === false) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Card" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
