"""Generate the colouring pages for Ausmalen (our own drawings).

    python3 scripts/coloring/generate.py [OUT_DIR]

OUT_DIR defaults to public/content/coloring. Writes one folder per theme with
theme.json and svgs/*.svg. Every area that can be coloured is an element with
a unique data-region and the blank fill; lines without data-region are only
drawn (see ColoringGame.vue). Later elements lie on top of earlier ones, so a
tap colours the topmost area. To look at the result, open
scripts/coloring/preview.html in a browser (it shows every page).
"""
import json, math, sys
from pathlib import Path

ROOT  = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public/content/coloring'
INK   = '#2c1a0a'
BLANK = '#f5f0e8'
SIZE  = 400


def attrs(a):
    return ' '.join(f'{k.rstrip("_").replace("_", "-")}="{v}"' for k, v in a.items())


class Page:
    def __init__(self):
        self.parts, self.names = [], set()

    def area(self, name, tag, sw=4, **a):
        """An area to colour."""
        assert name not in self.names, f'region {name} twice'
        self.names.add(name)
        self.parts.append(f'<{tag} data-region="{name}" {attrs(a)} fill="{BLANK}" stroke="{INK}" '
                          f'stroke-width="{sw}" stroke-linejoin="round"/>')

    def line(self, tag, sw=3, fill='none', **a):
        """A drawn line, not coloured."""
        self.parts.append(f'<{tag} {attrs(a)} fill="{fill}" stroke="{INK}" stroke-width="{sw}" '
                          f'stroke-linecap="round" stroke-linejoin="round"/>')

    def dot(self, x, y, r):
        self.parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{INK}"/>')

    def svg(self):
        body = '\n  '.join(self.parts)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" '
                f'width="{SIZE}" height="{SIZE}">\n  {body}\n</svg>\n')


def star(cx, cy, r, inner=0.45, points=5, turn=-90):
    pts = []
    for i in range(points * 2):
        rr = r if i % 2 == 0 else r * inner
        a = math.radians(turn + i * 180 / points)
        pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
    return ' '.join(pts)


def heart(cx, cy, s):
    return (f'M{cx},{cy + s * 0.9} C{cx - s * 1.4},{cy} {cx - s * 0.9},{cy - s * 1.1} {cx},{cy - s * 0.35} '
            f'C{cx + s * 0.9},{cy - s * 1.1} {cx + s * 1.4},{cy} {cx},{cy + s * 0.9} Z')


def flower(p, name, cx, cy, r, petals=5):
    for i in range(petals):
        a = math.radians(i * 360 / petals - 90)
        p.area(f'{name}-petal-{i + 1}', 'ellipse', 3, cx=f'{cx + r * math.cos(a):.1f}', cy=f'{cy + r * math.sin(a):.1f}',
               rx=r * 0.75, ry=r * 0.55, transform=f'rotate({i * 360 / petals} {cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f})')
    p.area(f'{name}-middle', 'circle', 3, cx=cx, cy=cy, r=r * 0.55)


# ---- Einhorn --------------------------------------------------------------

def einhorn():
    p = Page()
    p.area('hill', 'path', d='M0,340 Q120,300 220,330 T400,320 L400,400 L0,400 Z')
    p.area('star-left', 'polygon', 3, points=star(60, 70, 26))
    p.area('star-right', 'polygon', 3, points=star(340, 60, 20))
    p.area('tail', 'path', d='M300,205 C350,190 370,240 345,280 C335,300 360,320 340,335 '
                             'C320,320 310,290 318,265 C325,240 305,225 296,222 Z')
    for i, x in enumerate((165, 200, 255, 290)):
        p.area(f'leg-{i + 1}', 'rect', x=x, y=255, width=26, height=72, rx=11)
        p.area(f'hoof-{i + 1}', 'rect', x=x - 2, y=318, width=30, height=18, rx=6)
    p.area('body', 'ellipse', cx=235, cy=225, rx=90, ry=55)
    p.area('neck', 'path', d='M160,215 C150,180 135,150 128,120 L178,108 C190,140 200,175 215,190 Z')
    p.area('head', 'path', d='M178,108 C175,80 150,70 125,78 C100,86 70,105 62,125 '
                             'C56,142 70,155 90,152 C110,150 130,140 140,135 Z')
    p.area('ear', 'path', d='M150,80 L162,48 L172,88 Z')
    p.area('horn', 'path', d='M118,82 L112,22 L138,76 Z')
    p.line('path', 2, d='M114,40 L130,46 M116,55 L133,61 M118,68 L136,73')
    p.area('mane-1', 'path', d='M162,88 C190,80 205,100 192,118 C210,120 214,140 198,150 C185,150 180,130 178,110 Z')
    p.area('mane-2', 'path', d='M198,150 C222,150 226,175 210,185 C200,190 192,175 190,160 Z')
    p.area('mane-3', 'path', d='M138,78 C140,60 160,55 166,66 C160,72 150,78 148,85 Z')
    p.dot(115, 100, 5)
    p.line('path', 2.5, d='M78,135 Q82,138 86,135')
    p.line('path', 2.5, d='M100,145 Q110,150 120,143')
    return p


