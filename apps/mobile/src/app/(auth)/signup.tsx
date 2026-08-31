import { useState } from "react";
import { Link, router } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { supabase } from "@/lib/supabase";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.replace("/");
      return;
    }
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      // Padding lives on this inner View, not the SafeAreaView — see docs/DECISIONS.md
      // (SafeAreaView's inline inset style silently overrides className padding).
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-6 pt-12">
          <Text variant="muted" className="text-center">
            Check <Text className="font-medium text-foreground">{email}</Text> for a
            confirmation link to finish signing up.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-4 px-6 pt-12">
        <View className="mb-2 items-center gap-1">
          <Text variant="h3">Create your account</Text>
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
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />
        <Input
          placeholder="Confirm password"
          secureTextEntry
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {error && <Text className="text-sm text-danger">{error}</Text>}

        <Button onPress={handleSubmit} loading={submitting} disabled={!email || !password}>
          Create account
        </Button>

        <Link href="/login" className="text-center text-muted-foreground">
          Already have an account? <Text className="font-medium underline">Sign in</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
