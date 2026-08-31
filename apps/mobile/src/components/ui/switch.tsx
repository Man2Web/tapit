import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from "react-native";
import { colors } from "@/lib/colors";

type SwitchProps = Omit<RNSwitchProps, "trackColor" | "thumbColor">;

// House pattern: the on-brand replacement for RN's bare <Switch>, which otherwise renders
// with the OS default track color (green on Android, unstyled on iOS) instead of the brand
// color every other interactive control in the app uses.
export function Switch(props: SwitchProps) {
  return (
    <RNSwitch
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.card}
      {...props}
    />
  );
}