def regenbogen():
    p = Page()
    for i, r in enumerate((170, 145, 120, 95, 70)):
        p.area(f'arc-{i + 1}', 'path', d=f'M{200 - r},300 A{r},{r} 0 0 1 {200 + r},300 '
                                         f'L{200 + r - 25},300 A{r - 25},{r - 25} 0 0 0 {200 - r + 25},300 Z')
    p.area('sun', 'circle', cx=330, cy=70, r=34)
    for i in range(8):
        a = math.radians(i * 45)
        p.line('line', 4, x1=f'{330 + 44 * math.cos(a):.1f}', y1=f'{70 + 44 * math.sin(a):.1f}',
               x2=f'{330 + 60 * math.cos(a):.1f}', y2=f'{70 + 60 * math.sin(a):.1f}')
    p.area('cloud-left', 'path', d='M20,330 C10,300 40,280 62,292 C70,265 115,262 122,292 C150,285 165,315 145,335 Z')
    p.area('cloud-right', 'path', d='M255,335 C240,310 268,288 292,300 C300,272 345,272 352,300 C380,292 395,322 375,338 Z')
    p.area('star-1', 'polygon', 3, points=star(60, 70, 22))
    p.area('star-2', 'polygon', 3, points=star(120, 120, 14))
    p.area('heart', 'path', 3, d=heart(200, 360, 22))
    p.area('ground', 'path', d='M0,380 L400,380 L400,400 L0,400 Z')
    return p


def cupcake():
    p = Page()
    p.area('plate', 'ellipse', cx=200, cy=355, rx=150, ry=22)
    p.area('cup', 'path', d='M110,230 L290,230 L265,345 L135,345 Z')
    for x in (150, 180, 210, 240):
        p.line('line', 3, x1=x, y1=232, x2=x - 8 + (x - 200) * 0.05, y2=343)
    p.area('cream-bottom', 'path', d='M95,232 C80,200 120,180 140,195 C150,170 250,170 260,195 '
                                     'C280,180 320,200 305,232 Z')
    p.area('cream-middle', 'path', d='M125,190 C115,160 150,140 170,152 C180,130 230,130 238,152 '
                                     'C258,140 290,160 275,190 Z')
    p.area('cream-top', 'path', d='M160,150 C150,120 180,100 200,110 C220,100 250,120 240,150 Z')
    p.area('cherry', 'circle', cx=200, cy=92, r=20)
    p.line('path', 3, d='M200,72 Q205,50 225,40')
    p.area('sprinkle-1', 'rect', 2, x=140, y=200, width=16, height=7, rx=3, transform='rotate(-25 148 203)')
    p.area('sprinkle-2', 'rect', 2, x=235, y=205, width=16, height=7, rx=3, transform='rotate(20 243 208)')
    p.area('sprinkle-3', 'rect', 2, x=190, y=165, width=16, height=7, rx=3, transform='rotate(10 198 168)')
    p.area('candle', 'rect', 3, x=292, y=60, width=22, height=70, rx=4)
    p.area('flame', 'path', 3, d='M303,58 C290,45 300,30 303,20 C308,32 318,45 303,58 Z')
    p.area('star', 'polygon', 3, points=star(80, 80, 30))
    return p


# ---- Prinzessin -----------------------------------------------------------

