import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ListRow } from "@/components/ui/list-row";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function SettingsScreen() {
  const { session } = useAuth();

  return (
    <SafeAreaView className="flex-1 gap-4 bg-white px-6 pt-12">
      {session?.user.email && (
        <Text className="text-sm text-neutral-500">Signed in as {session.user.email}</Text>
      )}

      <View className="gap-3">
        <ListRow
          title="Sign out"
          leading={<Ionicons name="log-out-outline" size={20} color="#dc2626" />}
          onPress={() => supabase.auth.signOut()}
        />
      </View>
    </SafeAreaView>
  );
}
