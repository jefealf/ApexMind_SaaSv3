from PIL import Image
import os

png_path = r"C:/Users/jefer/.gemini/antigravity/brain/f5b72e36-92d1-4e68-95ce-972ea210766c/apexmind_premium_icon_1770153755350.png"
ico_path = "icon.ico"

try:
    img = Image.open(png_path)
    img.save(ico_path, format='ICO', sizes=[(256, 256)])
    print(f"Converted {png_path} to {ico_path}")
except Exception as e:
    print(f"Error converting icon: {e}")
