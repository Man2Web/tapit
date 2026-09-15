import React, { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ProfileBlock, BlockDefinition } from "@tapit/core";
import { getBlockDefinition } from "@tapit/core";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type BlockEditorProps = {
  blocks: ProfileBlock[];
  onAddBlock: () => void;
  onToggleBlock: (id: string, isVisible: boolean) => void;
  onDeleteBlock: (id: string) => void;
  onEditBlock: (id: string) => void;
};

export function BlockEditor({
  blocks,
  onAddBlock,
  onToggleBlock,
  onDeleteBlock,
  onEditBlock,
}: BlockEditorProps) {
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active Blocks ({blocks.length})
        </Text>
      </View>

      <View className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {blocks.length === 0 ? (
          <View className="p-6 text-center items-center gap-2">
            <Ionicons name="cube-outline" size={32} color={colors.muted} />
            <Text className="text-xs text-muted-foreground text-center">
              No content blocks yet — tap below to add one.
            </Text>
          </View>
        ) : (
          blocks.map((block, idx) => {
            const def = getBlockDefinition(block.block_type);
            return (
              <ListRow
                key={block.id}
                showDivider={idx < blocks.length - 1}
                leading={
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Ionicons
                      name={def.icon as ComponentProps<typeof Ionicons>["name"]}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                }
                title={block.title || def.label}
                subtitle={block.data?.url || block.data?.value || def.description}
                onPress={() => onEditBlock(block.id)}
                trailing={
                  <View className="flex-row items-center gap-3">
                    <Pressable onPress={() => onToggleBlock(block.id, !!block.is_visible)}>
                      <Ionicons
                        name={block.is_visible ? "eye" : "eye-off-outline"}
                        size={18}
                        color={block.is_visible ? colors.primary : colors.muted}
                      />
                    </Pressable>
                    <Pressable onPress={() => onDeleteBlock(block.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                }
              />
            );
          })
        )}
      </View>

      <View className="pt-2">
        <Button
          icon="add-outline"
          onPress={onAddBlock}
          className="w-full rounded-xl py-3.5 border-dashed border-2 border-border/70"
          variant="outline"
        >
          Add Content Block
        </Button>
      </View>
    </View>
  );
}
