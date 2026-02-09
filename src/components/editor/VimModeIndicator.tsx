import type { VimMode } from "../../stores/editorStore";

interface VimModeIndicatorProps {
  mode: VimMode;
  className?: string;
}

const MODE_CONFIG: Record<VimMode, { label: string; color: string; bgColor: string }> = {
  NORMAL: {
    label: "NORMAL",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700",
  },
  INSERT: {
    label: "INSERT",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700",
  },
  VISUAL: {
    label: "VISUAL",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700",
  },
  VISUAL_LINE: {
    label: "V-LINE",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700",
  },
  REPLACE: {
    label: "REPLACE",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700",
  },
};

export function VimModeIndicator({ mode, className = "" }: VimModeIndicatorProps) {
  const config = MODE_CONFIG[mode];

  return (
    <div
      className={`
        inline-flex items-center justify-center
        px-3 py-1 rounded-full
        text-xs font-bold tracking-wide
        border shadow-sm
        transition-all duration-150
        ${config.color}
        ${config.bgColor}
        ${className}
      `}
    >
      <span className="relative">
        {/* Pulsing dot for INSERT mode */}
        {mode === "INSERT" && (
          <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        )}
        {config.label}
      </span>
    </div>
  );
}

// Floating version positioned at bottom center
interface FloatingVimModeIndicatorProps {
  mode: VimMode;
  visible?: boolean;
}

export function FloatingVimModeIndicator({ mode, visible = true }: FloatingVimModeIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <VimModeIndicator mode={mode} />
    </div>
  );
}

// Compact inline version for toolbar
export function VimModeIndicatorCompact({ mode }: { mode: VimMode }) {
  const config = MODE_CONFIG[mode];

  return (
    <span
      className={`
        inline-flex items-center
        px-2 py-0.5 rounded
        text-[10px] font-bold tracking-wider
        ${config.color}
        ${config.bgColor}
      `}
    >
      {config.label}
    </span>
  );
}
