"""
Crop 5 Gemini-generated monster sheets (2816x1536, 4 rows x 7 cols)
into 140 individual 256x256 PNGs, generate 20 egg SVGs, and 1 mystery image.
"""

from PIL import Image
import os
import shutil

# === Configuration ===

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'public', 'pets')
IMAGE_DIR = os.path.join(os.path.dirname(__file__), 'image')

# Source images and their species (4 rows each, top to bottom)
SHEETS = [
    {
        'file': 'Gemini_Generated_Image_quvfovquvfovquvf.png',
        'species': ['spirit_dog', 'chick_bird', 'young_scale', 'beetle'],
    },
    {
        'file': 'Gemini_Generated_Image_tt5yqbtt5yqbtt5y.png',
        'species': ['electric_mouse', 'hard_crab', 'mimic_lizard', 'seed_ball'],
    },
    {
        'file': 'Gemini_Generated_Image_sug7njsug7njsug7.png',
        'species': ['jellyfish', 'ore_giant', 'jungle_cub', 'sky_dragon'],
    },
    {
        'file': 'Gemini_Generated_Image_nbsvaxnbsvaxnbsv.png',
        'species': ['dune_bug', 'sonic_bat', 'snow_beast', 'circuit_fish'],
    },
    {
        'file': 'Gemini_Generated_Image_tj9euntj9euntj9e.png',
        'species': ['mushroom', 'crystal_beast', 'nebula_fish', 'clockwork_bird'],
    },
]

# Column index -> output filename suffix
COL_SUFFIXES = ['-2', '-a3', '-a4', '-a5', '-b3', '-b4', '-b5']

# Egg SVG color mapping by base type
EGG_COLORS = {
    'spirit_dog':     {'primary': '#C8B896', 'secondary': '#A08868', 'spot': '#E8D8C0'},
    'chick_bird':     {'primary': '#A0C8E8', 'secondary': '#6898C0', 'spot': '#C8E0F8'},
    'young_scale':    {'primary': '#4A90B8', 'secondary': '#2A6088', 'spot': '#78B0D0'},
    'beetle':         {'primary': '#88A848', 'secondary': '#587828', 'spot': '#A8C868'},
    'electric_mouse': {'primary': '#E8D040', 'secondary': '#B8A020', 'spot': '#F8E878'},
    'hard_crab':      {'primary': '#B0886A', 'secondary': '#88603A', 'spot': '#D0A88A'},
    'mimic_lizard':   {'primary': '#B8B8B8', 'secondary': '#888888', 'spot': '#D8D8D8'},
    'seed_ball':      {'primary': '#68B048', 'secondary': '#408020', 'spot': '#90D070'},
    'jellyfish':      {'primary': '#88C0E8', 'secondary': '#5090C0', 'spot': '#B0D8F8'},
    'ore_giant':      {'primary': '#8888A0', 'secondary': '#585878', 'spot': '#A8A8C0'},
    'jungle_cub':     {'primary': '#58A038', 'secondary': '#387018', 'spot': '#80C060'},
    'sky_dragon':     {'primary': '#E88040', 'secondary': '#C06020', 'spot': '#F8A868'},
    'dune_bug':       {'primary': '#C8A868', 'secondary': '#987838', 'spot': '#E0C890'},
    'sonic_bat':      {'primary': '#9088B8', 'secondary': '#685898', 'spot': '#B0A8D8'},
    'snow_beast':     {'primary': '#C0D8E8', 'secondary': '#90B0C8', 'spot': '#E0F0FF'},
    'circuit_fish':   {'primary': '#4888B8', 'secondary': '#285888', 'spot': '#70A8D8'},
    'mushroom':       {'primary': '#C07848', 'secondary': '#904818', 'spot': '#E09870'},
    'crystal_beast':  {'primary': '#B090D0', 'secondary': '#8060A8', 'spot': '#D0B8E8'},
    'nebula_fish':    {'primary': '#6070B8', 'secondary': '#384090', 'spot': '#8898D8'},
    'clockwork_bird': {'primary': '#A0A0B0', 'secondary': '#707088', 'spot': '#C0C0D0'},
}


