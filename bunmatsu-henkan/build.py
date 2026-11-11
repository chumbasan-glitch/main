# template.html に engine.js を入れて、公開用とPC用（ネットなしで開ける）の2つを作る
import re
eng = open('engine.js', encoding='utf-8').read()
t = open('template.html', encoding='utf-8').read().replace('/*ENGINE*/', eng)
open('bunmatsu-henkan.html', 'w', encoding='utf-8').write(t)
pc = re.sub(r'<link rel="(preconnect|stylesheet)" href="https://fonts\.g[^"]*"( crossorigin)?>\n', '', t)
pc = pc.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
pc = pc.replace('ver 1.0</span>', 'ver 1.0 PC版</span>')
pc = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + pc + '</body></html>'
assert 'fonts.googleapis' not in pc
open('bunmatsu-henkan-pc.html', 'w', encoding='utf-8').write(pc)
print(len(t.encode()), len(pc.encode()))
