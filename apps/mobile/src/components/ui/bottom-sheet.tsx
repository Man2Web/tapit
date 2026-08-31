import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

// House pattern (§13.1a): simple, testable slide-up sheet (RN's built-in Modal, no custom
// gesture handling) — swap for a gesture-driven implementation later if a screen needs it.
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityRole="button"
        />
        <SafeAreaView edges={["bottom"]} className="rounded-t-xl bg-background">
          <View className="items-center pt-2">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>
          <View className="p-4">{children}</View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