def generate_egg_svg(species, colors):
    """Generate an egg SVG with species-specific coloring."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256">
  <defs>
    <radialGradient id="egg-grad" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="{colors['spot']}"/>
      <stop offset="60%" stop-color="{colors['primary']}"/>
      <stop offset="100%" stop-color="{colors['secondary']}"/>
    </radialGradient>
    <radialGradient id="shine" cx="35%" cy="30%" r="25%">
      <stop offset="0%" stop-color="white" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="35" rx="18" ry="23" fill="url(#egg-grad)" stroke="{colors['secondary']}" stroke-width="1.5"/>
  <ellipse cx="28" cy="28" rx="8" ry="10" fill="url(#shine)"/>
  <ellipse cx="38" cy="42" rx="4" ry="3" fill="{colors['spot']}" opacity="0.5"/>
  <ellipse cx="26" cy="44" rx="3" ry="2.5" fill="{colors['spot']}" opacity="0.4"/>
  <ellipse cx="36" cy="30" rx="2.5" ry="2" fill="{colors['spot']}" opacity="0.3"/>
</svg>'''


def generate_mystery_image():
    """Generate a mystery evolution placeholder image (256x256 PNG)."""
    img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    pixels = img.load()

    # Draw a dark purple/gray rounded square background
    for y in range(256):
        for x in range(256):
            # Rounded rectangle mask
            cx, cy = abs(x - 128), abs(y - 128)
            if cx > 110 or cy > 110:
                continue
            corner_dist = max(0, cx - 90) ** 2 + max(0, cy - 90) ** 2
            if corner_dist > 400:
                continue
            # Gradient background
            dist_from_center = ((x - 128) ** 2 + (y - 128) ** 2) ** 0.5
            brightness = max(30, int(60 - dist_from_center * 0.2))
            pixels[x, y] = (brightness, brightness, brightness + 20, 200)

    # Draw "?" character using pixel art
    question_mark = [
        "  XXXXX  ",
        " XX   XX ",
        "XX    XX ",
        "      XX ",
        "     XX  ",
        "    XX   ",
        "   XX    ",
        "   XX    ",
        "         ",
        "   XX    ",
        "   XX    ",
    ]
    scale = 6
    start_x = 128 - (len(question_mark[0]) * scale) // 2
    start_y = 128 - (len(question_mark) * scale) // 2

    for row_i, row in enumerate(question_mark):
        for col_i, ch in enumerate(row):
            if ch == 'X':
                for dy in range(scale):
                    for dx in range(scale):
                        px = start_x + col_i * scale + dx
                        py = start_y + row_i * scale + dy
                        if 0 <= px < 256 and 0 <= py < 256:
                            pixels[px, py] = (180, 160, 220, 255)

    return img


def remove_checkerboard_bg(img):
    """Remove the checkerboard transparency pattern from Gemini-generated images.

    Uses spatial frequency analysis: checkerboard has a regular pattern of
    alternating light/dark squares. We detect gray pixels and check if they
    form a checkerboard-like pattern by looking at local variance.
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    import numpy as np
    data = np.array(img)

    r = data[:,:,0].astype(np.int16)
    g = data[:,:,1].astype(np.int16)
    b = data[:,:,2].astype(np.int16)

    # Average brightness
    brightness = (r + g + b) / 3.0

    # Max channel difference (how "gray" the pixel is)
    max_diff = np.maximum(np.maximum(np.abs(r - g), np.abs(g - b)), np.abs(r - b))

    # Gray pixels: low saturation (channels are similar) and in brightness range
    is_gray = (max_diff < 20) & (brightness > 180)

    # Set alpha to 0 for gray background pixels
    data[:,:,3] = np.where(is_gray, 0, data[:,:,3])

    return Image.fromarray(data)


