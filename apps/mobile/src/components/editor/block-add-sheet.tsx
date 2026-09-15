import React, { ComponentProps } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLOCK_DEFINITIONS, type BlockType } from "@tapit/core";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type BlockAddSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectBlock: (type: BlockType) => void;
};

export function BlockAddSheet({ visible, onClose, onSelectBlock }: BlockAddSheetProps) {
  const categories = [
    { id: "contact", label: "Contact & Social" },
    { id: "business", label: "Business & Sales" },
    { id: "content", label: "Media & Content" },
    { id: "action", label: "Actions & Links" },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-4 pb-4">
        <Text variant="h4" className="text-base font-bold text-center text-foreground">
          Add Content Block
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} className="max-h-[60vh]">
          <View className="gap-5">
            {categories.map((category) => {
              const blocks = BLOCK_DEFINITIONS.filter((b) => b.category === category.id);
              if (blocks.length === 0) return null;

              return (
                <View key={category.id} className="gap-2.5">
                  <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {category.label}
                  </Text>
                  <View className="gap-2">
                    {blocks.map((block) => (
                      <Pressable
                        key={block.type}
                        onPress={() => onSelectBlock(block.type)}
                        className="flex-row items-center gap-3.5 rounded-xl border border-border bg-card p-3.5 shadow-xs active:bg-accent/50"
                      >
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <Ionicons
                            name={block.icon as ComponentProps<typeof Ionicons>["name"]}
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                        <View className="flex-1 gap-0.5">
                          <Text className="text-sm font-bold text-foreground">{block.label}</Text>
                          <Text className="text-xs text-muted-foreground">{block.description}</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}
