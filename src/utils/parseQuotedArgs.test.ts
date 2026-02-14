import { describe, it, expect } from 'vitest';
import { parseQuotedArgs } from './parseQuotedArgs';

describe('parseQuotedArgs', () => {
  it('should return empty array for empty input', () => {
    expect(parseQuotedArgs([])).toEqual([]);
  });

  it('should pass through single unquoted arg unchanged', () => {
    expect(parseQuotedArgs(['hello'])).toEqual(['hello']);
  });

  it('should pass through multiple unquoted args unchanged', () => {
    expect(parseQuotedArgs(['add', 'name', 'repo'])).toEqual(['add', 'name', 'repo']);
  });

  it('should join double-quoted multi-word args and strip quotes', () => {
    expect(parseQuotedArgs(['"My', 'Project"'])).toEqual(['My Project']);
  });

  it('should join single-quoted multi-word args and strip quotes', () => {
    expect(parseQuotedArgs(["'My", "Project'"])).toEqual(['My Project']);
  });

  it('should strip quotes from single-word double-quoted arg', () => {
    expect(parseQuotedArgs(['"Developer"'])).toEqual(['Developer']);
  });

  it('should strip quotes from single-word single-quoted arg', () => {
    expect(parseQuotedArgs(["'Developer'"])).toEqual(['Developer']);
  });

  it('should handle mixed quoted and unquoted args', () => {
    expect(parseQuotedArgs(['"End', 'User"', 'Developer', '"The', 'devs"'])).toEqual([
      'End User',
      'Developer',
      'The devs',
    ]);
  });

  it('should handle three+ word quoted strings', () => {
    expect(parseQuotedArgs(['"A', 'B', 'C"'])).toEqual(['A B C']);
  });

  it('should gracefully handle unclosed quote at end', () => {
    expect(parseQuotedArgs(['"Open', 'ended'])).toEqual(['Open ended']);
  });

  it('should handle multiple quoted args in sequence', () => {
    expect(
      parseQuotedArgs(['add', '"My', 'App"', '"user/repo"', '"/home/user/my', 'app"', '"A', 'cool', 'description"'])
    ).toEqual(['add', 'My App', 'user/repo', '/home/user/my app', 'A cool description']);
  });

  it('should preserve URLs without quotes', () => {
    expect(parseQuotedArgs(['https://github.com/user/repo'])).toEqual([
      'https://github.com/user/repo',
    ]);
  });

  it('should handle empty double-quoted string', () => {
    expect(parseQuotedArgs(['add', '""', 'repo', 'path'])).toEqual(['add', '', 'repo', 'path']);
  });

  it('should handle empty single-quoted string', () => {
    expect(parseQuotedArgs(['add', "''", 'repo'])).toEqual(['add', '', 'repo']);
  });

  it('should handle a realistic /project add command', () => {
    // Simulating: /project add "My Project" "user/my-repo" "/tmp/my project" "A test project"
    // After split(/\s+/): ['add', '"My', 'Project"', '"user/my-repo"', '"/tmp/my', 'project"', '"A', 'test', 'project"']
    expect(
      parseQuotedArgs([
        'add',
        '"My',
        'Project"',
        '"user/my-repo"',
        '"/tmp/my',
        'project"',
        '"A',
        'test',
        'project"',
      ])
    ).toEqual(['add', 'My Project', 'user/my-repo', '/tmp/my project', 'A test project']);
  });
});
