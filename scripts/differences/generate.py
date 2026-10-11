"""Generate the spot-the-difference scenes (scene.svg + theme.json per theme).

    python3 scripts/differences/generate.py [OUT_DIR]

OUT_DIR defaults to public/content/differences. Then verify the result:

    google-chrome --headless=new --allow-file-access-from-files \
      --virtual-time-budget=30000 --dump-dom \
      "file://$PWD/scripts/differences/check.html#file://$PWD/public/content/differences" \
      | grep -A20 RESULT

A scene is an ordered list of items. A plain string is drawn as-is. A D is a
candidate difference: `orig` is drawn in the original, each variant is an
alternative the game may swap in (see buildRound in src/logic/differences.js).
The hotspot (cx, cy, r) in 800x600 units must cover the original and every
variant, and hotspots within a scene must not overlap — the script asserts the
latter, check.html verifies the former by pixel-diffing every variant.
"""
import json, math, os, sys, random
from pathlib import Path

ROOT = sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public/content/differences'
TTS = 'Finde die 10 Unterschiede! Tippe auf die Unterschiede in einem der Bilder.'


class D:
    def __init__(self, key, cx, cy, r, orig, *variants):
        self.key, self.cx, self.cy, self.r, self.orig, self.variants = key, cx, cy, r, orig, variants

    def svg(self):
        parts = [f'<g data-variant="orig">{self.orig}</g>']
        for i, (body, label) in enumerate(self.variants):
            parts.append(f'<g data-variant="v{i + 1}" data-label="{label}" display="none">{body}</g>')
        return (f'<g data-diff="{self.key}" data-cx="{self.cx}" data-cy="{self.cy}" data-r="{self.r}">\n    '
                + '\n    '.join(parts) + '\n  </g>')


def star(cx, cy, ro, ri, fill, n=5):
    pts = []
    for i in range(n * 2):
        a = -math.pi / 2 + i * math.pi / n
        rad = ro if i % 2 == 0 else ri
        pts.append(f'{cx + rad * math.cos(a):.1f},{cy + rad * math.sin(a):.1f}')
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"/>'


def flower(x, y, petal):
    return (f'<rect x="{x - 3}" y="{y + 5}" width="6" height="35" fill="#2E7D32"/>'
            + ''.join(f'<circle cx="{x + dx}" cy="{y + dy}" r="11" fill="{petal}"/>' for dx, dy in ((0, -13), (0, 13), (-13, 0), (13, 0)))
            + f'<circle cx="{x}" cy="{y}" r="8" fill="#FFD93D"/>')


# ── Bauernhof ───────────────────────────────────────────────────────────
def cow(c):
    return (f'<rect x="380" y="450" width="80" height="50" fill="{c}"/>'
            '<rect x="380" y="450" width="30" height="20" fill="#333"/>'
            + ''.join(f'<rect x="{x}" y="495" width="12" height="25" fill="{c}"/>' for x in (390, 415, 438))
            + f'<ellipse cx="360" cy="470" rx="30" ry="20" fill="{c}"/>'
            '<circle cx="348" cy="463" r="4" fill="#333"/>')


def pig(spots):
    s = (''.join(f'<rect x="{x}" y="505" width="8" height="15" fill="#FFA0B4"/>' for x in (555, 585))
         + '<ellipse cx="575" cy="495" rx="30" ry="20" fill="#FFB6C1"/>'
         '<path d="M604,490 q8,-6 4,4" stroke="#FF8FA8" stroke-width="2" fill="none"/>'
         '<circle cx="545" cy="488" r="15" fill="#FFB6C1"/>'
         '<polygon points="540,474 548,468 552,478" fill="#FF8FA8"/>'
         '<ellipse cx="533" cy="492" rx="6" ry="5" fill="#FF8FA8"/>'
         '<circle cx="543" cy="483" r="2" fill="#333"/>')
    if spots:
        s += ''.join(f'<circle cx="{x}" cy="{y}" r="6" fill="#8B5A2B"/>' for x, y in ((570, 488), (588, 500), (560, 503)))
    return s


def hen(c):
    return ('<line x1="700" y1="536" x2="698" y2="548" stroke="#E0A800" stroke-width="3"/>'
            '<line x1="710" y1="536" x2="712" y2="548" stroke="#E0A800" stroke-width="3"/>'
            f'<ellipse cx="705" cy="525" rx="18" ry="14" fill="{c}"/>'
            f'<circle cx="718" cy="510" r="8" fill="{c}"/>'
            '<path d="M713,503 q2,-8 5,-2 q3,-8 5,2 Z" fill="#E74C3C"/>'
            '<polygon points="725,509 732,512 725,514" fill="#FF9A3C"/>'
            '<circle cx="720" cy="508" r="1.6" fill="#333"/>')