def prinzessin():
    p = Page()
    # Back to front: hair behind, then dress and arms, then the face
    p.area('hair-back', 'path', d='M145,110 C140,60 260,60 255,110 C260,140 252,160 240,172 L160,172 C148,160 140,140 145,110 Z')
    p.area('dress', 'path', d='M170,180 L230,180 L300,370 Q200,390 100,370 Z')
    p.area('dress-belt', 'rect', x=165, y=180, width=70, height=18, rx=6)
    p.area('arm-left', 'path', d='M172,186 C150,200 135,240 132,268 L148,272 C152,245 165,215 182,200 Z')
    p.area('arm-right', 'path', d='M228,186 C250,200 265,240 268,268 L252,272 C248,245 235,215 218,200 Z')
    p.area('hand-left', 'circle', 3, cx=140, cy=278, r=11)
    p.area('hand-right', 'circle', 3, cx=260, cy=278, r=11)
    p.area('neck', 'rect', 3, x=190, y=150, width=20, height=32)
    p.area('face', 'ellipse', cx=200, cy=118, rx=42, ry=46)
    p.area('fringe', 'path', d='M158,105 C165,70 235,70 242,105 C225,90 210,96 200,85 C190,96 175,90 158,105 Z')
    p.area('crown', 'path', d='M168,72 L172,40 L186,58 L200,32 L214,58 L228,40 L232,72 Z')
    p.area('crown-gem', 'circle', 2.5, cx=200, cy=60, r=6)
    p.dot(184, 118, 4.5)
    p.dot(216, 118, 4.5)
    p.line('path', 2.5, d='M188,138 Q200,148 212,138')
    p.area('cheek-left', 'circle', 2, cx=176, cy=134, r=7)
    p.area('cheek-right', 'circle', 2, cx=224, cy=134, r=7)
    p.area('skirt-heart', 'path', 3, d=heart(200, 300, 18))
    p.area('skirt-star-left', 'polygon', 3, points=star(155, 330, 14))
    p.area('skirt-star-right', 'polygon', 3, points=star(245, 330, 14))
    return p


def schloss():
    p = Page()
    p.area('hill', 'path', d='M0,350 Q200,320 400,350 L400,400 L0,400 Z')
    p.area('wall', 'rect', x=110, y=190, width=180, height=150)
    p.area('tower-left', 'rect', x=60, y=150, width=60, height=190)
    p.area('tower-right', 'rect', x=280, y=150, width=60, height=190)
    p.area('roof-left', 'path', d='M52,152 L90,70 L128,152 Z')
    p.area('roof-right', 'path', d='M272,152 L310,70 L348,152 Z')
    p.area('tower-middle', 'rect', x=170, y=120, width=60, height=72)
    p.area('roof-middle', 'path', d='M162,122 L200,40 L238,122 Z')
    p.area('flag-left', 'path', 3, d='M90,70 L90,40 L115,48 L90,56')
    p.area('flag-middle', 'path', 3, d='M200,40 L200,12 L225,20 L200,28')
    p.area('flag-right', 'path', 3, d='M310,70 L310,40 L335,48 L310,56')
    p.area('door', 'path', d='M175,340 L175,280 Q200,250 225,280 L225,340 Z')
    p.area('window-left', 'path', 3, d='M78,230 L78,205 Q90,190 102,205 L102,230 Z')
    p.area('window-right', 'path', 3, d='M298,230 L298,205 Q310,190 322,205 L322,230 Z')
    p.area('window-middle', 'circle', 3, cx=200, cy=155, r=16)
    for x in range(120, 290, 30):
        p.line('rect', 3, x=x, y=178, width=16, height=14)
    p.line('line', 3, x1=200, y1=262, x2=200, y2=340)
    return p


def krone():
    p = Page()
    p.area('cushion', 'path', d='M60,320 C60,290 340,290 340,320 C345,350 55,350 60,320 Z')
    p.area('crown', 'path', d='M90,290 L80,130 L140,200 L200,100 L260,200 L320,130 L310,290 Z')
    p.area('band', 'rect', x=88, y=250, width=224, height=40, rx=6)
    p.area('ball-left', 'circle', cx=80, cy=122, r=14)
    p.area('ball-middle', 'circle', cx=200, cy=90, r=16)
    p.area('ball-right', 'circle', cx=320, cy=122, r=14)
    p.area('gem-left', 'ellipse', 3, cx=135, cy=270, rx=16, ry=11)
    p.area('gem-middle', 'path', 3, d='M200,252 L216,270 L200,288 L184,270 Z')
    p.area('gem-right', 'ellipse', 3, cx=265, cy=270, rx=16, ry=11)
    p.area('gem-top', 'path', 3, d='M200,170 L222,200 L200,230 L178,200 Z')
    p.area('heart-left', 'path', 3, d=heart(130, 220, 13))
    p.area('heart-right', 'path', 3, d=heart(270, 220, 13))
    p.area('tassel-left', 'path', 3, d='M70,330 L60,370 L80,370 Z')
    p.area('tassel-right', 'path', 3, d='M330,330 L320,370 L340,370 Z')
    return p


