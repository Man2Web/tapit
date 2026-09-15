import { useEffect } from "react";
import { router, Tabs, useRootNavigationState } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";

export default function TabsLayout() {
  const rootNavigationState = useRootNavigationState();
  const { session, hasProfile, loading } = useAuth();

  useEffect(() => {
    if (!rootNavigationState?.key || loading) return;

    if (!session) {
      router.replace("/login");
    } else if (hasProfile === false) {
      router.replace("/onboarding");
    }
  }, [session, hasProfile, loading, rootNavigationState?.key]);

  if (!rootNavigationState?.key || loading || !session || hasProfile === false) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: "rgba(0, 0, 0, 0.08)",
          elevation: 0,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 8 : 8,
        },
        tabBarItemStyle: {
          paddingBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: -0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Identity",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: "Share",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "share" : "share-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Contacts",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} color={color} size={size} />
          ),
        }}
      />
      {/* Hidden routes — accessible via stack navigation, not tab bar */}
      <Tabs.Screen name="devices" options={{ href: null }} />
      <Tabs.Screen name="teams" options={{ href: null }} />
      <Tabs.Screen name="shop" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
