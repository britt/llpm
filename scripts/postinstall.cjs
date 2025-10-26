#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { execSync } = require('child_process');
const os = require('os');

/**
 * Postinstall script that downloads the appropriate LLPM binary
 * for the current platform and architecture
 */

// Configuration
const REPO_OWNER = 'britt';
const REPO_NAME = 'llpm';
const BINARY_DIR = path.join(__dirname, '..', 'bin');

// Platform/architecture mapping
const PLATFORM_MAP = {
  win32: 'windows',
  darwin: 'macos',
  linux: 'linux'
};

const ARCH_MAP = {
  x64: 'x64',
  arm64: 'arm64'
};

function log(message) {
  console.log(`📦 llpm postinstall: ${message}`);
}

function error(message) {
  console.error(`❌ llpm postinstall: ${message}`);
}

function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  const mappedPlatform = PLATFORM_MAP[platform];
  const mappedArch = ARCH_MAP[arch];

  if (!mappedPlatform || !mappedArch) {
    throw new Error(
      `Unsupported platform: ${platform}-${arch}. Supported: ${Object.keys(PLATFORM_MAP).join(', ')}-${Object.keys(ARCH_MAP).join(', ')}`
    );
  }

  return { platform: mappedPlatform, arch: mappedArch };
}

function getPackageVersion() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    );
    return packageJson.version;
  } catch (err) {
    throw new Error(`Failed to read package.json: ${err.message}`);
  }
}