def duck(c):
    return (f'<ellipse cx="235" cy="557" rx="16" ry="10" fill="{c}"/>'
            f'<circle cx="250" cy="546" r="8" fill="{c}"/>'
            '<polygon points="257,545 265,548 257,550" fill="#FF9A3C"/>'
            '<circle cx="252" cy="544" r="1.6" fill="#333"/>')


def barn_door(c):
    return (f'<rect x="210" y="320" width="80" height="80" fill="{c}"/>'
            '<path d="M210,320 L290,400 M290,320 L210,400" stroke="#F5DEB3" stroke-width="4"/>')


def house_door(c):
    return f'<rect x="510" y="330" width="60" height="70" fill="{c}"/><circle cx="560" cy="368" r="4" fill="#FFD93D"/>'


def house_window(x, fill):
    return (f'<rect x="{x - 15}" y="273" width="30" height="30" fill="{fill}" stroke="white" stroke-width="3"/>'
            f'<path d="M{x},273 V303 M{x - 15},288 H{x + 15}" stroke="white" stroke-width="2"/>')


APPLES = ''.join(f'<circle cx="{x}" cy="{y}" r="7" fill="#E74C3C"/>' for x, y in ((702, 330), (735, 345), (722, 318)))

BAUERNHOF = [
    '<rect width="800" height="600" fill="#87CEEB"/>',
    '<rect x="0" y="400" width="800" height="200" fill="#6BCB77"/>',
    '<ellipse cx="200" cy="80" rx="70" ry="35" fill="white"/><ellipse cx="240" cy="65" rx="50" ry="30" fill="white"/><ellipse cx="160" cy="70" rx="45" ry="28" fill="white"/>',
    D('sun', 680, 78, 58, '<circle cx="680" cy="80" r="50" fill="#FFD93D"/>',
      ('<circle cx="680" cy="80" r="50" fill="#FF6B6B"/>', 'Die Sonne ist rot!'),
      ('', 'Die Sonne fehlt!')),
    D('cloud', 417, 75, 60, '',
      ('<ellipse cx="410" cy="82" rx="50" ry="24" fill="white"/><ellipse cx="440" cy="68" rx="34" ry="20" fill="white"/>', 'Da ist eine neue Wolke!')),
    D('bird', 560, 140, 28, '<path d="M545,142 Q552,130 560,140 Q568,130 575,142" stroke="#333" stroke-width="3" fill="none"/>',
      ('<path d="M545,142 Q552,130 560,140 Q568,130 575,142" stroke="#E74C3C" stroke-width="3" fill="none"/>', 'Der Vogel ist rot!'),
      ('', 'Der Vogel ist weggeflogen!')),
    # Barn
    '<rect x="150" y="200" width="200" height="200" fill="#FF6B6B"/>',
    '<polygon points="150,200 250,100 350,200" fill="#CC3333"/>',
    D('gable', 250, 160, 28, '<circle cx="250" cy="160" r="18" fill="#FFD93D" stroke="#8B4513" stroke-width="3"/>',
      ('<circle cx="250" cy="160" r="18" fill="#4D96FF" stroke="#8B4513" stroke-width="3"/>', 'Das runde Fenster ist blau!'),
      ('', 'Das runde Fenster fehlt!')),
    D('barnwin', 250, 262, 33, '',
      ('<rect x="230" y="242" width="40" height="40" fill="#87CEEB" stroke="#8B4513" stroke-width="3"/>', 'Die Scheune hat ein neues Fenster!')),
    D('barndoor', 250, 360, 58, barn_door('#8B4513'),
      (barn_door('#2E8B57'), 'Das Scheunentor ist grün!'),
      (barn_door('#4D96FF'), 'Das Scheunentor ist blau!')),
    # House
    D('chimney', 598, 205, 30, '<rect x="588" y="183" width="20" height="43" fill="#8B4513"/>',
      ('<rect x="588" y="183" width="20" height="43" fill="#E74C3C"/>', 'Der Kamin ist rot!'),
      ('', 'Der Kamin fehlt!')),
    '<rect x="450" y="250" width="180" height="150" fill="#FFD93D"/>',
    '<polygon points="450,250 540,170 630,250" fill="#FFA500"/>',
    house_window(600, '#A8E6FF'),
    D('housewin', 480, 288, 28, house_window(480, '#A8E6FF'),
      (house_window(480, '#FF8FC8'), 'Das Fenster ist rosa!'),
      ('', 'Ein Fenster fehlt!')),
    D('housedoor', 540, 365, 48, house_door('#8B4513'),
      (house_door('#E74C3C'), 'Die Haustür ist rot!'),
      (house_door('#4D96FF'), 'Die Haustür ist blau!')),
    # Trees
    '<rect x="80" y="350" width="20" height="60" fill="#8B4513"/>',
    D('treeL', 90, 325, 48, '<circle cx="90" cy="330" r="40" fill="#228B22"/>',
      ('', 'Die Baumkrone fehlt!'),
      ('<circle cx="90" cy="330" r="40" fill="#FFD93D"/>', 'Der Baum ist gelb!')),
    '<rect x="710" y="360" width="20" height="50" fill="#8B4513"/>',
    D('treeR', 720, 335, 45, '<circle cx="720" cy="340" r="35" fill="#228B22"/>',
      ('<circle cx="720" cy="340" r="35" fill="#228B22"/>' + APPLES, 'Am Baum hängen Äpfel!'),
      ('', 'Die Baumkrone fehlt!')),
    # Fence
    '<rect x="0" y="390" width="800" height="10" fill="#DEB887"/>',
    *[f'<rect x="{x}" y="360" width="10" height="40" fill="#DEB887"/>' for x in (100, 200, 300, 500, 600, 700)],
    D('post', 405, 380, 28, '<rect x="400" y="360" width="10" height="40" fill="#DEB887"/>',
      ('', 'Ein Zaunpfahl fehlt!')),
    # Meadow
    '<ellipse cx="240" cy="565" rx="70" ry="18" fill="#4D96FF"/>',
    D('duck', 242, 552, 28, duck('#FFD93D'),
      ('', 'Die Ente fehlt!'),
      (duck('white'), 'Die Ente ist weiss!')),
    D('flower', 150, 520, 35, '', (flower(150, 512, '#FF6BB5'), 'Da wächst eine Blume!')),
    D('cow', 395, 485, 75, cow('white'),
      (cow('#FF9A3C'), 'Die Kuh ist orange!'),
      (cow('#A0522D'), 'Die Kuh ist braun!')),
    D('pig', 568, 495, 45, pig(False),
      ('', 'Das Schwein fehlt!'),
      (pig(True), 'Das Schwein ist schmutzig!')),
    D('hen', 708, 522, 32, hen('white'),
      ('', 'Das Huhn fehlt!'),
      (hen('#A0522D'), 'Das Huhn ist braun!')),
]