def auto_crop_alpha(img):
    """Find the bounding box of non-transparent pixels."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    bbox = img.getbbox()
    if bbox is None:
        return img
    return img.crop(bbox)


def crop_and_center(cell_img, target_size=256):
    """Remove checkerboard bg, auto-crop alpha, then scale to fit and center."""
    cleaned = remove_checkerboard_bg(cell_img)
    cropped = auto_crop_alpha(cleaned)
    w, h = cropped.size

    if w == 0 or h == 0:
        return Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))

    # Scale to fit within target_size with some padding
    padding = 16
    max_dim = target_size - padding * 2
    ratio = min(max_dim / w, max_dim / h)
    new_w = int(w * ratio)
    new_h = int(h * ratio)

    resized = cropped.resize((new_w, new_h), Image.LANCZOS)

    # Center on transparent canvas
    result = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    paste_x = (target_size - new_w) // 2
    paste_y = (target_size - new_h) // 2
    result.paste(resized, (paste_x, paste_y), resized)
    return result


def main():
    # Clean output directory
    if os.path.exists(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            os.remove(os.path.join(OUTPUT_DIR, f))
    else:
        os.makedirs(OUTPUT_DIR)

    total_cropped = 0

    for sheet_info in SHEETS:
        filepath = os.path.join(IMAGE_DIR, sheet_info['file'])
        print(f"Processing: {sheet_info['file']}")

        img = Image.open(filepath).convert('RGBA')
        img_w, img_h = img.size
        print(f"  Image size: {img_w}x{img_h}")

        num_rows = 4
        num_cols = 7

        # The rightmost ~316px is the series name label area
        # Actual monster area is roughly the left ~2500px
        content_width = img_w - 316
        row_height = img_h / num_rows
        col_width = content_width / num_cols

        # The bottom portion of each row is text labels - cut more aggressively
        monster_height = row_height - 120

        # Horizontal inset to exclude arrows between columns
        h_inset = 30  # pixels to trim from left and right of each cell

        # Vertical inset to exclude horizontal lines between rows
        v_inset_top = 12

        for row_i in range(num_rows):
            species = sheet_info['species'][row_i]
            for col_i in range(num_cols):
                # Calculate cell bounds with insets to exclude arrows and lines
                left = int(col_i * col_width) + h_inset
                top = int(row_i * row_height) + v_inset_top
                right = int((col_i + 1) * col_width) - h_inset
                bottom = int(row_i * row_height + monster_height)

                # Crop cell
                cell = img.crop((left, top, right, bottom))

                # Auto-crop and center to 256x256
                result = crop_and_center(cell)

                # Determine output filename
                suffix = COL_SUFFIXES[col_i]
                out_name = f"{species}{suffix}.png"
                out_path = os.path.join(OUTPUT_DIR, out_name)
                result.save(out_path, 'PNG', optimize=True)
                total_cropped += 1

            print(f"  {species}: 7 images cropped")

    print(f"\nTotal PNGs cropped: {total_cropped}")

    # Generate egg SVGs
    egg_count = 0
    for species, colors in EGG_COLORS.items():
        svg_content = generate_egg_svg(species, colors)
        svg_path = os.path.join(OUTPUT_DIR, f"{species}-1.svg")
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        egg_count += 1
    print(f"Egg SVGs generated: {egg_count}")

    # Generate mystery evolution placeholder
    mystery = generate_mystery_image()
    mystery_path = os.path.join(OUTPUT_DIR, 'mystery-evolution.png')
    mystery.save(mystery_path, 'PNG', optimize=True)
    print("Mystery evolution image generated")

    # Summary
    total_files = len(os.listdir(OUTPUT_DIR))
    print(f"\nTotal files in {OUTPUT_DIR}: {total_files}")
    print("Done!")


if __name__ == '__main__':
    main()
