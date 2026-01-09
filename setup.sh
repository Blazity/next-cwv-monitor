#!/usr/bin/env bash
set -e


COMPOSE_URL="${COMPOSE_URL:-https://raw.githubusercontent.com/Blazity/next-cwv-monitor/main/docker/docker-compose.yml}"
COMPOSE_SSL_URL="${COMPOSE_SSL_URL:-https://raw.githubusercontent.com/Blazity/next-cwv-monitor/main/docker/docker-compose.ssl.yml}"
DEFAULT_INSTALL_DIR="$HOME/cwv-monitor"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Read from terminal even when script is piped
# This allows: bash <(curl -fsSL URL)
if [ -t 0 ]; then
  # Already connected to terminal
  :
elif [ -e /dev/tty ]; then
  exec < /dev/tty
else
  echo -e "${RED}Error: This script requires an interactive terminal.${NC}"
  echo "Please run: bash <(curl -fsSL URL)"
  exit 1
fi

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         CWV Monitor - Production Setup Wizard             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

INSTALL_DIR="${1:-$DEFAULT_INSTALL_DIR}"

echo -e "${YELLOW}Installation directory: $INSTALL_DIR${NC}"
read -p "Press Enter to continue or specify a different path: " CUSTOM_DIR
if [ -n "$CUSTOM_DIR" ]; then
  INSTALL_DIR="$CUSTOM_DIR"
fi

mkdir -p "$INSTALL_DIR"
ENV_FILE="$INSTALL_DIR/.env"

echo ""
echo -e "${BLUE}▶ Downloading configuration files...${NC}"
echo "─────────────────────────────────────────────────────────────"

download_file() {
  local url="$1"
  local dest="$2"
  if command -v curl &> /dev/null; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget &> /dev/null; then
    wget -q "$url" -O "$dest"
  else
    echo -e "${RED}Error: curl or wget is required${NC}"
    exit 1
  fi
}

download_file "$COMPOSE_URL" "$INSTALL_DIR/docker-compose.yml"
echo -e "${GREEN}✓ Downloaded docker-compose.yml${NC}"

# Download SSL compose if needed (we'll check ENABLE_SSL_BOOL later after it's set)
echo ""

