#!/bin/bash
# Restart pclaw API server
PID=$(pgrep -f "node.*scaffold")
if [ -n "$PID" ]; then
    echo "Killing old node PID: $PID"
    kill -9 $PID 2>/dev/null
    sleep 2
else
    echo "No old node process found"
fi
echo "Starting new node..."
cd /var/www/pclaw-api
nohup node scaffold-api.js >> /tmp/scaffold.log 2>&1 &
echo "Node started with PID: $!"
sleep 3
NEW_PID=$(pgrep -f "node.*scaffold")
echo "Now running PID: $NEW_PID"
curl -s http://localhost:3001/api/payment/packages | head -c 50
echo ""
