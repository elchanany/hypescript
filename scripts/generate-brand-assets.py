"""Generate every Hypescript raster asset from the minimal H/play mark."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "web" / "public"
NAVY, ACCENT, WHITE, MUTED = "#0B1733", "#6F8CFF", "#F7FAFF", "#9AA7BC"
MINT = "#35D59A"

def font(size: int, bold: bool = False):
    names = ["C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"]
    for name in names:
        try: return ImageFont.truetype(name, size)
        except OSError: pass
    return ImageFont.load_default()

def mark(size: int, maskable: bool = False) -> Image.Image:
    """Draw a flat, small-size-safe squircle with one H/play glyph."""
    scale = 4
    canvas = size * scale
    im = Image.new("RGBA", (canvas, canvas), NAVY if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pad = round(canvas * (.13 if maskable else .045))
    d.rounded_rectangle(
        (pad, pad, canvas - pad, canvas - pad),
        radius=round(canvas * .245),
        fill=NAVY,
    )
    top, bottom = round(canvas * .245), round(canvas * .755)
    rail_w = round(canvas * .13)
    left_x, right_x = round(canvas * .27), round(canvas * .60)
    d.rounded_rectangle((left_x, top, left_x + rail_w, bottom), radius=rail_w // 2, fill=MINT)
    d.rounded_rectangle((right_x, top, right_x + rail_w, bottom), radius=rail_w // 2, fill=MINT)
    d.polygon(((round(canvas * .335), round(canvas * .39)), (round(canvas * .665), round(canvas * .50)), (round(canvas * .335), round(canvas * .61))), fill=MINT)
    return im.resize((size, size), Image.Resampling.LANCZOS)

def social(size: tuple[int,int]) -> Image.Image:
    w,h=size; im=Image.new("RGB",size,NAVY); d=ImageDraw.Draw(im)
    d.rounded_rectangle((w*.72,-h*.12,w*1.05,h*.34),radius=80,fill="#102A3C")
    icon=mark(round(h*.38)); im.paste(icon,(round(w*.08),round(h*.15)),icon)
    d.text((w*.32,h*.29),"Hypescript",font=font(round(h*.105),True),fill=WHITE)
    d.text((w*.325,h*.46),"AI VIDEO EDITOR",font=font(round(h*.034),True),fill=MINT)
    d.text((w*.325,h*.57),"From words to a finished video.",font=font(round(h*.038)),fill=MUTED)
    return im

def wordmark(dark: bool = False) -> Image.Image:
    im=Image.new("RGBA",(1272,256),(0,0,0,0)); icon=mark(256); im.paste(icon,(0,0),icon); d=ImageDraw.Draw(im)
    main=WHITE if dark else NAVY; d.text((316,53),"Hypescript",font=font(122,True),fill=main)
    d.text((323,184),"AI VIDEO EDITOR",font=font(34,True),fill=MINT)
    return im

def save_icon(size: int, path: Path, maskable=False):
    path.parent.mkdir(parents=True,exist_ok=True); mark(size,maskable).save(path,optimize=True)

mark(2048).save(ROOT/"brand/hypescript-mark-minimal.png", optimize=True)
mark(1024).save(ROOT/"brand/hypescript-icon.png", optimize=True)
for s in (16,32,48,64,96,128,180,192,256,512): save_icon(s,ROOT/f"brand/icons/icon-{s}.png")
save_icon(192,ROOT/"brand/icons/icon-maskable-192.png",True)
save_icon(512,ROOT/"brand/icons/icon-maskable-512.png",True)
save_icon(16,ROOT/"favicon-16.png"); save_icon(32,ROOT/"favicon-32.png")
save_icon(180,ROOT/"apple-touch-icon.png"); save_icon(180,ROOT/"brand/icons/apple-touch-icon.png")
save_icon(1024,ROOT/"brand/hypescript-icon.png")
mark(256).save(ROOT/"favicon.ico",format="ICO",sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
wordmark(False).save(ROOT/"brand/hypescript-logo-light.png",optimize=True)
wordmark(False).save(ROOT/"brand/hypescript-logo-horizontal.png",optimize=True)
wordmark(True).save(ROOT/"brand/hypescript-logo-dark.png",optimize=True)
social((1200,630)).save(ROOT/"brand/social/open-graph.png",optimize=True)
social((1200,630)).save(ROOT/"brand/social/twitter-card.png",optimize=True)
