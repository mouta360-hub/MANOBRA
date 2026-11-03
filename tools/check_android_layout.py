#!/usr/bin/env python3
"""Confirma que o APK receberá a versão Android atual, e não a interface antiga."""
from pathlib import Path
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'www')
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'android_visual_approved.css').read_text(encoding='utf-8')
js=(root/'app.js').read_text(encoding='utf-8')
assert 'android-menu-20261103b' in html, 'index.html antigo: marcador ausente'
assert '@media(max-width:900px)' in css, 'CSS Android desatualizado'
assert 'android-brand' in js and 'android-menu-nav' in js, 'menu Android ausente'
assert 'menu-options' in js, 'cartoes do menu ausentes'
print('OK: layout Android atualizado em',root)
