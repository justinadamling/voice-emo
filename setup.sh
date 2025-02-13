#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}==>${NC} $1"
}

# Function to print error messages
print_error() {
    echo -e "${RED}Error:${NC} $1"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        if [ "$2" != "" ]; then
            print_status "Installing $1..."
            eval $2
        fi
        return 1
    else
        print_status "$1 is installed"
        return 0
    fi
}

# Check system dependencies
print_status "Checking system dependencies..."

# Check for Homebrew on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! check_command "brew" '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'; then
        print_error "Failed to install Homebrew. Please install it manually."
        exit 1
    fi
fi

# Check for ffmpeg
if ! check_command "ffmpeg" "brew install ffmpeg"; then
    print_error "Failed to install ffmpeg. Please install it manually."
    exit 1
fi

# Check for Python
if ! check_command "python3" "brew install python@3.13"; then
    print_error "Failed to install Python. Please install it manually."
    exit 1
fi

# Check for Node.js
if ! check_command "node" "brew install node"; then
    print_error "Failed to install Node.js. Please install it manually."
    exit 1
fi

# Check for npm
if ! check_command "npm" "brew install npm"; then
    print_error "Failed to install npm. Please install it manually."
    exit 1
fi

# Function to check if a file exists
check_file() {
    if [ ! -f "$1" ]; then
        if [ -f "$2" ]; then
            print_status "Creating $1 from example..."
            cp "$2" "$1"
        else
            print_error "Missing $1 and no example file found"
            return 1
        fi
    fi
    return 0
}

# Check for required files
print_status "Checking required files..."

# Check .env files
check_file "hume-tools/.env" "hume-tools/.env.example"
check_file "hume-web/.env.local" "hume-web/.env.example"
check_file "hume-tools/config/hume_gs.json" "hume-tools/config/hume_gs.json.example"

# Setup backend
print_status "Setting up backend..."
cd hume-tools

# Create and activate virtual environment
print_status "Creating Python virtual environment..."
python3 -m venv hume_env
source hume_env/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt
pip install python-multipart pydub SpeechRecognition hume fastapi uvicorn

# Verify backend setup
print_status "Verifying backend setup..."
if ! python -c "from src.api import app" 2>/dev/null; then
    print_error "Backend setup verification failed"
    print_error "Please check your .env file and Google Sheets credentials"
else
    print_status "Backend setup verified successfully"
fi

# Setup frontend
print_status "Setting up frontend..."
cd ../hume-web

# Install Node.js dependencies
print_status "Installing frontend dependencies..."
npm install

# Return to root directory
cd ..

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Final verification
print_status "Verifying full setup..."

# Check if all required files exist
FILES_OK=true
for file in "hume-tools/.env" "hume-web/.env.local" "hume-tools/config/hume_gs.json"; do
    if [ ! -f "$file" ]; then
        print_error "Missing required file: $file"
        FILES_OK=false
    fi
done

if [ "$FILES_OK" = false ]; then
    print_error "Some required files are missing. Please check the error messages above."
    exit 1
fi

# Print success message and next steps
echo
print_status "Setup complete!"
echo
echo -e "${GREEN}Next steps:${NC}"
echo "1. Start both servers with: npm run dev"
echo "   OR"
echo "2. Start servers individually:"
echo "   - Frontend: npm run frontend"
echo "   - Backend: npm run backend"
echo
echo -e "${YELLOW}Note:${NC} If you encounter any issues:"
echo "1. Make sure you're in the correct directory when running commands"
echo "2. Check that all environment variables are set correctly"
echo "3. Verify that Google Sheets credentials are valid"
echo "4. Look for error messages in the terminal output"
echo
print_status "For more information, see the README.md file" 