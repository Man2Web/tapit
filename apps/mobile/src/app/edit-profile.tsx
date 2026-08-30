import { useEffect, useRef, useState } from "react";
import { Redirect, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { STARTER_LINKS, type StarterLinkDef } from "@tapit/core";
import type { Database } from "@tapit/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function EditProfileScreen() {
  const { session, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [designation, setDesignation] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const [originalUsername, setOriginalUsername] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameReason, setUsernameReason] = useState<string | null>(null);

  const [enabledLinks, setEnabledLinks] = useState<Record<string, boolean>>({});
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
  const [linkIds, setLinkIds] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkSeq = useRef(0);

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
      setDisplayName(profileData.display_name);
      setDesignation(profileData.designation ?? "");
      setCompany(profileData.company ?? "");
      setBio(profileData.bio ?? "");
      setAvatarUrl(profileData.avatar_url);
      setOriginalUsername(profileData.username);
      setUsername(profileData.username);

      const { data: links } = await supabase
        .from("profile_links")
        .select("*")
        .eq("profile_id", profileData.id);

      const enabled: Record<string, boolean> = {};
      const values: Record<string, string> = {};
      const ids: Record<string, string> = {};
      for (const link of (links ?? []) as ProfileLink[]) {
        const starter = STARTER_LINKS.find((l) =>
          l.platform ? l.platform === link.platform : l.kind === link.kind,
        );
        if (!starter) continue;
        enabled[starter.key] = true;
        values[starter.key] = link.value;
        ids[starter.key] = link.id;
      }
      setEnabledLinks(enabled);
      setLinkValues(values);
      setLinkIds(ids);
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
      setNewAvatarUri(result.assets[0].uri);
    }
  }

  async function uploadAvatarIfChanged(): Promise<string | null> {
    if (!newAvatarUri || !session) return avatarUrl;
    const response = await fetch(newAvatarUri);
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
      return avatarUrl;
    }
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function handleSave() {
    if (!session || !profile) return;
    if (username !== originalUsername && usernameStatus !== "available") return;

    setSubmitting(true);
    setSubmitError(null);

    const newAvatarUrl = await uploadAvatarIfChanged();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        designation: designation || null,
        company: company || null,
        bio: bio || null,
        avatar_url: newAvatarUrl,
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

    for (const link of STARTER_LINKS) {
      const raw = linkValues[link.key];
      const existingId = linkIds[link.key];
      const isEnabled = enabledLinks[link.key] && !!raw?.trim();

      if (isEnabled) {
        const value = link.formatValue(raw);
        if (existingId) {
          await supabase.from("profile_links").update({ value }).eq("id", existingId);
        } else {
          await supabase.from("profile_links").insert({
            profile_id: profile.id,
            kind: link.kind,
            platform: link.platform ?? null,
            label: link.label,
            value,
            position: STARTER_LINKS.indexOf(link),
          });
        }
      } else if (existingId) {
        await supabase.from("profile_links").delete().eq("id", existingId);
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
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-neutral-600">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-neutral-600">
          No card yet — finish onboarding first.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="gap-4 px-6 py-8" keyboardShouldPersistTaps="handled">
        <Text className="text-center text-xl font-semibold">Edit profile</Text>

        <View className="items-center gap-2">
          <Pressable onPress={() => setPhotoSheetOpen(true)}>
            {newAvatarUri || avatarUrl ? (
              <Image source={{ uri: newAvatarUri ?? avatarUrl! }} className="h-24 w-24 rounded-full" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-neutral-100">
                <Text className="text-sm text-neutral-400">Upload</Text>
              </View>
            )}
          </Pressable>
          <Text className="text-sm text-neutral-600">Change photo</Text>
        </View>

        <Input placeholder="Full name" value={displayName} onChangeText={setDisplayName} />
        <Input placeholder="Designation" value={designation} onChangeText={setDesignation} />
        <Input placeholder="Company" value={company} onChangeText={setCompany} />
        <Input placeholder="Bio" value={bio} onChangeText={setBio} multiline />

        <View className="gap-1.5">
          <View className="flex-row items-center rounded-md border border-neutral-200 px-4 py-3">
            <Text className="text-neutral-400">tapit.in/u/</Text>
            <Input
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase())}
              autoCapitalize="none"
              className="flex-1 border-0 p-0"
            />
          </View>
          {username !== originalUsername && (
            <Text className="text-sm">
              {usernameStatus === "checking" && <Text className="text-neutral-600">Checking…</Text>}
              {usernameStatus === "available" && <Text className="text-success">Available</Text>}
              {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                <Text className="text-danger">{usernameReason}</Text>
              )}
            </Text>
          )}
        </View>

        <Text className="mt-2 font-semibold">Links</Text>
        {STARTER_LINKS.map((link: StarterLinkDef) => (
          <View key={link.key} className="rounded-md border border-neutral-200 p-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-medium">{link.label}</Text>
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

        {submitError && <Text className="text-sm text-danger">{submitError}</Text>}

        <View className="flex-row gap-3">
          <Button variant="secondary" onPress={() => router.replace("/")} className="flex-1">
            Cancel
          </Button>
          <Button
            onPress={handleSave}
            loading={submitting}
            disabled={!displayName.trim() || (username !== originalUsername && usernameStatus !== "available")}
            className="flex-1"
          >
            Save
          </Button>
        </View>

        <BottomSheet visible={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)}>
          <View className="gap-2">
            <Button variant="secondary" onPress={() => pickImage("camera")}>
              Take Photo
            </Button>
            <Button variant="secondary" onPress={() => pickImage("library")}>
              Choose from Library
            </Button>
          </View>
        </BottomSheet>
      </ScrollView>
    </SafeAreaView>
  );
}
