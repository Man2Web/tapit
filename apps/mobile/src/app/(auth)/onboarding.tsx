import { useEffect, useRef, useState, type ComponentProps } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { STARTER_LINKS, suggestUsername, type StarterLinkDef } from "@tapit/core";
import { Avatar, type AvatarFocusMode } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { UsernameStatus as UsernameStatusIndicator } from "@/components/ui/username-status";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  ProfilePhotoEditor,
  type AspectMask,
  type ColorFilter,
  type PhotoEditorResult,
} from "@/components/ui/profile-photo-editor";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type UsernameCheckStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function OnboardingScreen() {
  const { session, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [designation, setDesignation] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarFocusMode, setAvatarFocusMode] = useState<AvatarFocusMode>("head");
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  // Full-Screen Photo Editor State
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorImageUri, setEditorImageUri] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheckStatus>("idle");
  const [usernameReason, setUsernameReason] = useState<string | null>(null);

  const [enabledLinks, setEnabledLinks] = useState<Record<string, boolean>>({});
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkSeq = useRef(0);

  const [lastSuggestedFor, setLastSuggestedFor] = useState("");
  if (!usernameTouched && displayName !== lastSuggestedFor) {
    setLastSuggestedFor(displayName);
    setUsername(suggestUsername(displayName));
  }

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

  async function pickImage(source: "camera" | "library") {
    setPhotoSheetOpen(false);
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false });

    if (!result.canceled && result.assets[0]) {
      setEditorImageUri(result.assets[0].uri);
      setEditorVisible(true);
    }
  }

  function handleSaveEditedPhoto(res: PhotoEditorResult) {
    setAvatarUri(res.imageUri);
    setAvatarFocusMode(res.focusMode);
    setAvatarZoom(res.zoom);
    setAvatarPanX(res.panX);
    setAvatarPanY(res.panY);
    setAvatarRotation(res.rotation);
    setAvatarAspectMask(res.aspectMask ?? "circle");
    setAvatarColorFilter(res.colorFilter ?? "normal");
  }

  const [avatarZoom, setAvatarZoom] = useState(1.0);
  const [avatarPanX, setAvatarPanX] = useState(0);
  const [avatarPanY, setAvatarPanY] = useState(0);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [avatarAspectMask, setAvatarAspectMask] = useState<AspectMask>("circle");
  const [avatarColorFilter, setAvatarColorFilter] = useState<ColorFilter>("normal");

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
        theme: {
          avatar_focus: avatarFocusMode,
          avatar_zoom: avatarZoom,
          avatar_pan_x: avatarPanX,
          avatar_pan_y: avatarPanY,
          avatar_rotation: avatarRotation,
          avatar_aspect_mask: avatarAspectMask,
          avatar_color_filter: avatarColorFilter,
          template: "apple_minimal",
          primary: "#0071E3",
        } as any,
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
        return {
          kind: l.kind,
          platform: l.platform ?? null,
          label: l.label,
          value: l.formatValue(raw),
          icon: l.icon,
        };
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-6 pt-12 pb-8" keyboardShouldPersistTaps="handled">
        {step > 0 && (
          <Text className="text-center text-xs font-medium text-muted-foreground">
            Step {step} of 4
          </Text>
        )}

        {step === 0 && (
          <View className="flex-1 items-center justify-center gap-4 py-12">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg">
              <Ionicons name="card" size={36} color={colors.card} />
            </View>
            <View className="items-center gap-1.5">
              <Text variant="h3">Welcome to TapIt</Text>
              <Text variant="muted" className="text-center">
                Your digital visiting card. Set it up once, share it forever — by link, QR, or
                a tap.
              </Text>
            </View>
            <Button
              icon="chevron-forward"
              iconPosition="right"
              onPress={() => setStep(1)}
              className="mt-4 w-full rounded-full py-3.5"
            >
              Get Started
            </Button>
          </View>
        )}

        {step === 1 && (
          <View className="gap-3">
            <Text variant="h3" className="text-center">
              Tell us about you
            </Text>
            <Input placeholder="Full name" value={displayName} onChangeText={setDisplayName} autoFocus className="rounded-2xl" />
            <Input
              placeholder="Job Title (e.g. Realtor)"
              value={designation}
              onChangeText={setDesignation}
              className="rounded-2xl"
            />
            <Input placeholder="Organization Name" value={company} onChangeText={setCompany} className="rounded-2xl" />
            <Input
              placeholder="Bio — a line or two about you"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              className="min-h-20 rounded-2xl"
            />
            <Button
              icon="chevron-forward"
              iconPosition="right"
              onPress={() => setStep(2)}
              disabled={!displayName.trim()}
              className="mt-2 rounded-full py-3.5"
            >
              Continue
            </Button>
          </View>
        )}

        {step === 2 && (
          <View className="items-center gap-4">
            <Text variant="h3" className="text-center">
              Add your profile photo
            </Text>
            <Pressable onPress={() => setPhotoSheetOpen(true)}>
              <Avatar
                uri={avatarUri}
                size={110}
                fallbackIcon="camera-outline"
                focusMode={avatarFocusMode}
                showEditBadge
              />
            </Pressable>

            <View className="flex-row gap-2.5 w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                icon="camera-outline"
                onPress={() => setPhotoSheetOpen(true)}
                className="flex-1 rounded-full border-border/70"
              >
                {avatarUri ? "Change Photo" : "Add Photo"}
              </Button>

              {avatarUri && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="create-outline"
                  onPress={() => {
                    setEditorImageUri(avatarUri);
                    setEditorVisible(true);
                  }}
                  className="flex-1 rounded-full"
                >
                  Adjust & Crop
                </Button>
              )}
            </View>

            <View className="w-full flex-row gap-3 pt-4">
              <Button
                variant="secondary"
                icon="chevron-back"
                onPress={() => setStep(1)}
                className="flex-1 rounded-full"
              >
                Back
              </Button>
              <Button
                icon="chevron-forward"
                iconPosition="right"
                onPress={() => setStep(3)}
                className="flex-1 rounded-full shadow-sm"
              >
                {avatarUri ? "Continue" : "Skip for now"}
              </Button>
            </View>

            <BottomSheet visible={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)}>
              <View className="gap-2.5 pb-2">
                <Text variant="h4" className="text-center font-bold">
                  Add Profile Photo
                </Text>
                <Button
                  variant="outline"
                  icon="camera-outline"
                  onPress={() => pickImage("camera")}
                  className="rounded-full py-3.5 justify-start border-border/70"
                >
                  Take Photo with Camera
                </Button>
                <Button
                  variant="outline"
                  icon="images-outline"
                  onPress={() => pickImage("library")}
                  className="rounded-full py-3.5 justify-start border-border/70"
                >
                  Choose from Photo Library
                </Button>

                {avatarUri && (
                  <Button
                    variant="outline"
                    icon="create-outline"
                    onPress={() => {
                      setPhotoSheetOpen(false);
                      setEditorImageUri(avatarUri);
                      setEditorVisible(true);
                    }}
                    className="rounded-full py-3.5 justify-start border-border/70"
                  >
                    Edit & Adjust Photo
                  </Button>
                )}

                {avatarUri && (
                  <Button
                    variant="destructive"
                    icon="trash-outline"
                    onPress={() => {
                      setPhotoSheetOpen(false);
                      setAvatarUri(null);
                    }}
                    className="rounded-full py-3.5 justify-start"
                  >
                    Remove Photo
                  </Button>
                )}
              </View>
            </BottomSheet>
          </View>
        )}

        {step === 3 && (
          <View className="gap-3">
            <Text variant="h3" className="text-center">
              Pick your link
            </Text>
            <Text className="text-sm font-medium text-foreground">Profile link</Text>
            <View className="flex-row items-center rounded-2xl border border-border px-4 py-3 bg-card">
              <Text className="text-muted-foreground font-medium">tapit.man2web.in/u/</Text>
              <Input
                value={username}
                onChangeText={(v) => {
                  setUsernameTouched(true);
                  setUsername(v.toLowerCase());
                }}
                autoCapitalize="none"
                className="flex-1 border-0 p-0 font-bold text-foreground"
              />
            </View>
            <UsernameStatusIndicator status={usernameStatus} reason={usernameReason} />
            <View className="flex-row gap-3 pt-2">
              <Button
                variant="secondary"
                icon="chevron-back"
                onPress={() => setStep(2)}
                className="flex-1 rounded-full"
              >
                Back
              </Button>
              <Button
                icon="chevron-forward"
                iconPosition="right"
                onPress={() => setStep(4)}
                disabled={usernameStatus !== "available"}
                className="flex-1 rounded-full shadow-sm"
              >
                Continue
              </Button>
            </View>
          </View>
        )}

        {step === 4 && (
          <View className="gap-3">
            <Text variant="h3" className="text-center">
              Add your links
            </Text>
            {STARTER_LINKS.map((link: StarterLinkDef) => (
              <ListRow
                key={link.key}
                leading={
                  <Ionicons
                    name={link.icon as ComponentProps<typeof Ionicons>["name"]}
                    size={20}
                    color={colors.mutedForeground}
                  />
                }
                title={link.label}
                trailing={
                  <Switch
                    value={!!enabledLinks[link.key]}
                    onValueChange={(v) => setEnabledLinks((prev) => ({ ...prev, [link.key]: v }))}
                  />
                }
                footer={
                  enabledLinks[link.key] ? (
                    <Input
                      placeholder={link.placeholder}
                      value={linkValues[link.key] ?? ""}
                      onChangeText={(v) => setLinkValues((prev) => ({ ...prev, [link.key]: v }))}
                      autoCapitalize="none"
                      className="rounded-xl"
                    />
                  ) : undefined
                }
              />
            ))}

            {submitError && (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text className="text-sm text-danger">{submitError}</Text>
              </View>
            )}

            <View className="flex-row gap-3 pt-2">
              <Button
                variant="secondary"
                icon="chevron-back"
                onPress={() => setStep(3)}
                className="flex-1 rounded-full"
              >
                Back
              </Button>
              <Button
                icon="checkmark"
                iconPosition="right"
                onPress={handleFinish}
                loading={submitting}
                className="flex-1 rounded-full shadow-sm"
              >
                Done
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Full Screen Photo Editor Modal for Onboarding */}
      <ProfilePhotoEditor
        visible={editorVisible}
        imageUri={editorImageUri}
        initialFocusMode={avatarFocusMode}
        initialZoom={avatarZoom}
        initialPanX={avatarPanX}
        initialPanY={avatarPanY}
        initialRotation={avatarRotation}
        initialAspectMask={avatarAspectMask}
        initialColorFilter={avatarColorFilter}
        onClose={() => setEditorVisible(false)}
        onSave={handleSaveEditedPhoto}
      />
    </SafeAreaView>
  );
}