# ── Meer ────────────────────────────────────────────────────────────────
def fish_big(color):
    return (f'<polygon points="195,200 160,172 160,228" fill="{color}"/>'
            f'<ellipse cx="250" cy="200" rx="55" ry="32" fill="{color}"/>'
            '<path d="M235,172 Q240,200 235,228" stroke="white" stroke-width="5" fill="none" opacity="0.6"/>'
            '<circle cx="280" cy="192" r="7" fill="white"/><circle cx="282" cy="192" r="3.5" fill="#222"/>')


def fish_little(color):
    return (f'<polygon points="128,320 145,308 145,332" fill="{color}"/>'
            f'<ellipse cx="108" cy="320" rx="24" ry="14" fill="{color}"/>'
            '<circle cx="96" cy="316" r="3" fill="#222"/>')


def jelly(color):
    t = ''.join(f'<path d="M{x},182 Q{x - 6},200 {x},215 Q{x + 6},228 {x},238" stroke="{color}" stroke-width="4" fill="none" stroke-linecap="round"/>'
                for x in (658, 672, 688, 702))
    return f'<path d="M648,184 A32,32 0 0 1 712,184 Z" fill="{color}"/>' + t


def turtle(shell):
    return ('<ellipse cx="380" cy="318" rx="10" ry="6" fill="#7ED957" transform="rotate(-30 380 318)"/>'
            '<ellipse cx="380" cy="344" rx="10" ry="6" fill="#7ED957" transform="rotate(30 380 344)"/>'
            '<ellipse cx="465" cy="318" rx="10" ry="6" fill="#7ED957" transform="rotate(30 465 318)"/>'
            '<ellipse cx="465" cy="344" rx="10" ry="6" fill="#7ED957" transform="rotate(-30 465 344)"/>'
            '<circle cx="472" cy="331" r="11" fill="#7ED957"/><circle cx="476" cy="328" r="2" fill="#222"/>'
            f'<ellipse cx="420" cy="331" rx="40" ry="25" fill="{shell}"/>'
            '<path d="M400,312 L420,331 L440,312 M400,350 L420,331 L440,350" stroke="#1E5E35" stroke-width="3" fill="none"/>')


