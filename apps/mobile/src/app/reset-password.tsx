import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { supabase } from "@/lib/supabase";

// Deliberately NOT under (auth) or (tabs) — both of those groups redirect based on
// session/profile state, which would yank the user away mid-flow the instant the
// recovery code exchange below establishes a session, before they've set a new password.
export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [exchanging, setExchanging] = useState(true);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Loading state set synchronously before/around the async code exchange — React's own
  // endorsed "fetch in an effect" pattern, not the anti-pattern this rule targets.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!code) {
      setExchanging(false);
      setExchangeError("This reset link is invalid or has expired.");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      setExchanging(false);
      if (error) setExchangeError("This reset link is invalid or has expired.");
    });
  }, [code]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
  }

  if (exchanging) {
    return (
      // Padding lives on this inner View, not the SafeAreaView — see docs/DECISIONS.md
      // (SafeAreaView's inline inset style silently overrides className padding).
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 pt-12">
          <Text variant="muted">Verifying link…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (exchangeError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-6 pt-12">
          <Text variant="muted" className="text-center">
            {exchangeError}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-4 px-6 pt-12">
        <View className="mb-2 items-center">
          <Text variant="h3">Choose a new password</Text>
        </View>

        <Input
          placeholder="New password"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />
        <Input
          placeholder="Confirm new password"
          secureTextEntry
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {error && <Text className="text-sm text-danger">{error}</Text>}

        <Button onPress={handleSubmit} loading={submitting}>
          Save new password
        </Button>
      </View>
    </SafeAreaView>
  );
}
