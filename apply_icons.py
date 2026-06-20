import os
from PIL import Image

def resize_and_copy(src_path, dest_dir, sizes, filenames):
    if not os.path.exists(src_path):
        print(f"Source not found: {src_path}")
        return
        
    img = Image.open(src_path)
    
    for size_name, (w, h) in sizes.items():
        resized = img.resize((w, h), Image.Resampling.LANCZOS)
        
        # Mipmap dirs
        target_dir = os.path.join(dest_dir, f"mipmap-{size_name}")
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            
        for fn in filenames:
            # save as PNG or WEBP depending on original, let's do PNG, wait, Android supports both.
            # I will save as PNG, but sometimes Android projects have .webp.
            # The original had .webp
            resized.save(os.path.join(target_dir, fn.replace('.png', '.webp')), format="WEBP")
            resized.save(os.path.join(target_dir, fn), format="PNG")
            print(f"Saved {fn} in mipmap-{size_name}")

# Splash screen has specific drawable sizes usually, but we can just put a high-res one in drawable-xxxhdpi
# or just update the mipmap for launcher icons.
src_icon = r"d:\aryan project\music app\NeonPulse\assets\icon.png"
src_splash = r"d:\aryan project\music app\NeonPulse\assets\splash-icon.png"
res_dir = r"d:\aryan project\music app\NeonPulse\android\app\src\main\res"

# Android mipmap sizes for launcher icons
icon_sizes = {
    'mdpi': (48, 48),
    'hdpi': (72, 72),
    'xhdpi': (96, 96),
    'xxhdpi': (144, 144),
    'xxxhdpi': (192, 192)
}

resize_and_copy(src_icon, res_dir, icon_sizes, ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'])

# Now for splash screen, usually in drawable folders or just a single drawable-v24 folder
# Wait, let's just create drawable-xxhdpi/splashscreen_image.png
drawable_dir = os.path.join(res_dir, "drawable-xxhdpi")
if not os.path.exists(drawable_dir):
    os.makedirs(drawable_dir)

splash_img = Image.open(src_splash)
splash_img.thumbnail((400, 400), Image.Resampling.LANCZOS) # reasonable splash size
splash_img.save(os.path.join(drawable_dir, "splashscreen_image.png"), format="PNG")
print("Saved splashscreen_image.png")

