import type { IconType } from "react-icons";
import * as Io5 from "react-icons/io5";

function kebabToIoName(icon: string): string {
  return (
    "Io" +
    icon
      .split("-")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join("")
  );
}

// profile_links.icon stores an Ionicons kebab-case glyph name (e.g. "logo-whatsapp",
// "globe-outline") shared with the mobile app's @expo/vector-icons usage — this resolves the
// same name against react-icons' io5 (Ionicons 5) set for web. Not every glyph mobile can use
// exists in this older bundled Ionicons version (e.g. "logo-x", "logo-threads" postdate it),
// so an unresolved name falls back to a generic link icon rather than rendering nothing.
export function LinkIcon({ icon, size = 18 }: { icon: string | null; size?: number }) {
  const Component: IconType =
    (icon && (Io5 as unknown as Record<string, IconType>)[kebabToIoName(icon)]) || Io5.IoLinkOutline;
  return <Component size={size} />;
}
