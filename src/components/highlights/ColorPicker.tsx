import { useState } from "react";
import { Check } from "lucide-react";
import { HIGHLIGHT_COLORS, isValidHex } from "../../constants/colors";

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  showHexInput?: boolean;
}

export function ColorPicker({
  selectedColor,
  onColorChange,
  showHexInput = true,
}: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(selectedColor);
  const [hexError, setHexError] = useState(false);

  const handleHexChange = (value: string) => {
    setHexInput(value);
    setHexError(false);

    // Auto-add # if missing
    const hex = value.startsWith("#") ? value : `#${value}`;

    if (isValidHex(hex)) {
      onColorChange(hex.toUpperCase());
    } else if (value.length >= 7) {
      setHexError(true);
    }
  };

  const handlePresetClick = (hex: string) => {
    setHexInput(hex);
    setHexError(false);
    onColorChange(hex);
  };

  const normalizedSelected = selectedColor.toUpperCase();

  return (
    <div className="space-y-3">
      {/* Preset color grid - 4x4 */}
      <div className="grid grid-cols-8 gap-1.5">
        {HIGHLIGHT_COLORS.map((color) => {
          const isSelected = color.hex.toUpperCase() === normalizedSelected;
          return (
            <button
              key={color.id}
              onClick={() => handlePresetClick(color.hex)}
              className={`w-6 h-6 rounded-full transition-all relative ${
                isSelected
                  ? "ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-stone-800"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {isSelected && (
                <Check className="w-3.5 h-3.5 absolute inset-0 m-auto text-white drop-shadow-md" />
              )}
            </button>
          );
        })}
      </div>

      {/* Hex input */}
      {showHexInput && (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg border border-stone-200 dark:border-stone-700 flex-shrink-0"
            style={{ backgroundColor: selectedColor }}
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
            placeholder="#000000"
            maxLength={7}
            className={`flex-1 px-2 py-1.5 text-sm font-mono rounded-lg border ${
              hexError
                ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function ColorPickerCompact({
  selectedColor,
  onColorChange,
}: {
  selectedColor: string;
  onColorChange: (color: string) => void;
}) {
  const normalizedSelected = selectedColor.toUpperCase();

  return (
    <div className="flex gap-1">
      {HIGHLIGHT_COLORS.slice(0, 8).map((color) => {
        const isSelected = color.hex.toUpperCase() === normalizedSelected;
        return (
          <button
            key={color.id}
            onClick={() => onColorChange(color.hex)}
            className={`w-5 h-5 rounded-full transition-all ${
              isSelected
                ? "ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-stone-800"
                : "hover:scale-110"
            }`}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          />
        );
      })}
    </div>
  );
}
