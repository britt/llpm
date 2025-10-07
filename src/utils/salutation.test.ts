import { describe, it, expect } from 'vitest';
import {
  composeWithSalutation,
  getSalutationConfig,
  DEFAULT_SALUTATION
} from './salutation';

describe('composeWithSalutation', () => {
  it('should prepend default salutation to body text', () => {
    const body = 'This is a test issue body.';
    const result = composeWithSalutation(body);
    expect(result).toBe(`${DEFAULT_SALUTATION}\n\n${body}`);
  });

  it('should trim leading and trailing whitespace from body', () => {
    const body = '   This is a test issue body.   \n';
    const result = composeWithSalutation(body);
    expect(result).toBe(`${DEFAULT_SALUTATION}\n\nThis is a test issue body.`);
  });

  it('should not prepend salutation if already present (idempotent)', () => {
    const body = `${DEFAULT_SALUTATION}\n\nThis is a test issue body.`;
    const result = composeWithSalutation(body);
    expect(result).toBe(body);
  });

  it('should handle empty body text', () => {
    const result = composeWithSalutation('');
    expect(result).toBe(`${DEFAULT_SALUTATION}\n\n`);
  });

  it('should handle whitespace-only body text', () => {
    const result = composeWithSalutation('   \n  \t  ');
    expect(result).toBe(`${DEFAULT_SALUTATION}\n\n`);
  });

  it('should use custom salutation text when provided', () => {
    const body = 'Test body';
    const customText = '🎉 Custom Salutation';
    const result = composeWithSalutation(body, { text: customText });
    expect(result).toBe(`${customText}\n\n${body}`);
  });

  it('should not prepend salutation when disabled', () => {
    const body = 'This is a test issue body.';
    const result = composeWithSalutation(body, { enabled: false });
    expect(result).toBe(body);
  });

  it('should detect custom salutation already present', () => {
    const customText = '🎉 Custom Salutation';
    const body = `${customText}\n\nThis is a test issue body.`;
    const result = composeWithSalutation(body, { text: customText });
    expect(result).toBe(body);
  });

  it('should handle multiline body text correctly', () => {
    const body = 'Line 1\nLine 2\n\nLine 3';
    const result = composeWithSalutation(body);
    expect(result).toBe(`${DEFAULT_SALUTATION}\n\n${body}`);
  });

  it('should preserve body content with markdown formatting', () => {
    const body = '# Title\n\n**Bold text**\n\n- List item 1\n- List item 2';
    const result = composeWithSalutation(body);
    expect(result).toBe(`${DEFAULT_SALUTATION}\n\n${body}`);
  });

  it('should handle body that starts with similar but different text', () => {
    const body = '🤖 LLPM Assistant says hello';
    const result = composeWithSalutation(body);
    // Should prepend because it doesn't exactly match the salutation line
    expect(result).toBe(`${DEFAULT_SALUTATION}\n\n${body}`);
  });

  it('should be idempotent when called multiple times', () => {
    const body = 'Test body';
    const first = composeWithSalutation(body);
    const second = composeWithSalutation(first);
    const third = composeWithSalutation(second);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('should handle config with only enabled set', () => {
    const body = 'Test body';
    const result = composeWithSalutation(body, { enabled: true });
    expect(result).toBe(`${DEFAULT_SALUTATION}\n\n${body}`);
  });

  it('should handle config with only text set', () => {
    const body = 'Test body';
    const customText = 'Custom';
    const result = composeWithSalutation(body, { text: customText });
    expect(result).toBe(`${customText}\n\n${body}`);
  });
});

describe('getSalutationConfig', () => {
  it('should return default config when no app config provided', () => {
    const config = getSalutationConfig();
    expect(config).toEqual({
      enabled: true,
      text: DEFAULT_SALUTATION
    });
  });

  it('should return default config when app config has no automation section', () => {
    const appConfig = { projects: {} };
    const config = getSalutationConfig(appConfig);
    expect(config).toEqual({
      enabled: true,
      text: DEFAULT_SALUTATION
    });
  });

  it('should return default config when automation section has no salutation', () => {
    const appConfig = { automation: {} };
    const config = getSalutationConfig(appConfig);
    expect(config).toEqual({
      enabled: true,
      text: DEFAULT_SALUTATION
    });
  });

  it('should use custom enabled value from app config', () => {
    const appConfig = {
      automation: {
        salutation: {
          enabled: false
        }
      }
    };
    const config = getSalutationConfig(appConfig);
    expect(config.enabled).toBe(false);
    expect(config.text).toBe(DEFAULT_SALUTATION);
  });

  it('should use custom text from app config', () => {
    const customText = '🎉 Custom';
    const appConfig = {
      automation: {
        salutation: {
          text: customText
        }
      }
    };
    const config = getSalutationConfig(appConfig);
    expect(config.enabled).toBe(true);
    expect(config.text).toBe(customText);
  });

  it('should use both custom enabled and text from app config', () => {
    const customText = '🎉 Custom';
    const appConfig = {
      automation: {
        salutation: {
          enabled: false,
          text: customText
        }
      }
    };
    const config = getSalutationConfig(appConfig);
    expect(config.enabled).toBe(false);
    expect(config.text).toBe(customText);
  });

  it('should handle explicit true for enabled', () => {
    const appConfig = {
      automation: {
        salutation: {
          enabled: true
        }
      }
    };
    const config = getSalutationConfig(appConfig);
    expect(config.enabled).toBe(true);
  });

  it('should handle null/undefined values in config', () => {
    const appConfig = {
      automation: {
        salutation: {
          enabled: null,
          text: undefined
        }
      }
    };
    const config = getSalutationConfig(appConfig);
    expect(config.enabled).toBe(true);
    expect(config.text).toBe(DEFAULT_SALUTATION);
  });
});