def seaweed(x, y0=505, h=100):
    q = h / 4
    return (f'<path d="M{x},{y0} Q{x - 20},{y0 - q} {x},{y0 - 2 * q} Q{x + 20},{y0 - 3 * q} {x},{y0 - h}" '
            'stroke="#2E8B57" stroke-width="14" fill="none" stroke-linecap="round"/>')


def sail(c):
    return f'<polygon points="606,10 606,46 650,46" fill="{c}"/>'


def shell(c, line):
    return (f'<path d="M535,578 Q560,525 585,578 Z" fill="{c}"/>'
            f'<path d="M560,578 L560,540 M547,578 L552,545 M573,578 L568,545" stroke="{line}" stroke-width="2"/>')


COINS = ''.join(f'<circle cx="{x}" cy="{y}" r="9" fill="#FFD93D" stroke="#E0A800" stroke-width="2"/>'
                for x, y in ((745, 545), (763, 548), (754, 533)))
ANCHOR = ('<path d="M255,525 V575 M240,535 H270 M232,560 Q255,585 278,560" stroke="#555" stroke-width="6" fill="none" stroke-linecap="round"/>'
          '<circle cx="255" cy="522" r="6" fill="none" stroke="#555" stroke-width="4"/>')

MEER = [
    '<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD3F7"/><stop offset="1" stop-color="#1E6FA8"/></linearGradient></defs>',
    '<rect width="800" height="600" fill="url(#w)"/>',
    '<rect width="800" height="62" fill="#CDEFFF"/>',
    '<path d="M0,62 Q25,52 50,62 T100,62 T150,62 T200,62 T250,62 T300,62 T350,62 T400,62 T450,62 T500,62 T550,62 T600,62 T650,62 T700,62 T750,62 T800,62 V70 H0 Z" fill="#7FD3F7"/>',
    '<path d="M0,505 Q100,480 200,500 T400,498 T600,502 T800,495 V600 H0 Z" fill="#F4D58D"/>',
    seaweed(80), seaweed(300, 510, 120),
    '<rect x="598" y="6" width="5" height="46" fill="#5D4037"/>',
    D('sail', 625, 30, 40, sail('white'),
      (sail('#FF6B6B'), 'Das Segel ist rot!'),
      (sail('#6BCB77'), 'Das Segel ist grün!')),
    '<polygon points="545,50 665,50 645,74 565,74" fill="#8B4513"/>',
    D('fish', 230, 200, 78, fish_big('#FF9A3C'),
      (fish_big('#9B59B6'), 'Der grosse Fisch ist lila!'),
      (fish_big('#4D96FF'), 'Der grosse Fisch ist blau!'),
      ('', 'Der grosse Fisch ist weg!')),
    D('littlefish', 115, 320, 36, fish_little('#4D96FF'),
      (fish_little('#FF8FC8'), 'Der kleine Fisch ist rosa!'),
      ('', 'Der kleine Fisch ist weg!')),
    '<circle cx="350" cy="120" r="7" fill="none" stroke="white" stroke-width="2"/>',
    '<circle cx="335" cy="95" r="5" fill="none" stroke="white" stroke-width="2"/>',
    D('bubble', 340, 150, 30, '<circle cx="340" cy="150" r="11" fill="none" stroke="white" stroke-width="3"/>',
      ('', 'Eine Blase fehlt!')),
    '<ellipse cx="560" cy="300" rx="35" ry="20" fill="#FFD93D"/>',
    '<circle cx="540" cy="295" r="5" fill="white"/><circle cx="539" cy="295" r="2.5" fill="#222"/>',
    D('tail', 607, 300, 30, '<polygon points="593,300 622,282 622,318" fill="#FFD93D"/>',
      ('<polygon points="593,300 622,282 622,318" fill="#6BCB77"/>', 'Die Schwanzflosse ist grün!'),
      ('<polygon points="593,300 622,282 622,318" fill="#FF6B6B"/>', 'Die Schwanzflosse ist rot!')),
    D('jelly', 680, 198, 52, jelly('#FF8FC8'),
      (jelly('#7ED957'), 'Die Qualle ist grün!'),
      ('', 'Die Qualle ist weg!')),
    D('turtle', 425, 331, 62, turtle('#2E8B57'),
      (turtle('#FF9A3C'), 'Die Schildkröte ist orange!'),
      ('', 'Die Schildkröte ist weg!')),
    D('starfish', 150, 545, 38, star(150, 545, 30, 13, '#FFD93D'),
      (star(150, 545, 30, 13, '#FF6B6B'), 'Der Seestern ist rot!'),
      ('', 'Der Seestern fehlt!')),
    D('anchor', 255, 550, 38, ANCHOR, ('', 'Der Anker fehlt!')),
    # Crab (left claw shared, right claw is the difference)
    ''.join(f'<line x1="{x}" y1="545" x2="{x + d}" y2="568" stroke="#C0392B" stroke-width="4"/>'
            for x, d in ((375, -12), (388, -8), (412, 8), (425, 12))),
    '<line x1="388" y1="525" x2="384" y2="505" stroke="#C0392B" stroke-width="3"/><line x1="412" y1="525" x2="416" y2="505" stroke="#C0392B" stroke-width="3"/>',
    '<circle cx="384" cy="503" r="5" fill="white"/><circle cx="384" cy="503" r="2.5" fill="#222"/><circle cx="416" cy="503" r="5" fill="white"/><circle cx="416" cy="503" r="2.5" fill="#222"/>',
    '<ellipse cx="400" cy="540" rx="35" ry="20" fill="#E74C3C"/>',
    '<line x1="368" y1="535" x2="356" y2="528" stroke="#C0392B" stroke-width="5"/><circle cx="352" cy="524" r="12" fill="#E74C3C"/>',
    D('claw', 445, 527, 30, '<line x1="432" y1="535" x2="444" y2="528" stroke="#C0392B" stroke-width="5"/><circle cx="448" cy="524" r="12" fill="#E74C3C"/>',
      ('', 'Der Krabbe fehlt eine Schere!')),
    D('seaweed', 520, 455, 58, '', (seaweed(520), 'Da ist eine neue Pflanze!')),
    D('shell', 560, 558, 35, shell('#FFC0CB', '#E89AAE'),
      ('', 'Die Muschel fehlt!'),
      (shell('#B39DDB', '#7E57C2'), 'Die Muschel ist lila!')),
    '<rect x="640" y="490" width="80" height="50" fill="#8B5A2B"/>',
    '<rect x="636" y="476" width="88" height="18" rx="5" fill="#6B3E1B"/>',
    D('lock', 680, 505, 25, '<rect x="673" y="497" width="14" height="16" fill="#FFD93D"/>',
      ('<rect x="673" y="497" width="14" height="16" fill="#E74C3C"/>', 'Das Schloss ist rot!'),
      ('', 'Das Schloss fehlt!')),
    D('coins', 754, 542, 32, '', (COINS, 'Da liegen Goldmünzen!')),
]


