import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Redirect, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ALL_TOGGLE_LINKS, formatCustomLinkValue, type StarterLinkDef } from "@tapit/core";
import type { Database } from "@tapit/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { UsernameStatus } from "@/components/ui/username-status";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];
type UsernameCheckStatus = "idle" | "checking" | "available" | "taken" | "invalid";
// `id` is a stable client-side React key; `savedId` is the profile_links row id once persisted.
type CustomLinkDraft = { id: string; savedId?: string; label: string; value: string };
type EditorTab = "display" | "information" | "links";
type PhotoTarget = "avatar" | "logo";

const CONTACT_LINKS = ALL_TOGGLE_LINKS.filter((l) => l.kind !== "social");
const SOCIAL_LINKS = ALL_TOGGLE_LINKS.filter((l) => l.kind === "social");

function LinkToggleRow({
  link,
  enabled,
  value,
  onToggle,
  onChangeValue,
}: {
  link: StarterLinkDef;
  enabled: boolean;
  value: string;
  onToggle: (v: boolean) => void;
  onChangeValue: (v: string) => void;
}) {
  return (
    <ListRow
      leading={
        <Ionicons
          name={link.icon as ComponentProps<typeof Ionicons>["name"]}
          size={20}
          color={colors.mutedForeground}
        />
      }
      title={link.label}
      trailing={<Switch value={enabled} onValueChange={onToggle} />}
      footer={
        enabled ? (
          <Input
            placeholder={link.placeholder}
            value={value}
            onChangeText={onChangeValue}
            autoCapitalize="none"
          />
        ) : undefined
      }
    />
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={cn("flex-1 items-center rounded-md py-2", active && "bg-primary")}
    >
      <Text
        className={cn("text-sm font-medium", active ? "text-primary-foreground" : "text-muted-foreground")}
      >
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

  const [enabledLinks, setEnabledLinks] = useState<Record<string, boolean>>({});
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
  const [linkIds, setLinkIds] = useState<Record<string, string>>({});
  const [linkSearch, setLinkSearch] = useState("");

  const [customLinks, setCustomLinks] = useState<CustomLinkDraft[]>([]);
  const [removedCustomLinkIds, setRemovedCustomLinkIds] = useState<string[]>([]);

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
      // Existing cards only ever had a single `display_name` — best-effort split it into
      // first/last on first edit rather than showing blank fields; from then on the stored
      // first_name/last_name (set on every save below) take over as the source of truth.
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

      const { data: links } = await supabase
        .from("profile_links")
        .select("*")
        .eq("profile_id", profileData.id);

      const enabled: Record<string, boolean> = {};
      const values: Record<string, string> = {};
      const ids: Record<string, string> = {};
      const custom: CustomLinkDraft[] = [];
      for (const link of (links ?? []) as ProfileLink[]) {
        if (link.kind === "custom") {
          custom.push({ id: `saved-${link.id}`, savedId: link.id, label: link.label, value: link.value });
          continue;
        }
        const def = ALL_TOGGLE_LINKS.find((l) =>
          l.platform ? l.platform === link.platform : l.kind === link.kind,
        );
        if (!def) continue;
        enabled[def.key] = true;
        values[def.key] = link.value;
        ids[def.key] = link.id;
      }
      setEnabledLinks(enabled);
      setLinkValues(values);
      setLinkIds(ids);
      setCustomLinks(custom);
      setLoading(false);
    })();
  }, [session]);

  // Loading state set synchronously before the async availability check — React's own
  // endorsed "fetch in an effect" pattern, not the anti-pattern this rule targets.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!username || username === originalUsername) {
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
  }, [username, originalUsername]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function pickImage(source: "camera" | "library", target: PhotoTarget) {
    setPhotoSheetTarget(null);
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
      if (target === "avatar") setNewAvatarUri(result.assets[0].uri);
      else setNewLogoUri(result.assets[0].uri);
    }
  }

  async function uploadImageIfChanged(
    uri: string | null,
    bucket: "avatars" | "logos",
    fallbackUrl: string | null,
  ): Promise<string | null> {
    if (!uri || !session) return fallbackUrl;
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
      })
      .eq("id", profile.id);

    if (profileError) {
      setSubmitting(false);
      setSubmitError(
        profileError.code === "23505"
          ? "That username was just taken — try another."
          : profileError.message,
      );
      return;
    }

    for (const link of ALL_TOGGLE_LINKS) {
      const raw = linkValues[link.key];
      const existingId = linkIds[link.key];
      const isEnabled = enabledLinks[link.key] && !!raw?.trim();

      if (isEnabled) {
        const value = link.formatValue(raw);
        if (existingId) {
          // Also backfills `icon` on every save — rows created before the icon column was
          // populated at insert time would otherwise stay iconless forever.
          await supabase.from("profile_links").update({ value, icon: link.icon }).eq("id", existingId);
        } else {
          await supabase.from("profile_links").insert({
            profile_id: profile.id,
            kind: link.kind,
            platform: link.platform ?? null,
            label: link.label,
            value,
            icon: link.icon,
            position: ALL_TOGGLE_LINKS.indexOf(link),
          });
        }
      } else if (existingId) {
        await supabase.from("profile_links").delete().eq("id", existingId);
      }
    }

    for (const id of removedCustomLinkIds) {
      await supabase.from("profile_links").delete().eq("id", id);
    }
    for (const [index, draft] of customLinks.entries()) {
      const label = draft.label.trim();
      const raw = draft.value.trim();
      if (!label || !raw) continue;
      const value = formatCustomLinkValue(raw);
      if (draft.savedId) {
        await supabase.from("profile_links").update({ label, value }).eq("id", draft.savedId);
      } else {
        await supabase.from("profile_links").insert({
          profile_id: profile.id,
          kind: "custom",
          platform: null,
          label,
          value,
          position: ALL_TOGGLE_LINKS.length + index,
        });
      }
    }

    await refreshProfile();
    setSubmitting(false);
    router.replace("/");
  }

  if (!session) {
    return <Redirect href="/login" />;
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
      // Padding lives on this inner View, not the SafeAreaView — see docs/DECISIONS.md
      // (SafeAreaView's inline inset style silently overrides className padding).
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 pt-12">
          <Text variant="muted" className="text-center">
            No card yet — finish onboarding first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-3 px-6 pt-12">
        <Text variant="h4" className="text-center">
          Edit profile
        </Text>
        <View className="flex-row gap-1 rounded-md bg-muted p-1">
          <TabButton label="Display" active={tab === "display"} onPress={() => setTab("display")} />
          <TabButton
            label="Information"
            active={tab === "information"}
            onPress={() => setTab("information")}
          />
          <TabButton label="Links" active={tab === "links"} onPress={() => setTab("links")} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-6 pb-4 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {tab === "display" && (
          <>
            <View className="items-center gap-2">
              <Pressable onPress={() => setPhotoSheetTarget("avatar")}>
                <Avatar uri={newAvatarUri ?? avatarUrl} size={96} />
              </Pressable>
              <Text variant="muted" className="text-sm">
                Change photo
              </Text>
            </View>

            <View className="items-center gap-2">
              <Pressable onPress={() => setPhotoSheetTarget("logo")}>
                <Avatar uri={newLogoUri ?? logoUrl} size={72} fallbackIcon="business-outline" />
              </Pressable>
              <Text variant="muted" className="text-sm">
                {newLogoUri ?? logoUrl ? "Change logo" : "Add logo"}
              </Text>
            </View>
          </>
        )}

        {tab === "information" && (
          <>
            <Field label="First Name">
              <Input value={firstName} onChangeText={setFirstName} />
            </Field>
            <Field label="Last Name">
              <Input value={lastName} onChangeText={setLastName} />
            </Field>
            <Field label="Accreditations">
              <Input placeholder="e.g. MD, PhD" value={accreditations} onChangeText={setAccreditations} />
            </Field>
            <Field label="Pronouns">
              <Input placeholder="e.g. she/her" value={pronouns} onChangeText={setPronouns} />
            </Field>

            <Text variant="large" className="mt-2">
              Affiliation
            </Text>
            <Field label="Title">
              <Input value={designation} onChangeText={setDesignation} />
            </Field>
            <Field label="Department">
              <Input value={department} onChangeText={setDepartment} />
            </Field>
            <Field label="Organization Name">
              <Input value={company} onChangeText={setCompany} />
            </Field>
            <Field label="Bio">
              <Input
                placeholder="A line or two about you"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                className="min-h-20"
              />
            </Field>

            <Field label="Profile link">
              <View className="flex-row items-center rounded-md border border-border px-4 py-3">
                <Text className="text-muted-foreground">tapit.in/u/</Text>
                <Input
                  value={username}
                  onChangeText={(v) => setUsername(v.toLowerCase())}
                  autoCapitalize="none"
                  className="flex-1 border-0 p-0"
                />
              </View>
              {username !== originalUsername && (
                <UsernameStatus status={usernameStatus} reason={usernameReason} />
              )}
            </Field>
          </>
        )}

        {tab === "links" && (
          <>
            {(() => {
              const query = linkSearch.trim().toLowerCase();
              const matches = (link: StarterLinkDef) => link.label.toLowerCase().includes(query);
              const contactMatches = CONTACT_LINKS.filter(matches);
              const socialMatches = SOCIAL_LINKS.filter(matches);
              const contactCount = CONTACT_LINKS.filter((l) => enabledLinks[l.key]).length;
              const socialCount = SOCIAL_LINKS.filter((l) => enabledLinks[l.key]).length;

              return (
                <>
                  <View className="flex-row items-center gap-2 rounded-md border border-border px-4 py-3">
                    <Ionicons name="search-outline" size={16} color={colors.muted} />
                    <Input
                      placeholder="Search links (e.g. Instagram, UPI)"
                      value={linkSearch}
                      onChangeText={setLinkSearch}
                      autoCapitalize="none"
                      className="flex-1 border-0 p-0"
                    />
                  </View>

                  {contactMatches.length > 0 && (
                    <>
                      <Text variant="large" className="mt-2">
                        Contact & payments{contactCount > 0 ? ` (${contactCount} added)` : ""}
                      </Text>
                      {contactMatches.map((link) => (
                        <LinkToggleRow
                          key={link.key}
                          link={link}
                          enabled={!!enabledLinks[link.key]}
                          value={linkValues[link.key] ?? ""}
                          onToggle={(v) => setEnabledLinks((prev) => ({ ...prev, [link.key]: v }))}
                          onChangeValue={(v) => setLinkValues((prev) => ({ ...prev, [link.key]: v }))}
                        />
                      ))}
                    </>
                  )}

                  {socialMatches.length > 0 && (
                    <>
                      <Text variant="large" className="mt-2">
                        Social{socialCount > 0 ? ` (${socialCount} added)` : ""}
                      </Text>
                      {socialMatches.map((link) => (
                        <LinkToggleRow
                          key={link.key}
                          link={link}
                          enabled={!!enabledLinks[link.key]}
                          value={linkValues[link.key] ?? ""}
                          onToggle={(v) => setEnabledLinks((prev) => ({ ...prev, [link.key]: v }))}
                          onChangeValue={(v) => setLinkValues((prev) => ({ ...prev, [link.key]: v }))}
                        />
                      ))}
                    </>
                  )}

                  {query && contactMatches.length === 0 && socialMatches.length === 0 && (
                    <Text variant="muted" className="text-sm">
                      No links match &quot;{linkSearch}&quot;.
                    </Text>
                  )}
                </>
              );
            })()}

            <Text variant="large" className="mt-2">
              Custom links
            </Text>
            {customLinks.map((draft) => (
              <Card key={draft.id} className="gap-2">
                <Field label="Label">
                  <View className="flex-row items-center gap-2">
                    <Input
                      placeholder="e.g. Portfolio"
                      value={draft.label}
                      onChangeText={(v) =>
                        setCustomLinks((prev) =>
                          prev.map((d) => (d.id === draft.id ? { ...d, label: v } : d)),
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      icon="trash-outline"
                      onPress={() => {
                        if (draft.savedId) {
                          setRemovedCustomLinkIds((prev) => [...prev, draft.savedId!]);
                        }
                        setCustomLinks((prev) => prev.filter((d) => d.id !== draft.id));
                      }}
                    />
                  </View>
                </Field>
                <Field label="URL">
                  <Input
                    placeholder="yoursite.com/page"
                    value={draft.value}
                    onChangeText={(v) =>
                      setCustomLinks((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, value: v } : d)),
                      )
                    }
                    autoCapitalize="none"
                  />
                </Field>
              </Card>
            ))}
            <Button
              variant="secondary"
              icon="add-circle-outline"
              onPress={() =>
                setCustomLinks((prev) => [
                  ...prev,
                  { id: `new-${customLinkSeq.current++}`, label: "", value: "" },
                ])
              }
            >
              Add custom link
            </Button>
          </>
        )}
      </ScrollView>

      <View className="gap-2 px-6 pb-8 pt-2">
        {submitError && (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text className="text-sm text-danger">{submitError}</Text>
          </View>
        )}

        <View className="flex-row gap-3">
          <Button
            variant="secondary"
            icon="close"
            onPress={() => router.replace("/")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            icon="checkmark"
            iconPosition="right"
            onPress={handleSave}
            loading={submitting}
            disabled={!firstName.trim() || (username !== originalUsername && usernameStatus !== "available")}
            className="flex-1"
          >
            Save
          </Button>
        </View>
      </View>

      <BottomSheet visible={photoSheetTarget !== null} onClose={() => setPhotoSheetTarget(null)}>
        <View className="gap-2">
          <Button
            variant="secondary"
            icon="camera-outline"
            onPress={() => pickImage("camera", photoSheetTarget ?? "avatar")}
          >
            Take Photo
          </Button>
          <Button
            variant="secondary"
            icon="images-outline"
            onPress={() => pickImage("library", photoSheetTarget ?? "avatar")}
          >
            Choose from Library
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
