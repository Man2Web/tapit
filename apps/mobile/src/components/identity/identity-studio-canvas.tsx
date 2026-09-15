import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import type { Database } from "@tapit/types";
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
  brandColor = "#0071E3",
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

  const bannerColor =
    (typeof themeObj.banner_color === "string" ? themeObj.banner_color : undefined) ??
    (typeof themeObj.primary === "string" ? themeObj.primary : undefined) ??
    brandColor ??
    "#0071E3";

  // Native Device Wallet Pass Detection
  const isIOS = Platform.OS === "ios";
  const walletUrl = isIOS
    ? `${WEB_BASE_URL}/api/wallet/apple/${profile.username}`
    : `${WEB_BASE_URL}/api/wallet/google/${profile.username}`;
  const walletLabel = isIOS ? "Add to Apple Wallet" : "Add to Google Wallet";
  const walletIcon: React.ComponentProps<typeof Ionicons>["name"] = isIOS
    ? "logo-apple"
    : "wallet-outline";

  return (
    <View className="w-full max-w-[360px] rounded-2xl border border-border bg-card overflow-hidden shadow-md">
      {/* 💳 Top Header Banner (Apple Pass Aesthetic) */}
      <View
        className="relative h-36 w-full items-center justify-between p-4"
        style={{
          backgroundColor: bannerColor,
        }}
      >
        {/* Subtle Overlay Highlight */}
        <View className="absolute inset-0 bg-black/10" />

        {/* Top Header Overlay Row */}
        <View className="flex-row items-center justify-between w-full z-10">
          {/* Active NFC Chip Badge */}
          <View className="flex-row items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 border border-white/20">
            <View className="h-2 w-2 rounded-full bg-emerald-400" />
            <Text className="text-[10px] font-bold text-white uppercase tracking-widest">
              NFC Active
            </Text>
          </View>

          {/* Quick Edit Action Button */}
          <Pressable
            onPress={onEditPress}
            className="h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-white/20 active:bg-black/60"
          >
            <Ionicons name="pencil" size={14} color="white" />
          </Pressable>
        </View>

        {/* Bottom Banner Branding Watermark */}
        <View className="w-full flex-row items-center justify-between z-10 pb-1">
          <Text className="text-[11px] font-bold text-white/80 uppercase tracking-widest font-mono">
            TAPIT IDENTITY PASS
          </Text>
          <Ionicons name="hardware-chip-outline" size={20} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      {/* 👤 Pass Details & Interactive Segmented Controls */}
      <View className="px-5 pb-5 pt-0 relative">
        <View className="flex-row items-end justify-between -mt-10 mb-3.5 z-20">
          <View className="relative border-4 border-card rounded-full shadow-md bg-card">
            <Avatar
              uri={profile.avatar_url}
              size={82}
              focusMode={focusMode}
              zoom={zoom}
              panX={panX}
              panY={panY}
              rotation={rotation}
              aspectMask={aspectMask}
              colorFilter={colorFilter}
            />
          </View>

          {/* Authentic iOS Segmented Control Switcher */}
          <View className="flex-row items-center rounded-full bg-secondary/80 p-1 border border-border/50">
            <Pressable
              onPress={() => setActiveMode("profile")}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                activeMode === "profile" ? "bg-card shadow-xs" : "bg-transparent"
              }`}
            >
              <Text className={`text-xs font-bold ${activeMode === "profile" ? "text-foreground" : "text-muted-foreground"}`}>
                Pass
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveMode("qr")}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                activeMode === "qr" ? "bg-card shadow-xs" : "bg-transparent"
              }`}
            >
              <Text className={`text-xs font-bold ${activeMode === "qr" ? "text-foreground" : "text-muted-foreground"}`}>
                QR Code
              </Text>
            </Pressable>
          </View>
        </View>

        {activeMode === "profile" ? (
          /* PROFILE DETAILS & CONNECTED CHANNELS */
          <View className="gap-3.5">
            <View className="gap-0.5">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xl font-bold text-foreground tracking-tight">
                  {profile.display_name}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color={bannerColor || brandColor} />
              </View>

              {profile.designation && (
                <Text className="text-xs font-semibold text-muted-foreground">
                  {profile.designation}
                  {profile.company ? ` • ${profile.company}` : ""}
                </Text>
              )}
            </View>

            {profile.bio && (
              <Text className="text-xs text-muted-foreground leading-relaxed" numberOfLines={2}>
                &quot;{profile.bio}&quot;
              </Text>
            )}

            {/* Active Channels Grid */}
            {links.length > 0 && (
              <View className="pt-1 gap-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Channels ({links.length})
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
                      className="flex-row items-center gap-2 rounded-full border border-border/60 bg-secondary/60 px-3.5 py-1.5 active:bg-secondary"
                    >
                      <Ionicons
                        name={(link.icon ?? "link-outline") as React.ComponentProps<typeof Ionicons>["name"]}
                        size={14}
                        color={colors.primary}
                      />
                      <Text className="text-xs font-semibold text-foreground">{link.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Handle Footer */}
            <View className="flex-row items-center justify-between border-t border-border/40 pt-3 mt-1">
              <Text className="text-xs font-mono text-muted-foreground">
                tapit.man2web.in/u/{profile.username}
              </Text>
              <Pressable onPress={() => setActiveMode("qr")} className="flex-row items-center gap-1">
                <Ionicons name="qr-code-outline" size={14} color={colors.primary} />
                <Text className="text-xs font-bold text-primary">Show QR</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* QR CODE STAGE */
          <View className="items-center text-center gap-3.5 py-1">
            <View className="flex-row items-center justify-between w-full border-b border-border/40 pb-2">
              <Text className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                ID // TAPIT-{profile.username.toUpperCase()}
              </Text>
              <Pressable onPress={() => setActiveMode("profile")} className="p-1">
                <Ionicons name="close-circle-outline" size={18} color={colors.muted} />
              </Pressable>
            </View>

            <View className="p-4 bg-white rounded-2xl border border-border shadow-xs my-1">
              <QRCode value={cardUrl(profile.username, "qr")} size={156} />
            </View>

            <Text className="text-xs text-center text-muted-foreground px-2">
              Scan code to open digital contact card or save pass to wallet.
            </Text>

            <View className="flex-row gap-2 w-full pt-1">
              <Pressable
                onPress={() => Linking.openURL(walletUrl)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 shadow-xs active:bg-secondary"
              >
                <Ionicons name={walletIcon} size={15} color={colors.foreground} />
                <Text className="text-xs font-semibold text-foreground">{walletLabel}</Text>
              </Pressable>

              <Pressable
                onPress={() => Linking.openURL(`${WEB_BASE_URL}/api/vcard/${profile.username}`)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 shadow-xs active:bg-secondary"
              >
                <Ionicons name="download-outline" size={15} color={colors.foreground} />
                <Text className="text-xs font-semibold text-foreground">Save vCard</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