function constructDownloadUrl(version, platform, arch) {
  // Example: https://github.com/britt/llpm/releases/download/v1.0.0/llpm-macos-arm64.tar.gz
  const filename = `llpm-${platform}-${arch}.tar.gz`;
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v${version}/${filename}`;
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    log(`Downloading: ${url}`);

    const file = fs.createWriteStream(outputPath);

    const request = https.get(url, response => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          log(`Following redirect to: ${response.headers.location}`);
          return downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        }
      }

      if (response.statusCode !== 200) {
        reject(
          new Error(`Download failed with status ${response.statusCode}: ${response.statusMessage}`)
        );
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      response.on('data', chunk => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const percent = Math.round((downloadedSize / totalSize) * 100);
          process.stdout.write(`\r📦 llpm postinstall: Downloaded ${percent}%`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        process.stdout.write('\n');
        log('Download completed');
        resolve();
      });
    });

    request.on('error', err => {
      fs.unlink(outputPath, () => {}); // Clean up partial file
      reject(new Error(`Download failed: ${err.message}`));
    });

    request.setTimeout(30000, () => {
      request.destroy();
      fs.unlink(outputPath, () => {});
      reject(new Error('Download timeout after 30 seconds'));
    });
  });
}

function extractTarGz(archivePath, extractDir) {
  try {
    log(`Extracting: ${archivePath}`);

    // Ensure extract directory exists
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }

    // Use tar command to extract
    execSync(`tar -xzf "${archivePath}" -C "${extractDir}"`, {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    log('Extraction completed');
  } catch (err) {
    throw new Error(`Failed to extract archive: ${err.message}`);
  }
}

function calculateSHA256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function loadChecksums() {
  try {
    const checksumsPath = path.join(__dirname, '..', 'checksums.json');
    const checksumsData = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
    return checksumsData.checksums;
  } catch (err) {
    // If checksums file doesn't exist or is invalid, skip verification with warning
    log(`Warning: Could not load checksums file: ${err.message}`);
    log('Skipping checksum verification');
    return null;
  }
}

async function verifyChecksum(filePath, expectedHash) {
  if (!expectedHash || expectedHash.includes('placeholder')) {
    log('Skipping checksum verification (placeholder hash)');
    return;
  }

  log('Verifying file integrity...');
  const actualHash = await calculateSHA256(filePath);

  if (actualHash !== expectedHash) {
    throw new Error(`Checksum verification failed! 
      Expected: ${expectedHash}
      Actual: ${actualHash}
      File may be corrupted or tampered with.`);
  }

  log('✅ Checksum verification passed');
}

function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, 0o755);
    log(`Made executable: ${filePath}`);
  } catch (err) {
    // Windows doesn't need chmod, so ignore errors there
    if (process.platform !== 'win32') {
      throw new Error(`Failed to make binary executable: ${err.message}`);
    }
  }
}

function getConfigDir() {
  return path.join(os.homedir(), '.llpm');
}

function ensureConfigDir() {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    log(`Created config directory: ${configDir}`);
  }
}

function initializeSystemPrompt() {
  try {
    log('Initializing system prompt configuration');

    ensureConfigDir();
    const configDir = getConfigDir();
    const promptPath = path.join(configDir, 'system_prompt.txt');

    if (fs.existsSync(promptPath)) {
      log('System prompt file already exists, skipping initialization');
      return;
    }

    // Default system prompt content (matches src/utils/systemPrompt.ts)
    const defaultPrompt = `You are LLPM (Large Language Model Product Manager), an AI-powered project manager assistant. You can help manage multiple projects and their configurations. 

You have access to tools for:
- Project management: getting current project info, listing projects, adding new projects, switching between projects, and removing projects
- GitHub integration: browsing user repositories, searching for repositories, and getting repository details
- GitHub issue management: creating, listing, updating, commenting on, and searching GitHub issues

CRITICAL: You MUST ALWAYS provide a text response. NEVER just call tools without providing explanatory text. Even when calling tools, you must explain what you're doing and what you found. 

When users ask questions:
1. Call the appropriate tools to get the information
2. ALWAYS provide a natural language explanation of what the tools returned
3. Answer the user's question directly based on the tool results

NEVER respond with empty text, "Action completed", "I have completed the requested action", or similar generic responses.

When users ask about project management tasks or GitHub repositories, use the available tools to help them AND provide clear explanations of what you found.

Key capabilities:
1. Project Management: Help users organize their work across multiple projects, each connected to a GitHub repository
2. GitHub Integration: Browse and search repositories to help users select the right one for their projects  
3. GitHub Issue Management: Create and manage GitHub issues within the context of the active project
4. Configuration: Persist project settings and preferences
5. Chat History: Maintain conversation history per project

Always ask for clarification if you need more information to help effectively.`;

    fs.writeFileSync(promptPath, defaultPrompt, 'utf-8');
    log(`Created default system prompt file: ${promptPath}`);
  } catch (err) {
    log(`Warning: Failed to initialize system prompt file: ${err.message}`);
    // Don't fail the entire postinstall process for this
  }
}

async function main() {
  try {
    log('Starting binary download and installation');

    // Always initialize system prompt, regardless of environment
    initializeSystemPrompt();

    // Setup sqlite-vss system dependencies if not in CI
    if (!process.env.CI && !process.env.GITHUB_ACTIONS && !process.env.LLPM_TEST_MODE) {
      try {
        log('Checking sqlite-vss system dependencies...');

        // Only install if needed (check if sqlite-vss package exists)
        const sqliteVssPath = path.join(__dirname, '..', 'node_modules', 'sqlite-vss');
        if (fs.existsSync(sqliteVssPath)) {
          log('sqlite-vss package found, dependencies may be required');
          log('Run: node scripts/install-sqlite-vss-deps.cjs to install system dependencies');
        } else {
          log('sqlite-vss package not found, no system dependencies needed');
        }
      } catch (err) {
        log(`Warning: sqlite-vss check failed: ${err.message}`);
        // Don't fail the entire installation for this
      }
    }

    // Skip binary installation in development environments
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.CI === 'true' ||
      process.env.GITHUB_ACTIONS === 'true' ||
      process.env.LLPM_TEST_MODE ||
      // Skip if we're in the source repository (has src/ directory)
      fs.existsSync(path.join(__dirname, '..', 'src'))
    ) {
      log('Skipping binary installation (development/CI environment)');

      // In test mode, still test the functions
      if (process.env.LLPM_TEST_MODE) {
        const { platform, arch } = detectPlatform();
        log(`Detected platform: ${platform}-${arch}`);

        const version = getPackageVersion();
        log(`Package version: ${version}`);

        const downloadUrl = constructDownloadUrl(version, platform, arch);
        log(`Would download: ${downloadUrl}`);

        log('✅ Test mode completed successfully');
      } else {
        log('✅ Skipped successfully');
      }
      return;
    }

    // Detect platform and architecture
    const { platform, arch } = detectPlatform();
    log(`Detected platform: ${platform}-${arch}`);

    // Get package version
    const version = getPackageVersion();
    log(`Package version: ${version}`);

    // Construct download URL
    const downloadUrl = constructDownloadUrl(version, platform, arch);

    // Ensure binary directory exists
    if (!fs.existsSync(BINARY_DIR)) {
      fs.mkdirSync(BINARY_DIR, { recursive: true });
    }

    // Load checksums for verification
    const checksums = loadChecksums();
    const archiveFilename = `llpm-${platform}-${arch}.tar.gz`;
    const expectedHash = checksums ? checksums[archiveFilename] : null;

    // Download archive
    const archivePath = path.join(BINARY_DIR, archiveFilename);
    await downloadFile(downloadUrl, archivePath);

    // Verify checksum if available
    if (expectedHash) {
      await verifyChecksum(archivePath, expectedHash);
    }

    // Extract binary
    extractTarGz(archivePath, BINARY_DIR);

    // Make binary executable
    const binaryName = platform === 'windows' ? 'llpm.exe' : 'llpm';
    const binaryPath = path.join(BINARY_DIR, binaryName);

    if (fs.existsSync(binaryPath)) {
      makeExecutable(binaryPath);
      log(`✅ Binary installed successfully: ${binaryPath}`);
    } else {
      throw new Error(`Binary not found after extraction: ${binaryPath}`);
    }

    // Clean up archive
    try {
      fs.unlinkSync(archivePath);
      log('Cleaned up archive file');
    } catch (err) {
      log(`Warning: Could not clean up archive file: ${err.message}`);
    }

    log('🎉 LLPM installation completed successfully!');
  } catch (err) {
    error(err.message);
    console.error('');
    console.error('If this error persists, please:');
    console.error('1. Check your internet connection');
    console.error('2. Verify the package version has a corresponding GitHub release');
    console.error(`3. Report issues at: https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  detectPlatform,
  getPackageVersion,
  constructDownloadUrl,
  downloadFile,
  extractTarGz,
  makeExecutable,
  getConfigDir,
  ensureConfigDir,
  initializeSystemPrompt
};
