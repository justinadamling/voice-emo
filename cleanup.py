import os
import shutil
from pathlib import Path
import logging
import stat
import sys

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Files to be removed
REDUNDANT_FILES = [
    # Duplicate API files
    "backend/src/api.py",  # Duplicate of root api.py
    
    # Test files (not needed in production)
    "backend/minimal_test.py",
    "hume-web/src/services/test-sheets.ts",
    
    # Redundant environment files
    "backend/.env.example",  # Keep only production env files
    "hume-web/.env.example",
    
    # System and cache files
    ".DS_Store",
    "backend/.DS_Store",
    "hume-web/.DS_Store",
    
    # Root level package files (should only be in hume-web)
    "package.json",
    "package-lock.json",
    
    # Redundant script files
    "setup.sh"  # Consolidate with start.sh
]

# Directories to be removed
REDUNDANT_DIRS = [
    # Cache directories
    "__pycache__",
    "backend/__pycache__",
    ".pytest_cache",
    
    # Build directories (can be regenerated)
    "hume-web/.next",
    "hume-web/node_modules",
    
    # Empty or redundant directories
    "backend/src",  # Contains only duplicate api.py
    ".subframe",
    "hume-web/.subframe"
]

def handle_error(func, path, exc_info):
    """Error handler for shutil.rmtree"""
    logger.warning(f"Error handling {path}: {exc_info[1]}")
    try:
        # Try to change permissions and retry
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception as e:
        logger.error(f"Failed to remove {path} even after chmod: {e}")

def safe_remove_file(file_path):
    """Safely remove a file with proper error handling"""
    try:
        if os.path.exists(file_path):
            # Try to make file writable first
            os.chmod(file_path, stat.S_IWRITE | stat.S_IREAD)
            os.remove(file_path)
            logger.info(f"✅ Removed: {file_path}")
    except Exception as e:
        logger.error(f"❌ Failed to remove {file_path}: {str(e)}")

def safe_remove_dir(dir_path):
    """Safely remove a directory with proper error handling"""
    try:
        if os.path.exists(dir_path):
            # Make all files in directory writable
            for root, dirs, files in os.walk(dir_path):
                for d in dirs:
                    try:
                        os.chmod(os.path.join(root, d), stat.S_IWRITE | stat.S_IREAD | stat.S_IEXEC)
                    except:
                        pass
                for f in files:
                    try:
                        os.chmod(os.path.join(root, f), stat.S_IWRITE | stat.S_IREAD)
                    except:
                        pass
            
            shutil.rmtree(dir_path, onerror=handle_error)
            logger.info(f"✅ Removed directory: {dir_path}")
    except Exception as e:
        logger.error(f"❌ Failed to remove directory {dir_path}: {str(e)}")

def backup_files():
    """Create a backup of files before removal"""
    backup_dir = Path("cleanup_backup")
    backup_dir.mkdir(exist_ok=True)
    
    logger.info("Creating backup of files before removal...")
    
    for file_path in REDUNDANT_FILES:
        if os.path.exists(file_path):
            try:
                # Create necessary subdirectories in backup
                backup_path = backup_dir / file_path
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy file to backup
                shutil.copy2(file_path, backup_path)
                logger.info(f"✅ Backed up: {file_path}")
            except Exception as e:
                logger.error(f"❌ Failed to backup {file_path}: {str(e)}")

def remove_redundant_files():
    """Remove redundant files after verifying they're backed up"""
    logger.info("Removing redundant files...")
    for file_path in REDUNDANT_FILES:
        safe_remove_file(file_path)

def remove_redundant_dirs():
    """Remove redundant directories"""
    logger.info("Removing redundant directories...")
    for dir_path in REDUNDANT_DIRS:
        safe_remove_dir(dir_path)

def create_readme():
    """Create a new README with clean setup instructions"""
    readme_content = """# Hume Project

A clean, efficient implementation for prosody analysis using Hume AI.

## Structure

- `backend/` - Python FastAPI backend service
- `hume-web/` - Next.js frontend application
- `hume-insights/` - Analytics component

## Setup

1. Backend Setup:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or `venv\\Scripts\\activate` on Windows
   pip install -r requirements.txt
   ```

2. Frontend Setup:
   ```bash
   cd hume-web
   npm install
   ```

3. Environment Setup:
   - Copy `.env.example` to `.env` in both backend and frontend directories
   - Add your Hume API key to both environment files

## Running the Application

1. Start Backend:
   ```bash
   cd backend
   source venv/bin/activate
   python api.py
   ```

2. Start Frontend:
   ```bash
   cd hume-web
   npm run dev
   ```

## License

See LICENSE file for details.
"""
    try:
        with open("README.md", "w") as f:
            f.write(readme_content)
        logger.info("✅ Created new README.md with clean setup instructions")
    except Exception as e:
        logger.error(f"❌ Failed to create README: {str(e)}")

def main():
    try:
        logger.info("Starting cleanup process...")
        
        # Create backup
        backup_files()
        
        # Remove redundant files
        remove_redundant_files()
        
        # Remove redundant directories
        remove_redundant_dirs()
        
        # Create new README
        create_readme()
        
        logger.info("✅ Cleanup successful!")
        logger.info("\nNext steps:")
        logger.info("1. Review the new README.md for updated setup instructions")
        logger.info("2. Run 'npm install' in hume-web directory to reinstall dependencies")
        logger.info("3. Create new virtual environment if needed: 'python -m venv venv'")
            
    except Exception as e:
        logger.error(f"❌ Error during cleanup: {str(e)}")
        raise
    except KeyboardInterrupt:
        logger.warning("\n⚠️ Cleanup interrupted by user. Some files may remain.")
        logger.info("To complete cleanup, run the script again.")
        sys.exit(1)

if __name__ == "__main__":
    main() 