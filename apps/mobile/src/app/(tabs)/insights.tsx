import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Insights = { views: number; qr_views: number; vcard_saves: number };

const EMPTY_INSIGHTS: Insights = { views: 0, qr_views: 0, vcard_saves: 0 };

function ActivityRingBar({
  label,
  value,
  max,
  color,
  icon,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon} size={16} color={color} />
          <Text className="text-xs font-bold text-foreground">{label}</Text>
        </View>
        <Text className="text-xs font-extrabold text-foreground">{value} ({pct}%)</Text>
      </View>

      <View className="h-3 w-full rounded-full bg-accent/60 overflow-hidden border border-border/40">
        <View
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(6, pct)}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

function AppleStatCard({
  icon,
  label,
  value,
  subtitle,
  iconBgClass,
  iconColor,
  trend,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: number;
  subtitle: string;
  iconBgClass: string;
  iconColor: string;
  trend: string;
}) {
  return (
    <Card className="rounded-3xl border border-border/60 p-5 shadow-xs gap-3 bg-card">
      <View className="flex-row items-center justify-between">
        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${iconBgClass}`}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20">
          <Ionicons name="trending-up" size={12} color="#10B981" />
          <Text className="text-[11px] font-bold text-emerald-600">{trend}</Text>
        </View>
      </View>

      <View>
        <Text className="text-3xl font-extrabold text-foreground">{value}</Text>
        <Text className="text-sm font-bold text-foreground mt-0.5">{label}</Text>
        <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
      </View>
    </Card>
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
  const maxGoal = Math.max(10, stats.views + stats.qr_views + stats.vcard_saves);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-6 pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
              Card Analytics
            </Text>
            <Text variant="muted" className="text-xs">
              Live engagement & conversion telemetry
            </Text>
          </View>

          <View className="rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
            <Text className="text-xs font-bold text-primary">Apple Health Activity</Text>
          </View>
        </View>

        {/* 🔴🟢🔵 Apple Activity Summary Ring Card */}
        <Card className="gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="fitness-outline" size={20} color="#0071E3" />
              <Text className="text-base font-bold text-foreground">Engagement Rings</Text>
            </View>
            <Text className="text-xs font-semibold text-muted-foreground">Total: {stats.views + stats.qr_views + stats.vcard_saves}</Text>
          </View>

          <View className="gap-3 pt-1">
            <ActivityRingBar
              label="Web Profile Views"
              value={stats.views}
              max={maxGoal}
              color="#0071E3"
              icon="eye"
            />
            <ActivityRingBar
              label="Physical QR Scans"
              value={stats.qr_views}
              max={maxGoal}
              color="#7C2FD6"
              icon="qr-code"
            />
            <ActivityRingBar
              label="Address Book Saves"
              value={stats.vcard_saves}
              max={maxGoal}
              color="#10B981"
              icon="download"
            />
          </View>
        </Card>

        {/* Apple Health Metric Grid Cards */}
        <View className="gap-4">
          <AppleStatCard
            icon="globe-outline"
            label="Total Profile Visits"
            value={stats.views}
            subtitle="Times your digital card link was opened worldwide"
            iconBgClass="bg-blue-500/10"
            iconColor="#0071E3"
            trend="+18% this week"
          />

          <AppleStatCard
            icon="qr-code-outline"
            label="Physical QR Code Scans"
            value={stats.qr_views}
            subtitle="Direct scans recorded from your NFC card or QR code"
            iconBgClass="bg-purple-500/10"
            iconColor="#7C2FD6"
            trend="+24% active"
          />

          <AppleStatCard
            icon="person-add-outline"
            label="vCard Address Book Saves"
            value={stats.vcard_saves}
            subtitle="Contacts who downloaded your pre-filled phone vCard"
            iconBgClass="bg-emerald-500/10"
            iconColor="#10B981"
            trend="High Conversion"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
