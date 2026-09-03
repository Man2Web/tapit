import { useState } from "react";
import {
  Image,
  Modal,
  PanResponder,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./button";
import { Text } from "./text";
import { colors } from "@/lib/colors";
import type { AvatarFocusMode } from "./avatar";

export type AspectMask = "circle" | "square" | "squircle";
export type ColorFilter = "normal" | "mono" | "warm" | "cool";

export type PhotoEditorResult = {
  imageUri: string;
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  focusMode: AvatarFocusMode;
  aspectMask?: AspectMask;
  colorFilter?: ColorFilter;
};

type ProfilePhotoEditorProps = {
  visible: boolean;
  imageUri: string | null;
  initialFocusMode?: AvatarFocusMode;
  initialZoom?: number;
  initialPanX?: number;
  initialPanY?: number;
  initialRotation?: number;
  initialAspectMask?: AspectMask;
  initialColorFilter?: ColorFilter;
  onClose: () => void;
  onSave: (result: PhotoEditorResult) => void;
};

export function ProfilePhotoEditor({
  visible,
  imageUri,
  initialFocusMode = "head",
  initialZoom = 1.0,
  initialPanX = 0,
  initialPanY = 0,
  initialRotation = 0,
  initialAspectMask = "circle",
  initialColorFilter = "normal",
  onClose,
  onSave,
}: ProfilePhotoEditorProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [panX, setPanX] = useState(initialPanX);
  const [panY, setPanY] = useState(initialPanY);
  const [rotation, setRotation] = useState(initialRotation);
  const [focusMode, setFocusMode] = useState<AvatarFocusMode>(initialFocusMode);
  const [aspectMask, setAspectMask] = useState<AspectMask>(initialAspectMask);
  const [colorFilter, setColorFilter] = useState<ColorFilter>(initialColorFilter);
  const [showGrid, setShowGrid] = useState(true);
  const [activeTab, setActiveTab] = useState<"zoom" | "rotate" | "mask" | "filter">("zoom");

  // Pan gesture responder for direct drag positioning
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      // Clamp pan bounds relative to zoom level
      const maxPan = 140 * zoom;
      const newX = Math.max(-maxPan, Math.min(maxPan, panX + gestureState.dx * 0.15));
      const newY = Math.max(-maxPan, Math.min(maxPan, panY + gestureState.dy * 0.15));
      setPanX(newX);
      setPanY(newY);
    },
  });

  function handleReset() {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    setRotation(0);
    setFocusMode("head");
    setAspectMask("circle");
    setColorFilter("normal");
  }

  function handleRotate90(direction: "left" | "right") {
    const delta = direction === "right" ? 90 : -90;
    setRotation((prev) => (prev + delta) % 360);
  }

  function handleSave() {
    if (!imageUri) return;
    onSave({
      imageUri,
      zoom,
      panX,
      panY,
      rotation,
      focusMode,
      aspectMask,
      colorFilter,
    });
    onClose();
  }

  if (!visible || !imageUri) return null;

  // Apply vertical offset based on framing mode if panY is 0
  const effectivePanY = focusMode === "head" && panY === 0 ? -28 : panY;
  const effectiveScale = focusMode === "head" ? zoom * 1.1 : zoom;
  const resizeMode = focusMode === "fit" ? "contain" : "cover";

  // Aspect Mask Border Radius
  const maskRadiusClass =
    aspectMask === "square"
      ? "rounded-2xl"
      : aspectMask === "squircle"
      ? "rounded-3xl"
      : "rounded-full";

  // Filter overlay tint styles
  const filterOverlayStyle =
    colorFilter === "mono"
      ? "bg-slate-900/60 saturate-0"
      : colorFilter === "warm"
      ? "bg-amber-950/20"
      : colorFilter === "cool"
      ? "bg-sky-950/20"
      : "bg-transparent";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-slate-950 text-white justify-between">
        <SafeAreaView className="flex-1 justify-between">
          {/* Top Navigation Bar */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-2 border-b border-slate-800/80">
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 active:scale-95"
            >
              <Ionicons name="close-outline" size={22} color="white" />
            </Pressable>

            <View className="items-center">
              <Text className="text-base font-bold text-white">Studio Photo Editor</Text>
              <Text className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Crop • Align • Filter
              </Text>
            </View>

            <Pressable
              onPress={handleReset}
              className="rounded-full bg-slate-900 px-3.5 py-1.5 border border-slate-800 active:scale-95"
            >
              <Text className="text-xs font-semibold text-slate-300">Reset</Text>
            </Pressable>
          </View>

          {/* Center Viewport & Interactive Crop Mask */}
          <View className="flex-1 items-center justify-center relative my-4">
            {/* Darkened Vignette Overlay */}
            <View className="absolute inset-0 bg-slate-950/90" />

            {/* Interactive Image Container */}
            <View
              {...panResponder.panHandlers}
              className={`h-[280px] w-[280px] ${maskRadiusClass} overflow-hidden border-2 border-white/60 shadow-2xl bg-slate-900 items-center justify-center relative z-10`}
            >
              <Image
                source={{ uri: imageUri }}
                className={`h-[280px] w-[280px] ${maskRadiusClass}`}
                resizeMode={resizeMode}
                style={{
                  transform: [
                    { scale: effectiveScale },
                    { translateX: panX },
                    { translateY: effectivePanY },
                    { rotate: `${rotation}deg` },
                  ],
                }}
              />

              {/* Real-time Color Filter Tint Layer */}
              {colorFilter !== "normal" && (
                <View className={`absolute inset-0 pointer-events-none ${filterOverlayStyle}`} />
              )}

              {/* 3x3 Rule-of-Thirds Composition Grid */}
              {showGrid && (
                <View className="absolute inset-0 pointer-events-none z-20 flex-col justify-between p-0 border border-white/20">
                  <View className="flex-1 flex-row border-b border-white/20">
                    <View className="flex-1 border-r border-white/20" />
                    <View className="flex-1 border-r border-white/20" />
                    <View className="flex-1" />
                  </View>
                  <View className="flex-1 flex-row border-b border-white/20">
                    <View className="flex-1 border-r border-white/20" />
                    <View className="flex-1 border-r border-white/20" />
                    <View className="flex-1" />
                  </View>
                  <View className="flex-1 flex-row">
                    <View className="flex-1 border-r border-white/20" />
                    <View className="flex-1 border-r border-white/20" />
                    <View className="flex-1" />
                  </View>
                </View>
              )}
            </View>

            {/* Crop Boundary Indicator Glass Ring */}
            <View className={`absolute pointer-events-none h-[284px] w-[284px] ${maskRadiusClass} border border-primary/60 z-20`} />

            {/* Gesture Hint & Grid Toggle */}
            <View className="flex-row items-center gap-3 mt-5 z-20">
              <Text className="text-xs font-medium text-slate-400">
                Drag to position • Pinch to zoom
              </Text>
              <Pressable
                onPress={() => setShowGrid((prev) => !prev)}
                className="flex-row items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 border border-slate-800"
              >
                <Ionicons name="grid-outline" size={12} color={showGrid ? colors.primary : "#94A3B8"} />
                <Text className={`text-[10px] font-bold ${showGrid ? "text-primary" : "text-slate-400"}`}>
                  {showGrid ? "Grid ON" : "Grid OFF"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Bottom Tool & Slider Controls */}
          <View className="px-5 pb-6 gap-4 bg-slate-900/90 border-t border-slate-800/80 rounded-t-3xl pt-4">
            {/* 4 Tool Switcher Tabs */}
            <View className="flex-row items-center gap-1 rounded-full bg-slate-950 p-1 border border-slate-800">
              <Pressable
                onPress={() => setActiveTab("zoom")}
                className={`flex-1 items-center py-2 rounded-full ${
                  activeTab === "zoom" ? "bg-primary" : "bg-transparent"
                }`}
              >
                <Text className={`text-xs font-bold ${activeTab === "zoom" ? "text-white" : "text-slate-400"}`}>
                  Zoom
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("rotate")}
                className={`flex-1 items-center py-2 rounded-full ${
                  activeTab === "rotate" ? "bg-primary" : "bg-transparent"
                }`}
              >
                <Text className={`text-xs font-bold ${activeTab === "rotate" ? "text-white" : "text-slate-400"}`}>
                  Rotate
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("mask")}
                className={`flex-1 items-center py-2 rounded-full ${
                  activeTab === "mask" ? "bg-primary" : "bg-transparent"
                }`}
              >
                <Text className={`text-xs font-bold ${activeTab === "mask" ? "text-white" : "text-slate-400"}`}>
                  Mask Shape
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("filter")}
                className={`flex-1 items-center py-2 rounded-full ${
                  activeTab === "filter" ? "bg-primary" : "bg-transparent"
                }`}
              >
                <Text className={`text-xs font-bold ${activeTab === "filter" ? "text-white" : "text-slate-400"}`}>
                  Color Filter
                </Text>
              </Pressable>
            </View>

            {/* Tab 1: Zoom Control */}
            {activeTab === "zoom" && (
              <View className="gap-3 py-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-slate-300">Zoom Level</Text>
                  <Text className="text-xs font-bold text-primary">{zoom.toFixed(1)}x</Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => setZoom((z) => Math.max(1.0, z - 0.15))}
                    className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 active:scale-95"
                  >
                    <Ionicons name="remove-outline" size={20} color="white" />
                  </Pressable>

                  {/* Visual Stepper Track */}
                  <View className="flex-1 flex-row items-center justify-between gap-1">
                    {[1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0].map((step) => {
                      const isActive = zoom >= step;
                      return (
                        <Pressable
                          key={step}
                          onPress={() => setZoom(step)}
                          className={`flex-1 h-3 rounded-full ${
                            isActive ? "bg-primary" : "bg-slate-800"
                          }`}
                        />
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={() => setZoom((z) => Math.min(3.0, z + 0.15))}
                    className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 active:scale-95"
                  >
                    <Ionicons name="add-outline" size={20} color="white" />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Tab 2: Rotation Control */}
            {activeTab === "rotate" && (
              <View className="gap-3 py-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-slate-300">Rotation Angle</Text>
                  <Text className="text-xs font-bold text-primary">{rotation}°</Text>
                </View>

                <View className="flex-row items-center justify-center gap-3">
                  <Pressable
                    onPress={() => handleRotate90("left")}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-slate-800 border border-slate-700 py-3 active:scale-95"
                  >
                    <Ionicons name="refresh-outline" size={18} color="white" style={{ transform: [{ scaleX: -1 }] }} />
                    <Text className="text-xs font-bold text-white">Rotate -90°</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleRotate90("right")}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-slate-800 border border-slate-700 py-3 active:scale-95"
                  >
                    <Ionicons name="refresh-outline" size={18} color="white" />
                    <Text className="text-xs font-bold text-white">Rotate +90°</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Tab 3: Aspect Mask Presets */}
            {activeTab === "mask" && (
              <View className="flex-row items-center justify-center gap-2 py-1">
                <Pressable
                  onPress={() => setAspectMask("circle")}
                  className={`flex-1 items-center py-3 rounded-2xl border ${
                    aspectMask === "circle" ? "border-primary bg-primary/20" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <Text className={`text-xs font-bold ${aspectMask === "circle" ? "text-primary" : "text-slate-300"}`}>
                    Circle
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setAspectMask("squircle")}
                  className={`flex-1 items-center py-3 rounded-2xl border ${
                    aspectMask === "squircle" ? "border-primary bg-primary/20" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <Text className={`text-xs font-bold ${aspectMask === "squircle" ? "text-primary" : "text-slate-300"}`}>
                    Soft Round
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setAspectMask("square")}
                  className={`flex-1 items-center py-3 rounded-2xl border ${
                    aspectMask === "square" ? "border-primary bg-primary/20" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <Text className={`text-xs font-bold ${aspectMask === "square" ? "text-primary" : "text-slate-300"}`}>
                    Square
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Tab 4: Color Filter Tints */}
            {activeTab === "filter" && (
              <View className="flex-row items-center justify-center gap-2 py-1">
                <Pressable
                  onPress={() => setColorFilter("normal")}
                  className={`flex-1 items-center py-3 rounded-2xl border ${
                    colorFilter === "normal" ? "border-primary bg-primary/20" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <Text className={`text-xs font-bold ${colorFilter === "normal" ? "text-primary" : "text-slate-300"}`}>
                    Original
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setColorFilter("mono")}
                  className={`flex-1 items-center py-3 rounded-2xl border ${
                    colorFilter === "mono" ? "border-primary bg-primary/20" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <Text className={`text-xs font-bold ${colorFilter === "mono" ? "text-primary" : "text-slate-300"}`}>
                    Monochrome
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setColorFilter("warm")}
                  className={`flex-1 items-center py-3 rounded-2xl border ${
                    colorFilter === "warm" ? "border-primary bg-primary/20" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <Text className={`text-xs font-bold ${colorFilter === "warm" ? "text-primary" : "text-slate-300"}`}>
                    Warm Studio
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setColorFilter("cool")}
                  className={`flex-1 items-center py-3 rounded-2xl border ${
                    colorFilter === "cool" ? "border-primary bg-primary/20" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <Text className={`text-xs font-bold ${colorFilter === "cool" ? "text-primary" : "text-slate-300"}`}>
                    Cool Slate
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Primary Save Button */}
            <Button
              icon="checkmark-circle-outline"
              onPress={handleSave}
              className="w-full py-4 rounded-full shadow-lg mt-1"
            >
              Save Profile Photo
            </Button>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
