import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getCurrentProjectDatabase } from '../utils/projectDatabase';
import TextInput from 'ink-text-input';

interface ProjectNote {
  id: number;
  title: string;
  content: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotesSelectorProps = {
  onClose?: () => void;
  onInsertNote?: (noteContent: string, noteId: number) => void;
}

type ViewMode = 'list' | 'detail';

export default function NotesSelector({
  onClose,
  onInsertNote
}: NotesSelectorProps) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<ProjectNote | null>(null);
  const [error, setError] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState(true);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Filter notes based on search query
  useEffect(() => {
    loadNotes(searchQuery);
  }, [searchQuery]);

  const loadNotes = async (query: string = '') => {
    try {
      const db = await getCurrentProjectDatabase();
      if (!db) {
        setError('No active project');
        return;
      }

      const allNotes = query ? db.searchNotes(query) : db.getNotes();
      // Get last 10 notes by default
      setNotes(allNotes.slice(0, 10));
      db.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    }
  };

  const handleSelectNote = () => {
    if (notes[selectedIndex]) {
      setSelectedNote(notes[selectedIndex]);
      setViewMode('detail');
    }
  };

  const handleInsertNote = () => {
    if (selectedNote) {
      const provenance = `\n\n---\nFrom note: ${selectedNote.title} — saved ${new Date(selectedNote.updatedAt).toLocaleString()}`;
      onInsertNote?.(selectedNote.content + provenance, selectedNote.id);
      onClose?.();
    }
  };

  const handleCopyNote = () => {
    if (selectedNote) {
      // In a terminal context, we can't actually copy to clipboard
      // But we can provide feedback that the content is ready to copy
      // For now, just show a message
      setError('Copy to clipboard not supported in terminal. Use insert instead.');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedNote(null);
  };

  // Handle keyboard input
  useInput((inputChar, key) => {
    if (viewMode === 'list' && !isSearchFocused) {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      } else if (key.downArrow && selectedIndex < notes.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      } else if (key.return) {
        handleSelectNote();
      } else if (key.escape) {
        onClose?.();
      } else if (inputChar === '/') {
        setIsSearchFocused(true);
      }
    } else if (viewMode === 'detail') {
      if (key.escape) {
        handleBackToList();
      } else if (inputChar === 'i') {
        handleInsertNote();
      } else if (inputChar === 'c') {
        handleCopyNote();
      }
    }
  }, { isActive: !isSearchFocused });

  if (error) {
    return (
      <Box borderStyle="single" paddingX={1} borderColor="red">
        <Box flexDirection="column">
          <Text color="red" bold>Error loading notes</Text>
          <Text color="red">{error}</Text>
          <Box marginTop={1}>
            <Text color="gray">Press ESC to close</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (viewMode === 'detail' && selectedNote) {
    return (
      <Box borderStyle="single" paddingX={1}>
        <Box flexDirection="column">
          <Text color="cyan" bold>
            📝 Note #{selectedNote.id}: {selectedNote.title}
          </Text>
          {selectedNote.tags && (
            <Text color="yellow">
              🏷️  {selectedNote.tags}
            </Text>
          )}
          <Box marginTop={1}>
            <Text color="gray">
              📅 Created: {new Date(selectedNote.createdAt).toLocaleString()}
            </Text>
          </Box>
          <Box>
            <Text color="gray">
              📅 Updated: {new Date(selectedNote.updatedAt).toLocaleString()}
            </Text>
          </Box>
          <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="gray">
            <Text>{selectedNote.content}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="green">i</Text>
            <Text> = Insert into chat  </Text>
            <Text color="green">c</Text>
            <Text> = Copy  </Text>
            <Text color="yellow">ESC</Text>
            <Text> = Back</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" paddingX={1} width={80}>
      <Box flexDirection="column" width="100%">
        <Text color="cyan" bold>
          📝 Notes ({notes.length} {searchQuery ? 'matching' : 'total'})
        </Text>
        <Box marginTop={1}>
          <Text>Search: </Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Type to search..."
            focus={isSearchFocused}
            onSubmit={() => setIsSearchFocused(false)}
          />
        </Box>
        {!isSearchFocused && notes.length === 0 && (
          <Box marginTop={1}>
            <Text color="gray">
              {searchQuery ? `No notes found matching "${searchQuery}"` : 'No notes found. Use /notes add to create one.'}
            </Text>
          </Box>
        )}
        {!isSearchFocused && notes.length > 0 && (
          <Box marginTop={1} flexDirection="column">
            {notes.map((note, index) => {
              const isSelected = index === selectedIndex;
              const preview = note.content.length > 50
                ? note.content.substring(0, 50) + '...'
                : note.content;
              const tags = note.tags ? ` [${note.tags}]` : '';

              // Limit title length to prevent overflow
              const maxTitleLength = 60;
              const titleText = `${note.id}: ${note.title}${tags}`;
              const displayTitle = titleText.length > maxTitleLength
                ? titleText.substring(0, maxTitleLength) + '...'
                : titleText;

              return (
                <Box key={note.id} flexDirection="column">
                  <Text
                    color={isSelected ? 'green' : undefined}
                    bold={isSelected}
                  >
                    {isSelected ? '▶ ' : '  '}
                    {displayTitle}
                  </Text>
                  <Text color="gray" dimColor>
                    {'  '}{preview}
                  </Text>
                </Box>
              );
            })}
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            {isSearchFocused ? (
              'Press ENTER to start navigating'
            ) : (
              '↑↓ = Navigate  ENTER = View  / = Search  ESC = Close'
            )}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