generate_secret() {
  openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

validate_email() {
  local email="$1"
  if [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    return 0
  fi
  return 1
}

echo -e "${YELLOW}This wizard will help you configure CWV Monitor for production.${NC}"
echo ""

echo -e "${GREEN}▶ SSL Configuration${NC}"
echo "─────────────────────────────────────────────────────────────"
echo "Caddy can automatically obtain and renew SSL certificates."
echo ""

read -p "Enable automatic SSL with Caddy? (yes/no) [no]: " ENABLE_SSL
ENABLE_SSL="${ENABLE_SSL:-no}"

ENABLE_SSL_BOOL="false"
if [ "$ENABLE_SSL" = "yes" ] || [ "$ENABLE_SSL" = "y" ]; then
  ENABLE_SSL_BOOL="true"
  
  echo ""
  echo -e "${YELLOW}Note: Your domain must be pointing to this server's IP address.${NC}"
  echo ""
  
  while true; do
    read -p "Domain name (e.g., monitor.example.com): " SSL_DOMAIN
    if [ -n "$SSL_DOMAIN" ]; then
      break
    fi
    echo -e "${RED}Domain is required for SSL.${NC}"
  done
  
  read -p "Email for Let's Encrypt notifications (optional): " SSL_EMAIL
  
  # Set derived values for SSL mode
  AUTH_BASE_URL="https://$SSL_DOMAIN"
  APP_PORT="3000"  # Internal port, Caddy handles 80/443
  TRUST_PROXY="true"
  
  echo ""
  echo -e "${GREEN}✓ SSL will be configured for: $SSL_DOMAIN${NC}"
fi

echo ""

echo -e "${GREEN}▶ Application Settings${NC}"
echo "─────────────────────────────────────────────────────────────"

if [ "$ENABLE_SSL_BOOL" = "false" ]; then
  read -p "Public URL where the app will be accessible [http://localhost]: " AUTH_BASE_URL
  AUTH_BASE_URL="${AUTH_BASE_URL:-http://localhost}"

  read -p "Port to expose the app on [80]: " APP_PORT
  APP_PORT="${APP_PORT:-80}"

  read -p "Is the app behind a reverse proxy? (true/false) [false]: " TRUST_PROXY
  TRUST_PROXY="${TRUST_PROXY:-false}"
else
  echo -e "Public URL: ${GREEN}$AUTH_BASE_URL${NC} (set by SSL config)"
  echo -e "Reverse proxy: ${GREEN}true${NC} (Caddy)"
fi

echo ""

echo -e "${GREEN}▶ Initial Admin User${NC}"
echo "─────────────────────────────────────────────────────────────"
echo "This user will be created on first startup."
echo ""

while true; do
  read -p "Admin email: " INITIAL_USER_EMAIL
  if validate_email "$INITIAL_USER_EMAIL"; then
    break
  fi
  echo -e "${RED}Invalid email format. Please try again.${NC}"
done

read -p "Admin name [Admin]: " INITIAL_USER_NAME
INITIAL_USER_NAME="${INITIAL_USER_NAME:-Admin}"

while true; do
  read -sp "Admin password (min 8 chars): " INITIAL_USER_PASSWORD
  echo ""
  if [ ${#INITIAL_USER_PASSWORD} -ge 8 ]; then
    read -sp "Confirm password: " INITIAL_USER_PASSWORD_CONFIRM
    echo ""
    if [ "$INITIAL_USER_PASSWORD" = "$INITIAL_USER_PASSWORD_CONFIRM" ]; then
      break
    fi
    echo -e "${RED}Passwords don't match. Please try again.${NC}"
  else
    echo -e "${RED}Password must be at least 8 characters.${NC}"
  fi
done

echo ""

echo -e "${GREEN}▶ ClickHouse Settings${NC}"
echo "─────────────────────────────────────────────────────────────"

read -p "ClickHouse host [clickhouse]: " CLICKHOUSE_HOST
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-clickhouse}"

read -p "ClickHouse port [8123]: " CLICKHOUSE_PORT
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"

read -p "ClickHouse database [cwv_monitor]: " CLICKHOUSE_DB
CLICKHOUSE_DB="${CLICKHOUSE_DB:-cwv_monitor}"

read -p "ClickHouse user [default]: " CLICKHOUSE_USER
CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"

echo ""
echo -e "${YELLOW}Generating ClickHouse password...${NC}"
CLICKHOUSE_PASSWORD=$(generate_secret)
echo -e "${GREEN}✓ Generated secure password${NC}"

echo ""

echo -e "${GREEN}▶ Security Settings${NC}"
echo "─────────────────────────────────────────────────────────────"

echo -e "${YELLOW}Generating auth secret...${NC}"
BETTER_AUTH_SECRET=$(generate_secret)
echo -e "${GREEN}✓ Generated secure auth secret${NC}"

read -p "Min password strength score (0-4) [2]: " MIN_PASSWORD_SCORE
MIN_PASSWORD_SCORE="${MIN_PASSWORD_SCORE:-2}"

read -p "Rate limit window (ms) [60000]: " RATE_LIMIT_WINDOW_MS
RATE_LIMIT_WINDOW_MS="${RATE_LIMIT_WINDOW_MS:-60000}"

read -p "Max login attempts [5]: " MAX_LOGIN_ATTEMPTS
MAX_LOGIN_ATTEMPTS="${MAX_LOGIN_ATTEMPTS:-5}"

echo ""

echo -e "${GREEN}▶ Image Settings (Optional)${NC}"
echo "─────────────────────────────────────────────────────────────"
echo "Leave blank to use default registry."
echo ""

read -p "Image registry [ghcr.io/blazity]: " IMAGE_REGISTRY
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io/blazity}"

read -p "Image tag [latest]: " IMAGE_TAG
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo ""

echo -e "${GREEN}▶ Demo Data (Optional)${NC}"
echo "─────────────────────────────────────────────────────────────"

read -p "Seed demo data on startup? (yes/no) [no]: " SEED_DEMO
SEED_DEMO="${SEED_DEMO:-no}"

INCLUDE_DEMO_PROFILE="false"
if [ "$SEED_DEMO" = "yes" ] || [ "$SEED_DEMO" = "y" ]; then
  INCLUDE_DEMO_PROFILE="true"
  read -p "Demo project name [Next CWV Demo]: " SEED_PROJECT_NAME
  SEED_PROJECT_NAME="${SEED_PROJECT_NAME:-Next CWV Demo}"
  read -p "Days of data to generate [14]: " SEED_DAYS
  SEED_DAYS="${SEED_DAYS:-14}"
fi

echo ""

if [ "$ENABLE_SSL_BOOL" = "true" ]; then
  echo -e "${BLUE}▶ Configuring SSL...${NC}"
  echo "─────────────────────────────────────────────────────────────"
  
  download_file "$COMPOSE_SSL_URL" "$INSTALL_DIR/docker-compose.ssl.yml"
  echo -e "${GREEN}✓ Downloaded docker-compose.ssl.yml${NC}"
  
  CADDYFILE="$INSTALL_DIR/Caddyfile"
  if [ -n "$SSL_EMAIL" ]; then
    cat > "$CADDYFILE" << CADDYEOF
{
    email $SSL_EMAIL
}

$SSL_DOMAIN {
    reverse_proxy monitor-app:3000
}
CADDYEOF
  else
    cat > "$CADDYFILE" << CADDYEOF
$SSL_DOMAIN {
    reverse_proxy monitor-app:3000
}
CADDYEOF
  fi
  echo -e "${GREEN}✓ Generated Caddyfile${NC}"
  echo ""
fi

echo -e "${BLUE}▶ Writing configuration...${NC}"
echo "─────────────────────────────────────────────────────────────"

cat > "$ENV_FILE" << EOF
# CWV Monitor Production Configuration
# Generated on $(date)
# ═══════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────
# Image Settings
# ─────────────────────────────────────────────────────────────────
IMAGE_REGISTRY=$IMAGE_REGISTRY
IMAGE_TAG=$IMAGE_TAG

# ─────────────────────────────────────────────────────────────────
# Application
# ─────────────────────────────────────────────────────────────────
AUTH_BASE_URL=$AUTH_BASE_URL
APP_PORT=$APP_PORT
TRUST_PROXY=$TRUST_PROXY
NODE_ENV=production
LOG_LEVEL=info

# ─────────────────────────────────────────────────────────────────
# Initial Admin User (created on first startup)
# ─────────────────────────────────────────────────────────────────
INITIAL_USER_EMAIL=$INITIAL_USER_EMAIL
INITIAL_USER_NAME="$INITIAL_USER_NAME"
INITIAL_USER_PASSWORD="$INITIAL_USER_PASSWORD"

# ─────────────────────────────────────────────────────────────────
# ClickHouse Database
# ─────────────────────────────────────────────────────────────────
CLICKHOUSE_HOST=$CLICKHOUSE_HOST
CLICKHOUSE_PORT=$CLICKHOUSE_PORT
CLICKHOUSE_DB=$CLICKHOUSE_DB
CLICKHOUSE_USER=$CLICKHOUSE_USER
CLICKHOUSE_PASSWORD=$CLICKHOUSE_PASSWORD

# ─────────────────────────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────────────────────────
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
MIN_PASSWORD_SCORE=$MIN_PASSWORD_SCORE
RATE_LIMIT_WINDOW_MS=$RATE_LIMIT_WINDOW_MS
MAX_LOGIN_ATTEMPTS=$MAX_LOGIN_ATTEMPTS
EOF

if [ "$INCLUDE_DEMO_PROFILE" = "true" ]; then
  cat >> "$ENV_FILE" << EOF

# ─────────────────────────────────────────────────────────────────
# Demo Data Seeding (used with: docker compose --profile demo up)
# ─────────────────────────────────────────────────────────────────
SEED_PROJECT_NAME="$SEED_PROJECT_NAME"
SEED_DAYS=$SEED_DAYS
SEED_RESET=false
EOF
fi

chmod 600 "$ENV_FILE"

echo -e "${GREEN}✓ Configuration written to: $ENV_FILE${NC}"
echo ""

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Files created in: $INSTALL_DIR"
echo "  - docker-compose.yml"
if [ "$ENABLE_SSL_BOOL" = "true" ]; then
  echo "  - docker-compose.ssl.yml"
  echo "  - Caddyfile"
fi
echo "  - .env"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""

# Build the docker compose command based on options
COMPOSE_CMD="docker compose"
if [ "$ENABLE_SSL_BOOL" = "true" ]; then
  COMPOSE_CMD="$COMPOSE_CMD -f docker-compose.yml -f docker-compose.ssl.yml"
fi

if [ "$INCLUDE_DEMO_PROFILE" = "true" ]; then
  echo "  1. Start the services with demo data:"
  echo -e "     ${GREEN}cd $INSTALL_DIR && $COMPOSE_CMD --profile demo up -d${NC}"
  echo ""
  echo -e "     ${YELLOW}Note:${NC} The --profile demo flag seeds demo data on first startup."
  echo -e "     For subsequent starts without re-seeding, use:"
  echo -e "     ${GREEN}$COMPOSE_CMD up -d${NC}"
else
  echo "  1. Start the services:"
  echo -e "     ${GREEN}cd $INSTALL_DIR && $COMPOSE_CMD up -d${NC}"
fi

echo ""
echo "  2. Access the dashboard:"
echo -e "     ${GREEN}$AUTH_BASE_URL${NC}"
if [ "$ENABLE_SSL_BOOL" = "true" ]; then
  echo ""
  echo -e "     ${YELLOW}Note:${NC} SSL certificates will be automatically obtained on first request."
  echo -e "     Make sure your domain ${GREEN}$SSL_DOMAIN${NC} points to this server."
fi
echo ""
echo "  3. Login with:"
echo -e "     Email: ${GREEN}$INITIAL_USER_EMAIL${NC}"
echo ""
echo -e "${RED}⚠ IMPORTANT:${NC} Keep the .env file secure. It contains secrets!"
echo ""

