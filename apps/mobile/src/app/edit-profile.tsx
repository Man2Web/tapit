import { useEffect, useRef, useState, type ComponentProps } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  COLOR_PRESETS,
  STARTER_LINKS,
  WEB_TEMPLATES,
  linkDisplayValue,
  type StarterLinkDef,
  type WebTemplateId,
} from "@tapit/core";
import type { Database } from "@tapit/types";
import { Avatar, type AvatarFocusMode } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { Text } from "@/components/ui/text";
import { UsernameStatus as UsernameStatusIndicator } from "@/components/ui/username-status";
import {
  ProfilePhotoEditor,
  type AspectMask,
  type ColorFilter,
  type PhotoEditorResult,
} from "@/components/ui/profile-photo-editor";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];

type UsernameCheckStatus = "idle" | "checking" | "available" | "taken" | "invalid";
type PhotoTarget = "avatar" | "logo";
type EditorTab = "display" | "identity" | "company" | "links";

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-1 items-center justify-center py-2.5 rounded-full transition-all",
        active ? "bg-card shadow-xs" : "bg-transparent active:bg-accent/50",
      )}
    >
      <Text className={cn("text-xs font-bold", active ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function EditProfileScreen() {
  const { session, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<EditorTab>("display");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [avatarFocusMode, setAvatarFocusMode] = useState<AvatarFocusMode>("head");

  // Advanced Photo Adjustments State
  const [avatarZoom, setAvatarZoom] = useState<number>(1.0);
  const [avatarPanX, setAvatarPanX] = useState<number>(0);
  const [avatarPanY, setAvatarPanY] = useState<number>(0);
  const [avatarRotation, setAvatarRotation] = useState<number>(0);
  const [avatarAspectMask, setAvatarAspectMask] = useState<AspectMask>("circle");
  const [avatarColorFilter, setAvatarColorFilter] = useState<ColorFilter>("normal");

  // Full-Screen Photo Editor Modal State
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorImageUri, setEditorImageUri] = useState<string | null>(null);

  // Web Card Customization State
  const [selectedWebTemplate, setSelectedWebTemplate] = useState<WebTemplateId>("apple_minimal");
  const [selectedColor, setSelectedColor] = useState<string>("#0071E3");
  const [customHex, setCustomHex] = useState<string>("");
  const [selectedRadius, setSelectedRadius] = useState<"rounded" | "pill" | "sharp">("rounded");
  const [selectedDensity, setSelectedDensity] = useState<"spacious" | "compact">("spacious");

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [newLogoUri, setNewLogoUri] = useState<string | null>(null);
  const [photoSheetTarget, setPhotoSheetTarget] = useState<PhotoTarget | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accreditations, setAccreditations] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  const [originalUsername, setOriginalUsername] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheckStatus>("idle");
  const [usernameReason, setUsernameReason] = useState<string | null>(null);

  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [addLinkSheetOpen, setAddLinkSheetOpen] = useState(false);
  const [newLinkDef, setNewLinkDef] = useState<StarterLinkDef | null>(null);
  const [newLinkRawValue, setNewLinkRawValue] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkSeq = useRef(0);
  const customLinkSeq = useRef(0);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("owner_id", session.user.id)
        .eq("is_primary", true)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);
      const themeObj = (profileData.theme ?? {}) as Record<string, unknown>;
      if (typeof themeObj.avatar_focus === "string") {
        setAvatarFocusMode(themeObj.avatar_focus as AvatarFocusMode);
      }
      if (typeof themeObj.avatar_zoom === "number") setAvatarZoom(themeObj.avatar_zoom);
      if (typeof themeObj.avatar_pan_x === "number") setAvatarPanX(themeObj.avatar_pan_x);
      if (typeof themeObj.avatar_pan_y === "number") setAvatarPanY(themeObj.avatar_pan_y);
      if (typeof themeObj.avatar_rotation === "number") setAvatarRotation(themeObj.avatar_rotation);
      if (typeof themeObj.avatar_aspect_mask === "string") setAvatarAspectMask(themeObj.avatar_aspect_mask as AspectMask);
      if (typeof themeObj.avatar_color_filter === "string") setAvatarColorFilter(themeObj.avatar_color_filter as ColorFilter);

      if (typeof themeObj.template === "string") {
        setSelectedWebTemplate(themeObj.template as WebTemplateId);
      }
      if (typeof themeObj.primary === "string") {
        setSelectedColor(themeObj.primary);
      }
      if (typeof themeObj.radius === "string") {
        setSelectedRadius(themeObj.radius as "rounded" | "pill" | "sharp");
      }
      if (typeof themeObj.density === "string") {
        setSelectedDensity(themeObj.density as "spacious" | "compact");
      }

      const [firstFromName, ...restFromName] = profileData.display_name.trim().split(/\s+/);
      setFirstName(profileData.first_name ?? firstFromName ?? "");
      setLastName(profileData.last_name ?? restFromName.join(" "));
      setAccreditations(profileData.accreditations ?? "");
      setPronouns(profileData.pronouns ?? "");
      setDesignation(profileData.designation ?? "");
      setDepartment(profileData.department ?? "");
      setCompany(profileData.company ?? "");
      setBio(profileData.bio ?? "");
      setAvatarUrl(profileData.avatar_url);
      setLogoUrl(profileData.logo_url);
      setOriginalUsername(profileData.username);
      setUsername(profileData.username);

      const { data: linkData } = await supabase
        .from("profile_links")
        .select("*")
        .eq("profile_id", profileData.id)
        .order("position", { ascending: true });

      setLinks(linkData ?? []);
      setLoading(false);
    })();
  }, [session]);

  useEffect(() => {
    if (!username || username === originalUsername) {
      setUsernameStatus("idle");
      setUsernameReason(null);
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
  }, [username, originalUsername]);

  async function pickImage(source: "camera" | "library", target: PhotoTarget) {
    setPhotoSheetTarget(null);
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
      if (target === "avatar") {
        setEditorImageUri(result.assets[0].uri);
        setEditorVisible(true);
      } else {
        setNewLogoUri(result.assets[0].uri);
      }
    }
  }

  async function handleSaveEditedPhoto(res: PhotoEditorResult) {
    setNewAvatarUri(res.imageUri);
    setAvatarFocusMode(res.focusMode);
    setAvatarZoom(res.zoom);
    setAvatarPanX(res.panX);
    setAvatarPanY(res.panY);
    setAvatarRotation(res.rotation);
    setAvatarAspectMask(res.aspectMask ?? "circle");
    setAvatarColorFilter(res.colorFilter ?? "normal");

    // Immediately persist photo adjustment settings to Supabase
    if (profile) {
      const existingTheme = (profile.theme ?? {}) as Record<string, unknown>;
      const updatedTheme = {
        ...existingTheme,
        avatar_focus: res.focusMode,
        avatar_zoom: res.zoom,
        avatar_pan_x: res.panX,
        avatar_pan_y: res.panY,
        avatar_rotation: res.rotation,
        avatar_aspect_mask: res.aspectMask ?? "circle",
        avatar_color_filter: res.colorFilter ?? "normal",
      };

      let finalAvatarUrl = avatarUrl;
      if (res.imageUri && res.imageUri.startsWith("file://")) {
        finalAvatarUrl = await uploadImageIfChanged(res.imageUri, "avatars", avatarUrl);
        setAvatarUrl(finalAvatarUrl);
        setNewAvatarUri(null);
      }

      await supabase
        .from("profiles")
        .update({
          avatar_url: finalAvatarUrl,
          theme: updatedTheme as any,
        })
        .eq("id", profile.id);

      setProfile({
        ...profile,
        avatar_url: finalAvatarUrl,
        theme: updatedTheme as any,
      });
      refreshProfile();
    }
  }

  async function uploadImageIfChanged(
    uri: string | null,
    bucket: "avatars" | "logos",
    fallbackUrl: string | null,
  ): Promise<string | null> {
    if (!uri || !session || !uri.startsWith("file://")) return fallbackUrl;
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1] ?? "jpg";
    const path = `${session.user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      setSubmitError(`${bucket === "avatars" ? "Photo" : "Logo"} upload failed: ${error.message}`);
      return fallbackUrl;
    }
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function handleSave() {
    if (!session || !profile) return;
    if (username !== originalUsername && usernameStatus !== "available") return;

    setSubmitting(true);
    setSubmitError(null);

    const newAvatarUrl = await uploadImageIfChanged(newAvatarUri, "avatars", avatarUrl);
    const newLogoUrl = await uploadImageIfChanged(newLogoUri, "logos", logoUrl);
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const activeColor = customHex.trim() ? (customHex.startsWith("#") ? customHex : `#${customHex}`) : selectedColor;

    const existingTheme = (profile.theme ?? {}) as Record<string, unknown>;
    const updatedTheme = {
      ...existingTheme,
      avatar_focus: avatarFocusMode,
      avatar_zoom: avatarZoom,
      avatar_pan_x: avatarPanX,
      avatar_pan_y: avatarPanY,
      avatar_rotation: avatarRotation,
      avatar_aspect_mask: avatarAspectMask,
      avatar_color_filter: avatarColorFilter,
      template: selectedWebTemplate,
      primary: activeColor,
      radius: selectedRadius,
      density: selectedDensity,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        accreditations: accreditations.trim() || null,
        pronouns: pronouns.trim() || null,
        designation: designation.trim() || null,
        department: department.trim() || null,
        company: company.trim() || null,
        bio: bio.trim() || null,
        avatar_url: newAvatarUrl,
        logo_url: newLogoUrl,
        theme: updatedTheme as any,
      })
      .eq("id", profile.id);

    if (profileError) {
      setSubmitting(false);
      setSubmitError(
        profileError.code === "23505"
          ? "That username is already taken."
          : profileError.message,
      );
      return;
    }

    await refreshProfile();
    setSubmitting(false);
    router.back();
  }

  async function handleAddLinkConfirm() {
    if (!profile || !newLinkDef || !newLinkRawValue.trim()) return;
    const formatted = newLinkDef.formatValue(newLinkRawValue.trim());

    const { data: newLink, error } = await supabase
      .from("profile_links")
      .insert({
        profile_id: profile.id,
        kind: newLinkDef.kind,
        platform: newLinkDef.platform ?? null,
        label: newLinkDef.label,
        value: formatted,
        icon: newLinkDef.icon,
        position: links.length,
        is_visible: true,
      })
      .select()
      .single();

    if (!error && newLink) {
      setLinks((prev) => [...prev, newLink]);
    }

    setAddLinkSheetOpen(false);
    setNewLinkDef(null);
    setNewLinkRawValue("");
  }

  async function handleToggleLink(linkId: string, currentVisible: boolean) {
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, is_visible: !currentVisible } : l)));
    await supabase.from("profile_links").update({ is_visible: !currentVisible }).eq("id", linkId);
  }

  async function handleDeleteLink(linkId: string) {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    await supabase.from("profile_links").delete().eq("id", linkId);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 pt-12">
          <Text variant="muted" className="text-center">
            No card yet — finish onboarding first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentColor = customHex.trim() ? (customHex.startsWith("#") ? customHex : `#${customHex}`) : selectedColor;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header Navigation */}
      <View className="gap-3 px-5 pt-6 pb-2 border-b border-border/40 bg-card/60 backdrop-blur-md">
        <View className="flex-row items-center justify-between">
          <Button variant="ghost" size="sm" icon="arrow-back" onPress={() => router.back()}>
            Back
          </Button>
          <Text variant="h4" className="text-base font-bold text-foreground">
            Card Studio
          </Text>
          <Button
            size="sm"
            onPress={handleSave}
            loading={submitting}
            disabled={!firstName.trim() || (username !== originalUsername && usernameStatus !== "available")}
            className="rounded-full px-4"
          >
            Save
          </Button>
        </View>

        {/* 4-Segmented Control Bar */}
        <View className="flex-row gap-1 rounded-full bg-accent/60 p-1 border border-border/50">
          <TabButton label="Theme" active={tab === "display"} onPress={() => setTab("display")} />
          <TabButton label="Identity" active={tab === "identity"} onPress={() => setTab("identity")} />
          <TabButton label="Company" active={tab === "company"} onPress={() => setTab("company")} />
          <TabButton label="Links" active={tab === "links"} onPress={() => setTab("links")} />
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-6 px-5 pt-5 pb-12" keyboardShouldPersistTaps="handled">
        {submitError && (
          <View className="flex-row items-center gap-2 rounded-2xl bg-destructive/10 p-3.5 border border-destructive/20">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text className="text-xs font-semibold text-danger flex-1">{submitError}</Text>
          </View>
        )}

        {/* TAB 1: THEME & DISPLAY CUSTOMIZATION */}
        {tab === "display" && (
          <View className="gap-5">
            {/* 1. Profile Picture Studio Hero Card */}
            <View className="items-center gap-3 rounded-3xl border border-border/60 bg-card p-6 shadow-xs">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Profile Avatar Studio
              </Text>

              <Pressable onPress={() => setPhotoSheetTarget("avatar")} className="my-2">
                <Avatar
                  uri={newAvatarUri ?? avatarUrl}
                  size={114}
                  focusMode={avatarFocusMode}
                  showEditBadge
                />
              </Pressable>

              <View className="flex-row gap-2 w-full pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  icon="camera-outline"
                  onPress={() => setPhotoSheetTarget("avatar")}
                  className="flex-1 rounded-full border-border/70"
                >
                  Change Photo
                </Button>

                {(newAvatarUri || avatarUrl) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="create-outline"
                    onPress={() => {
                      setEditorImageUri(newAvatarUri || avatarUrl);
                      setEditorVisible(true);
                    }}
                    className="flex-1 rounded-full"
                  >
                    Adjust & Crop
                  </Button>
                )}
              </View>
            </View>

            {/* 2. Web Profile Templates */}
            <View className="gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-xs">
              <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
                  <Text className="text-base font-bold text-foreground">Web Card Template</Text>
                </View>
                <Text className="text-xs font-semibold text-primary">Standard</Text>
              </View>

              <Text variant="muted" className="text-xs">
                Select your preferred web profile layout template:
              </Text>

              <View className="gap-2.5 pt-1">
                {WEB_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedWebTemplate === tmpl.id;
                  return (
                    <Pressable
                      key={tmpl.id}
                      onPress={() => setSelectedWebTemplate(tmpl.id)}
                      className={cn(
                        "flex-row items-center justify-between rounded-2xl border p-4 transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-background active:bg-accent"
                      )}
                    >
                      <View className="flex-1 gap-1 pr-3">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-bold text-foreground">{tmpl.name}</Text>
                          <View className="rounded-full bg-accent px-2 py-0.5 border border-border/60">
                            <Text className="text-[10px] font-semibold text-muted-foreground">{tmpl.badge}</Text>
                          </View>
                        </View>
                        <Text className="text-xs text-muted-foreground">{tmpl.description}</Text>
                      </View>

                      <View
                        className={cn(
                          "h-6 w-6 items-center justify-center rounded-full border",
                          isSelected ? "border-primary bg-primary" : "border-muted"
                        )}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 3. Accent Color Swatches */}
            <View className="gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-xs">
              <View className="flex-row items-center gap-2 border-b border-border/40 pb-3">
                <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
                <Text className="text-base font-bold text-foreground">Brand Accent Color</Text>
              </View>

              <View className="flex-row flex-wrap gap-3 pt-1">
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = selectedColor === preset.hex && !customHex;
                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => {
                        setSelectedColor(preset.hex);
                        setCustomHex("");
                      }}
                      className={cn(
                        "flex-row items-center gap-2 rounded-full border px-3.5 py-2",
                        isSelected ? "border-primary bg-primary/10" : "border-border/60 bg-background"
                      )}
                    >
                      <View className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.hex }} />
                      <Text className="text-xs font-semibold text-foreground">{preset.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="pt-2">
                <Text variant="muted" className="text-xs mb-1.5 font-medium">
                  Custom Hex Code (Optional)
                </Text>
                <Input
                  placeholder="#0071E3"
                  value={customHex}
                  onChangeText={setCustomHex}
                  autoCapitalize="characters"
                  className="rounded-2xl"
                />
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: IDENTITY & BIO */}
        {tab === "identity" && (
          <View className="gap-4">
            <View className="gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-xs">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Web Handle & Name
              </Text>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Public Handle</Text>
                <View className="flex-row items-center rounded-2xl border border-border/80 px-4 py-3 bg-background">
                  <Text className="text-muted-foreground font-mono text-xs">tapit.man2web.in/u/</Text>
                  <Input
                    value={username}
                    onChangeText={(v) => setUsername(v.toLowerCase())}
                    autoCapitalize="none"
                    className="flex-1 border-0 p-0 font-bold text-foreground text-xs"
                  />
                </View>
                {username !== originalUsername && (
                  <UsernameStatusIndicator status={usernameStatus} reason={usernameReason} />
                )}
              </View>

              <View className="flex-row gap-3 pt-1">
                <View className="flex-1 gap-1.5">
                  <Text className="text-xs font-semibold text-foreground">First Name *</Text>
                  <Input placeholder="John" value={firstName} onChangeText={setFirstName} className="rounded-2xl" />
                </View>

                <View className="flex-1 gap-1.5">
                  <Text className="text-xs font-semibold text-foreground">Last Name</Text>
                  <Input placeholder="Doe" value={lastName} onChangeText={setLastName} className="rounded-2xl" />
                </View>
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Accreditations / Degrees</Text>
                <Input
                  placeholder="e.g. MD, PhD, CPA"
                  value={accreditations}
                  onChangeText={setAccreditations}
                  className="rounded-2xl"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Pronouns</Text>
                <Input
                  placeholder="e.g. they/them, she/her"
                  value={pronouns}
                  onChangeText={setPronouns}
                  className="rounded-2xl"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Bio / Executive Pitch</Text>
                <Input
                  placeholder="A short introduction about yourself..."
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  className="min-h-20 rounded-2xl"
                />
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: COMPANY & ORGANIZATION */}
        {tab === "company" && (
          <View className="gap-4">
            <View className="gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-xs">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Workplace Information
              </Text>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Job Title / Designation</Text>
                <Input
                  placeholder="e.g. Senior Partner"
                  value={designation}
                  onChangeText={setDesignation}
                  className="rounded-2xl"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Department</Text>
                <Input
                  placeholder="e.g. Enterprise Sales"
                  value={department}
                  onChangeText={setDepartment}
                  className="rounded-2xl"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Organization / Company Name</Text>
                <Input
                  placeholder="e.g. Acme Corporation"
                  value={company}
                  onChangeText={setCompany}
                  className="rounded-2xl"
                />
              </View>
            </View>
          </View>
        )}

        {/* TAB 4: SOCIAL LINKS & CONTACT CHANNELS */}
        {tab === "links" && (
          <View className="gap-4">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Channels ({links.length})
              </Text>
            </View>

            {/* List of Active Links */}
            <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
              {links.length === 0 ? (
                <View className="p-6 text-center items-center gap-2">
                  <Ionicons name="link-outline" size={32} color={colors.muted} />
                  <Text className="text-xs text-muted-foreground text-center">
                    No active channels yet — tap below to add WhatsApp, Email, LinkedIn or Custom URL.
                  </Text>
                </View>
              ) : (
                links.map((link, idx) => (
                  <ListRow
                    key={link.id}
                    showDivider={idx < links.length - 1}
                    leading={
                      <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                        <Ionicons
                          name={(link.icon ?? "link-outline") as ComponentProps<typeof Ionicons>["name"]}
                          size={18}
                          color={colors.primary}
                        />
                      </View>
                    }
                    title={link.label}
                    subtitle={linkDisplayValue(link.value)}
                    trailing={
                      <View className="flex-row items-center gap-3">
                        <Pressable onPress={() => handleToggleLink(link.id, !!link.is_visible)}>
                          <Ionicons
                            name={link.is_visible ? "eye" : "eye-off-outline"}
                            size={18}
                            color={link.is_visible ? colors.primary : colors.muted}
                          />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteLink(link.id)}>
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </Pressable>
                      </View>
                    }
                  />
                ))
              )}
            </View>

            {/* Quick Add Link Buttons Grid */}
            <View className="gap-2.5 pt-2">
              <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Add New Channel
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {STARTER_LINKS.map((starterDef) => (
                  <Pressable
                    key={starterDef.key}
                    onPress={() => {
                      setNewLinkDef(starterDef);
                      setNewLinkRawValue("");
                      setAddLinkSheetOpen(true);
                    }}
                    className="flex-row items-center gap-2 rounded-2xl border border-border/60 bg-card px-3.5 py-3 shadow-xs active:bg-accent"
                  >
                    <Ionicons
                      name={starterDef.icon as ComponentProps<typeof Ionicons>["name"]}
                      size={18}
                      color={colors.primary}
                    />
                    <Text className="text-xs font-bold text-foreground">{starterDef.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Link Bottom Sheet Modal */}
      <BottomSheet visible={addLinkSheetOpen} onClose={() => setAddLinkSheetOpen(false)}>
        <View className="gap-4 pb-2">
          {newLinkDef && (
            <>
              <View className="flex-row items-center gap-2.5 border-b border-border/40 pb-3">
                <Ionicons
                  name={newLinkDef.icon as ComponentProps<typeof Ionicons>["name"]}
                  size={22}
                  color={colors.primary}
                />
                <Text variant="h4" className="text-base font-bold text-foreground">
                  Add {newLinkDef.label}
                </Text>
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-foreground">Enter Handle / URL</Text>
                <Input
                  placeholder={newLinkDef.placeholder}
                  value={newLinkRawValue}
                  onChangeText={setNewLinkRawValue}
                  autoFocus
                  autoCapitalize="none"
                  className="rounded-2xl"
                />
              </View>

              <View className="gap-2 pt-2">
                <Button
                  onPress={handleAddLinkConfirm}
                  disabled={!newLinkRawValue.trim()}
                  className="w-full rounded-full py-3.5"
                >
                  Add to Card
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => setAddLinkSheetOpen(false)}
                  className="w-full rounded-full"
                >
                  Cancel
                </Button>
              </View>
            </>
          )}
        </View>
      </BottomSheet>

      {/* Photo Picker Bottom Sheet Modal */}
      <BottomSheet visible={!!photoSheetTarget} onClose={() => setPhotoSheetTarget(null)}>
        <View className="gap-2.5 pb-2">
          <Text variant="h4" className="text-center font-bold">
            {photoSheetTarget === "avatar" ? "Update Profile Picture" : "Update Company Logo"}
          </Text>
          <Button
            variant="outline"
            icon="camera-outline"
            onPress={() => photoSheetTarget && pickImage("camera", photoSheetTarget)}
            className="rounded-full py-3.5 justify-start border-border/70"
          >
            Take Photo with Camera
          </Button>
          <Button
            variant="outline"
            icon="images-outline"
            onPress={() => photoSheetTarget && pickImage("library", photoSheetTarget)}
            className="rounded-full py-3.5 justify-start border-border/70"
          >
            Choose from Photo Library
          </Button>

          {photoSheetTarget === "avatar" && (avatarUrl || newAvatarUri) && (
            <Button
              variant="outline"
              icon="create-outline"
              onPress={() => {
                setPhotoSheetTarget(null);
                setEditorImageUri(newAvatarUri || avatarUrl);
                setEditorVisible(true);
              }}
              className="rounded-full py-3.5 justify-start border-border/70"
            >
              Edit & Adjust Photo
            </Button>
          )}

          {photoSheetTarget && (
            <Button
              variant="destructive"
              icon="trash-outline"
              onPress={() => {
                if (photoSheetTarget === "avatar") {
                  setAvatarUrl(null);
                  setNewAvatarUri(null);
                } else {
                  setLogoUrl(null);
                  setNewLogoUri(null);
                }
                setPhotoSheetTarget(null);
              }}
              className="rounded-full py-3.5 justify-start"
            >
              Remove Profile Photo
            </Button>
          )}

          <Button variant="secondary" onPress={() => setPhotoSheetTarget(null)} className="rounded-full mt-1">
            Cancel
          </Button>
        </View>
      </BottomSheet>

      {/* Full Screen Photo Editor Modal */}
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
