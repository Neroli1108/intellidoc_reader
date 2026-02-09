import { useState, useEffect } from "react";
import { MessageSquare, X, Send, Trash2 } from "lucide-react";

export interface LineNote {
  id: string;
  lineNumber: number;
  lineText: string;
  note: string;
  color: "yellow" | "green" | "blue" | "purple" | "red";
  createdAt: string;
}

interface LineNotesProps {
  notes: LineNote[];
  onAddNote: (lineNumber: number, lineText: string, note: string, color: string) => void;
  onDeleteNote: (noteId: string) => void;
  onNoteClick?: (note: LineNote) => void;
}

export function LineNotes({ notes, onAddNote: _onAddNote, onDeleteNote, onNoteClick }: LineNotesProps) {
  return (
    <div className="space-y-2">
      {notes.length === 0 ? (
        <p className="text-stone-500 dark:text-stone-400 text-sm text-center py-4">
          No notes yet. Select text to add a note.
        </p>
      ) : (
        notes.map((note) => (
          <div
            key={note.id}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              note.color === "yellow"
                ? "bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500"
                : note.color === "green"
                ? "bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500"
                : note.color === "blue"
                ? "bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500"
                : note.color === "purple"
                ? "bg-purple-100 dark:bg-purple-900/30 border-l-4 border-purple-500"
                : "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500"
            }`}
            onClick={() => onNoteClick?.(note)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                  Line {note.lineNumber}
                </p>
                <p className="text-sm text-stone-700 dark:text-stone-300 italic mb-2 line-clamp-2">
                  "{note.lineText}"
                </p>
                <p className="text-sm text-stone-900 dark:text-stone-100">{note.note}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded"
              >
                <Trash2 className="w-4 h-4 text-stone-500" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

interface AddNoteDialogProps {
  isOpen: boolean;
  selectedText: string;
  lineNumber: number;
  initialNote?: string;
  onClose: () => void;
  onSave: (note: string, color: string) => void;
}

export function AddNoteDialog({
  isOpen,
  selectedText,
  lineNumber,
  initialNote = "",
  onClose,
  onSave,
}: AddNoteDialogProps) {
  const [note, setNote] = useState(initialNote);
  const isEditing = !!initialNote;

  // Reset note when dialog opens with new initialNote
  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (note.trim()) {
      onSave(note.trim(), "yellow"); // Color not used when editing
      setNote("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold">{isEditing ? "Edit Note" : "Add Note"}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Selected text preview */}
          <div>
            <label className="text-xs text-stone-500 dark:text-stone-400">
              Highlighted Text (Page {lineNumber})
            </label>
            <p className="mt-1 p-2 bg-stone-100 dark:bg-stone-700 rounded text-sm italic line-clamp-3">
              "{selectedText}"
            </p>
          </div>

          {/* Note input */}
          <div>
            <label className="text-xs text-stone-500 dark:text-stone-400">
              Your Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your note here..."
              className="mt-1 w-full p-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-stone-200 dark:border-stone-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!note.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isEditing ? "Update Note" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
