import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import type { Database } from "@tapit/types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

type ShareMethod = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  subtitle: string;
  color: string;
  onPress: () => void;
};

export default function ShareScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrSheetOpen, setQrSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("owner_id", session.user.id)
          .eq("is_primary", true)
          .maybeSingle();
        setProfile(data);
        setLoading(false);
      })();
    }, [session]),
  );

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
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Ionicons name="share-outline" size={40} color={colors.mutedForeground} />
          <Text className="text-lg font-semibold text-foreground text-center">
            Create your profile first
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            Set up your digital identity before sharing.
          </Text>
          <Button onPress={() => router.replace("/onboarding")} className="mt-2 rounded-xl px-6">
            Get Started
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const profileUrl = `${WEB_BASE_URL}/u/${profile.username}`;
  const qrUrl = `${profileUrl}?source=qr`;

  async function handleCopyLink() {
    await Clipboard.setStringAsync(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShareLink() {
    await Share.share({
      message: `Check out my digital profile: ${profileUrl}`,
      url: profileUrl,
    });
  }

  function handleShareWhatsApp() {
    const text = encodeURIComponent(`Here's my digital business card: ${profileUrl}`);
    Linking.openURL(`https://wa.me/?text=${text}`);
  }

  function handleShareEmail() {
    const subject = encodeURIComponent(`${profile!.display_name} — Digital Business Card`);
    const body = encodeURIComponent(`Hi,\n\nHere's my digital business card:\n${profileUrl}\n\nBest regards,\n${profile!.display_name}`);
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  }

  function handleShareSMS() {
    const body = encodeURIComponent(`Here's my digital business card: ${profileUrl}`);
    Linking.openURL(`sms:?body=${body}`);
  }

  function handleOpenWallet() {
    const walletUrl = `${WEB_BASE_URL}/api/wallet/apple/${profile!.username}`;
    Linking.openURL(walletUrl);
  }

  const shareMethods: ShareMethod[] = [
    {
      id: "qr",
      icon: "qr-code-outline",
      label: "Show QR Code",
      subtitle: "Let anyone scan to view your profile",
      color: "#7C2FD6",
      onPress: () => setQrSheetOpen(true),
    },
    {
      id: "copy",
      icon: copied ? "checkmark-circle" : "copy-outline",
      label: copied ? "Link Copied!" : "Copy Profile Link",
      subtitle: profileUrl.replace("https://", ""),
      color: "#2563EB",
      onPress: handleCopyLink,
    },
    {
      id: "share",
      icon: "share-social-outline",
      label: "Share via…",
      subtitle: "Open system share sheet",
      color: "#10B981",
      onPress: handleShareLink,
    },
    {
      id: "whatsapp",
      icon: "logo-whatsapp",
      label: "Share via WhatsApp",
      subtitle: "Send your card on WhatsApp",
      color: "#25D366",
      onPress: handleShareWhatsApp,
    },
    {
      id: "email",
      icon: "mail-outline",
      label: "Share via Email",
      subtitle: "Send a professional email with your card",
      color: "#EA4335",
      onPress: handleShareEmail,
    },
    {
      id: "sms",
      icon: "chatbubble-outline",
      label: "Share via SMS",
      subtitle: "Text your profile link",
      color: "#3B82F6",
      onPress: handleShareSMS,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-6 pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="gap-1">
          <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
            Share Your Identity
          </Text>
          <Text variant="muted" className="text-xs text-muted-foreground">
            Share your digital profile via QR, link, NFC, or wallet pass.
          </Text>
        </View>

        {/* Quick Link Bar */}
        <Card className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Ionicons name="link-outline" size={20} color={colors.primary} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-xs font-bold text-foreground">Your Profile Link</Text>
            <Text className="text-xs font-mono text-muted-foreground" numberOfLines={1}>
              {profileUrl.replace("https://", "")}
            </Text>
          </View>
          <Button
            size="sm"
            variant={copied ? "secondary" : "default"}
            icon={copied ? "checkmark" : "copy-outline"}
            onPress={handleCopyLink}
            className="rounded-xl px-3"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </Card>

        {/* Share Methods Grid */}
        <View className="gap-3">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Share Methods
          </Text>
          <View className="gap-2.5">
            {shareMethods.map((method) => (
              <Pressable
                key={method.id}
                onPress={method.onPress}
                className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-xs active:bg-accent/50"
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${method.color}15` }}
                >
                  <Ionicons
                    name={method.icon}
                    size={22}
                    color={method.color}
                  />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-bold text-foreground">{method.label}</Text>
                  <Text className="text-xs text-muted-foreground">{method.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Connected Accessories */}
        <View className="gap-3">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Connected Accessories
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push("/devices")}
              className="flex-1 items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs active:bg-accent/50"
            >
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Ionicons name="hardware-chip-outline" size={24} color={colors.primary} />
              </View>
              <Text className="text-xs font-bold text-foreground">NFC Devices</Text>
              <Text className="text-[10px] text-muted-foreground text-center">
                Tap to share instantly
              </Text>
            </Pressable>

            <Pressable
              onPress={handleOpenWallet}
              className="flex-1 items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs active:bg-accent/50"
            >
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Ionicons name="wallet-outline" size={24} color="#F59E0B" />
              </View>
              <Text className="text-xs font-bold text-foreground">Wallet Pass</Text>
              <Text className="text-[10px] text-muted-foreground text-center">
                Add to Apple or Google
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Bottom Sheet */}
      <BottomSheet visible={qrSheetOpen} onClose={() => setQrSheetOpen(false)}>
        <View className="items-center gap-4 pb-2">
          <Text className="text-base font-bold text-foreground text-center">
            Your QR Code
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            Anyone can scan this to view your profile and save your contact.
          </Text>

          <View className="items-center justify-center p-6 bg-white rounded-2xl border border-neutral-200 shadow-xs">
            <QRCode
              value={qrUrl}
              size={200}
              backgroundColor="#ffffff"
            />
          </View>

          <Text className="text-xs text-muted-foreground text-center font-mono">
            {profileUrl.replace("https://", "")}
          </Text>

          <View className="w-full gap-2 pt-2">
            <Button
              icon="share-outline"
              onPress={handleShareLink}
              className="w-full rounded-xl py-3.5"
            >
              Share QR Code
            </Button>
            <Button
              variant="secondary"
              onPress={() => setQrSheetOpen(false)}
              className="w-full rounded-xl"
            >
              Done
            </Button>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
