# template.html に units6.json（6年 国語・算数・理科・社会の年間指導計画）を入れて まいにち授業ノート.html を作る
# units6.json は「スマート週案簿 v9.4」の PRESETS から取り出したもの
import json, os
d = os.path.dirname(os.path.abspath(__file__))
units = json.load(open(os.path.join(d, 'units6.json')))
js = json.dumps(units, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
s = open(os.path.join(d, 'template.html')).read().replace('/*UNITS*/', js)
open(os.path.join(d, 'まいにち授業ノート.html'), 'w').write(s)
print('OK', len(s.encode()) // 1024, 'KB')