# ---- Eisprinzessin --------------------------------------------------------

def schneemann():
    p = Page()
    p.area('snow', 'path', d='M0,350 Q200,330 400,350 L400,400 L0,400 Z')
    p.area('ball-bottom', 'circle', cx=200, cy=290, r=75)
    p.area('ball-middle', 'circle', cx=200, cy=185, r=55)
    p.area('head', 'circle', cx=200, cy=105, r=40)
    p.area('hat-brim', 'rect', x=150, y=70, width=100, height=12, rx=5)
    p.area('hat', 'rect', x=168, y=20, width=64, height=52, rx=4)
    p.area('hat-band', 'rect', 3, x=168, y=56, width=64, height=12)
    p.area('scarf', 'path', d='M160,135 Q200,152 240,135 L242,150 Q200,168 158,150 Z')
    p.area('scarf-end', 'path', d='M220,150 L238,150 L245,195 L225,198 Z')
    p.area('nose', 'path', 3, d='M200,105 L240,113 L200,118 Z')
    p.dot(185, 95, 5)
    p.dot(215, 95, 5)
    for x in (183, 193, 207, 217):
        p.dot(x, 128 - abs(x - 200) * 0.3, 2.5)
    for i, y in enumerate((175, 205, 235)):
        p.area(f'button-{i + 1}', 'circle', 3, cx=200, cy=y, r=8)
    p.line('path', 4, d='M148,175 L95,140 M110,150 L95,130 M122,158 L105,165')
    p.line('path', 4, d='M252,175 L305,140 M290,150 L305,130 M278,158 L295,165')
    p.area('snowflake-1', 'polygon', 2.5, points=star(60, 60, 18, 0.4, 6))
    p.area('snowflake-2', 'polygon', 2.5, points=star(340, 70, 15, 0.4, 6))
    return p


def schneeflocke():
    p = Page()
    p.area('middle', 'polygon', points=star(200, 200, 40, 0.6, 6, -90))
    for i in range(6):
        a = i * 60 - 90
        p.area(f'arm-{i + 1}', 'path', 3,
               d='M188,160 L188,70 L200,55 L212,70 L212,160 Z', transform=f'rotate({a + 90} 200 200)')
        p.area(f'branch-left-{i + 1}', 'path', 3,
               d='M190,110 L160,85 L168,77 L194,100 Z', transform=f'rotate({a + 90} 200 200)')
        p.area(f'branch-right-{i + 1}', 'path', 3,
               d='M210,110 L240,85 L232,77 L206,100 Z', transform=f'rotate({a + 90} 200 200)')
        p.area(f'tip-{i + 1}', 'circle', 3, cx=200, cy=45, r=10, transform=f'rotate({a + 90} 200 200)')
    p.area('centre', 'circle', 3, cx=200, cy=200, r=16)
    return p


def schlitten():
    p = Page()
    p.area('snow', 'path', d='M0,330 Q200,300 400,330 L400,400 L0,400 Z')
    p.area('runner', 'path', d='M60,300 L320,300 Q360,300 360,270 L372,270 Q372,315 320,315 L60,315 Z')
    p.area('seat', 'rect', x=90, y=220, width=230, height=30, rx=6)
    p.area('back', 'rect', x=90, y=150, width=30, height=72, rx=6)
    for i, x in enumerate((120, 200, 280)):
        p.area(f'post-{i + 1}', 'rect', 3, x=x, y=250, width=16, height=52)
    p.area('present', 'rect', x=180, y=150, width=80, height=70)
    p.area('present-ribbon', 'rect', 3, x=212, y=150, width=16, height=70)
    p.area('bow-left', 'path', 3, d='M220,150 C195,125 185,145 205,152 Z')
    p.area('bow-right', 'path', 3, d='M220,150 C245,125 255,145 235,152 Z')
    p.area('teddy-head', 'circle', cx=290, cy=170, r=26)
    p.area('teddy-ear-left', 'circle', 3, cx=270, cy=148, r=10)
    p.area('teddy-ear-right', 'circle', 3, cx=310, cy=148, r=10)
    p.area('teddy-body', 'ellipse', cx=290, cy=210, rx=24, ry=16)
    p.dot(282, 166, 3.5)
    p.dot(298, 166, 3.5)
    p.line('path', 2.5, d='M284,180 Q290,186 296,180')
    p.area('snowflake-1', 'polygon', 2.5, points=star(70, 70, 20, 0.4, 6))
    p.area('snowflake-2', 'polygon', 2.5, points=star(330, 60, 16, 0.4, 6))
    p.area('snowflake-3', 'polygon', 2.5, points=star(200, 50, 13, 0.4, 6))
    return p


