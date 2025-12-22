#!/bin/bash
# Script to import CSV data into Filadex via API
# This requires authentication - cookies need to be set manually

BASE_URL="http://localhost:10200"
COOKIE_FILE="/tmp/filadex_cookies.txt"

# Function to make authenticated request
api_request() {
  local endpoint=$1
  local method=${2:-GET}
  local data=$3
  
  if [ "$method" = "POST" ]; then
    curl -s -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -b "$COOKIE_FILE" \
      -c "$COOKIE_FILE" \
      -d "$data"
  else
    curl -s -X GET "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -b "$COOKIE_FILE" \
      -c "$COOKIE_FILE"
  fi
}

# Login first
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d '{"username":"admin","password":"admin123"}')

echo "Login response: $LOGIN_RESPONSE"

# Import manufacturers
echo "Importing manufacturers..."
MANUFACTURERS_CSV=$(cat resources/vendors_init.csv | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")
api_request "/api/manufacturers?import=csv" "POST" "{\"csvData\":$MANUFACTURERS_CSV}"

# Import materials  
echo "Importing materials..."
MATERIALS_CSV=$(cat resources/materials_init.csv | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")
api_request "/api/materials?import=csv" "POST" "{\"csvData\":$MATERIALS_CSV}"

# Import colors
echo "Importing colors..."
COLORS_CSV=$(cat resources/filament_colors_init.csv | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")
api_request "/api/colors?import=csv" "POST" "{\"csvData\":$COLORS_CSV}"

echo "Import complete!"

