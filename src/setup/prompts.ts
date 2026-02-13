import * as readline from 'node:readline';

export interface ReadlineInterface {
  question: (prompt: string, callback: (answer: string) => void) => void;
  close: () => void;
}

/**
 * Create a readline interface for interactive prompts
 */
export function createReadlineInterface(): ReadlineInterface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Close a readline interface
 */
export function closeReadlineInterface(rl: ReadlineInterface): void {
  rl.close();
}

/**
 * Ask a simple question and return the trimmed answer
 */
export function askQuestion(rl: ReadlineInterface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Ask a yes/no question
 */
export function askYesNo(
  rl: ReadlineInterface,
  prompt: string,
  defaultYes: boolean = false
): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  return new Promise((resolve) => {
    rl.question(`${prompt} ${hint} `, (answer: string) => {
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') {
        resolve(defaultYes);
      } else {
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    });
  });
}

/**
 * Ask user to pick from a numbered list of choices
 */
export async function askChoice(
  rl: ReadlineInterface,
  prompt: string,
  choices: string[]
): Promise<string> {
  console.log(prompt);
  for (let i = 0; i < choices.length; i++) {
    console.log(`  ${i + 1}. ${choices[i]}`);
  }

  while (true) {
    const answer = await askQuestion(rl, `Enter number (1-${choices.length}): `);
    const num = parseInt(answer, 10);

    if (!isNaN(num) && num >= 1 && num <= choices.length) {
      return choices[num - 1]!;
    }

    console.log(`Invalid selection. Please enter a number between 1 and ${choices.length}.`);
  }
}

/**
 * Ask for a secret value (API key, token, etc.)
 * Note: In a real terminal this would mask input, but for simplicity
 * we use a regular question. True masking requires raw mode.
 */
export function askSecret(rl: ReadlineInterface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      resolve(answer.trim());
    });
  });
}
