#!/bin/bash
# Helper script to start sleep-debt-app service with confirmation

SERVICE_NAME="sleep-debt-app"

echo "Starting $SERVICE_NAME..."
sudo systemctl start $SERVICE_NAME

sleep 2  # Wait a moment for service to start

if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✓ Service started successfully!"
    echo ""
    echo "Service status:"
    sudo systemctl status $SERVICE_NAME --no-pager -l
else
    echo "✗ Service failed to start."
    echo ""
    echo "Recent logs:"
    sudo journalctl -u $SERVICE_NAME -n 20 --no-pager
    exit 1
fi