# ---- Feuerwehr ------------------------------------------------------------

def feuerwehrauto():
    p = Page()
    p.area('road', 'rect', x=0, y=330, width=400, height=70)
    p.area('body', 'rect', x=40, y=180, width=230, height=110, rx=8)
    p.area('cab', 'path', d='M270,290 L270,150 L325,150 L365,215 L365,290 Z')
    p.area('window', 'path', 3, d='M282,165 L320,165 L350,212 L282,212 Z')
    p.area('ladder', 'rect', x=55, y=150, width=200, height=22, rx=4)
    for x in range(75, 250, 25):
        p.line('line', 3, x1=x, y1=150, x2=x, y2=172)
    p.area('light', 'rect', 3, x=290, y=132, width=26, height=18, rx=5)
    p.area('door', 'rect', 3, x=280, y=222, width=40, height=55, rx=4)
    p.area('stripe', 'rect', 3, x=40, y=245, width=230, height=16)
    p.area('box-1', 'rect', 3, x=60, y=196, width=60, height=40, rx=4)
    p.area('box-2', 'rect', 3, x=135, y=196, width=60, height=40, rx=4)
    p.area('hose', 'circle', 3, cx=232, cy=216, r=20)
    for i, x in enumerate((95, 215, 320)):
        p.area(f'wheel-{i + 1}', 'circle', cx=x, cy=300, r=32)
        p.area(f'hubcap-{i + 1}', 'circle', 3, cx=x, cy=300, r=12)
    p.area('bumper', 'rect', 3, x=355, y=270, width=22, height=20, rx=4)
    return p


def helm():
    p = Page()
    p.area('brim', 'path', d='M50,270 Q200,330 350,270 L350,295 Q200,355 50,295 Z')
    p.area('shell', 'path', d='M80,275 C70,150 130,80 200,80 C270,80 330,150 320,275 Q200,310 80,275 Z')
    p.area('comb', 'path', d='M185,82 Q200,70 215,82 L218,285 Q200,292 182,285 Z')
    p.area('badge', 'polygon', 3, points=star(200, 190, 40, 0.55, 5))
    p.area('badge-middle', 'circle', 3, cx=200, cy=193, r=16)
    p.area('visor', 'path', 3, d='M110,240 Q200,265 290,240 L285,262 Q200,288 115,262 Z')
    p.area('strap-left', 'path', 3, d='M70,295 L95,355 L110,350 L90,292 Z')
    p.area('strap-right', 'path', 3, d='M330,295 L305,355 L290,350 L310,292 Z')
    p.area('buckle', 'rect', 3, x=180, y=345, width=40, height=22, rx=4)
    p.area('flame-left', 'path', 3, d='M120,170 C100,150 120,125 125,110 C135,130 150,145 130,172 Z')
    p.area('flame-right', 'path', 3, d='M280,170 C300,150 280,125 275,110 C265,130 250,145 270,172 Z')
    return p


def hydrant():
    p = Page()
    p.area('ground', 'rect', x=0, y=350, width=400, height=50)
    p.area('base', 'rect', x=130, y=320, width=140, height=32, rx=6)
    p.area('body', 'path', d='M150,322 L150,150 Q150,130 170,130 L230,130 Q250,130 250,150 L250,322 Z')
    p.area('cap', 'path', d='M145,132 Q145,80 200,78 Q255,80 255,132 Z')
    p.area('top-nut', 'rect', 3, x=188, y=56, width=24, height=24, rx=4)
    p.area('ring', 'rect', 3, x=140, y=180, width=120, height=20, rx=6)
    p.area('outlet-left', 'rect', x=100, y=220, width=52, height=44, rx=8)
    p.area('outlet-right', 'rect', x=248, y=220, width=52, height=44, rx=8)
    p.area('outlet-left-cap', 'circle', 3, cx=104, cy=242, r=16)
    p.area('outlet-right-cap', 'circle', 3, cx=296, cy=242, r=16)
    p.area('front-cap', 'circle', 3, cx=200, cy=255, r=24)
    p.area('drop-1', 'path', 3, d='M60,150 C45,175 75,175 60,150 Z')
    p.area('drop-2', 'path', 3, d='M340,170 C325,195 355,195 340,170 Z')
    p.area('drop-3', 'path', 3, d='M75,250 C60,275 90,275 75,250 Z')
    return p


