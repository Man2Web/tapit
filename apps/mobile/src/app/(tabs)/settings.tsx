import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white px-6 pt-12">
      <View className="gap-3">
        <Button variant="secondary" onPress={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}
