import { Box, Text } from 'ink';
import type { Project } from '../types/project';
import SelectInput from 'ink-select-input';
import { useState } from 'react';
import { listProjects } from '../utils/projectConfig';

export type ProjectSelectorProps = {
  onProjectSelect: (projectValue: { label: string; value: string }) => void;
};

export default function ProjectSelector({ onProjectSelect }: ProjectSelectorProps) {
  const [projects, setProjects] = useState([] as Project[]);
  // Load available projects
  listProjects()
    .then(projects => {
      setProjects(projects);
    })
    .catch(error => {
      console.error('Failed to load projects:', error);
      setProjects([]);
    });

  const items = projects.map(project => ({
    label: project.name,
    value: project.id
  }));

  // Add "Create New" option
  items.unshift({
    label: '(Create New Project)',
    value: '__create_new__'
  });

  return (
    <Box borderStyle="single" borderColor="yellow" borderLeft={false} borderRight={false} paddingX={1}>
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Select Project (ESC to cancel):
        </Text>
        <SelectInput items={items} onSelect={onProjectSelect} onHighlight={() => {}} />
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            💡 Create New: Use format "/project add {'<name> <owner/repo> <path> [description]'}"
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
