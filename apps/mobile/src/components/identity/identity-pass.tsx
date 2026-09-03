import { useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import type { Database } from "@tapit/types";
import { Avatar, type AvatarFocusMode } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

function cardUrl(username: string, source?: "qr") {
  const base = `${WEB_BASE_URL}/u/${username}`;
  return source ? `${base}?source=${source}` : base;
}

type IdentityPassProps = {
  profile: Profile;
  brandColor?: string;
  focusMode?: AvatarFocusMode;
};

export function IdentityPass({
  profile,
  brandColor = "#2563EB",
  focusMode = "center",
}: IdentityPassProps) {
  const [activeMode, setActiveMode] = useState<"card" | "qr">("card");

  const themeObj = (profile.theme ?? {}) as Record<string, unknown>;
  const zoom = typeof themeObj.avatar_zoom === "number" ? themeObj.avatar_zoom : undefined;
  const panX = typeof themeObj.avatar_pan_x === "number" ? themeObj.avatar_pan_x : undefined;
  const panY = typeof themeObj.avatar_pan_y === "number" ? themeObj.avatar_pan_y : undefined;
  const rotation = typeof themeObj.avatar_rotation === "number" ? themeObj.avatar_rotation : undefined;
  const aspectMask = typeof themeObj.avatar_aspect_mask === "string" ? themeObj.avatar_aspect_mask : undefined;
  const colorFilter = typeof themeObj.avatar_color_filter === "string" ? themeObj.avatar_color_filter : undefined;

  // Device Auto-Detection for Native Wallet Pass
  const isIOS = Platform.OS === "ios";
  const walletUrl = isIOS
    ? `${WEB_BASE_URL}/api/wallet/apple/${profile.username}`
    : `${WEB_BASE_URL}/api/wallet/google/${profile.username}`;
  const walletLabel = isIOS ? "Apple Wallet" : "Google Wallet";
  const walletIcon: React.ComponentProps<typeof Ionicons>["name"] = isIOS
    ? "logo-apple"
    : "wallet-outline";

  return (
    <View className="w-full max-w-[360px] items-center gap-5">
      {/* Segmented Mode Switcher */}
      <View className="flex-row items-center gap-1 rounded-full bg-accent/60 p-1 border border-border/50 w-full max-w-[260px]">
        <Pressable
          onPress={() => setActiveMode("card")}
          className={`flex-1 items-center py-2 rounded-full transition-all ${
            activeMode === "card" ? "bg-primary shadow-xs" : "bg-transparent"
          }`}
        >
          <Text className={`text-xs font-bold ${activeMode === "card" ? "text-white" : "text-muted-foreground"}`}>
            Identity Profile
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveMode("qr")}
          className={`flex-1 items-center py-2 rounded-full transition-all ${
            activeMode === "qr" ? "bg-primary shadow-xs" : "bg-transparent"
          }`}
        >
          <Text className={`text-xs font-bold ${activeMode === "qr" ? "text-white" : "text-muted-foreground"}`}>
            QR Pass Code
          </Text>
        </Pressable>
      </View>

      {/* ⚪ Minimalist Clean Slate Hero Identity Card */}
      <View className="w-full rounded-[32px] border border-border/80 bg-card p-6 shadow-sm items-center text-center gap-4 relative">
        {activeMode === "card" ? (
          /* PROFILE IDENTITY CARD FACE */
          <View className="items-center text-center w-full gap-3 py-1">
            {/* Active NFC Pill Badge */}
            <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/20">
              <View className="h-2 w-2 rounded-full bg-emerald-500" />
              <Text className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                NFC Active • Ready to Tap
              </Text>
            </View>

            {/* Centered Hero Profile Avatar */}
            <View className="my-1 relative">
              <Avatar
                uri={profile.avatar_url}
                size={96}
                focusMode={focusMode}
                zoom={zoom}
                panX={panX}
                panY={panY}
                rotation={rotation}
                aspectMask={aspectMask}
                colorFilter={colorFilter}
              />
            </View>

            {/* Centered Identity Info */}
            <View className="items-center text-center gap-1">
              <View className="flex-row items-center gap-1.5 justify-center">
                <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
                  {profile.display_name}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color={brandColor} />
              </View>

              {profile.designation && (
                <Text className="text-sm font-semibold text-foreground/80 text-center">
                  {profile.designation}
                  {profile.company ? ` • ${profile.company}` : ""}
                </Text>
              )}

              {profile.bio && (
                <Text className="text-xs text-muted-foreground text-center italic mt-1 px-4" numberOfLines={2}>
                  "{profile.bio}"
                </Text>
              )}
            </View>

            {/* Clean Handle Footer */}
            <View className="w-full border-t border-border/40 pt-3.5 mt-2 flex-row items-center justify-between px-1">
              <Text className="text-xs font-mono text-muted-foreground">
                tapit.man2web.in/u/{profile.username}
              </Text>
              <Pressable onPress={() => setActiveMode("qr")} className="flex-row items-center gap-1">
                <Ionicons name="qr-code-outline" size={14} color={brandColor} />
                <Text className="text-xs font-bold text-primary">View QR</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* QR PASS CODE FACE */
          <View className="items-center text-center w-full gap-4 py-2">
            <View className="flex-row items-center justify-between w-full">
              <Text className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                ID // TAPIT-{profile.username.toUpperCase()}
              </Text>
              <Pressable onPress={() => setActiveMode("card")} className="p-1">
                <Ionicons name="close-circle-outline" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-md my-1">
              <QRCode value={cardUrl(profile.username, "qr")} size={160} />
            </View>

            <Text className="text-xs text-center text-muted-foreground px-4">
              Scan code to view profile, save contact, or download wallet pass.
            </Text>

            <View className="flex-row gap-2.5 w-full pt-1">
              {/* Auto-Detected Native Device Wallet Pass Button */}
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
