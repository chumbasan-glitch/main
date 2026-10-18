# PC版（ネットなし）：Googleの書体を読みこまず、Windowsの「UD デジタル 教科書体」で表示・印刷する
import re
t = open('note-maker.html', encoding='utf-8').read()
pc = re.sub(r'<link rel="(preconnect|stylesheet)" href="https://fonts\.g[^"]*"( crossorigin)?>\n', '', t)
pc = pc.replace('<span class="ver">ver 1.5</span>', '<span class="ver">ver 1.5 PC版</span>')
pc = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + pc + '</body></html>'
assert 'fonts.googleapis' not in pc
open('notetsukuru-pc.html', 'w', encoding='utf-8').write(pc)
print('pc', len(pc.encode()))
