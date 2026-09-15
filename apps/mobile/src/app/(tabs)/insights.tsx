import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Insights = { views: number; qr_views: number; vcard_saves: number };
type DateRange = "today" | "7d" | "30d" | "90d" | "all";

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "all", label: "All Time" },
];

const EMPTY_INSIGHTS: Insights = { views: 0, qr_views: 0, vcard_saves: 0 };

function MetricProgressBar({
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
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon} size={16} color={color} />
          <Text className="text-xs font-semibold text-foreground">{label}</Text>
        </View>
        <Text className="text-xs font-bold text-foreground">{value} ({pct}%)</Text>
      </View>

      <View className="h-2 w-full rounded-full bg-accent/80 overflow-hidden border border-border/40">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.max(4, pct)}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  iconColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: number;
  subtitle: string;
  iconColor: string;
}) {
  return (
    <Card className="rounded-2xl border border-border/80 p-5 shadow-xs gap-3 bg-card">
      <View className="flex-row items-center justify-between">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent border border-border/60">
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      </View>

      <View>
        <Text className="text-3xl font-extrabold text-foreground">{value}</Text>
        <Text className="text-sm font-bold text-foreground mt-1">{label}</Text>
        <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
      </View>
    </Card>
  );
}

export default function InsightsScreen() {
  const { session } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [leadCount, setLeadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      (async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("owner_id", session.user.id)
          .eq("is_primary", true)
          .maybeSingle();

        if (profile) {
          const { count } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", profile.id);

          setLeadCount(count ?? 0);
        }

        const { data } = await supabase.rpc("get_profile_insights").single();
        setInsights(data ?? EMPTY_INSIGHTS);
        setLoading(false);
      })();
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
  const totalInteractions = stats.views + stats.qr_views + stats.vcard_saves;
  const maxGoal = Math.max(1, totalInteractions);
  const conversionRate = stats.views > 0 ? Math.round((leadCount / stats.views) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-6 pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="gap-1">
          <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
            Analytics & Activity
          </Text>
          <Text variant="muted" className="text-xs text-muted-foreground">
            Performance telemetry, channel distribution & lead conversion rates.
          </Text>
        </View>

        {/* Date Range Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {DATE_RANGES.map((range) => {
            const isSelected = dateRange === range.id;
            return (
              <Pressable
                key={range.id}
                onPress={() => setDateRange(range.id)}
                className={`rounded-lg px-3.5 py-1.5 border transition-colors ${
                  isSelected
                    ? "bg-primary border-primary shadow-xs"
                    : "bg-card border-border active:bg-secondary"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  {range.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Lead Conversion Overview Hero */}
        <Card className="gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
              <Text className="text-sm font-bold text-foreground">Lead Conversion Rate</Text>
            </View>
            <View className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/20">
              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {conversionRate}% Rate
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-1">
            <View>
              <Text className="text-2xl font-extrabold text-foreground">{leadCount}</Text>
              <Text className="text-xs text-muted-foreground">Leads Captured</Text>
            </View>
            <View className="h-8 w-px bg-border/60" />
            <View>
              <Text className="text-2xl font-extrabold text-foreground">{stats.views}</Text>
              <Text className="text-xs text-muted-foreground">Profile Visitors</Text>
            </View>
            <View className="h-8 w-px bg-border/60" />
            <View>
              <Text className="text-2xl font-extrabold text-foreground">{stats.vcard_saves}</Text>
              <Text className="text-xs text-muted-foreground">vCard Saves</Text>
            </View>
          </View>
        </Card>

        {/* Activity Distribution Card */}
        <Card className="gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
              <Text className="text-sm font-bold text-foreground">Interaction Distribution</Text>
            </View>
            <Text className="text-xs font-medium text-muted-foreground">Total: {totalInteractions}</Text>
          </View>

          <View className="gap-3.5 pt-1">
            <MetricProgressBar
              label="Web Profile Views"
              value={stats.views}
              max={maxGoal}
              color="#2563EB"
              icon="globe-outline"
            />
            <MetricProgressBar
              label="QR Code Scans"
              value={stats.qr_views}
              max={maxGoal}
              color="#7C2FD6"
              icon="qr-code-outline"
            />
            <MetricProgressBar
              label="vCard Contact Downloads"
              value={stats.vcard_saves}
              max={maxGoal}
              color="#10B981"
              icon="download-outline"
            />
          </View>
        </Card>

        {/* Detailed Metric Cards */}
        <View className="gap-4">
          <StatCard
            icon="globe-outline"
            label="Total Profile Views"
            value={stats.views}
            subtitle="Number of times your digital card link was accessed"
            iconColor="#2563EB"
          />

          <StatCard
            icon="qr-code-outline"
            label="QR Code Scans"
            value={stats.qr_views}
            subtitle="Direct scans recorded from your QR code"
            iconColor="#7C2FD6"
          />

          <StatCard
            icon="person-add-outline"
            label="vCard Contact Downloads"
            value={stats.vcard_saves}
            subtitle="Contacts who downloaded your pre-filled contact card"
            iconColor="#10B981"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
