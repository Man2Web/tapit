import { View } from "react-native";
import { Text } from "@/components/ui/text";

type Metric = {
  label: string;
  value: number;
};

type HomeActivityRowProps = {
  metrics: Metric[];
};

/**
 * Horizontal row of 4 activity metrics in a uniform muted style.
 * No colored icons, no gradients, no card-per-metric.
 */
export function HomeActivityRow({ metrics }: HomeActivityRowProps) {
  if (metrics.every((m) => m.value === 0)) {
    return null;
  }

  return (
    <View className="w-full">
      <Text className="text-sm font-semibold text-foreground mb-3">
        Activity
      </Text>
      <View className="flex-row rounded-lg border border-border bg-card">
        {metrics.map((metric, i) => (
          <View
            key={metric.label}
            className={`flex-1 items-center py-3.5 ${
              i < metrics.length - 1 ? "border-r border-border" : ""
            }`}
          >
            <Text className="text-lg font-semibold text-foreground">
              {metric.value.toLocaleString()}
            </Text>
            <Text className="text-[11px] text-muted-foreground mt-0.5">
              {metric.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
