import os
import glob
from PIL import Image

# Path to the brain directory
brain_dir = r"C:\Users\ARYAN\.gemini\antigravity\brain\cf5da5d6-4c21-4b80-b469-28ea37af91fd"

# Find all images
extensions = ["*.png", "*.jpg", "*.jpeg", "*.webp"]
files = []
for ext in extensions:
    files.extend(glob.glob(os.path.join(brain_dir, "**", ext), recursive=True))

if not files:
    print("No images found.")
else:
    # Sort by modification time
    latest_file = max(files, key=os.path.getmtime)
    print(f"Latest image found: {latest_file}")
