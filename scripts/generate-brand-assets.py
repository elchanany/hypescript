"""Generate Hypescript raster icons and social cards from the canonical mark geometry."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "web" / "public"
NAVY, GREEN, WHITE, MUTED = "#0B1733", "#35D59A", "#F7FAFF", "#9AA7BC"

def font(size: int, bold: bool = False):
    names = ["C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"]
    for name in names:
        try: return ImageFont.truetype(name, size)
        except OSError: pass
    return ImageFont.load_default()

def mark(size: int, maskable: bool = False) -> Image.Image:
    scale = size / 64
    im = Image.new("RGBA", (size, size), NAVY)
    d = ImageDraw.Draw(im)
    if not maskable:
        radius = round(17 * scale)
        im = Image.new("RGBA", (size, size), (0,0,0,0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0,0,size-1,size-1), radius=radius, fill=NAVY)
    w = max(2, round(7 * scale))
    xy = lambda p: round(p * scale)
    d.line((xy(18),xy(17),xy(18),xy(47)), fill=GREEN, width=w)
    d.line((xy(46),xy(17),xy(46),xy(47)), fill=GREEN, width=w)
    d.line((xy(21.5),xy(32),xy(43.5),xy(32)), fill=GREEN, width=w)
    r = max(1, round(3.5 * scale))
    for x,y in ((18,17),(18,47),(46,17),(46,47)): d.ellipse((xy(x)-r,xy(y)-r,xy(x)+r,xy(y)+r),fill=GREEN)
    d.polygon([(xy(28),xy(24.5)),(xy(40.5),xy(32)),(xy(28),xy(39.5))],fill=WHITE)
    pr=max(1,round(2*scale))
    for x,y in ((18,17),(46,47)): d.ellipse((xy(x)-pr,xy(y)-pr,xy(x)+pr,xy(y)+pr),fill=WHITE)
    return im

def social(size: tuple[int,int]) -> Image.Image:
    w,h=size; im=Image.new("RGB",size,NAVY); d=ImageDraw.Draw(im)
    d.ellipse((w*.68,-h*.5,w*1.08,h*.35),fill="#123C4A")
    d.ellipse((-w*.2,h*.55,w*.25,h*1.4),fill="#102B45")
    icon=mark(round(h*.34)); im.paste(icon,(round(w*.09),round(h*.19)),icon)
    d.text((w*.09,h*.59),"Hypescript",font=font(round(h*.10),True),fill=WHITE)
    d.text((w*.09,h*.72),"AI VIDEO EDITOR",font=font(round(h*.033),True),fill=GREEN)
    d.text((w*.09,h*.80),"From words to a finished video.",font=font(round(h*.034)),fill=MUTED)
    return im

def wordmark(dark: bool = False) -> Image.Image:
    im=Image.new("RGBA",(1272,256),(0,0,0,0)); icon=mark(256); im.paste(icon,(0,0),icon); d=ImageDraw.Draw(im)
    main=WHITE if dark else NAVY; d.text((312,66),"Hype",font=font(116,True),fill=main)
    hype_w=d.textlength("Hype",font=font(116,True)); d.text((312+hype_w,66),"script",font=font(116,True),fill=GREEN if dark else "#159B70")
    d.text((318,185),"AI VIDEO EDITOR",font=font(34,True),fill=MUTED)
    return im

def save_icon(size: int, path: Path, maskable=False):
    path.parent.mkdir(parents=True,exist_ok=True); mark(size,maskable).save(path,optimize=True)

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
