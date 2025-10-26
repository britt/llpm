#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Install system-level dependencies required for sqlite-vss vector search functionality
 * Addresses issue #50: Upgrade Memory DB to Include Vector Search Using sqlite-vss
 */

function log(message) {
  console.log(`🔧 sqlite-vss setup: ${message}`);
}

function error(message) {
  console.error(`❌ sqlite-vss setup: ${message}`);
}

function runCommand(command, description) {
  try {
    log(`${description}...`);
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed`);
  } catch (err) {
    error(`Failed: ${description}`);
    throw err;
  }
}

function checkCommandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function installMacOSDependencies() {
  log('Installing macOS dependencies for sqlite-vss...');

  // Check if Homebrew is installed
  if (!checkCommandExists('brew')) {
    error('Homebrew is required for installing sqlite-vss dependencies on macOS');
    error('Please install Homebrew first: https://brew.sh/');
    throw new Error('Homebrew not found');
  }

  // Install required system packages
  const packages = [
    'sqlite', // Latest SQLite with extension support
    'llvm', // For compilation (if needed)
    'libomp' // OpenMP support (required by FAISS) - correct name for macOS
  ];

  for (const pkg of packages) {
    try {
      log(`Checking if ${pkg} is installed...`);
      execSync(`brew list ${pkg}`, { stdio: 'pipe' });
      log(`✅ ${pkg} already installed`);
    } catch {
      runCommand(`brew install ${pkg}`, `Installing ${pkg}`);
    }
  }

  // Set environment variables for compilation
  const llvmPath = execSync('brew --prefix llvm', { encoding: 'utf-8' }).trim();
  log(`LLVM installed at: ${llvmPath}`);

  // Export compiler environment variables
  process.env.CC = `${llvmPath}/bin/clang`;
  process.env.CXX = `${llvmPath}/bin/clang++`;

  log('✅ macOS system dependencies installed successfully');
}

function installLinuxDependencies() {
  log('Installing Linux dependencies for sqlite-vss...');

  // Detect package manager
  let packageManager = null;
  if (checkCommandExists('apt-get')) {
    packageManager = 'apt';
  } else if (checkCommandExists('yum')) {
    packageManager = 'yum';
  } else if (checkCommandExists('pacman')) {
    packageManager = 'pacman';
  } else {
    error('Unsupported Linux distribution. Please install dependencies manually:');
    error('- libgomp1 (OpenMP support)');
    error('- libatlas-base-dev (BLAS/LAPACK)');
    error('- liblapack-dev (Linear algebra)');
    error('- build-essential (compilation tools)');
    throw new Error('Unsupported package manager');
  }

  // Install packages based on detected package manager
  switch (packageManager) {
    case 'apt':
      runCommand('sudo apt-get update', 'Updating package lists');
      runCommand(
        'sudo apt-get install -y libgomp1 libatlas-base-dev liblapack-dev build-essential sqlite3 libsqlite3-dev',
        'Installing sqlite-vss dependencies via apt'
      );
      break;
    case 'yum':
      runCommand(
        'sudo yum install -y libgomp atlas-devel lapack-devel gcc-c++ sqlite sqlite-devel',
        'Installing sqlite-vss dependencies via yum'
      );
      break;
    case 'pacman':
      runCommand(
        'sudo pacman -S --noconfirm gcc-libs atlas-lapack sqlite',
        'Installing sqlite-vss dependencies via pacman'
      );
      break;
  }

  log('✅ Linux system dependencies installed successfully');
}

function installWindowsDependencies() {
  log('Windows sqlite-vss setup...');

  // Check if we're running in WSL
  if (fs.existsSync('/proc/version')) {
    const version = fs.readFileSync('/proc/version', 'utf-8');
    if (version.includes('Microsoft') || version.includes('WSL')) {
      log('Detected WSL environment, using Linux dependencies...');
      return installLinuxDependencies();
    }
  }

  error('Native Windows support for sqlite-vss is limited');
  error('Recommendations:');
  error('1. Use WSL (Windows Subsystem for Linux) for better compatibility');
  error('2. Install Visual Studio Build Tools');
  error('3. Consider using Docker for consistent environment');

  // For native Windows, we can try to install build tools
  if (checkCommandExists('choco')) {
    log('Chocolatey detected, installing build tools...');
    try {
      runCommand(
        'choco install visualstudio2022buildtools -y',
        'Installing Visual Studio Build Tools'
      );
      runCommand('choco install sqlite -y', 'Installing SQLite');
    } catch (err) {
      error('Failed to install Windows dependencies via Chocolatey');
      throw err;
    }
  } else {
    error('Please install Chocolatey or manually install:');
    error('- Visual Studio Build Tools 2022');
    error('- SQLite');
    throw new Error('Windows dependencies not available');
  }

  log('✅ Windows system dependencies setup completed');
}

function createSystemInfoFile() {
  const infoPath = path.join(__dirname, '..', 'SQLITE_VSS_SETUP.md');
  const systemInfo = `# SQLite-VSS System Setup Information

Generated on: ${new Date().toISOString()}
Platform: ${os.platform()}-${os.arch()}
Node.js: ${process.version}

## System Dependencies Installed

### Platform-Specific Requirements

${
  os.platform() === 'darwin'
    ? `
**macOS:**
- Homebrew packages: sqlite, llvm, libgomp
- Compiler: LLVM Clang
- Extensions support: Enabled via Homebrew SQLite

`
    : os.platform() === 'linux'
      ? `
**Linux:**
- Packages: libgomp1, libatlas-base-dev, liblapack-dev, build-essential
- SQLite: System package with extension support
- OpenMP: Available for FAISS acceleration

`
      : `
**Windows:**
- Visual Studio Build Tools 2022
- SQLite with extension support
- Note: Consider using WSL for better compatibility
`
}

## sqlite-vss Integration Notes

1. **Bun Compatibility**: Bun's built-in SQLite doesn't support extensions
2. **better-sqlite3 Required**: Use better-sqlite3 for extension loading
3. **Vector Search**: Powered by FAISS library
4. **Performance**: Hardware-accelerated similarity search

## Usage Example

\`\`\`javascript
const Database = require('better-sqlite3');
const sqlite_vss = require('sqlite-vss');

const db = Database('vector.db');
sqlite_vss.load(db);

// Create vector table
db.exec(\`
  CREATE VIRTUAL TABLE embeddings USING vss0(
    id INTEGER PRIMARY KEY,
    embedding(384)
  );
\`);

// Insert vector
const vector = [...]; // 384-dimensional array
db.prepare('INSERT INTO embeddings(id, embedding) VALUES (?, vss_encode(?))').run(1, JSON.stringify(vector));

// Search similar vectors
const results = db.prepare(\`
  SELECT id, vss_distance(embedding, vss_encode(?)) as distance
  FROM embeddings 
  WHERE vss_search(embedding, vss_encode(?))
  LIMIT 10
\`).all(JSON.stringify(queryVector), JSON.stringify(queryVector));
\`\`\`

## Troubleshooting

- **Extension loading fails**: Ensure better-sqlite3 is used instead of bun:sqlite
- **FAISS errors**: Check OpenMP and BLAS libraries are installed
- **Performance issues**: Verify hardware acceleration is available

---
Generated by LLPM sqlite-vss setup script
`;

  fs.writeFileSync(infoPath, systemInfo);
  log(`System setup information saved to: ${infoPath}`);
}

async function main() {
  try {
    log('Starting sqlite-vss system dependency installation...');
    log(`Detected platform: ${os.platform()}-${os.arch()}`);

    // Install platform-specific dependencies
    switch (os.platform()) {
      case 'darwin':
        await installMacOSDependencies();
        break;
      case 'linux':
        await installLinuxDependencies();
        break;
      case 'win32':
        await installWindowsDependencies();
        break;
      default:
        throw new Error(`Unsupported platform: ${os.platform()}`);
    }

    // Create system information file
    createSystemInfoFile();

    log('🎉 sqlite-vss system dependencies installation completed!');
    log('');
    log('Next steps:');
    log('1. Run: bun add better-sqlite3 (if not already installed)');
    log('2. Use better-sqlite3 instead of bun:sqlite for vector search');
    log('3. Load sqlite-vss extension: sqlite_vss.load(db)');
    log('4. Create virtual tables using vss0()');
  } catch (err) {
    error(`Installation failed: ${err.message}`);
    error('');
    error('Manual installation may be required. Please check:');
    error('- System package manager access (sudo/admin rights)');
    error('- Internet connectivity');
    error('- Platform compatibility');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  installMacOSDependencies,
  installLinuxDependencies,
  installWindowsDependencies,
  createSystemInfoFile
};
