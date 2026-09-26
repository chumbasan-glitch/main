s=open('shell.html').read()
core='\n'.join(open(f).read() for f in ['kanji.js','core1.js','core2.js','core3.js','core4.js','core6.js','core7.js','core5.js'])
ui=open('ui.js').read()
s=s.replace('<script>\n"use strict";\n/*CORE*/\n</script>\n<script>\n"use strict";\n/*UI*/\n</script>','<script>\n"use strict";\n'+core+'\n'+ui+'\n</script>')
assert '/*CORE*/' not in s
open('../sansu-print-maker.html','w').write(s)
print(len(s))
