#!/bin/bash

# Healthcheck script for development environment container
# Tests that all major tools and runtimes are available

set -e

echo "Starting healthcheck..."

# Test essential tools
echo "Testing essential tools..."
git --version > /dev/null 2>&1 || (echo "Git not found" && exit 1)
curl --version > /dev/null 2>&1 || (echo "Curl not found" && exit 1)
jq --version > /dev/null 2>&1 || (echo "jq not found" && exit 1)

# Test Node.js ecosystem
echo "Testing Node.js ecosystem..."
node --version > /dev/null 2>&1 || (echo "Node not found" && exit 1)
npm --version > /dev/null 2>&1 || (echo "npm not found" && exit 1)
yarn --version > /dev/null 2>&1 || (echo "yarn not found" && exit 1)
pnpm --version > /dev/null 2>&1 || (echo "pnpm not found" && exit 1)
bun --version > /dev/null 2>&1 || (echo "Bun not found" && exit 1)

# Test Python ecosystem
echo "Testing Python ecosystem..."
python3 --version > /dev/null 2>&1 || (echo "Python3 not found" && exit 1)
pip3 --version > /dev/null 2>&1 || (echo "pip3 not found" && exit 1)
poetry --version > /dev/null 2>&1 || (echo "Poetry not found" && exit 1)
uv --version > /dev/null 2>&1 || (echo "uv not found" && exit 1)

# Test other languages
echo "Testing other language runtimes..."
java -version > /dev/null 2>&1 || (echo "Java not found" && exit 1)
javac -version > /dev/null 2>&1 || (echo "javac not found" && exit 1)
go version > /dev/null 2>&1 || (echo "Go not found" && exit 1)
rustc --version > /dev/null 2>&1 || (echo "Rust not found" && exit 1)
cargo --version > /dev/null 2>&1 || (echo "Cargo not found" && exit 1)
dotnet --version > /dev/null 2>&1 || (echo "dotnet not found" && exit 1)
ruby --version > /dev/null 2>&1 || (echo "Ruby not found" && exit 1)
php --version > /dev/null 2>&1 || (echo "PHP not found" && exit 1)
composer --version > /dev/null 2>&1 || (echo "Composer not found" && exit 1)

# Test build tools
echo "Testing build tools..."
gcc --version > /dev/null 2>&1 || (echo "gcc not found" && exit 1)
clang --version > /dev/null 2>&1 || (echo "clang not found" && exit 1)
make --version > /dev/null 2>&1 || (echo "make not found" && exit 1)

# Test database clients
echo "Testing database clients..."
sqlite3 --version > /dev/null 2>&1 || (echo "sqlite3 not found" && exit 1)
psql --version > /dev/null 2>&1 || (echo "psql not found" && exit 1)
mysql --version > /dev/null 2>&1 || (echo "mysql client not found" && exit 1)

# Test Docker CLI
echo "Testing Docker CLI..."
docker --version > /dev/null 2>&1 || (echo "Docker CLI not found" && exit 1)

# Simple smoke tests
echo "Running smoke tests..."
python3 -c 'print("Python OK")' > /dev/null 2>&1
node -e 'console.log("Node OK")' > /dev/null 2>&1
echo 'fn main() { println!("Rust OK"); }' > /tmp/test.rs && rustc /tmp/test.rs -o /tmp/test && /tmp/test > /dev/null 2>&1
echo 'package main; import "fmt"; func main() { fmt.Println("Go OK") }' > /tmp/test.go && go run /tmp/test.go > /dev/null 2>&1

echo "Healthcheck passed!"
exit 0