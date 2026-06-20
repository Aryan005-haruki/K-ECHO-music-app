import sys
from PIL import Image, ImageDraw

def remove_background(input_path, output_paths):
    try:
        # Open the image
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        
        # We assume the disk is perfectly centered and circular.
        # Let's create a circular mask.
        # The background is a light gray/white color, but we can just use a circle mask.
        mask = Image.new('L', (width, height), 0)
        draw = ImageDraw.Draw(mask)
        
        # Calculate the bounding box for the circle
        # Assuming the disk takes up most of the image, we can find the bounding box
        # Alternatively, we can just find the bounding box of non-white pixels
        # Let's find the bounding box of non-white pixels first:
        bg_color = img.getpixel((0, 0)) # get color of top-left corner
        
        # Iterate over pixels and make them transparent if they match bg_color roughly
        data = img.getdata()
        new_data = []
        
        # Threshold for considering a pixel as background (e.g. white/light gray)
        # Background seems to be rgb(224, 224, 224) roughly, or white.
        for item in data:
            # item is (R, G, B, A)
            # If it's very close to the background color, make it transparent
            # Let's say anything > 200, 200, 200 is background, wait, the disk has white text.
            # A circle mask is much safer!
            pass
            
        # Let's just use a circle mask that fits the image dimensions.
        # Usually these logos have a slight margin. We can just use the circle that touches the edges.
        # Let's find the actual bounds of the disk by looking for darker pixels from the edges
        left, top, right, bottom = width, height, 0, 0
        pixels = img.load()
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                # If it's significantly different from the top-left pixel
                if abs(r - bg_color[0]) > 20 or abs(g - bg_color[1]) > 20 or abs(b - bg_color[2]) > 20:
                    if x < left: left = x
                    if y < top: top = y
                    if x > right: right = x
                    if y > bottom: bottom = y
                    
        # Now we have the bounding box of the disk
        margin = 2 # add a small margin
        left = max(0, left - margin)
        top = max(0, top - margin)
        right = min(width - 1, right + margin)
        bottom = min(height - 1, bottom + margin)
        
        # Create a circle mask using this bounding box
        draw.ellipse((left, top, right, bottom), fill=255)
        
        # Apply the mask
        result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        result.paste(img, (0, 0), mask)
        
        # Save to all output paths
        for path in output_paths:
            result.save(path, format="PNG")
            print(f"Saved {path}")
            
    except Exception as e:
        print(f"Error: {e}")

input_img = r"C:\Users\ARYAN\.gemini\antigravity\brain\cf5da5d6-4c21-4b80-b469-28ea37af91fd\media__1778228377471.png"
out_dir = r"d:\aryan project\music app\NeonPulse\assets"
outputs = [
    f"{out_dir}\\icon.png",
    f"{out_dir}\\adaptive-icon.png",
    f"{out_dir}\\splash-icon.png",
    f"{out_dir}\\favicon.png"
]

remove_background(input_img, outputs)
