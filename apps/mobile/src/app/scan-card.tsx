import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Contacts from "expo-contacts";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { parseBusinessCardText, type ParsedCardData } from "@tapit/core";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

async function getBase64FromUri(uri: string): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && result.includes(",")) {
          resolve(result.split(",")[1] || null);
        } else {
          resolve(result || null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Base64 conversion error:", err);
    return null;
  }
}

async function performDirectOcr(base64: string): Promise<string[]> {
  try {
    const formData = new URLSearchParams();
    formData.append("apikey", "helloworld");
    formData.append("base64Image", `data:image/jpeg;base64,${base64}`);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");

    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (res.ok) {
      const data = await res.json();
      const parsedText = data.ParsedResults?.[0]?.ParsedText;
      if (parsedText) {
        return parsedText.split("\n").map((l: string) => l.trim()).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn("Direct mobile OCR request failed:", err);
  }
  return [];
}

export default function ScanCardScreen() {
  const { session } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingToPhone, setSavingToPhone] = useState(false);
  const [cardData, setCardData] = useState<ParsedCardData | null>(null);

  async function pickImage(useCamera: boolean) {
    let result: ImagePicker.ImagePickerResult;

    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission Required", "Camera access is needed to scan paper business cards.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          base64: true,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          base64: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset) {
          setImageUri(asset.uri);
          let b64 = asset.base64;
          if (!b64) {
            b64 = await getBase64FromUri(asset.uri);
          }
          processImageText(asset.uri, b64);
        }
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Could not capture image from device.");
    }
  }

  async function processImageText(uri: string, base64?: string | null) {
    setParsing(true);
    setCardData(null);

    let extractedLines: string[] = [];

    if (base64) {
      // 1. Try web backend OCR endpoint first
      try {
        const ocrEndpoint = `${WEB_BASE_URL}/api/ocr`;
        const res = await fetch(ocrEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.parsed && (data.parsed.name || data.parsed.phone || data.parsed.email || data.parsed.company)) {
            setCardData(data.parsed);
            setParsing(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend OCR endpoint unreachable, trying direct OCR engine:", err);
      }

      // 2. Direct client-side OCR engine fallback on mobile
      extractedLines = await performDirectOcr(base64);
    }

    if (extractedLines.length > 0) {
      const parsed = parseBusinessCardText(extractedLines);
      setCardData(parsed);
    } else {
      setCardData({
        name: "",
        designation: "",
        company: "",
        phone: "",
        email: "",
        website: "",
        notes: `Scanned card on ${new Date().toLocaleDateString()}`,
        rawText: "",
      });
    }

    setParsing(false);
  }

  async function handleSaveToPhoneContacts() {
    if (!cardData) return;
    setSavingToPhone(true);

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setSavingToPhone(false);
        Alert.alert(
          "Permission Required",
          "Please grant contacts permission to save contacts to your device's native address book."
        );
        return;
      }

      const fullName = (cardData.name || "Scanned Contact").trim();
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Scanned";
      const lastName = nameParts.slice(1).join(" ") || "";

      const contact: any = {
        name: fullName,
        firstName,
        lastName,
        jobTitle: cardData.designation || undefined,
        company: cardData.company || undefined,
        phoneNumbers: cardData.phone ? [{ label: "mobile", number: cardData.phone }] : undefined,
        emails: cardData.email ? [{ label: "work", email: cardData.email }] : undefined,
        note: cardData.notes || undefined,
      };

      try {
        await Contacts.presentFormAsync(null, contact);
        setSavingToPhone(false);
      } catch {
        const contactId = await Contacts.addContactAsync(contact);
        setSavingToPhone(false);
        if (contactId) {
          Alert.alert(
            "Saved to Device! 📱",
            `${fullName} has been added to your phone's native address book.`
          );
        }
      }
    } catch (err: any) {
      setSavingToPhone(false);
      console.error("Error saving to native contacts:", err);
      Alert.alert("Save Error", err.message || "Could not save to native phone contacts.");
    }
  }

  async function handleSaveLead() {
    if (!session || !cardData) {
      Alert.alert("Error", "No active session or card data found.");
      return;
    }
    setSaving(true);

    try {
      // 1. Lookup user's profile
      let { data: profile } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("owner_id", session.user.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (!profile) {
        const { data: anyProfile } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("owner_id", session.user.id)
          .limit(1)
          .maybeSingle();
        profile = anyProfile;
      }

      if (!profile || !profile.username) {
        setSaving(false);
        Alert.alert("Error", "No profile found to attach contact.");
        return;
      }

      // 2. Submit lead via Security Definer RPC
      let { error } = await supabase.rpc("submit_lead", {
        p_username: profile.username,
        p_name: cardData.name || "Scanned Contact",
        p_phone: cardData.phone || undefined,
        p_email: cardData.email || undefined,
        p_company: cardData.company || undefined,
        p_designation: cardData.designation || undefined,
        p_notes: cardData.notes || undefined,
        p_source: "scan",
      });

      // 3. Fallback to 4-arg submit_lead RPC if remote DB has original signature
      if (error) {
        console.warn("Full submit_lead RPC error, trying 4-arg submit_lead fallback:", error);
        const { error: fallbackError } = await supabase.rpc("submit_lead", {
          p_username: profile.username,
          p_name: cardData.name || "Scanned Contact",
          p_phone: cardData.phone || undefined,
          p_email: cardData.email || undefined,
        });
        error = fallbackError;
      }

      setSaving(false);

      if (error) {
        console.error("Supabase submit_lead RPC error:", error);
        Alert.alert("Save Error", error.message);
        return;
      }

      // 4. Instant navigation to Contacts tab
      if (router.canGoBack()) {
        router.back();
      }
      router.replace("/(tabs)/leads");
    } catch (err: any) {
      setSaving(false);
      Alert.alert("Error", err.message || "Could not save contact.");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-5 px-5 pt-8 pb-12">
        {/* Top Header */}
        <View className="flex-row items-center justify-between">
          <Button variant="ghost" size="sm" icon="arrow-back" onPress={() => router.back()}>
            Back
          </Button>
          <Text variant="h4" className="text-base font-bold">
            AI Card Scanner
          </Text>
          <View className="w-12" />
        </View>

        {/* Capture / Picker Buttons */}
        {!imageUri ? (
          <View className="items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-border/80 p-8 bg-card shadow-sm mt-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="camera-outline" size={32} color={colors.primary} />
            </View>
            <Text variant="h4" className="text-center">
              Scan Paper Business Card
            </Text>
            <Text variant="muted" className="text-center text-xs">
              Take a photo or upload a card image. Our smart AI will instantly extract details.
            </Text>

            <View className="w-full gap-2.5 pt-2">
              <Button icon="camera-outline" onPress={() => pickImage(true)} className="rounded-xl">
                Take Photo
              </Button>
              <Button
                variant="secondary"
                icon="image-outline"
                onPress={() => pickImage(false)}
                className="rounded-xl"
              >
                Choose from Photos
              </Button>
            </View>
          </View>
        ) : (
          <View className="gap-5">
            {/* Image Preview */}
            <View className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              <Image source={{ uri: imageUri }} className="h-44 w-full object-cover" />
              <Button
                variant="secondary"
                size="sm"
                icon="refresh-outline"
                onPress={() => {
                  setImageUri(null);
                  setCardData(null);
                }}
                className="absolute right-3 top-3 rounded-full bg-background/80 px-3 backdrop-blur-md"
              >
                Rescan
              </Button>
            </View>

            {/* Parsing State or Edit Form */}
            {parsing ? (
              <View className="items-center justify-center gap-3 p-8">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text variant="muted" className="text-xs">
                  Extracting text from business card...
                </Text>
              </View>
            ) : cardData ? (
              <View className="gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
                <View className="flex-row items-center gap-2 border-b border-border/50 pb-3">
                  <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
                  <Text className="text-base font-bold text-foreground">Extracted Information</Text>
                </View>

                <View className="gap-3">
                  <View className="gap-1">
                    <Text className="text-xs font-semibold text-muted-foreground">Full Name</Text>
                    <TextInput
                      value={cardData.name}
                      onChangeText={(v) => setCardData({ ...cardData, name: v })}
                      placeholder="e.g. John Doe"
                      placeholderTextColor={colors.muted}
                      className="rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm text-foreground"
                    />
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-xs font-semibold text-muted-foreground">Title</Text>
                      <TextInput
                        value={cardData.designation}
                        onChangeText={(v) => setCardData({ ...cardData, designation: v })}
                        placeholder="e.g. Director"
                        placeholderTextColor={colors.muted}
                        className="rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm text-foreground"
                      />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-xs font-semibold text-muted-foreground">Company</Text>
                      <TextInput
                        value={cardData.company}
                        onChangeText={(v) => setCardData({ ...cardData, company: v })}
                        placeholder="e.g. Acme Inc"
                        placeholderTextColor={colors.muted}
                        className="rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm text-foreground"
                      />
                    </View>
                  </View>

                  <View className="gap-1">
                    <Text className="text-xs font-semibold text-muted-foreground">Phone Number</Text>
                    <TextInput
                      value={cardData.phone}
                      onChangeText={(v) => setCardData({ ...cardData, phone: v })}
                      placeholder="e.g. +1 234 567 8900"
                      placeholderTextColor={colors.muted}
                      className="rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm text-foreground"
                    />
                  </View>

                  <View className="gap-1">
                    <Text className="text-xs font-semibold text-muted-foreground">Email Address</Text>
                    <TextInput
                      value={cardData.email}
                      onChangeText={(v) => setCardData({ ...cardData, email: v })}
                      placeholder="e.g. john@acme.com"
                      placeholderTextColor={colors.muted}
                      className="rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm text-foreground"
                    />
                  </View>
                </View>

                {/* Save Buttons */}
                <View className="gap-2.5 pt-3 border-t border-border/50">
                  <Button
                    icon="checkmark-done-outline"
                    onPress={handleSaveLead}
                    loading={saving}
                    className="rounded-full py-3.5"
                  >
                    Save to App Contacts
                  </Button>

                  <Button
                    variant="outline"
                    icon="person-add-outline"
                    onPress={handleSaveToPhoneContacts}
                    loading={savingToPhone}
                    className="rounded-full py-3.5 border-border/80"
                  >
                    Save to Mobile Address Book
                  </Button>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