# ── Weltraum ────────────────────────────────────────────────────────────
def ring(color):
    return f'<ellipse cx="180" cy="170" rx="95" ry="20" fill="none" stroke="{color}" stroke-width="8" transform="rotate(-15 180 170)"/>'


def rocket_window(color):
    return f'<circle cx="400" cy="300" r="13" fill="{color}" stroke="#9E9E9E" stroke-width="4"/>'


def flame(c1, c2):
    return (f'<polygon points="383,382 400,430 417,382" fill="{c1}"/>'
            f'<polygon points="391,382 400,410 409,382" fill="{c2}"/>')


def ufo(alien, lights):
    return (f'<circle cx="620" cy="305" r="9" fill="{alien}"/><circle cx="617" cy="303" r="2" fill="#222"/><circle cx="623" cy="303" r="2" fill="#222"/>'
            '<ellipse cx="620" cy="327" rx="70" ry="18" fill="#9E9E9E"/>'
            + ''.join(f'<circle cx="{x}" cy="330" r="5" fill="{lights}"/>' for x in (575, 597, 620, 643, 665)))


def panels(left, right):
    s = f'<rect x="680" y="244" width="28" height="12" fill="{left}"/>'
    if right:
        s += f'<rect x="732" y="244" width="28" height="12" fill="{right}"/>'
    return s


def visor(c):
    return f'<ellipse cx="155" cy="400" rx="18" ry="13" fill="{c}"/>'


ASTEROID = ('<polygon points="270,510 290,490 320,495 335,520 320,548 285,550 268,532" fill="#8D8D8D"/>'
            '<circle cx="295" cy="515" r="7" fill="#6D6D6D"/><circle cx="315" cy="532" r="5" fill="#6D6D6D"/>')

rnd = random.Random(7)
STARS = ''.join(f'<circle cx="{rnd.randint(5, 795)}" cy="{rnd.randint(5, 595)}" r="{rnd.choice((1.2, 1.6, 2.2))}" fill="white" opacity="0.8"/>'
                for _ in range(90))

