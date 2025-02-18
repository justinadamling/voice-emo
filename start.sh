#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting Hume Voice Emotion Analysis ===${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to kill process using a port
kill_port() {
    lsof -i tcp:$1 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
}

# Function to validate Hume API key
validate_hume_key() {
    local api_key=$1
    echo "Validating API key..."
    
    # Make a request to Hume API
    local response=$(curl -s -H "accept: application/json" \
        -H "X-Hume-Api-Key: $api_key" \
        "https://api.hume.ai/v0/batch/jobs")
    
    # Check if response contains an invalid key error
    if echo "$response" | grep -q "Invalid ApiKey\|oauth\.v2\.InvalidApiKey\|invalid_api_key"; then
        echo -e "${RED}❌ Invalid API key${NC}"
        return 1
    fi
    
    # If we got here, the key is valid
    echo -e "${GREEN}✅ API key validated successfully${NC}"
    return 0
}

# Function to configure Hume API key
configure_hume_key() {
    while true; do
        local current_key=""
        if [ -f "backend/.env" ]; then
            current_key=$(grep HUME_API_KEY backend/.env | cut -d '=' -f2)
        fi

        # Show current key status
        if [ ! -z "$current_key" ] && [ "$current_key" != "your_hume_api_key_here" ]; then
            echo -e "${YELLOW}Current API key: ${current_key:0:4}...${current_key: -4}${NC}"
        fi

        # Prompt for new key
        echo -e "${GREEN}Enter your Hume API key (press Ctrl+C to exit):${NC}"
        read -r api_key

        # Empty input is not allowed
        if [ -z "$api_key" ]; then
            echo -e "${RED}Error: No API key provided${NC}"
            echo -e "${YELLOW}Get your API key at: https://app.hume.ai/login${NC}"
            continue
        fi

        # Validate the new key
        if validate_hume_key "$api_key"; then
            # Create or update .env file
            if [ ! -f "backend/.env" ]; then
                cp backend/.env.example backend/.env
            fi
            # Update API key while preserving other variables
            sed -i.bak "s/^HUME_API_KEY=.*$/HUME_API_KEY=$api_key/" backend/.env && rm backend/.env.bak
            echo -e "${GREEN}✅ API key validated and saved${NC}"
            return 0
        else
            echo -e "${RED}❌ Invalid API key${NC}"
            echo -e "${YELLOW}Please check your key and try again${NC}"
            # Continue the loop to ask for another key
        fi
    done
}

# Check prerequisites
echo "Checking prerequisites..."
if ! command_exists "python3.11"; then
    echo -e "${RED}Error: Python 3.11 is not installed${NC}"
    echo -e "${YELLOW}Please install it with: brew install python@3.11${NC}"
    exit 1
fi

# Check Python version using Python itself
PYTHON_VERSION_CHECK=$(python3.11 -c 'import sys; print(1 if sys.version_info >= (3, 11) else 0)')
if [ "$PYTHON_VERSION_CHECK" -eq 0 ]; then
    CURRENT_VERSION=$(python3.11 --version)
    echo -e "${RED}Error: Python 3.11 or higher is required (current: $CURRENT_VERSION)${NC}"
    exit 1
fi

if ! command_exists "node"; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists "npm"; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Handle API key configuration
if [ ! -f "backend/.env" ] || [ "$1" = "--reconfigure" ]; then
    configure_hume_key || exit 1
else
    # Check if HUME_API_KEY is set and valid in .env
    HUME_API_KEY=$(grep HUME_API_KEY backend/.env | cut -d '=' -f2)
    if [ "$HUME_API_KEY" = "your_hume_api_key_here" ] || [ -z "$HUME_API_KEY" ]; then
        echo -e "${YELLOW}No valid API key found${NC}"
        configure_hume_key || exit 1
    fi
fi

if [ ! -f "hume-web/.env.local" ] && [ -f "hume-web/.env.example" ]; then
    echo "Creating frontend environment file..."
    cp hume-web/.env.example hume-web/.env.local
    echo -e "${GREEN}Created hume-web/.env.local${NC}"
fi

# Setup frontend dependencies with fixes
echo "Setting up frontend dependencies..."
cd hume-web
npm install
npm install nanoid
npm audit fix --force
cd ..

# Check if virtual environment exists, if not run setup
if [ ! -d "backend/venv" ]; then
    echo "First time setup: Installing backend dependencies..."
    cd backend
    python3.11 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
fi

# Kill any processes using our ports
echo "Ensuring ports are available..."
kill_port 3000
kill_port 8000

# Activate virtual environment and start both servers
echo -e "${GREEN}Starting servers...${NC}"
cd backend
source venv/bin/activate
cd ..
npm run dev 