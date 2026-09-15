import React from "react";
import { View } from "react-native";
import type { ProfileBlock } from "@tapit/core";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

type BlockRendererProps = {
  block: ProfileBlock;
  onChange: (updatedBlock: ProfileBlock) => void;
};

export function BlockRenderer({ block, onChange }: BlockRendererProps) {
  const handleChange = (field: string, value: any) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        [field]: value,
      },
    });
  };

  const renderFields = () => {
    switch (block.block_type) {
      case "contact":
      case "social":
      case "website":
      case "custom_link":
      case "payment":
      case "booking":
        return (
          <View className="gap-2">
            <Text className="text-xs font-semibold text-foreground">URL / Link</Text>
            <Input
              value={block.data?.url || block.data?.value || ""}
              onChangeText={(text) => handleChange(block.block_type === 'custom_link' ? 'url' : 'value', text)}
              placeholder="https://..."
              className="rounded-xl"
              autoCapitalize="none"
            />
          </View>
        );
      
      case "testimonial":
        return (
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-xs font-semibold text-foreground">Quote</Text>
              <Input
                value={block.data?.description || ""}
                onChangeText={(text) => handleChange("description", text)}
                placeholder="What did they say?"
                multiline
                numberOfLines={3}
                className="rounded-xl min-h-20"
              />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-semibold text-foreground">Author Name</Text>
              <Input
                value={block.data?.author || ""}
                onChangeText={(text) => handleChange("author", text)}
                placeholder="Jane Doe"
                className="rounded-xl"
              />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-semibold text-foreground">Designation / Company</Text>
              <Input
                value={block.data?.designation || ""}
                onChangeText={(text) => handleChange("designation", text)}
                placeholder="CEO at Acme Corp"
                className="rounded-xl"
              />
            </View>
          </View>
        );

      case "cta":
        return (
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-xs font-semibold text-foreground">Action Label</Text>
              <Input
                value={block.data?.action_label || ""}
                onChangeText={(text) => handleChange("action_label", text)}
                placeholder="e.g. Book a Consultation"
                className="rounded-xl"
              />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-semibold text-foreground">Destination URL</Text>
              <Input
                value={block.data?.url || ""}
                onChangeText={(text) => handleChange("url", text)}
                placeholder="https://..."
                className="rounded-xl"
                autoCapitalize="none"
              />
            </View>
          </View>
        );

      case "text":
        return (
          <View className="gap-2">
            <Text className="text-xs font-semibold text-foreground">Content</Text>
            <Input
              value={block.data?.description || ""}
              onChangeText={(text) => handleChange("description", text)}
              placeholder="Write something..."
              multiline
              numberOfLines={4}
              className="rounded-xl min-h-24"
            />
          </View>
        );

      default:
        return (
          <View className="gap-2">
            <Text className="text-xs font-semibold text-foreground">Details</Text>
            <Input
              value={block.data?.description || block.data?.value || ""}
              onChangeText={(text) => handleChange("description", text)}
              placeholder="Enter details..."
              multiline
              className="rounded-xl"
            />
          </View>
        );
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-xs font-semibold text-foreground">Block Title</Text>
        <Input
          value={block.title}
          onChangeText={(text) => onChange({ ...block, title: text })}
          placeholder="Block Title"
          className="rounded-xl font-bold"
        />
      </View>
      
      {renderFields()}
    </View>
  );
}