WELTRAUM = [
    '<rect width="800" height="600" fill="#0B1D3A"/>',
    STARS,
    '<circle cx="180" cy="170" r="60" fill="#FF9A3C"/>',
    '<path d="M125,150 Q180,140 235,150" stroke="#E07B1A" stroke-width="8" fill="none"/>',
    '<path d="M122,185 Q180,195 238,185" stroke="#E07B1A" stroke-width="8" fill="none"/>',
    D('ring', 180, 170, 100, ring('#FFD93D'),
      (ring('#6BCB77'), 'Der Ring ist grün!'),
      ('', 'Der Ring fehlt!')),
    D('planet', 320, 90, 32, '',
      ('<circle cx="320" cy="90" r="22" fill="#6BCB77"/><path d="M300,84 Q320,78 340,84" stroke="#3E9E4F" stroke-width="5" fill="none"/>', 'Da ist ein neuer Planet!')),
    D('star', 500, 120, 30, star(500, 120, 20, 8, '#FFD93D'),
      ('', 'Ein Stern fehlt!'),
      (star(500, 120, 20, 8, '#FF6B6B'), 'Ein Stern ist rot!')),
    D('newstar', 720, 470, 30, '', (star(720, 470, 20, 8, '#FFD93D'), 'Da ist ein neuer Stern!')),
    '<circle cx="650" cy="120" r="55" fill="#E0E0E0"/>',
    '<circle cx="660" cy="92" r="6" fill="#BDBDBD"/>',
    D('crater2', 628, 104, 20, '<circle cx="628" cy="104" r="10" fill="#BDBDBD"/>', ('', 'Ein kleiner Krater fehlt!')),
    D('crater', 672, 138, 30, '<circle cx="672" cy="138" r="14" fill="#BDBDBD"/>', ('', 'Ein Krater fehlt!')),
    '<rect x="710" y="240" width="20" height="20" fill="#9E9E9E"/>',
    D('satellite', 720, 250, 45, panels('#4D96FF', '#4D96FF'),
      (panels('#4D96FF', None), 'Dem Satelliten fehlt ein Flügel!'),
      (panels('#E74C3C', '#E74C3C'), 'Die Flügel sind rot!')),
    # Rocket
    '<polygon points="375,350 352,392 375,380" fill="#FF6B6B"/><polygon points="425,350 448,392 425,380" fill="#FF6B6B"/>',
    '<rect x="375" y="258" width="50" height="124" rx="6" fill="#F5F5F5"/>',
    '<polygon points="375,262 400,212 425,262" fill="#FF6B6B"/>',
    D('window', 400, 300, 28, rocket_window('#4D96FF'),
      (rocket_window('#FFD93D'), 'Das Fenster ist gelb!'),
      (rocket_window('#FF6B6B'), 'Das Fenster ist rot!')),
    D('flame', 400, 405, 32, flame('#FF9A3C', '#FFD93D'),
      (flame('#4D96FF', '#A8E6FF'), 'Das Feuer ist blau!'),
      ('', 'Die Rakete hat kein Feuer!')),
    # UFO
    '<ellipse cx="620" cy="310" rx="30" ry="24" fill="#A8E6FF"/>',
    D('ufo', 620, 330, 52, ufo('#6BCB77', '#FFD93D'),
      (ufo('#6BCB77', '#FF6B6B'), 'Die Lichter sind rot!'),
      (ufo('#B39DDB', '#FFD93D'), 'Das Männchen ist lila!')),
    # Comet
    D('comet', 506, 482, 62, '<polygon points="548,494 455,448 553,510" fill="#A8E6FF" opacity="0.7"/>',
      ('', 'Der Komet hat keinen Schweif!')),
    '<circle cx="556" cy="502" r="12" fill="white"/>',
    D('asteroid', 302, 520, 38, ASTEROID, ('', 'Der Stein fehlt!')),
    # Astronaut
    '<rect x="110" y="436" width="18" height="40" rx="6" fill="#BDBDBD"/>',
    '<rect x="128" y="428" width="44" height="62" rx="10" fill="white"/>',
    '<rect x="112" y="438" width="16" height="12" rx="6" fill="white"/><rect x="172" y="438" width="22" height="12" rx="6" fill="white"/>',
    '<rect x="132" y="488" width="14" height="28" rx="5" fill="white"/><rect x="154" y="488" width="14" height="28" rx="5" fill="white"/>',
    '<circle cx="150" cy="400" r="28" fill="white"/>',
    D('visor', 155, 400, 28, visor('#FFD93D'),
      (visor('#FF8FC8'), 'Das Visier ist rosa!'),
      (visor('#4D96FF'), 'Das Visier ist blau!')),
]


# ── Spielplatz ──────────────────────────────────────────────────────────
def kite(color):
    return (f'<polygon points="560,68 592,110 560,152 528,110" fill="{color}"/>'
            '<path d="M560,68 V152 M528,110 H592" stroke="white" stroke-width="3"/>')


