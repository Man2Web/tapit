import { Pressable, View } from "react-native";
import { router } from "expo-router";
import type { Database } from "@tapit/types";
import { Text } from "@/components/ui/text";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

type HomeConnectionsListProps = {
  leads: Lead[];
};

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

/**
 * Recent connections list for the Home screen.
 * Shows up to 5 most recent leads with initial avatar, name, company, and relative time.
 */
export function HomeConnectionsList({ leads }: HomeConnectionsListProps) {
  if (leads.length === 0) {
    return (
      <View className="w-full">
        <Text className="text-sm font-semibold text-foreground mb-3">
          Recent connections
        </Text>
        <View className="rounded-lg border border-border bg-card px-4 py-6 items-center gap-2">
          <Text className="text-sm text-muted-foreground">
            No connections yet
          </Text>
          <Text className="text-xs text-muted-foreground text-center">
            Share your profile to start building your network.
          </Text>
        </View>
      </View>
    );
  }

  const display = leads.slice(0, 5);

  return (
    <View className="w-full">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-foreground">
          Recent connections
        </Text>
        {leads.length > 5 && (
          <Pressable onPress={() => router.push("/leads")} className="active:opacity-70">
            <Text className="text-xs font-medium text-primary">
              View all
            </Text>
          </Pressable>
        )}
      </View>

      <View className="rounded-lg border border-border bg-card overflow-hidden">
        {display.map((lead, i) => (
          <View
            key={lead.id}
            className={`flex-row items-center gap-3 px-4 py-3 ${
              i < display.length - 1 ? "border-b border-border" : ""
            }`}
          >
            {/* Initial avatar */}
            <View className="h-9 w-9 rounded-full bg-secondary items-center justify-center">
              <Text className="text-sm font-semibold text-foreground">
                {getInitial(lead.name)}
              </Text>
            </View>

            {/* Name and info */}
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                {lead.name || "Unknown"}
              </Text>
              {(lead.designation || lead.company) && (
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {lead.designation}
                  {lead.designation && lead.company ? " · " : ""}
                  {lead.company}
                </Text>
              )}
            </View>

            {/* Time */}
            <Text className="text-[11px] text-muted-foreground">
              {formatRelativeTime(lead.created_at)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
