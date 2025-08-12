let isVerbose = false;

export function setVerbose(verbose: boolean) {
  isVerbose = verbose;
}

export function debug(...args: any[]) {
  if (isVerbose) {
    console.error('[DEBUG]', new Date().toISOString(), ...args);
  }
}

export function getVerbose(): boolean {
  return isVerbose;
}
