"""Gera os ícones do app Manobra nas pastas mipmap do projeto Android.

Uso: python3 tools/make_icons.py [pasta_res]   (padrão: android/app/src/main/res)
"""
import os
import sys

from PIL import Image, ImageDraw, ImageOps

RES = sys.argv[1] if len(sys.argv) > 1 else "android/app/src/main/res"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "assets", "manobra-icon-base.png")
BG = (20, 23, 31, 255)
DARK = (35, 40, 51, 255)
LIGHT = (236, 231, 218, 255)
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def art(size, with_bg):
    """Mini tabuleiro com uma peça branca de ataque e uma preta de defesa."""
    s = size * 4  # supersampling
    img = Image.new("RGBA", (s, s), BG if with_bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = int(s * (0.16 if with_bg else 0.25))  # margem (zona segura do ícone adaptativo)
    n = 4
    cell = (s - 2 * m) // n
    for r in range(n):
        for c in range(n):
            col = DARK if (r + c) % 2 == 0 else LIGHT
            d.rectangle([m + c * cell, m + r * cell, m + (c + 1) * cell - 1, m + (r + 1) * cell - 1], fill=col)

    def piece(r, c, kind):
        cx = m + c * cell + cell // 2
        cy = m + r * cell + cell // 2
        rad = int(cell * 0.4)
        if kind == "white_attack":
            d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(255, 255, 255, 255), outline=(26, 36, 51, 255), width=max(2, s // 90))
            r2 = int(rad * 0.5)
            d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=(17, 17, 17, 255))
        else:
            d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(11, 13, 18, 255), outline=(170, 180, 198, 255), width=max(2, s // 80))

    piece(2, 0, "white_attack")
    piece(1, 1, "white_attack")
    piece(0, 2, "black_defense")
    piece(3, 3, "black_defense")
    return img.resize((size, size), Image.LANCZOS)


def round_mask(img):
    size = img.size[0]
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def generated_art(size):
    """Usa o ícone final do jogo, com fallback para arte procedural offline."""
    if not os.path.exists(BASE):
        return art(size, True)
    src = Image.open(BASE).convert("RGBA")
    return ImageOps.contain(src, (size, size), Image.Resampling.LANCZOS)


def generated_foreground(size):
    if not os.path.exists(BASE):
        return art(size, False)
    src = Image.open(BASE).convert("RGBA")
    return ImageOps.contain(src, (size, size), Image.Resampling.LANCZOS)


def icon_folders(dens):
    # Capacitor costuma criar mipmap-*-v4. Android considera a pasta -v4
    # equivalente à pasta sem sufixo para este recurso; escrever nas duas
    # provoca "Duplicate resources" no mergeDebugResources.
    v4 = os.path.join(RES, "mipmap-" + dens + "-v4")
    plain = os.path.join(RES, "mipmap-" + dens)
    return [v4] if os.path.isdir(v4) else [plain]


for dens, size in LEGACY.items():
    full = generated_art(size)
    for folder in icon_folders(dens):
        os.makedirs(folder, exist_ok=True)
        full.save(os.path.join(folder, "ic_launcher.png"))
        round_mask(full).save(os.path.join(folder, "ic_launcher_round.png"))

for dens, size in FOREGROUND.items():
    foreground = generated_foreground(size)
    for folder in icon_folders(dens):
        os.makedirs(folder, exist_ok=True)
        foreground.save(os.path.join(folder, "ic_launcher_foreground.png"))

# Capacitor cria um adaptive icon que referencia este drawable vetorial em
# Android 8+. Substituí-lo por um bitmap aponta o launcher para a arte nova.
adaptive = os.path.join(RES, "drawable-anydpi-v24")
os.makedirs(adaptive, exist_ok=True)
with open(os.path.join(adaptive, "ic_launcher_foreground.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n'
            '<bitmap xmlns:android="http://schemas.android.com/apk/res/android"\n'
            '    android:src="@mipmap/ic_launcher_foreground"\n'
            '    android:gravity="fill" />\n')

drawable = os.path.join(RES, "drawable")
os.makedirs(drawable, exist_ok=True)
with open(os.path.join(drawable, "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n'
            '<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n'
            '    <solid android:color="#14171F" />\n'
            '</shape>\n')

values = os.path.join(RES, "values")
os.makedirs(values, exist_ok=True)
with open(os.path.join(values, "ic_launcher_background.xml"), "w") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#14171F</color>\n</resources>\n')
print("Ícones gerados em", RES)