def bench(c1, c2):
    return (f'<rect x="600" y="490" width="8" height="28" fill="{c2}"/><rect x="692" y="490" width="8" height="28" fill="{c2}"/>'
            f'<rect x="590" y="455" width="120" height="12" rx="4" fill="{c1}"/>'
            f'<rect x="600" y="467" width="8" height="15" fill="{c2}"/><rect x="692" y="467" width="8" height="15" fill="{c2}"/>'
            f'<rect x="590" y="480" width="120" height="12" rx="4" fill="{c1}"/>')


def ball(color):
    return (f'<circle cx="420" cy="520" r="25" fill="{color}"/>'
            '<path d="M397,512 Q420,525 443,512" stroke="white" stroke-width="7" fill="none"/>')


def bucket(c):
    return (f'<polygon points="158,488 182,488 178,515 162,515" fill="{c}"/>'
            '<path d="M158,488 Q170,475 182,488" stroke="#555" stroke-width="2" fill="none"/>')


def seat(x, c):
    return f'<rect x="{x}" y="328" width="60" height="10" rx="3" fill="{c}"/>'


def small_flower(x, y, c):
    return f'<circle cx="{x}" cy="{y}" r="6" fill="{c}"/><circle cx="{x}" cy="{y}" r="2.5" fill="#FFD93D"/>'


BIRD = ('<ellipse cx="440" cy="183" rx="14" ry="10" fill="#8E5A3C"/><circle cx="452" cy="175" r="7" fill="#8E5A3C"/>'
        '<circle cx="454" cy="173" r="1.8" fill="#222"/><polygon points="458,175 466,177 458,179" fill="#FF9A3C"/>')
BUTTERFLY = ('<ellipse cx="80" cy="192" rx="11" ry="14" fill="#FF8FC8"/><ellipse cx="100" cy="192" rx="11" ry="14" fill="#FF8FC8"/>'
             '<ellipse cx="82" cy="210" rx="8" ry="9" fill="#B39DDB"/><ellipse cx="98" cy="210" rx="8" ry="9" fill="#B39DDB"/>'
             '<rect x="88" y="186" width="4" height="30" rx="2" fill="#333"/>')
CASTLE = ('<rect x="232" y="495" width="40" height="25" fill="#E0B060"/><rect x="232" y="485" width="10" height="10" fill="#E0B060"/>'
          '<rect x="247" y="485" width="10" height="10" fill="#E0B060"/><rect x="262" y="485" width="10" height="10" fill="#E0B060"/>')

