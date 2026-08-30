import { useState } from "react";
import { Link, router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <SafeAreaView className="flex-1 justify-center px-6">
        <Text className="text-center text-neutral-600">
          Check <Text className="font-medium">{email}</Text> for a confirmation link to finish
          signing up.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 justify-center gap-4 bg-white px-6">
      <View className="mb-2 items-center">
        <Text className="text-2xl font-semibold">Create your account</Text>
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

      <Link href="/login" className="text-center text-neutral-600">
        Already have an account? <Text className="font-medium underline">Sign in</Text>
      </Link>
    </SafeAreaView>
  );
}
