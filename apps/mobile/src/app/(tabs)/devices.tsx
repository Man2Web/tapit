import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type NfcDevice = {
  id: string;
  device_name: string;
  device_type: string;
  nfc_uid: string | null;
  status: string;
  last_tapped_at: string | null;
  created_at: string;
};

export default function DevicesScreen() {
  const { session } = useAuth();
  const [devices, setDevices] = useState<NfcDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activateSheetOpen, setActivateSheetOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("card");
  const [nfcUid, setNfcUid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("nfc_devices" as any)
      .select("*")
      .order("created_at", { ascending: false });

    setDevices((data as any) ?? []);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices])
  );

  async function handleActivateDevice() {
    if (!session || !deviceName.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("nfc_devices" as any).insert({
      owner_id: session.user.id,
      device_name: deviceName.trim(),
      device_type: deviceType,
      nfc_uid: nfcUid.trim() || `NFC-${Date.now().toString(36).toUpperCase()}`,
      status: "active",
    });

    setSubmitting(false);

    if (error) {
      Alert.alert("Activation Error", error.message);
      return;
    }

    setDeviceName("");
    setNfcUid("");
    setActivateSheetOpen(false);
    loadDevices();
  }

  async function handleToggleStatus(device: NfcDevice) {
    const nextStatus = device.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("nfc_devices" as any)
      .update({ status: nextStatus })
      .eq("id", device.id);

    if (!error) {
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, status: nextStatus } : d))
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-6 pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
              NFC Devices
            </Text>
            <Text variant="muted" className="text-xs text-muted-foreground">
              Manage connected physical cards, stickers & smart hardware.
            </Text>
          </View>

          <Button
            size="sm"
            icon="add-outline"
            onPress={() => setActivateSheetOpen(true)}
            className="rounded-xl px-3.5 shadow-xs"
          >
            Activate
          </Button>
        </View>

        {/* Devices List */}
        {devices.length > 0 ? (
          <View className="gap-3.5">
            {devices.map((device) => {
              const isActive = device.status === "active";
              return (
                <Card
                  key={device.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-xs gap-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-11 w-11 items-center justify-center rounded-xl border ${
                          isActive
                            ? "bg-primary/10 border-primary/20"
                            : "bg-muted/40 border-border"
                        }`}
                      >
                        <Ionicons
                          name={
                            device.device_type === "sticker"
                              ? "hardware-chip-outline"
                              : device.device_type === "badge"
                              ? "shield-checkmark-outline"
                              : "card-outline"
                          }
                          size={22}
                          color={isActive ? colors.primary : colors.muted}
                        />
                      </View>

                      <View className="gap-0.5">
                        <Text className="text-base font-bold text-foreground">
                          {device.device_name}
                        </Text>
                        <Text className="text-xs font-mono text-muted-foreground">
                          {device.nfc_uid ?? "Tapit Tag"}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => handleToggleStatus(device)}
                      className={`px-3 py-1.5 rounded-full border ${
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500/20"
                          : "bg-secondary border-border"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold capitalize ${
                          isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        }`}
                      >
                        {device.status}
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <View className="items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center bg-card/40 my-4">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Ionicons name="hardware-chip-outline" size={28} color={colors.primary} />
            </View>
            <Text variant="h4">No NFC Devices Linked</Text>
            <Text variant="muted" className="text-center text-xs px-2">
              Activate your physical Tapit NFC card, phone tag, or executive smart badge.
            </Text>
            <Button
              icon="add-outline"
              onPress={() => setActivateSheetOpen(true)}
              className="mt-2 rounded-xl px-5 shadow-xs"
            >
              Activate Device
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Device Activation Sheet */}
      <BottomSheet visible={activateSheetOpen} onClose={() => setActivateSheetOpen(false)}>
        <View className="gap-4 pb-2">
          <Text variant="h4" className="text-base font-bold">
            Activate NFC Device
          </Text>

          <View className="gap-3">
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-foreground">Device Name</Text>
              <Input
                placeholder="e.g. Executive Titanium Card"
                value={deviceName}
                onChangeText={setDeviceName}
                className="rounded-xl"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-foreground">Device Hardware Type</Text>
              <View className="flex-row gap-2">
                {[
                  { id: "card", label: "Card" },
                  { id: "sticker", label: "Tag Sticker" },
                  { id: "badge", label: "Smart Badge" },
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setDeviceType(item.id)}
                    className={`flex-1 items-center py-2.5 rounded-xl border ${
                      deviceType === item.id
                        ? "bg-primary/10 border-primary shadow-xs"
                        : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        deviceType === item.id ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-foreground">NFC Serial / Code (Optional)</Text>
              <Input
                placeholder="e.g. NTAG-216-8840"
                value={nfcUid}
                onChangeText={setNfcUid}
                autoCapitalize="characters"
                className="rounded-xl"
              />
            </View>
          </View>

          <View className="gap-2 pt-2">
            <Button
              onPress={handleActivateDevice}
              loading={submitting}
              disabled={!deviceName.trim()}
              className="w-full rounded-xl py-3.5"
            >
              Confirm & Activate
            </Button>
            <Button
              variant="secondary"
              onPress={() => setActivateSheetOpen(false)}
              className="w-full rounded-xl"
            >
              Cancel
            </Button>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