# ---- Ballett --------------------------------------------------------------

def ballerina():
    p = Page()
    p.area('stage', 'path', d='M0,360 L400,360 L400,400 L0,400 Z')
    p.area('leg-left', 'path', d='M185,250 L170,345 L184,347 L198,252 Z')
    p.area('leg-right', 'path', d='M215,250 L250,330 L263,324 L228,246 Z')
    p.area('shoe-left', 'ellipse', 3, cx=176, cy=350, rx=14, ry=8)
    p.area('shoe-right', 'ellipse', 3, cx=260, cy=334, rx=14, ry=8, transform='rotate(-30 260 334)')
    p.area('tutu', 'path', d='M120,250 Q140,215 170,215 L230,215 Q260,215 280,250 '
                             'Q265,262 250,255 Q235,268 215,258 Q200,270 185,258 Q165,268 150,255 Q135,262 120,250 Z')
    p.area('top', 'path', d='M178,150 L222,150 L230,218 L170,218 Z')
    p.area('arm-left', 'path', d='M180,155 C150,140 125,110 120,80 L134,76 C142,105 165,128 188,140 Z')
    p.area('arm-right', 'path', d='M220,155 C250,140 275,110 280,80 L266,76 C258,105 235,128 212,140 Z')
    p.area('hand-left', 'circle', 3, cx=125, cy=72, r=10)
    p.area('hand-right', 'circle', 3, cx=275, cy=72, r=10)
    p.area('neck', 'rect', 3, x=192, y=128, width=16, height=24)
    p.area('face', 'ellipse', cx=200, cy=105, rx=30, ry=33)
    p.area('hair', 'path', d='M170,98 C168,65 232,65 230,98 C220,85 180,85 170,98 Z')
    p.area('bun', 'circle', cx=200, cy=62, r=16)
    p.area('bow', 'path', 3, d='M186,72 L176,64 L176,80 Z M214,72 L224,64 L224,80 Z')
    p.dot(189, 105, 3.5)
    p.dot(211, 105, 3.5)
    p.line('path', 2.5, d='M192,120 Q200,127 208,120')
    p.area('star-left', 'polygon', 3, points=star(60, 120, 20))
    p.area('star-right', 'polygon', 3, points=star(340, 120, 20))
    return p


def slipper(p, side, dx, dy):
    """A ballet slipper seen from the side: toe left, opening at the heel, ribbons crossing up."""
    t = f'translate({dx} {dy})'
    p.area(f'ribbon-{side}-1', 'path', 3, d='M172,250 L226,110 L238,114 L186,252 Z', transform=t)
    p.area(f'ribbon-{side}-2', 'path', 3, d='M226,246 L150,104 L161,98 L240,244 Z', transform=t)
    p.area(f'shoe-{side}', 'path', d='M40,285 C40,262 70,250 110,248 L230,238 C258,238 270,262 262,285 '
                                    'C258,300 240,305 220,305 L70,305 C50,305 40,298 40,285 Z', transform=t)
    p.area(f'toe-{side}', 'path', 3, d='M40,285 C40,262 70,250 105,249 C95,262 92,292 100,305 '
                                       'L70,305 C50,305 40,298 40,285 Z', transform=t)
    p.area(f'opening-{side}', 'path', 3, d='M140,250 C170,236 235,232 254,246 C236,262 170,262 140,250 Z', transform=t)
    p.area(f'bow-{side}', 'path', 3, d='M198,250 C180,232 168,256 194,258 Z M202,250 C220,232 232,256 206,258 Z', transform=t)


def ballettschuhe():
    p = Page()
    p.area('floor', 'path', d='M0,330 L400,330 L400,400 L0,400 Z')
    slipper(p, 'back', 110, -40)
    slipper(p, 'front', 10, 25)
    p.area('heart', 'path', 3, d=heart(340, 365, 20))
    p.area('star', 'polygon', 3, points=star(60, 80, 22))
    return p


