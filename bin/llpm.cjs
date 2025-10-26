#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * CLI stub script that forwards all arguments to the actual LLPM binary
 * This script is invoked when users run `llpm` after npm install
 */

function findBinaryPath() {
  const platform = process.platform;
  const arch = process.arch;

  // Map Node.js platform/arch to our binary naming convention
  const platformMap = {
    win32: 'windows',
    darwin: 'macos',
    linux: 'linux'
  };

  const archMap = {
    x64: 'x64',
    arm64: 'arm64'
  };

  const mappedPlatform = platformMap[platform];
  const mappedArch = archMap[arch];

  if (!mappedPlatform || !mappedArch) {
    console.error(`❌ Unsupported platform: ${platform}-${arch}`);
    console.error(
      'Supported platforms: windows-x64, macos-x64, macos-arm64, linux-x64, linux-arm64'
    );
    process.exit(1);
  }

  // Binary should be in node_modules/llpm/bin/
  const binaryName = platform === 'win32' ? 'llpm.exe' : 'llpm';
  const binaryPath = path.join(__dirname, binaryName);

  if (!fs.existsSync(binaryPath)) {
    console.error(`❌ LLPM binary not found at: ${binaryPath}`);
    console.error('This usually means the postinstall script failed.');
    console.error('Try reinstalling: npm uninstall llpm && npm install llpm');
    process.exit(1);
  }

  return binaryPath;
}

function main() {
  try {
    const binaryPath = findBinaryPath();

    // Forward all command line arguments to the binary
    const args = process.argv.slice(2);

    // Spawn the actual binary with all arguments
    const child = spawn(binaryPath, args, {
      stdio: 'inherit',
      windowsHide: false
    });

    // Forward exit code from binary to parent process
    child.on('close', code => {
      process.exit(code || 0);
    });

    // Handle errors
    child.on('error', err => {
      console.error(`❌ Error launching LLPM binary: ${err.message}`);
      process.exit(1);
    });

    // Handle process termination signals
    process.on('SIGINT', () => child.kill('SIGINT'));
    process.on('SIGTERM', () => child.kill('SIGTERM'));
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findBinaryPath };
