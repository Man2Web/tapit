import { useState } from "react";
import { Link, router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <SafeAreaView className="flex-1 justify-center gap-4 bg-white px-6">
      <View className="mb-2 items-center">
        <Text className="text-2xl font-semibold">Sign in to TapIt</Text>
        <Text className="mt-1 text-neutral-600">Your digital visiting card.</Text>
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

      <Link href="/signup" className="text-center text-neutral-600">
        No account? <Text className="font-medium underline">Sign up</Text>
      </Link>
    </SafeAreaView>
  );
}