def blume():
    p = Page()
    p.area('pot', 'path', d='M130,300 L270,300 L250,385 L150,385 Z')
    p.area('pot-rim', 'rect', x=120, y=285, width=160, height=25, rx=6)
    p.area('stem', 'path', d='M195,285 L195,170 L205,170 L205,285 Z')
    p.area('leaf-left', 'path', d='M195,250 C160,250 140,225 140,210 C165,210 190,225 195,245 Z')
    p.area('leaf-right', 'path', d='M205,225 C240,225 262,200 262,185 C235,185 210,200 205,220 Z')
    flower(p, 'flower', 200, 120, 48, 6)
    p.area('butterfly-left', 'ellipse', 3, cx=322, cy=70, rx=18, ry=24, transform='rotate(-20 322 70)')
    p.area('butterfly-right', 'ellipse', 3, cx=352, cy=70, rx=18, ry=24, transform='rotate(20 352 70)')
    p.area('butterfly-body', 'ellipse', 3, cx=337, cy=74, rx=5, ry=20)
    p.area('bee-wing', 'ellipse', 3, cx=70, cy=95, rx=14, ry=10)
    p.area('bee', 'ellipse', 3, cx=70, cy=118, rx=22, ry=15)
    p.line('path', 3, d='M64,104 L64,132 M76,104 L76,132')
    return p


# ---- Musik ----------------------------------------------------------------

def gitarre():
    p = Page()
    p.area('neck', 'rect', x=186, y=60, width=28, height=170)
    p.area('head', 'path', d='M180,62 L178,20 Q200,8 222,20 L220,62 Z')
    for i, y in enumerate((30, 45)):
        p.area(f'peg-left-{i + 1}', 'circle', 2.5, cx=170, cy=y, r=7)
        p.area(f'peg-right-{i + 1}', 'circle', 2.5, cx=230, cy=y, r=7)
    p.area('body', 'path', d='M200,200 C150,190 115,220 125,262 C132,290 100,310 110,345 '
                             'C125,390 275,390 290,345 C300,310 268,290 275,262 C285,220 250,190 200,200 Z')
    p.area('hole', 'circle', cx=200, cy=275, r=28)
    p.area('bridge', 'rect', 3, x=168, y=328, width=64, height=14, rx=4)
    for x in (192, 200, 208):
        p.line('line', 1.5, x1=x, y1=62, x2=x, y2=330)
    p.area('note-1', 'path', 3, d='M60,150 L60,90 L90,80 L90,140 M60,150 m-14,0 a14,10 0 1,0 28,0 a14,10 0 1,0 -28,0 '
                                 'M90,140 m-14,0 a14,10 0 1,0 28,0 a14,10 0 1,0 -28,0')
    p.area('note-2', 'path', 3, d='M330,120 L330,60 L350,75 M330,120 m-14,0 a14,10 0 1,0 28,0 a14,10 0 1,0 -28,0')
    p.area('star', 'polygon', 3, points=star(330, 330, 22))
    return p


def trommel():
    p = Page()
    p.area('shell', 'path', d='M90,170 L90,300 Q200,350 310,300 L310,170 Z')
    p.area('top', 'ellipse', cx=200, cy=170, rx=110, ry=36)
    p.area('rim-bottom', 'path', d='M90,290 Q200,340 310,290 L310,308 Q200,358 90,308 Z')
    for i, (x1, x2) in enumerate(((90, 145), (145, 200), (200, 255), (255, 310))):
        p.area(f'zigzag-{i + 1}', 'path', 3, d=f'M{x1},210 L{(x1 + x2) / 2},280 L{x2},210 Z')
    p.area('stick-left', 'path', 3, d='M60,60 L170,150 L162,160 L52,70 Z')
    p.area('stick-right', 'path', 3, d='M340,60 L230,150 L238,160 L348,70 Z')
    p.area('stick-tip-left', 'circle', 3, cx=172, cy=152, r=11)
    p.area('stick-tip-right', 'circle', 3, cx=228, cy=152, r=11)
    p.area('note', 'path', 3, d='M60,250 L60,190 L80,205 M60,250 m-14,0 a14,10 0 1,0 28,0 a14,10 0 1,0 -28,0')
    p.area('star', 'polygon', 3, points=star(345, 250, 20))
    return p


