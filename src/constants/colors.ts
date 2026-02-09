// Expanded 16-color palette for highlight categories

export interface ColorDefinition {
  id: string;
  name: string;
  hex: string;
  rgba: string;      // For highlight overlays (40% opacity)
  rgbaFull: string;  // Full opacity for swatches/borders
  tailwind: string;  // Tailwind class for backgrounds
}

export const HIGHLIGHT_COLORS: ColorDefinition[] = [
  {
    id: "yellow",
    name: "Yellow",
    hex: "#FDE047",
    rgba: "rgba(253, 224, 71, 0.35)",
    rgbaFull: "rgba(253, 224, 71, 1)",
    tailwind: "bg-yellow-300",
  },
  {
    id: "orange",
    name: "Orange",
    hex: "#FB923C",
    rgba: "rgba(251, 146, 60, 0.35)",
    rgbaFull: "rgba(251, 146, 60, 1)",
    tailwind: "bg-orange-400",
  },
  {
    id: "red",
    name: "Red",
    hex: "#F87171",
    rgba: "rgba(248, 113, 113, 0.35)",
    rgbaFull: "rgba(248, 113, 113, 1)",
    tailwind: "bg-red-400",
  },
  {
    id: "pink",
    name: "Pink",
    hex: "#F472B6",
    rgba: "rgba(244, 114, 182, 0.35)",
    rgbaFull: "rgba(244, 114, 182, 1)",
    tailwind: "bg-pink-400",
  },
  {
    id: "rose",
    name: "Rose",
    hex: "#FB7185",
    rgba: "rgba(251, 113, 133, 0.35)",
    rgbaFull: "rgba(251, 113, 133, 1)",
    tailwind: "bg-rose-400",
  },
  {
    id: "purple",
    name: "Purple",
    hex: "#C084FC",
    rgba: "rgba(192, 132, 252, 0.35)",
    rgbaFull: "rgba(192, 132, 252, 1)",
    tailwind: "bg-purple-400",
  },
  {
    id: "violet",
    name: "Violet",
    hex: "#A78BFA",
    rgba: "rgba(167, 139, 250, 0.35)",
    rgbaFull: "rgba(167, 139, 250, 1)",
    tailwind: "bg-violet-400",
  },
  {
    id: "indigo",
    name: "Indigo",
    hex: "#818CF8",
    rgba: "rgba(129, 140, 248, 0.35)",
    rgbaFull: "rgba(129, 140, 248, 1)",
    tailwind: "bg-indigo-400",
  },
  {
    id: "blue",
    name: "Blue",
    hex: "#60A5FA",
    rgba: "rgba(96, 165, 250, 0.35)",
    rgbaFull: "rgba(96, 165, 250, 1)",
    tailwind: "bg-blue-400",
  },
  {
    id: "sky",
    name: "Sky",
    hex: "#38BDF8",
    rgba: "rgba(56, 189, 248, 0.35)",
    rgbaFull: "rgba(56, 189, 248, 1)",
    tailwind: "bg-sky-400",
  },
  {
    id: "cyan",
    name: "Cyan",
    hex: "#22D3EE",
    rgba: "rgba(34, 211, 238, 0.35)",
    rgbaFull: "rgba(34, 211, 238, 1)",
    tailwind: "bg-cyan-400",
  },
  {
    id: "teal",
    name: "Teal",
    hex: "#2DD4BF",
    rgba: "rgba(45, 212, 191, 0.35)",
    rgbaFull: "rgba(45, 212, 191, 1)",
    tailwind: "bg-teal-400",
  },
  {
    id: "emerald",
    name: "Emerald",
    hex: "#34D399",
    rgba: "rgba(52, 211, 153, 0.35)",
    rgbaFull: "rgba(52, 211, 153, 1)",
    tailwind: "bg-emerald-400",
  },
  {
    id: "green",
    name: "Green",
    hex: "#4ADE80",
    rgba: "rgba(74, 222, 128, 0.35)",
    rgbaFull: "rgba(74, 222, 128, 1)",
    tailwind: "bg-green-400",
  },
  {
    id: "lime",
    name: "Lime",
    hex: "#A3E635",
    rgba: "rgba(163, 230, 53, 0.35)",
    rgbaFull: "rgba(163, 230, 53, 1)",
    tailwind: "bg-lime-400",
  },
  {
    id: "amber",
    name: "Amber",
    hex: "#FBBF24",
    rgba: "rgba(251, 191, 36, 0.35)",
    rgbaFull: "rgba(251, 191, 36, 1)",
    tailwind: "bg-amber-400",
  },
];

// Lookup helpers
export function getColorById(id: string): ColorDefinition | undefined {
  return HIGHLIGHT_COLORS.find((c) => c.id === id);
}

export function getColorByHex(hex: string): ColorDefinition | undefined {
  const normalizedHex = hex.toUpperCase();
  return HIGHLIGHT_COLORS.find((c) => c.hex.toUpperCase() === normalizedHex);
}

export function hexToRgba(hex: string, opacity: number = 0.35): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(253, 224, 71, ${opacity})`; // fallback to yellow

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

// Color name to legacy color mapping (for backward compatibility)
export const LEGACY_COLOR_MAP: Record<string, string> = {
  yellow: "#FDE047",
  green: "#4ADE80",
  blue: "#60A5FA",
  purple: "#C084FC",
  red: "#F87171",
  orange: "#FB923C",
};

export function legacyColorToHex(colorName: string): string {
  return LEGACY_COLOR_MAP[colorName] || "#FDE047";
}
