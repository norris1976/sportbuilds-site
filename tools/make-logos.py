# Generates docs/logo-options/option-{a,b,c}.svg (lockups, currentColor ink + gold accent),
# option-X-mark.svg (self-contained tile, works on any background) and the text-as-paths wordmarks.
# Fonts are SIL OFL 1.1 (Archivo Black, Barlow Condensed, Alata); text is converted to outlines, so no font is needed to display the logos.
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
G='/usr/share/fonts/truetype/sand-box/google/'
GREEN, GOLD = '#0b3d2e', '#f4c430'

def text_path(fontfile, text, size, tracking=0):
    f=TTFont(G+fontfile); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm; s=size/upm
    x=0; d=[]
    for ch in text:
        if ch==' ': x+=upm*0.28+tracking/s; continue
        g=cmap[ord(ch)]; pen=SVGPathPen(gs); gs[g].draw(TransformPen(pen,(s,0,0,-s,x*s,0))); d.append(pen.getCommands())
        x+=gs[g].width+tracking/s
    asc=f['OS/2'].sCapHeight*s
    return ' '.join(d), x*s, asc

# marks on a 100x100 grid; ink = currentColor, gold accent fixed
MARKS={
 'a': lambda ink,acc: f'<rect x="8" y="64" width="84" height="22" rx="7" fill="{ink}"/><rect x="22" y="38" width="56" height="22" rx="7" fill="{ink}"/><rect x="36" y="12" width="28" height="22" rx="7" fill="{acc}"/>',
 'b': lambda ink,acc: f'<rect x="9" y="22" width="82" height="56" rx="28" fill="none" stroke="{ink}" stroke-width="12"/><rect x="33" y="40" width="34" height="20" rx="10" fill="{acc}"/>',
 'c': lambda ink,acc: f'<path d="M30 28 L10 50 L30 72 M70 28 L90 50 L70 72" fill="none" stroke="{ink}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="50" r="16" fill="{acc}"/>',
}
WORD={'a':('Archivo Black/ArchivoBlack-Regular.ttf','Sport Builds',0,0),'b':('Barlow Condensed/BarlowCondensed-ExtraBold.ttf','SPORT BUILDS',2,0),'c':('Alata/Alata-Regular.ttf','sport builds',0,0)}
NAMES={'a':'Stack','b':'Track','c':'Brackets'}
for k in 'abc':
    ff,txt,trk,_=WORD[k]
    size=34
    d,w,cap=text_path(ff,txt,size,trk)
    H=40; mark_s=H/100
    wordx=H+10; ybase=H/2+cap/2
    W=wordx+w
    lock=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} {H}" role="img" aria-label="Sport Builds" fill="currentColor"><title>Sport Builds</title><g transform="scale({mark_s})" color="currentColor">{MARKS[k]("currentColor",GOLD)}</g><path transform="translate({wordx} {ybase:.2f})" d="{d}"/></svg>\n'
    open(f'docs/logo-options/option-{k}.svg','w').write(lock)
    # self-contained tile: green square, paper-white ink, gold accent
    tile=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Sport Builds"><title>Sport Builds</title><rect width="100" height="100" rx="22" fill="{GREEN}"/><g transform="translate(14 14) scale(.72)">{MARKS[k]("#ffffff",GOLD)}</g></svg>\n'
    open(f'docs/logo-options/option-{k}-mark.svg','w').write(tile)
print('ok')