SPIELPLATZ = [
    '<rect width="800" height="600" fill="#A8E6FF"/>',
    '<rect y="380" width="800" height="220" fill="#7ED957"/>',
    D('sun', 80, 75, 50, '<circle cx="80" cy="75" r="40" fill="#FFD93D"/>',
      ('', 'Die Sonne fehlt!'),
      ('<circle cx="80" cy="75" r="40" fill="#FF9A3C"/>', 'Die Sonne ist orange!')),
    '<ellipse cx="300" cy="75" rx="55" ry="25" fill="white"/><ellipse cx="335" cy="62" rx="38" ry="22" fill="white"/>',
    D('cloud', 685, 72, 55, '',
      ('<ellipse cx="680" cy="77" rx="45" ry="22" fill="white"/><ellipse cx="705" cy="64" rx="30" ry="18" fill="white"/>', 'Da ist eine neue Wolke!')),
    D('butterfly', 90, 200, 28, '', (BUTTERFLY, 'Da fliegt ein Schmetterling!')),
    '<path d="M560,152 Q600,240 540,330 Q520,360 530,380" stroke="#555" stroke-width="2" fill="none"/>',
    D('kite', 560, 110, 45, kite('#FF6B6B'),
      (kite('#6BCB77'), 'Der Drachen ist grün!'),
      (kite('#4D96FF'), 'Der Drachen ist blau!')),
    # Slide
    '<rect x="186" y="150" width="4" height="72" fill="#555"/>',
    D('flag', 203, 167, 30, '<polygon points="190,152 190,182 220,167" fill="#FFD93D"/>',
      ('<polygon points="190,152 190,182 220,167" fill="#9B59B6"/>', 'Die Fahne ist lila!'),
      ('', 'Die Fahne fehlt!')),
    '<rect x="146" y="225" width="8" height="175" fill="#C68B59"/><rect x="176" y="225" width="8" height="175" fill="#C68B59"/>',
    *[f'<rect x="150" y="{y}" width="30" height="6" fill="#C68B59"/>' for y in (250, 280, 310, 370)],
    D('rung', 165, 343, 28, '<rect x="150" y="340" width="30" height="6" fill="#C68B59"/>', ('', 'Eine Sprosse fehlt!')),
    '<rect x="140" y="218" width="105" height="12" fill="#FF9A3C"/>',
    '<polygon points="232,224 338,392 362,392 254,224" fill="#4D96FF"/>',
    # Swings
    '<rect x="400" y="195" width="240" height="10" rx="4" fill="#8B4513"/>',
    '<rect x="405" y="200" width="10" height="200" fill="#8B4513"/><rect x="625" y="200" width="10" height="200" fill="#8B4513"/>',
    '<line x1="470" y1="205" x2="470" y2="330" stroke="#555" stroke-width="3"/><line x1="510" y1="205" x2="510" y2="330" stroke="#555" stroke-width="3"/>',
    D('seat1', 490, 333, 35, seat(460, '#FF6B6B'),
      (seat(460, '#6BCB77'), 'Die Schaukel ist grün!'),
      ('', 'Ein Schaukelsitz fehlt!')),
    '<line x1="560" y1="205" x2="560" y2="330" stroke="#555" stroke-width="3"/><line x1="600" y1="205" x2="600" y2="330" stroke="#555" stroke-width="3"/>',
    D('seat2', 580, 333, 35, seat(550, '#4D96FF'),
      (seat(550, '#FFD93D'), 'Die Schaukel ist gelb!'),
      ('', 'Ein Schaukelsitz fehlt!')),
    D('bird', 446, 180, 30, '', (BIRD, 'Da sitzt ein Vogel!')),
    # Tree
    '<rect x="728" y="290" width="24" height="110" fill="#8B4513"/>',
    '<circle cx="740" cy="262" r="55" fill="#2E8B57"/>',
    D('apples', 740, 252, 43, '',
      (''.join(f'<circle cx="{x}" cy="{y}" r="8" fill="#E74C3C"/>' for x, y in ((718, 250), (760, 276), (748, 230))), 'Am Baum hängen Äpfel!')),
    # Sandbox
    '<rect x="120" y="470" width="180" height="70" fill="#F4D58D" stroke="#C68B59" stroke-width="8"/>',
    D('bucket', 170, 498, 30, bucket('#FF6B6B'),
      (bucket('#4D96FF'), 'Der Eimer ist blau!'),
      ('', 'Der Eimer fehlt!')),
    D('castle', 252, 502, 30, CASTLE, ('', 'Die Sandburg fehlt!')),
    D('ball', 420, 520, 35, ball('#FF6B6B'),
      (ball('#6BCB77'), 'Der Ball ist grün!'),
      (ball('#4D96FF'), 'Der Ball ist blau!')),
    D('bench', 650, 486, 70, bench('#C68B59', '#8B5A2B'),
      (bench('#4D96FF', '#2A6FCC'), 'Die Bank ist blau!'),
      ('', 'Die Bank fehlt!')),
    D('flower', 520, 450, 26, small_flower(520, 450, 'white'),
      (small_flower(520, 450, '#E74C3C'), 'Die Blume ist rot!'),
      ('', 'Eine Blume fehlt!')),
    *[small_flower(x, y, c) for x, y, c in ((60, 430, '#FF8FC8'), (95, 560, 'white'), (330, 575, '#FF8FC8'),
                                          (560, 580, '#9B59B6'), (760, 560, '#FF8FC8'), (340, 430, '#9B59B6'))],
]

SCENES = {
    'bauernhof':  ('Bauernhof',  BAUERNHOF),
    'meer':       ('Meer',       MEER),
    'weltraum':   ('Weltraum',   WELTRAUM),
    'spielplatz': ('Spielplatz', SPIELPLATZ),
}

for tid, (name, items) in SCENES.items():
    diffs = [it for it in items if isinstance(it, D)]
    assert len(diffs) >= 12, (tid, len(diffs))
    for i, a in enumerate(diffs):
        for b in diffs[i + 1:]:
            d = math.hypot(a.cx - b.cx, a.cy - b.cy)
            assert d > a.r + b.r, f'{tid}: overlap {a.key} / {b.key} ({d:.0f} <= {a.r + b.r})'
    out = os.path.join(ROOT, tid)
    os.makedirs(out, exist_ok=True)
    body = '\n  '.join(it.svg() if isinstance(it, D) else it for it in items)
    with open(os.path.join(out, 'scene.svg'), 'w') as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">\n  ' + body + '\n</svg>\n')
    with open(os.path.join(out, 'theme.json'), 'w') as f:
        json.dump({'name': name, 'tts': TTS, 'scene': 'scene.svg', 'count': 10}, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'wrote {tid}: {len(diffs)} candidates, {sum(len(d.variants) for d in diffs)} variants')
