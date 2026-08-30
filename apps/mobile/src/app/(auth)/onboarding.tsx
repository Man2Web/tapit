import { useEffect, useRef, useState, type ComponentProps } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { STARTER_LINKS, suggestUsername, type StarterLinkDef } from "@tapit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function OnboardingScreen() {
  const { session, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);

  const [displayName, setDisplayName] = useState("");
  const [designation, setDesignation] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameReason, setUsernameReason] = useState<string | null>(null);

  const [enabledLinks, setEnabledLinks] = useState<Record<string, boolean>>({});
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkSeq = useRef(0);

  // Adjusted during render (not an effect) per React's guidance for "derive state from a
  // prop, but allow local override": https://react.dev/learn/you-might-not-need-an-effect
  const [lastSuggestedFor, setLastSuggestedFor] = useState("");
  if (!usernameTouched && displayName !== lastSuggestedFor) {
    setLastSuggestedFor(displayName);
    setUsername(suggestUsername(displayName));
  }

  // The debounced availability check below sets a "checking"/"idle" loading status
  // synchronously before its async call — React's own endorsed "fetch in an effect"
  // pattern (https://react.dev/learn/you-might-not-need-an-effect#fetching-data).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const seq = ++checkSeq.current;
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_username_available", {
        check_username: username,
      });
      if (checkSeq.current !== seq) return;
      if (error || !data) {
        setUsernameStatus(error ? "invalid" : "taken");
        setUsernameReason(error ? "Couldn't check right now — try again." : "That username is taken.");
      } else {
        setUsernameStatus("available");
        setUsernameReason(null);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [username]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function pickImage(source: "camera" | "library") {
    setPhotoSheetOpen(false);
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarUri || !session) return null;
    const response = await fetch(avatarUri);
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1] ?? "jpg";
    const path = `${session.user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      setSubmitError(`Photo upload failed: ${error.message}`);
      return null;
    }
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function handleFinish() {
    if (!session) return;
    setSubmitting(true);
    setSubmitError(null);

    const avatarUrl = await uploadAvatar();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        owner_id: session.user.id,
        username,
        display_name: displayName,
        designation: designation || null,
        company: company || null,
        bio: bio || null,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (profileError || !profile) {
      setSubmitting(false);
      setSubmitError(
        profileError?.code === "23505"
          ? "That username was just taken — go back and try another."
          : profileError?.message ?? "Something went wrong.",
      );
      return;
    }

    const links = STARTER_LINKS.filter((l) => enabledLinks[l.key])
      .map((l) => {
        const raw = linkValues[l.key];
        if (!raw?.trim()) return null;
        return { kind: l.kind, platform: l.platform ?? null, label: l.label, value: l.formatValue(raw) };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    if (links.length > 0) {
      await supabase.from("profile_links").insert(
        links.map((link, position) => ({ ...link, profile_id: profile.id, position })),
      );
    }

    await supabase
      .from("user_profiles")
      .update({ onboarding_done: true, full_name: displayName })
      .eq("id", session.user.id);

    await refreshProfile();
    setSubmitting(false);
    router.replace("/");
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="gap-4 px-6 py-8" keyboardShouldPersistTaps="handled">
        <Text className="text-center text-xs font-medium text-neutral-400">Step {step} of 4</Text>

        {step === 1 && (
          <View className="gap-3">
            <Text className="text-center text-xl font-semibold">Tell us about you</Text>
            <Input placeholder="Full name" value={displayName} onChangeText={setDisplayName} autoFocus />
            <Input
              placeholder="Job Title (e.g. Realtor)"
              value={designation}
              onChangeText={setDesignation}
            />
            <Input placeholder="Organization Name" value={company} onChangeText={setCompany} />
            <Input
              placeholder="Bio — a line or two about you"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              className="min-h-20"
            />
            <Button
              icon="chevron-forward"
              iconPosition="right"
              onPress={() => setStep(2)}
              disabled={!displayName.trim()}
              className="mt-2"
            >
              Continue
            </Button>
          </View>
        )}

        {step === 2 && (
          <View className="items-center gap-4">
            <Text className="text-center text-xl font-semibold">Add a photo</Text>
            <Pressable onPress={() => setPhotoSheetOpen(true)}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} className="h-24 w-24 rounded-full" />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-full bg-neutral-100">
                  <Ionicons name="camera-outline" size={28} color="#9ca3af" />
                </View>
              )}
            </Pressable>
            <View className="w-full flex-row gap-3">
              <Button
                variant="secondary"
                icon="chevron-back"
                onPress={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                icon="chevron-forward"
                iconPosition="right"
                onPress={() => setStep(3)}
                className="flex-1"
              >
                {avatarUri ? "Continue" : "Skip for now"}
              </Button>
            </View>

            <BottomSheet visible={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)}>
              <View className="gap-2">
                <Button variant="secondary" icon="camera-outline" onPress={() => pickImage("camera")}>
                  Take Photo
                </Button>
                <Button
                  variant="secondary"
                  icon="images-outline"
                  onPress={() => pickImage("library")}
                >
                  Choose from Library
                </Button>
              </View>
            </BottomSheet>
          </View>
        )}

        {step === 3 && (
          <View className="gap-3">
            <Text className="text-center text-xl font-semibold">Pick your link</Text>
            <Text className="text-sm font-medium text-neutral-700">Profile link</Text>
            <View className="flex-row items-center rounded-md border border-neutral-200 px-4 py-3">
              <Text className="text-neutral-400">tapit.in/u/</Text>
              <Input
                value={username}
                onChangeText={(v) => {
                  setUsernameTouched(true);
                  setUsername(v.toLowerCase());
                }}
                autoCapitalize="none"
                className="flex-1 border-0 p-0"
              />
            </View>
            {usernameStatus !== "idle" && (
              <View className="flex-row items-center gap-1.5">
                {usernameStatus === "checking" && (
                  <Text className="text-sm text-neutral-600">Checking…</Text>
                )}
                {usernameStatus === "available" && (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text className="text-sm text-success">Available</Text>
                  </>
                )}
                {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                  <>
                    <Ionicons name="alert-circle" size={16} color="#dc2626" />
                    <Text className="text-sm text-danger">{usernameReason}</Text>
                  </>
                )}
              </View>
            )}
            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                icon="chevron-back"
                onPress={() => setStep(2)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                icon="chevron-forward"
                iconPosition="right"
                onPress={() => setStep(4)}
                disabled={usernameStatus !== "available"}
                className="flex-1"
              >
                Continue
              </Button>
            </View>
          </View>
        )}

        {step === 4 && (
          <View className="gap-3">
            <Text className="text-center text-xl font-semibold">Add your links</Text>
            {STARTER_LINKS.map((link: StarterLinkDef) => (
              <View key={link.key} className="rounded-md border border-neutral-200 p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name={link.icon as ComponentProps<typeof Ionicons>["name"]}
                      size={20}
                      color="#4b5563"
                    />
                    <Text className="font-medium">{link.label}</Text>
                  </View>
                  <Switch
                    value={!!enabledLinks[link.key]}
                    onValueChange={(v) => setEnabledLinks((prev) => ({ ...prev, [link.key]: v }))}
                  />
                </View>
                {enabledLinks[link.key] && (
                  <Input
                    placeholder={link.placeholder}
                    value={linkValues[link.key] ?? ""}
                    onChangeText={(v) => setLinkValues((prev) => ({ ...prev, [link.key]: v }))}
                    autoCapitalize="none"
                    className="mt-2"
                  />
                )}
              </View>
            ))}

            {submitError && (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text className="text-sm text-danger">{submitError}</Text>
              </View>
            )}

            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                icon="chevron-back"
                onPress={() => setStep(3)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                icon="checkmark"
                iconPosition="right"
                onPress={handleFinish}
                loading={submitting}
                className="flex-1"
              >
                Done
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