def klavier():
    p = Page()
    p.area('top', 'path', d='M50,120 L350,120 L350,150 L50,150 Z')
    p.area('front', 'rect', x=50, y=150, width=300, height=70)
    p.area('music-stand', 'path', d='M120,120 L130,60 L270,60 L280,120 Z')
    p.area('sheet', 'rect', 3, x=150, y=70, width=100, height=45)
    for y in (82, 92, 102):
        p.line('line', 1.5, x1=158, y1=y, x2=242, y2=y)
    for i, x in enumerate(range(50, 350, 30)):
        p.area(f'white-key-{i + 1}', 'rect', 3, x=x, y=220, width=30, height=90)
    for i, x in enumerate((70, 100, 160, 190, 220, 280, 310)):
        p.area(f'black-key-{i + 1}', 'rect', 3, x=x + 2, y=220, width=16, height=52)
    p.area('leg-left', 'rect', x=60, y=310, width=22, height=70)
    p.area('leg-right', 'rect', x=318, y=310, width=22, height=70)
    p.area('pedal', 'rect', 3, x=185, y=360, width=30, height=12, rx=4)
    p.area('note', 'path', 3, d='M40,90 L40,40 L62,52 M40,90 m-12,0 a12,9 0 1,0 24,0 a12,9 0 1,0 -24,0')
    return p


THEMES = {
    'einhorn': ('Einhorn', 'Male das Einhorn-Land an! Wähle eine Farbe und tippe auf das Bild.', [
        ('einhorn', einhorn, 'Einhorn', 'Das Einhorn', '🦄'),
        ('regenbogen', regenbogen, 'Regenbogen', 'Der Regenbogen', '🌈'),
        ('cupcake', cupcake, 'Cupcake', 'Der Cupcake', '🧁'),
    ]),
    'prinzessin': ('Prinzessin', 'Male das Prinzessinnen-Reich an!', [
        ('prinzessin', prinzessin, 'Prinzessin', 'Die Prinzessin', '👸'),
        ('schloss', schloss, 'Schloss', 'Das Schloss', '🏰'),
        ('krone', krone, 'Krone', 'Die Krone', '👑'),
    ]),
    'eisprinzessin': ('Eisprinzessin', 'Male die Winterwelt an!', [
        ('schneemann', schneemann, 'Schneemann', 'Der Schneemann', '⛄'),
        ('schneeflocke', schneeflocke, 'Schneeflocke', 'Die Schneeflocke', '❄️'),
        ('schlitten', schlitten, 'Schlitten', 'Der Schlitten', '🛷'),
    ]),
    'feuerwehr': ('Feuerwehr', 'Male die Feuerwehr an! Tatü tata!', [
        ('feuerwehrauto', feuerwehrauto, 'Feuerwehrauto', 'Das Feuerwehrauto', '🚒'),
        ('helm', helm, 'Helm', 'Der Feuerwehrhelm', '⛑️'),
        ('hydrant', hydrant, 'Hydrant', 'Der Hydrant', '🧯'),
    ]),
    'ballett': ('Ballett', 'Male die Ballett-Bilder an!', [
        ('ballerina', ballerina, 'Ballerina', 'Die Ballerina', '💃'),
        ('ballettschuhe', ballettschuhe, 'Ballettschuhe', 'Die Ballettschuhe', '🩰'),
        ('blume', blume, 'Blume', 'Die Blume', '🌸'),
    ]),
    'musik': ('Musik', 'Male die Musik-Bilder an!', [
        ('gitarre', gitarre, 'Gitarre', 'Die Gitarre', '🎸'),
        ('trommel', trommel, 'Trommel', 'Die Trommel', '🥁'),
        ('klavier', klavier, 'Klavier', 'Das Klavier', '🎹'),
    ]),
}


def main():
    for theme_id, (name, tts, pages) in THEMES.items():
        folder = ROOT / theme_id
        (folder / 'svgs').mkdir(parents=True, exist_ok=True)
        entries = []
        for page_id, draw, label, say, icon in pages:
            (folder / 'svgs' / f'{page_id}.svg').write_text(draw().svg())
            entries.append({'id': page_id, 'svg': f'svgs/{page_id}.svg', 'label': label, 'icon': icon, 'tts': say})
        (folder / 'theme.json').write_text(json.dumps({'name': name, 'tts': tts, 'pages': entries},
                                                      ensure_ascii=False, indent=2) + '\n')
        print(f'{theme_id}: {len(pages)} pages')


if __name__ == '__main__':
    main()
