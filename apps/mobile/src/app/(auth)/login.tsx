import { useState } from "react";
import { Link, router } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
  }

  return (
    // Padding lives on this inner View, not the SafeAreaView itself — SafeAreaView injects
    // its own inline `style` from safe-area insets, which (being inline) silently overrides
    // any px-*/pt-*/pb-* class applied directly on it. See docs/DECISIONS.md.
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-4 px-6 pt-12">
        <View className="mb-2 items-center gap-1">
          <Text variant="h3">Sign in to TapIt</Text>
          <Text variant="muted">Your digital visiting card.</Text>
        </View>

        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          placeholder="Password"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />
        {error && <Text className="text-sm text-danger">{error}</Text>}

        <Button onPress={handleSubmit} loading={submitting} disabled={!email || !password}>
          Sign in
        </Button>

        <Link href="/forgot-password" className="text-center text-muted-foreground">
          Forgot password?
        </Link>

        <Link href="/signup" className="text-center text-muted-foreground">
          No account? <Text className="font-medium underline">Sign up</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
