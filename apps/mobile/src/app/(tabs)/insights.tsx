import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Insights = { views: number; qr_views: number; vcard_saves: number };

const EMPTY_INSIGHTS: Insights = { views: 0, qr_views: 0, vcard_saves: 0 };

function AppleStatCard({
  icon,
  label,
  value,
  subtitle,
  iconBgClass,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: number;
  subtitle: string;
  iconBgClass: string;
}) {
  return (
    <View className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm gap-3">
      <View className="flex-row items-center justify-between">
        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${iconBgClass}`}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <Ionicons name="sparkles" size={16} color={colors.muted} />
      </View>

      <View>
        <Text className="text-3xl font-extrabold text-foreground">{value}</Text>
        <Text className="text-sm font-bold text-foreground mt-0.5">{label}</Text>
        <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const { session } = useAuth();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

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
      <ScrollView contentContainerClassName="gap-5 px-5 pt-8 pb-12">
        <View>
          <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
            Insights & Analytics
          </Text>
          <Text variant="muted" className="text-xs">
            Live profile engagement & card downloads
          </Text>
        </View>

        <View className="gap-3.5 pt-1">
          <AppleStatCard
            icon="eye-outline"
            label="Total Profile Visits"
            value={stats.views}
            subtitle="Times your web digital card link was opened"
            iconBgClass="bg-primary/10"
          />

          <AppleStatCard
            icon="qr-code-outline"
            label="QR Code Scans"
            value={stats.qr_views}
            subtitle="Scans recorded from physical QR card code"
            iconBgClass="bg-indigo-500/10"
          />

          <AppleStatCard
            icon="download-outline"
            label="vCard Contact Saves"
            subtitle="Phone address book contacts exported"
            value={stats.vcard_saves}
            iconBgClass="bg-emerald-500/10"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
