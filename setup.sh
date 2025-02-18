#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'
DIM='\033[2m'

# Spinner characters for loading animation
spinner=( "⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏" )

# Function to show spinner
show_spinner() {
    local pid=$1
    local message=$2
    local i=0
    while kill -0 $pid 2>/dev/null; do
        printf "\r${BLUE}${spinner[i]} ${message}${NC}"
        i=$(( (i+1) % ${#spinner[@]} ))
        sleep 0.1
    done
    printf "\r"
}

# Function to show step
show_step() {
    printf "\n${BOLD}${BLUE}[${1}/5]${NC} ${BOLD}${2}${NC}\n"
}

# Function to show success
show_success() {
    printf "${GREEN}✓ ${1}${NC}\n"
}

# Function to show error
show_error() {
    printf "${RED}✗ ${1}${NC}\n"
    if [ ! -z "$2" ]; then
        printf "${DIM}  ${2}${NC}\n"
    fi
}

# Function to validate Hume API key
validate_hume_key() {
    local api_key=$1
    local response
    local status_code
    
    # Make a request to Hume API
    response=$(curl -s -w "%{http_code}" -H "accept: application/json" \
        -H "X-Hume-Api-Key: $api_key" \
        "https://api.hume.ai/v0/batch/jobs")
    
    status_code=${response: -3}
    response_body=${response:0:${#response}-3}
    
    if [[ "$status_code" == "401" ]] || echo "$response_body" | grep -q "Invalid ApiKey\|oauth\.v2\.InvalidApiKey\|invalid_api_key"; then
        return 1
    fi
    
    if [[ "$status_code" == "200" ]]; then
        return 0
    fi
    
    # If we get here, there was an unexpected error
    echo "$response_body"
    return 2
}

# Function to configure environment files
configure_env_files() {
    local api_key=$1
    
    # Backend .env
    cat > backend/.env << EOL
HUME_API_KEY=${api_key}
PORT=8000
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
EOL

    # Frontend .env.local
    cat > hume-web/.env.local << EOL
# Hume AI API Key
NEXT_PUBLIC_HUME_API_KEY=${api_key}

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
EOL
}

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    lsof -i tcp:$1 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
}

# Function to check Python version
check_python_version() {
    # First, check if python3.11 exists
    if ! command_exists "python3.11"; then
        show_error "Python 3.11 not found" "Run these commands:
        1. brew install python@3.11
        2. brew unlink python@3.13 (if installed)
        3. brew link python@3.11"
        return 1
    fi

    # Then verify the exact version
    local version
    version=$(python3.11 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if [[ "$version" != "3.11" ]]; then
        show_error "Wrong Python version (found $version)" "Make sure python3.11 is linked:
        1. brew unlink python@3.13 (if installed)
        2. brew link python@3.11"
        return 1
    fi

    # Verify critical built-in modules
    if ! python3.11 -c "import aifc" 2>/dev/null; then
        show_error "Critical Python module 'aifc' not found" "This usually indicates a corrupted Python installation. Try:
        1. brew uninstall python@3.11
        2. brew install python@3.11"
        return 1
    fi

    return 0
}

# Function to verify Python environment
verify_python_env() {
    python3.11 -c "
import sys
import pkg_resources
import subprocess

def check_ffmpeg():
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except:
        return False

required_modules = {
    'psutil': '5.9.8',
    'aifc': None,  # Built-in module
    'speech_recognition': '3.10.1',
    'fastapi': '0.109.2',
    'uvicorn': '0.27.1',
    'pydub': '0.25.1'
}

system_dependencies = {
    'ffmpeg': check_ffmpeg()
}

missing = []
version_mismatch = []
missing_system = []

# Check system dependencies
for dep, available in system_dependencies.items():
    if not available:
        missing_system.append(dep)

# Check Python packages
for module, version in required_modules.items():
    try:
        if version:
            pkg_resources.require(f'{module}=={version}')
        else:
            __import__(module)
        print(f'✓ {module} - OK')
    except pkg_resources.VersionConflict:
        version_mismatch.append(module)
        print(f'✗ {module} - Version mismatch')
    except ImportError:
        missing.append(module)
        print(f'✗ {module} - Missing')

if missing or version_mismatch or missing_system:
    print('\nEnvironment verification failed!')
    
    if missing_system:
        print('\nMissing system dependencies:')
        print('  ' + ', '.join(missing_system))
        print('\nInstall with:')
        if 'ffmpeg' in missing_system:
            print('  brew install ffmpeg')
    
    if missing:
        print('\nMissing Python modules:')
        print('  ' + ', '.join(missing))
    
    if version_mismatch:
        print('\nVersion mismatched modules:')
        print('  ' + ', '.join(version_mismatch))
    
    sys.exit(1)

print('\nAll dependencies verified successfully!')
"
}

# Main setup process
main() {
    clear
    printf "${BOLD}${BLUE}=== Hume Voice Emotion Analysis Setup ===${NC}\n\n"
    
    # Step 1: Check Prerequisites
    show_step "1" "Checking Prerequisites"
    
    local prerequisites_met=true
    
    # Check Python version specifically
    if ! check_python_version; then
        prerequisites_met=false
    else
        show_success "Python 3.11 found"
    fi
    
    # Check Node.js
    if ! command_exists "node"; then
        show_error "Node.js not found" "Install from: https://nodejs.org"
        prerequisites_met=false
    else
        show_success "Node.js found"
    fi
    
    # Check npm
    if ! command_exists "npm"; then
        show_error "npm not found" "Install Node.js to get npm"
        prerequisites_met=false
    else
        show_success "npm found"
    fi

    # Check portaudio
    if ! brew list portaudio &>/dev/null; then
        show_error "portaudio not found" "Installing portaudio..."
        brew install portaudio || {
            show_error "Failed to install portaudio"
            prerequisites_met=false
        }
    else
        show_success "portaudio found"
    fi
    
    if [ "$prerequisites_met" = false ]; then
        printf "\n${RED}Please install the missing prerequisites and try again.${NC}\n"
        exit 1
    fi
    
    # Step 2: Install Dependencies
    show_step "2" "Installing Dependencies"
    
    # Clean up previous builds
    printf "${DIM}Cleaning up previous builds...${NC}"
    rm -rf hume-web/.next
    rm -rf hume-web/node_modules
    rm -rf backend/venv
    show_success "Cleaned up previous builds"
    
    # Check system dependencies first
    printf "${DIM}Checking system dependencies...${NC}"
    if ! command_exists "ffmpeg"; then
        show_error "FFmpeg not found" "Install with: brew install ffmpeg"
        exit 1
    fi
    show_success "System dependencies verified"
    
    # Backend dependencies
    printf "${DIM}Installing backend dependencies...${NC}"
    (cd backend && \
        python3.11 -m venv venv && \
        source venv/bin/activate && \
        pip install --upgrade pip && \
        # Install wheel first to ensure binary packages work
        pip install wheel && \
        # First try to install psutil specifically
        pip install psutil==5.9.8 && \
        # Then install remaining requirements
        pip install -r requirements.txt && \
        # Verify Python environment
        verify_python_env) > /dev/null 2>&1 &
    show_spinner $! "Installing and verifying backend dependencies"
    if [ $? -eq 0 ]; then
        show_success "Backend dependencies installed and verified"
    else
        show_error "Failed to install or verify backend dependencies. Common issues:
        1. Wrong Python version (need exactly 3.11)
        2. Missing system dependencies
        3. Corrupted Python installation
        
        Try these steps in order:
        1. brew install ffmpeg (if missing)
        2. brew uninstall python@3.13 (if installed)
        3. brew install python@3.11
        4. brew link python@3.11
        5. cd backend
        6. rm -rf venv
        7. python3.11 -m venv venv
        8. source venv/bin/activate
        9. pip install wheel
        10. pip install psutil==5.9.8
        11. pip install -r requirements.txt"
        exit 1
    fi
    
    # Frontend dependencies
    printf "${DIM}Installing frontend dependencies...${NC}"
    (cd hume-web && \
        npm install && \
        npm run build) > /dev/null 2>&1 &
    show_spinner $! "Installing frontend dependencies and building"
    if [ $? -eq 0 ]; then
        show_success "Frontend dependencies installed and built"
    else
        show_error "Failed to install frontend dependencies"
        exit 1
    fi
    
    # Step 3: Configure Hume API Key
    show_step "3" "Configuring Hume API Key"
    
    local api_key=""
    local validation_result
    
    while true; do
        printf "${BOLD}Enter your Hume API key:${NC} "
        read -r api_key
        
        if [ -z "$api_key" ]; then
            show_error "API key cannot be empty" "Get your key at: https://app.hume.ai"
            continue
        fi
        
        printf "${DIM}Validating API key...${NC}"
        validation_result=$(validate_hume_key "$api_key")
        validation_status=$?
        
        if [ $validation_status -eq 0 ]; then
            show_success "API key validated successfully"
            break
        elif [ $validation_status -eq 1 ]; then
            show_error "Invalid API key" "Please check your key and try again"
        else
            show_error "Error validating key" "$validation_result"
        fi
    done
    
    # Step 4: Configure Environment
    show_step "4" "Configuring Environment"
    
    printf "${DIM}Setting up environment files...${NC}"
    configure_env_files "$api_key"
    show_success "Environment files configured"
    
    # Step 5: Start Services
    show_step "5" "Starting Services"
    
    # Kill any existing processes
    kill_port 3000
    kill_port 8000
    
    # Start backend
    printf "${DIM}Starting backend service...${NC}"
    (cd backend && \
        source venv/bin/activate && \
        python api.py) 2>&1 &
    backend_pid=$!
    sleep 5  # Give it more time to start
    if ps -p $backend_pid > /dev/null; then
        show_success "Backend service started"
    else
        wait $backend_pid  # This will show us the error message
        show_error "Failed to start backend service"
        exit 1
    fi
    
    # Start frontend
    printf "${DIM}Starting frontend service...${NC}\n"
    cd hume-web
    npm run dev
    
    # Final success message
    printf "\n${GREEN}${BOLD}Setup Complete!${NC}\n"
    printf "${BOLD}Your application is running at:${NC} ${BLUE}http://localhost:3000${NC}\n"
}

# Run main function
main 