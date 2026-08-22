"""Generate every Hypescript raster asset from the approved Brain + Play master."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "web" / "public"
MASTER = ROOT / "brand/sources/hypescript-brain-play-master.png"
NAVY, NAVY_DEEP, WHITE, MUTED = "#0B1733", "#071127", "#F7FAFF", "#9AA7BC"
MINT = "#35D59A"


def font(size: int, bold: bool = False):
    names = [
        "C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def approved_master() -> Image.Image:
    if not MASTER.exists():
        raise FileNotFoundError(f"Missing approved brand master: {MASTER}")
    return ImageOps.fit(Image.open(MASTER).convert("RGB"), (1536, 1536), method=Image.Resampling.LANCZOS)


def mark(size: int, maskable: bool = False) -> Image.Image:
    """Create a full-bleed app mark with one shared Brain + Play master."""
    source = approved_master()
    if maskable:
        canvas = Image.new("RGBA", (size, size), NAVY_DEEP)
        glyph_size = round(size * 0.78)
        glyph = source.resize((glyph_size, glyph_size), Image.Resampling.LANCZOS).convert("RGBA")
        offset = (size - glyph_size) // 2
        canvas.alpha_composite(glyph, (offset, offset))
        return canvas

    icon = source.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
    # The background is the icon surface itself; only the four outer corners are transparent.
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.225), fill=255)
    icon.putalpha(mask)
    return icon


def wordmark(dark: bool = False) -> Image.Image:
    canvas = Image.new("RGBA", (1272, 256), (0, 0, 0, 0))
    icon = mark(256)
    canvas.alpha_composite(icon, (0, 0))
    draw = ImageDraw.Draw(canvas)
    main = WHITE if dark else NAVY
    draw.text((316, 32), "Hypescript", font=font(114, True), fill=main)
    draw.text((323, 204), "AI VIDEO EDITOR", font=font(27, True), fill=MINT, spacing=3)
    return canvas


def social(size: tuple[int, int]) -> Image.Image:
    width, height = size
    canvas = Image.new("RGB", size, NAVY_DEEP)
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((width * 0.66, -height * 0.38, width * 1.12, height * 0.48), fill="#0D2A38")
    draw.ellipse((-width * 0.18, height * 0.72, width * 0.42, height * 1.45), fill="#102647")
    icon = mark(round(height * 0.44))
    canvas.paste(icon, (round(width * 0.075), round(height * 0.13)), icon)
    draw.text((width * 0.34, height * 0.25), "Hypescript", font=font(round(height * 0.105), True), fill=WHITE)
    draw.text((width * 0.345, height * 0.44), "AI VIDEO EDITOR", font=font(round(height * 0.035), True), fill=MINT)
    draw.text((width * 0.345, height * 0.57), "From a conversation to a finished video.", font=font(round(height * 0.034)), fill=MUTED)
    return canvas


def product_art(name: str, accent: str) -> Image.Image:
    canvas = Image.new("RGB", (1200, 675), NAVY_DEEP)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((52, 52, 1148, 623), radius=58, fill="#101E39", outline="#2B3C5B", width=2)
    draw.ellipse((750, -180, 1300, 370), fill=accent)
    icon = mark(250)
    canvas.paste(icon, (105, 110), icon)
    draw.text((405, 155), "Hypescript", font=font(82, True), fill=WHITE)
    draw.text((410, 270), name.upper(), font=font(48, True), fill=MINT)
    draw.text((410, 355), "AI video editing that works with you.", font=font(31), fill=MUTED)
    return canvas


def save_icon(size: int, path: Path, maskable: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    mark(size, maskable).save(path, optimize=True)


def main():
    brand = ROOT / "brand"
    icons = brand / "icons"
    social_dir = brand / "social"
    products = brand / "products"
    for folder in (brand, icons, social_dir, products):
        folder.mkdir(parents=True, exist_ok=True)

    mark(1024).save(brand / "hypescript-mark-v4.png", optimize=True)
    mark(512).save(brand / "hypescript-mark-minimal.png", optimize=True)
    mark(256).save(brand / "hypescript-icon.png", optimize=True)
    for size in (16, 32, 48, 64, 96, 128, 180, 192, 256, 512):
        save_icon(size, icons / f"icon-{size}.png")
    save_icon(192, icons / "icon-maskable-192.png", True)
    save_icon(512, icons / "icon-maskable-512.png", True)
    save_icon(16, ROOT / "favicon-16.png")
    save_icon(32, ROOT / "favicon-32.png")
    save_icon(180, ROOT / "apple-touch-icon.png")
    save_icon(180, icons / "apple-touch-icon.png")
    mark(256).save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

    wordmark(False).save(brand / "hypescript-logo-light.png", optimize=True)
    wordmark(False).save(brand / "hypescript-logo-horizontal.png", optimize=True)
    wordmark(True).save(brand / "hypescript-logo-dark.png", optimize=True)
    social((1200, 630)).save(social_dir / "open-graph.png", optimize=True)
    social((1200, 630)).save(social_dir / "twitter-card.png", optimize=True)
    product_art("Creator", "#123A3A").save(products / "creator.png", optimize=True)
    product_art("Pro", "#1A2850").save(products / "pro.png", optimize=True)


if __name__ == "__main__":
    main()
