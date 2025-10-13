import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { getCurrentProjectDatabase } from '../utils/projectDatabase';

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
  const [allNotes, setAllNotes] = useState<ProjectNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<ProjectNote[]>([]);
  const [windowStart, setWindowStart] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<ProjectNote | null>(null);
  const [error, setError] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState(true);

  const WINDOW_SIZE = 10;

  // Load all notes on mount
  useEffect(() => {
    loadAllNotes();
  }, []);

  const loadAllNotes = async () => {
    try {
      const db = await getCurrentProjectDatabase();
      if (!db) {
        setError('No active project');
        return;
      }

      const notes = db.getNotes();
      setAllNotes(notes);
      setFilteredNotes(notes);
      setWindowStart(0);
      setNotes(notes.slice(0, WINDOW_SIZE));
      db.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    }
  };

  // Filter notes client-side as user types
  const filterNotes = () => {
    const query = searchQueryRef.current;

    if (!query.trim()) {
      setFilteredNotes(allNotes);
      setWindowStart(0);
      setNotes(allNotes.slice(0, WINDOW_SIZE));
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = allNotes.filter(note =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags?.toLowerCase().includes(lowerQuery)
    );
    setFilteredNotes(filtered);
    setWindowStart(0);
    setNotes(filtered.slice(0, WINDOW_SIZE));
  };

  // Update visible window of notes
  const updateWindow = (newStart: number) => {
    const clampedStart = Math.max(0, Math.min(newStart, Math.max(0, filteredNotes.length - WINDOW_SIZE)));
    setWindowStart(clampedStart);
    setNotes(filteredNotes.slice(clampedStart, clampedStart + WINDOW_SIZE));
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

  // Handle keyboard input for search
  useInput((inputChar, key) => {
    if (viewMode === 'list' && isSearchFocused) {
      if (key.return) {
        setIsSearchFocused(false);
      } else if (key.escape) {
        searchQueryRef.current = '';
        setSearchQuery('');
        filterNotes();
        onClose?.();
      } else if (key.backspace || key.delete) {
        searchQueryRef.current = searchQueryRef.current.slice(0, -1);
        setSearchQuery(searchQueryRef.current);
        filterNotes();
      } else if (inputChar && !key.ctrl && !key.meta) {
        searchQueryRef.current += inputChar;
        setSearchQuery(searchQueryRef.current);
        filterNotes();
      }
    } else if (viewMode === 'list' && !isSearchFocused) {
      if (key.upArrow) {
        if (selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1);
        } else if (windowStart > 0) {
          // Scroll window up and keep cursor at top
          updateWindow(windowStart - 1);
          setSelectedIndex(0);
        }
      } else if (key.downArrow) {
        if (selectedIndex < notes.length - 1) {
          setSelectedIndex(selectedIndex + 1);
        } else if (windowStart + WINDOW_SIZE < filteredNotes.length) {
          // Scroll window down and keep cursor at bottom
          updateWindow(windowStart + 1);
          setSelectedIndex(notes.length - 1);
        }
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
  });

  if (error) {
    return (
      <Box paddingX={1} borderStyle="single" borderColor="magenta" borderLeft={false} borderRight={false}>
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
      <Box paddingX={1} borderStyle="single" borderColor="magenta" borderLeft={false} borderRight={false}>
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
    <Box paddingX={1} borderStyle="single" borderColor="magenta" borderLeft={false} borderRight={false}>
      <Box flexDirection="column">
        <Text color="cyan" bold>
          📝 Notes ({filteredNotes.length > WINDOW_SIZE ? `${windowStart + 1}-${windowStart + notes.length}/${filteredNotes.length}` : filteredNotes.length} {searchQuery ? 'matching' : 'total'})
        </Text>
        <Box marginTop={1}>
          <Text>
            <Text color="cyan">Search: </Text>
            {searchQuery || (isSearchFocused ? <Text color="gray" dimColor>Type to search...</Text> : '')}
            {isSearchFocused && <Text backgroundColor="white" color="black"> </Text>}
          </Text>
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
                <React.Fragment key={note.id}>
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
                </React.Fragment>
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
