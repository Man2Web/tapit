import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import type { Database } from "@tapit/types";
import { linkDisplayValue } from "@tapit/core";
import { Avatar, type AvatarFocusMode } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

function cardUrl(username: string, source?: "qr") {
  const base = `${WEB_BASE_URL}/u/${username}`;
  return source ? `${base}?source=${source}` : base;
}

type IdentityStudioCanvasProps = {
  profile: Profile;
  links: ProfileLink[];
  brandColor?: string;
  focusMode?: AvatarFocusMode;
  onEditPress: () => void;
};

export function IdentityStudioCanvas({
  profile,
  links,
  brandColor = "#2563EB",
  focusMode = "center",
  onEditPress,
}: IdentityStudioCanvasProps) {
  const [activeMode, setActiveMode] = useState<"profile" | "qr">("profile");

  const themeObj = (profile.theme ?? {}) as Record<string, unknown>;
  const zoom = typeof themeObj.avatar_zoom === "number" ? themeObj.avatar_zoom : undefined;
  const panX = typeof themeObj.avatar_pan_x === "number" ? themeObj.avatar_pan_x : undefined;
  const panY = typeof themeObj.avatar_pan_y === "number" ? themeObj.avatar_pan_y : undefined;
  const rotation = typeof themeObj.avatar_rotation === "number" ? themeObj.avatar_rotation : undefined;
  const aspectMask = typeof themeObj.avatar_aspect_mask === "string" ? themeObj.avatar_aspect_mask : undefined;
  const colorFilter = typeof themeObj.avatar_color_filter === "string" ? themeObj.avatar_color_filter : undefined;

  // Native Device Wallet Pass Detection
  const isIOS = Platform.OS === "ios";
  const walletUrl = isIOS
    ? `${WEB_BASE_URL}/api/wallet/apple/${profile.username}`
    : `${WEB_BASE_URL}/api/wallet/google/${profile.username}`;
  const walletLabel = isIOS ? "Apple Wallet" : "Google Wallet";
  const walletIcon: React.ComponentProps<typeof Ionicons>["name"] = isIOS
    ? "logo-apple"
    : "wallet-outline";

  return (
    <View className="w-full rounded-[32px] border border-border/70 bg-card overflow-hidden shadow-md">
      {/* 🖼️ Cover Banner Header */}
      <View
        className="relative h-36 w-full items-center justify-between p-4"
        style={{
          backgroundColor: brandColor,
        }}
      >
        {/* Subtle Ambient Vignette Overlay */}
        <View className="absolute inset-0 bg-black/20" />

        {/* Top Header Bar Overlay */}
        <View className="flex-row items-center justify-between w-full z-10">
          {/* Active NFC Chip Pill */}
          <View className="flex-row items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 border border-white/20 backdrop-blur-md">
            <View className="h-2 w-2 rounded-full bg-emerald-400" />
            <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
              NFC ACTIVE
            </Text>
          </View>

          {/* Quick Edit Action Button */}
          <Pressable
            onPress={onEditPress}
            className="h-9 w-9 items-center justify-center rounded-full bg-black/40 border border-white/20 backdrop-blur-md active:scale-95"
          >
            <Ionicons name="create-outline" size={16} color="white" />
          </Pressable>
        </View>
      </View>

      {/* 👤 Overlapping Avatar & Studio Info Container */}
      <View className="px-6 pb-6 pt-0 relative">
        <View className="flex-row items-end justify-between -mt-12 mb-3">
          <View className="relative border-4 border-card rounded-full shadow-lg bg-card">
            <Avatar
              uri={profile.avatar_url}
              size={88}
              focusMode={focusMode}
              zoom={zoom}
              panX={panX}
              panY={panY}
              rotation={rotation}
              aspectMask={aspectMask}
              colorFilter={colorFilter}
            />
          </View>

          {/* 2-State Segmented Control Switcher */}
          <View className="flex-row items-center gap-1 rounded-full bg-accent/80 p-1 border border-border/60 mb-1">
            <Pressable
              onPress={() => setActiveMode("profile")}
              className={`px-3 py-1.5 rounded-full transition-all ${
                activeMode === "profile" ? "bg-primary shadow-xs" : "bg-transparent"
              }`}
            >
              <Text className={`text-xs font-bold ${activeMode === "profile" ? "text-white" : "text-muted-foreground"}`}>
                Card
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveMode("qr")}
              className={`px-3 py-1.5 rounded-full transition-all ${
                activeMode === "qr" ? "bg-primary shadow-xs" : "bg-transparent"
              }`}
            >
              <Text className={`text-xs font-bold ${activeMode === "qr" ? "text-white" : "text-muted-foreground"}`}>
                QR Pass
              </Text>
            </Pressable>
          </View>
        </View>

        {activeMode === "profile" ? (
          /* PROFILE DETAILS & SOCIAL CHIPS */
          <View className="gap-3">
            <View className="gap-0.5">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-2xl font-black text-foreground tracking-tight">
                  {profile.display_name}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color={brandColor} />
              </View>

              {profile.designation && (
                <Text className="text-sm font-semibold text-foreground/80">
                  {profile.designation}
                  {profile.company ? ` • ${profile.company}` : ""}
                </Text>
              )}
            </View>

            {profile.bio && (
              <Text className="text-xs text-muted-foreground italic leading-relaxed" numberOfLines={2}>
                "{profile.bio}"
              </Text>
            )}

            {/* 🔗 Active Social Channel Chips (Horizontal Scroll) */}
            {links.length > 0 && (
              <View className="pt-2 gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Connected Channels ({links.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 py-1"
                >
                  {links.map((link) => (
                    <Pressable
                      key={link.id}
                      onPress={() => Linking.openURL(link.value)}
                      className="flex-row items-center gap-2 rounded-full border border-border/80 bg-accent/50 px-3.5 py-2 active:bg-accent"
                    >
                      <Ionicons
                        name={(link.icon ?? "link-outline") as React.ComponentProps<typeof Ionicons>["name"]}
                        size={14}
                        color={brandColor}
                      />
                      <Text className="text-xs font-bold text-foreground">{link.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Handle URL */}
            <View className="flex-row items-center justify-between border-t border-border/40 pt-3.5 mt-1">
              <Text className="text-xs font-mono text-muted-foreground">
                tapit.man2web.in/u/{profile.username}
              </Text>
              <Pressable onPress={() => setActiveMode("qr")} className="flex-row items-center gap-1">
                <Ionicons name="qr-code-outline" size={14} color={brandColor} />
                <Text className="text-xs font-bold text-primary">Show QR</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* QR CODE PASS STAGE */
          <View className="items-center text-center gap-4 py-2">
            <View className="flex-row items-center justify-between w-full border-b border-border/40 pb-2">
              <Text className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                ID // TAPIT-{profile.username.toUpperCase()}
              </Text>
              <Pressable onPress={() => setActiveMode("profile")} className="p-1">
                <Ionicons name="close-circle-outline" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <View className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-md my-1">
              <QRCode value={cardUrl(profile.username, "qr")} size={160} />
            </View>

            <Text className="text-xs text-center text-muted-foreground px-4">
              Scan code to view profile, save contact, or download wallet pass.
            </Text>

            <View className="flex-row gap-2.5 w-full pt-1">
              <Pressable
                onPress={() => Linking.openURL(walletUrl)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-border/80 bg-accent/60 py-2.5 active:bg-accent"
              >
                <Ionicons name={walletIcon} size={16} color={colors.foreground} />
                <Text className="text-xs font-semibold text-foreground">{walletLabel}</Text>
              </Pressable>

              <Pressable
                onPress={() => Linking.openURL(`${WEB_BASE_URL}/api/vcard/${profile.username}`)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-border/80 bg-accent/60 py-2.5 active:bg-accent"
              >
                <Ionicons name="download-outline" size={16} color={colors.foreground} />
                <Text className="text-xs font-semibold text-foreground">Save vCard</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
