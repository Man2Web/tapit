import { useState } from "react";
import * as Linking from "expo-linking";
import { Link } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("/reset-password"),
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      // Padding lives on this inner View, not the SafeAreaView — see docs/DECISIONS.md
      // (SafeAreaView's inline inset style silently overrides className padding).
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-6 pt-12">
          <Text variant="muted" className="text-center">
            If an account exists for{" "}
            <Text className="font-medium text-foreground">{email}</Text>, a reset link is on
            its way. Open it on this device to finish resetting your password.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-4 px-6 pt-12">
        <View className="mb-2 items-center gap-1">
          <Text variant="h3">Reset your password</Text>
          <Text variant="muted">We&apos;ll email you a link.</Text>
        </View>

        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        {error && <Text className="text-sm text-danger">{error}</Text>}

        <Button onPress={handleSubmit} loading={submitting} disabled={!email}>
          Send reset link
        </Button>

        <Link href="/login" className="text-center text-muted-foreground">
          Back to sign in
        </Link>
      </View>
    </SafeAreaView>
  );
}
