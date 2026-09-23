from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets"
BRAND = ASSETS / "brand"

FOREST = "#1A3A34"
IVORY = "#FAF9F6"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
WORDMARK = "Hubik"
SUPERSAMPLE = 4


def mark_shapes(cx, cy, height):
    width = height * 0.78
    stem = height * 0.15
    bar = height * 0.12
    peak = height * 0.16
    left, right = cx - width / 2, cx + width / 2
    top, bottom = cy - height / 2, cy + height / 2
    mid = cy + height * 0.05
    return [
        [(left, top), (left + stem, top), (left + stem, bottom), (left, bottom)],
        [(right - stem, top), (right, top), (right, bottom), (right - stem, bottom)],
        [
            (left + stem, mid),
            (cx, mid - peak),
            (right - stem, mid),
            (right - stem, mid + bar),
            (cx, mid - peak + bar),
            (left + stem, mid + bar),
        ],
    ]


def svg_path(polygons):
    return " ".join(
        "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in polygon) + " Z" for polygon in polygons
    )


def write_svg(name, size, background, polygons, wordmark=None):
    rect = f'<rect width="{size}" height="{size}" fill="{background}"/>' if background else ""
    text = ""
    if wordmark:
        x, y, font_size = wordmark
        text = (
            f'<text x="{x}" y="{y}" font-family="Georgia, serif" font-size="{font_size}" '
            f'fill="{IVORY}" text-anchor="middle">{WORDMARK}</text>'
        )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
        f'{rect}<path d="{svg_path(polygons)}" fill="{IVORY}"/>{text}</svg>\n'
    )
    (BRAND / name).write_text(svg)


def render_png(path, size, background, mark_center_y, mark_height, wordmark_top=None, font_size=None):
    scale = SUPERSAMPLE
    image = Image.new("RGBA", (size * scale, size * scale), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for polygon in mark_shapes(size * scale / 2, mark_center_y * scale, mark_height * scale):
        draw.polygon(polygon, fill=IVORY)
    if wordmark_top is not None:
        font = ImageFont.truetype(GEORGIA, font_size * scale)
        text_width = draw.textlength(WORDMARK, font=font)
        draw.text(((size * scale - text_width) / 2, wordmark_top * scale), WORDMARK, font=font, fill=IVORY)
    image.resize((size, size), Image.LANCZOS).save(path)


def main():
    BRAND.mkdir(parents=True, exist_ok=True)

    render_png(ASSETS / "icon.png", 1024, FOREST, 512, 480)
    write_svg("icon.svg", 1024, FOREST, mark_shapes(512, 512, 480))

    render_png(ASSETS / "adaptive-icon.png", 1024, None, 512, 400)
    write_svg("adaptive-icon.svg", 1024, None, mark_shapes(512, 512, 400))

    render_png(ASSETS / "splash-icon.png", 1024, None, 400, 420, wordmark_top=680, font_size=170)
    write_svg("splash-icon.svg", 1024, None, mark_shapes(512, 400, 420), wordmark=(512, 830, 170))

    render_png(ASSETS / "favicon.png", 48, FOREST, 24, 28)


if __name__ == "__main__":
    main()
