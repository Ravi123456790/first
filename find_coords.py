import pytesseract
from PIL import Image

# Path to the image
image_path = '/home/ubuntu/.gemini/antigravity/brain/5fbb6181-fbc5-47f4-977f-b0d96a0a7dd4/uploaded_image_1765435269882.png'

# Load the image
img = Image.open(image_path)

# Use tesseract to get bounding box estimates
# psm 11: Sparse text. Find as much text as possible in no particular order.
# or psm 6: Assume a single uniform block of text.
# We want to find "470%" specifically.

# Crop to expected region (x: 0-100, y: 50-120)
# "Welcome" was at y=104. "470%" should be above it.
crop_img = img.crop((0, 50, 150, 120))

# Convert to grayscale
gray = crop_img.convert('L')
# Simple threshold
threshold_img = gray.point(lambda p: p > 128 and 255)

print(f"--- Searching in crop (0, 50, 150, 120) ---")
data = pytesseract.image_to_data(threshold_img, config='--psm 6', output_type=pytesseract.Output.DICT)

for i in range(len(data['text'])):
    text = data['text'][i].strip()
    if text:
        # Adjust y coordinates back to original image space
        x = data['left'][i]
        y = data['top'][i] + 50
        w = data['width'][i]
        h = data['height'][i]
        print(f"Text: '{text}' at x={x}, y={y}, w={w}, h={h}")
