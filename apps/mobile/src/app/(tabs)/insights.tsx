import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Insights = { views: number; qr_views: number; vcard_saves: number };

const EMPTY_INSIGHTS: Insights = { views: 0, qr_views: 0, vcard_saves: 0 };

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: number;
}) {
  return (
    <Card className="flex-1 items-center gap-2 py-5">
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text variant="h3">{value}</Text>
      <Text variant="muted" className="text-center text-sm">
        {label}
      </Text>
    </Card>
  );
}

export default function InsightsScreen() {
  const { session } = useAuth();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  // Refetches whenever this tab regains focus, same pattern as the Card tab, so a fresh
  // share/QR scan shows up next time the user checks without needing an app reload.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .rpc("get_profile_insights")
        .single()
        .then(({ data }) => {
          setInsights(data ?? EMPTY_INSIGHTS);
          setLoading(false);
        });
    }, [session]),
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const stats = insights ?? EMPTY_INSIGHTS;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-4 px-6 pt-16">
        <Text variant="h4">Insights</Text>
        <Text variant="muted" className="-mt-2 text-sm">
          How people are finding and saving your card.
        </Text>

        <View className="flex-row gap-3">
          <StatCard icon="eye-outline" label="Profile Views" value={stats.views} />
          <StatCard icon="qr-code-outline" label="QR Scans" value={stats.qr_views} />
          <StatCard icon="download-outline" label="Saved to Phone" value={stats.vcard_saves} />
        </View>
      </View>
    </SafeAreaView>
  );
}
