#!/bin/bash
# Deploy script for Sleep Debt Tracker on Raspberry Pi
# This script automates the deployment process

set -e  # Exit on error

# Configuration
APP_DIR="/opt/sleep-debt-app"
REPO_URL="${REPO_URL:-https://github.com/yourusername/sleep-debt-app.git}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="sleep-debt-app"

# Detect user: prefer DEPLOY_USER env var, then SUDO_USER (when using sudo), then USER, then fallback
if [ -n "$DEPLOY_USER" ]; then
    USER="$DEPLOY_USER"
elif [ -n "$SUDO_USER" ]; then
    USER="$SUDO_USER"
elif [ -n "$USER" ] && [ "$USER" != "root" ]; then
    USER="$USER"
else
    USER="pi"  # Fallback
fi

echo "=== Sleep Debt Tracker - Raspberry Pi Deploy ==="
echo "Using user: $USER"

# Check if running as root for system operations
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo) for system operations"
    echo "Some operations will be skipped if not root"
    IS_ROOT=false
else
    IS_ROOT=true
fi

# Create application directory
echo "Creating application directory..."
if [ "$IS_ROOT" = true ]; then
    mkdir -p "$APP_DIR"
    chown -R "$USER:$USER" "$APP_DIR"
else
    mkdir -p "$APP_DIR" || echo "Warning: Could not create $APP_DIR (may already exist)"
fi

cd "$APP_DIR"

# Clone or update repository
if [ -d ".git" ]; then
    echo "Updating repository..."
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    echo "Cloning repository..."
    git clone -b "$BRANCH" "$REPO_URL" .
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
echo "Creating data directory..."
mkdir -p data
chmod 755 data

# Copy .env.example to .env if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "⚠️  IMPORTANT: Edit .env file and configure:"
        echo "   - GARMIN_EMAIL"
        echo "   - GARMIN_PASSWORD"
        echo "   - ENVIRONMENT=prod"
    else
        echo "Warning: .env.example not found. Create .env manually."
    fi
fi

# Install systemd service if running as root
if [ "$IS_ROOT" = true ]; then
    echo "Installing systemd service..."
    if [ -f "scripts/sleep-debt-app.service" ]; then
        # Replace placeholders in service file
        sed "s|APP_DIR|$APP_DIR|g" scripts/sleep-debt-app.service > /tmp/sleep-debt-app.service
        sed -i "s|USER|$USER|g" /tmp/sleep-debt-app.service
        
        cp /tmp/sleep-debt-app.service /etc/systemd/system/$SERVICE_NAME.service
        systemctl daemon-reload
        systemctl enable $SERVICE_NAME
        echo "Service installed and enabled"
        echo "To start the service: sudo systemctl start $SERVICE_NAME"
        echo "To check status: sudo systemctl status $SERVICE_NAME"
    else
        echo "Warning: scripts/sleep-debt-app.service not found"
    fi
else
    echo "Skipping systemd service installation (not running as root)"
fi

echo ""
echo "=== Deploy completed ==="
echo "Next steps:"
echo "1. Edit $APP_DIR/.env with your Garmin credentials"
echo "2. Set ENVIRONMENT=prod in .env"
if [ "$IS_ROOT" = true ]; then
    echo "3. Start the service: sudo systemctl start $SERVICE_NAME"
    echo "4. Check logs: sudo journalctl -u $SERVICE_NAME -f"
else
    echo "3. Run manually: cd $APP_DIR && source venv/bin/activate && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
fi

