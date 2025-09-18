# Base Ubuntu 22.04 image with comprehensive development tools
FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Update and install system packages
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    # Essential tools
    curl \
    wget \
    git \
    unzip \
    tar \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    # Build tools
    build-essential \
    gcc \
    g++ \
    make \
    cmake \
    pkg-config \
    # Development utilities
    vim \
    nano \
    jq \
    sed \
    awk \
    rsync \
    htop \
    tree \
    # Network tools
    net-tools \
    iputils-ping \
    dnsutils \
    # Process management
    supervisor \
    # Compression tools
    zip \
    bzip2 \
    xz-utils \
    # SSL/TLS support
    openssl \
    # Locale support
    locales \
    && rm -rf /var/lib/apt/lists/*

# Set locale
RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Install Node.js, npm, and related tools
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest && \
    npm install -g yarn pnpm && \
    rm -rf /var/lib/apt/lists/*

# Install NVM (Node Version Manager)
ENV NVM_DIR="/opt/nvm"
RUN mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Install Python 3 and related tools
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    pipx \
    && rm -rf /var/lib/apt/lists/*

# Install Python package managers
RUN pip3 install --upgrade pip && \
    pip3 install poetry virtualenv pipenv

# Install uv (fast Python package installer)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"

# Install Go
RUN wget -q -O go.tar.gz https://go.dev/dl/go1.21.6.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go.tar.gz && \
    rm go.tar.gz
ENV PATH="/usr/local/go/bin:$PATH"
ENV GOPATH="/root/go"
ENV PATH="$GOPATH/bin:$PATH"

# Install Java (OpenJDK) and build tools
RUN apt-get update && \
    apt-get install -y \
    openjdk-17-jdk \
    maven \
    gradle \
    && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
ENV PATH="$JAVA_HOME/bin:$PATH"

# Install .NET SDK
RUN wget -q https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    rm packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y dotnet-sdk-8.0 && \
    rm -rf /var/lib/apt/lists/*

# Install Ruby
RUN apt-get update && \
    apt-get install -y \
    ruby-full \
    ruby-bundler \
    && rm -rf /var/lib/apt/lists/*

# Install PHP and Composer
RUN apt-get update && \
    apt-get install -y \
    php-cli \
    php-mbstring \
    php-xml \
    php-curl \
    php-zip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install Kotlin
RUN curl -s https://get.sdkman.io | bash && \
    bash -c "source $HOME/.sdkman/bin/sdkman-init.sh && sdk install kotlin"

# Install Scala
RUN apt-get update && \
    apt-get install -y scala && \
    rm -rf /var/lib/apt/lists/*

# Install R
RUN apt-get update && \
    apt-get install -y r-base r-base-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Dart
RUN sh -c 'wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -' && \
    sh -c 'wget -qO- https://storage.googleapis.com/download.dartlang.org/linux/debian/dart_stable.list > /etc/apt/sources.list.d/dart_stable.list' && \
    apt-get update && \
    apt-get install -y dart && \
    rm -rf /var/lib/apt/lists/*

# Install C/C++ tools
RUN apt-get update && \
    apt-get install -y \
    clang \
    clang-format \
    clangd \
    lldb \
    valgrind \
    && rm -rf /var/lib/apt/lists/*

# Install database clients
RUN apt-get update && \
    apt-get install -y \
    sqlite3 \
    postgresql-client \
    mysql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Install media processing tools
RUN apt-get update && \
    apt-get install -y \
    imagemagick \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (for Docker-in-Docker scenarios)
RUN curl -fsSL https://get.docker.com | sh

# Install formatters and linters
RUN npm install -g eslint prettier typescript typescript-language-server && \
    pip3 install black isort flake8 mypy pylint pyright && \
    gem install rubocop solargraph && \
    go install golang.org/x/tools/gopls@latest && \
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest && \
    cargo install rust-analyzer

# Install language servers
RUN npm install -g pyright && \
    dotnet tool install --global csharp-ls && \
    npm install -g vscode-langservers-extracted && \
    npm install -g bash-language-server

# Install additional development tools
RUN apt-get update && \
    apt-get install -y \
    tmux \
    screen \
    tig \
    httpie \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directory
WORKDIR /workspace

# Add healthcheck script
COPY --chmod=755 healthcheck.sh /usr/local/bin/healthcheck.sh

# Default command
CMD ["/bin/bash"]