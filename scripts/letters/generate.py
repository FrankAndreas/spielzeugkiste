"""Generate the tracing paths for Schreiben (src/logic/basisschrift.json).

    python3 scripts/letters/generate.py FONT [PREVIEW_PNG]

FONT is the official "Deutschschweizer Basisschrift" (DCH-Basisschrift.ttf from
https://www.basisschrift.ch/download). It is free for teaching in Switzerland
but not ours to redistribute, so it is not in the repo: download it to run this.

For every glyph the script renders the font, thins the ink to its centre line,
and walks that line through the waypoints in GLYPHS. The waypoints encode the
stroke order and direction of the official templates, documented in
docs/handwriting/basisschrift.md - change them there first, then here.

Units: the cap height is 100. Lines of the "Schreibhaus": TOP (cap line),
MID, BASE (baseline) and DESC (descender line). A preview sheet with every
glyph, its strokes numbered at their start, is written to PREVIEW_PNG.
"""
import heapq, json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT  = Path(__file__).resolve().parents[2] / 'src/logic/basisschrift.json'
K    = 4                                 # pixels per unit while tracing
BOX  = {'width': 100, 'height': 170}
TOP, MID, BASE, DESC = 10, 60, 110, 160

# Strokes as waypoints (u, v): u across the glyph's ink from 0 (left) to 1
# (right), v down from the cap line (0) to the baseline (1) and the
# descender line (1.5). Each stroke follows the centre line through its
# waypoints in order; the first one is where the pen starts.
GLYPHS = {
    'A': [[(0, 1), (0.5, 0), (1, 1)], [(0.2, 0.68), (0.8, 0.68)]],
    'C': [[(1, 0.06), (0, 0.5), (1, 0.94)]],
    'D': [[(0, 0), (0, 1)], [(0, 0), (1, 0.5), (0, 1)]],
    'E': [[(0, 0), (0, 1), (1, 1)], [(0, 0), (1, 0)], [(0, 0.5), (1, 0.5)]],
    'G': [[(1, 0.04), (0, 0.45), (0.45, 1), (1, 0.5), (1, 1.2), (0.3, 1.47)]],
    'H': [[(0, 0), (0, 1)], [(1, 0), (1, 1)], [(0, 0.5), (1, 0.5)]],
    'I': [[(0.5, 0), (0.5, 1)]],
    'J': [[(1, 0), (1, 1.2), (0, 1.5)]],
    'L': [[(0, 0), (0, 1), (1, 1)]],
    'N': [[(0, 0), (0, 1)], [(0, 0), (1, 1), (1, 0)]],
    'O': [[(0.5, 0), (0, 0.5), (0.5, 1), (1, 0.5), (0.52, 0)]],
    'P': [[(0, 0), (0, 1)], [(0, 0), (1, 0.27), (0, 0.55)]],
    'R': [[(0, 0), (0, 1)], [(0, 0), (1, 0.27), (0.1, 0.55), (1, 1)]],
    'S': [[(1, 0.07), (0, 0.25), (0.5, 0.5), (1, 0.75), (0, 0.93)]],
    '0': [[(0.5, 0), (0, 0.5), (0.5, 1), (1, 0.5), (0.52, 0)]],
    '1': [[(0, 0.25), (1, 0), (1, 1)]],
    '2': [[(0, 0.15), (0.55, 0), (1, 0.3), (0, 1), (1, 1)]],
    '3': [[(0, 0.05), (1, 0.25), (0.15, 0.48), (1, 0.75), (0, 0.95)]],
    '4': [[(0.7, 0.02), (0, 0.65), (1, 0.62)], [(0.7, 0.02), (0.7, 1)]],
    '5': [[(0, 0), (0, 0.42), (1, 0.7), (0, 1)], [(0, 0), (1, 0)]],
    '6': [[(1, 0.05), (0, 0.65), (0.5, 1), (1, 0.72), (0.5, 0.45), (0, 0.7)]],
    '7': [[(0, 0), (1, 0), (0, 1)], [(0.15, 0.53), (0.75, 0.53)]],
    '8': [[(0.75, 0.02), (0, 0.22), (0.5, 0.5), (1, 0.78), (0.5, 1), (0, 0.78), (0.5, 0.5), (1, 0.22), (0.5, 0)]],
    '9': [[(1, 0.04), (0, 0.25), (0.5, 0.5), (1, 0.04), (1, 0.9), (0, 1)]],
}


def render(font, ch, cap_top_offset):
    w, h = BOX['width'] * K, BOX['height'] * K
    probe = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(probe).text((0, 0), ch, font=font, fill=255)
    x0, _, x1, _ = probe.getbbox()
    im = Image.new('L', (w, h), 0)
    left = (w - (x1 - x0)) / 2 - x0
    ImageDraw.Draw(im).text((left, TOP * K - cap_top_offset), ch, font=font, fill=255)
    return im


def thin(im):
    """Zhang-Suen thinning: the ink's one-pixel centre line."""
    w, h = im.size
    px = im.load()
    on = {(x, y) for y in range(h) for x in range(w) if px[x, y] > 127}
    nb = [(0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1)]
    changed = True
    while changed:
        changed = False
        for step in (0, 1):
            drop = []
            for (x, y) in on:
                n = [(x + dx, y + dy) in on for dx, dy in nb]
                b = sum(n)
                a = sum(1 for i in range(8) if not n[i] and n[(i + 1) % 8])
                p2, p4, p6, p8 = n[0], n[2], n[4], n[6]
                if 2 <= b <= 6 and a == 1 and (
                        (step == 0 and not (p2 and p4 and p6) and not (p4 and p6 and p8)) or
                        (step == 1 and not (p2 and p4 and p8) and not (p2 and p6 and p8))):
                    drop.append((x, y))
            if drop:
                changed = True
                on.difference_update(drop)
    return on


def shortest(skel, a, b):
    """Dijkstra along the centre line from pixel a to pixel b."""
    dist, prev, todo = {a: 0}, {}, [(0, a)]
    while todo:
        d, p = heapq.heappop(todo)
        if p == b:
            break
        if d > dist[p]:
            continue
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                q = (p[0] + dx, p[1] + dy)
                if q == p or q not in skel:
                    continue
                nd = d + math.hypot(dx, dy)
                if nd < dist.get(q, math.inf):
                    dist[q], prev[q] = nd, p
                    heapq.heappush(todo, (nd, q))
    if b not in dist:
        raise SystemExit(f'no centre-line path from {a} to {b}')
    path = [b]
    while path[-1] != a:
        path.append(prev[path[-1]])
    return path[::-1]


def smooth(pts, r=4):
    out = []
    for i in range(len(pts)):
        if i < r or i >= len(pts) - r:
            out.append(pts[i])
            continue
        win = pts[i - r:i + r + 1]
        out.append((sum(p[0] for p in win) / len(win), sum(p[1] for p in win) / len(win)))
    return out


def sparse(pts, step=1.0):
    out = [pts[0]]
    for p in pts[1:]:
        if math.dist(p, out[-1]) >= step:
            out.append(p)
    if out[-1] != pts[-1]:
        out.append(pts[-1])
    return out


def main():
    font_path = sys.argv[1]
    preview = sys.argv[2] if len(sys.argv) > 2 else None
    # Size the font so the cap height is 100 units
    probe = ImageFont.truetype(font_path, 400)
    hb = probe.getbbox('H')
    size = round(400 * 100 * K / (hb[3] - hb[1]))
    font = ImageFont.truetype(font_path, size)
    cap_top_offset = font.getbbox('H')[1]

    glyphs, sheets, problems = {}, [], []
    for ch, strokes in GLYPHS.items():
        im = render(font, ch, cap_top_offset)
        x0, _, x1, _ = im.getbbox()
        skel = thin(im)
        cells = list(skel)
        # Line ends: centre-line pixels with a single neighbour
        ends = [c for c in cells if sum((c[0] + dx, c[1] + dy) in skel
                                        for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy) == 1]

        def snap(u, v, to_end):
            target = (x0 + u * (x1 - x0), (TOP + v * (BASE - TOP)) * K)
            # A stroke starts or stops at a line end of the glyph when one is close
            near_end = min(ends, key=lambda c: math.dist(c, target), default=None)
            if to_end and near_end and math.dist(near_end, target) <= 16 * K:
                return near_end
            best = min(cells, key=lambda c: math.dist(c, target))
            if math.dist(best, target) > 12 * K:
                raise SystemExit(f'{ch}: waypoint {(u, v)} is {math.dist(best, target) / K:.0f} units from the centre line')
            return best

        paths = []
        for wps in strokes:
            pix = [snap(u, v, i in (0, len(wps) - 1)) for i, (u, v) in enumerate(wps)]
            line = [pix[0]]
            for a, b in zip(pix, pix[1:]):
                line += shortest(skel, a, b)[1:]
            units = [(x / K, y / K) for x, y in line]
            paths.append([[round(x, 1), round(y, 1)] for x, y in sparse(smooth(units))])

        # Every bit of ink must be near a path, so no part of the glyph is missed
        pts = [p for path in paths for p in path]
        ink = im.load()
        worst = 0
        for y in range(0, im.size[1], 6):
            for x in range(0, im.size[0], 6):
                if ink[x, y] > 127:
                    worst = max(worst, min(math.dist((x / K, y / K), p) for p in pts))
        if worst > 7:
            problems.append(f'{ch}: ink {worst:.1f} units away from every stroke')
        print(f'{ch}: {len(paths)} stroke(s), ink within {worst:.1f} units')
        glyphs[ch] = paths
        sheets.append((ch, im, paths))

    if preview:
        write_preview(sheets, preview)
    if problems:
        raise SystemExit('\n'.join(problems))
    OUT.write_text(json.dumps({'box': {**BOX, 'lines': [TOP, MID, BASE, DESC]}, 'glyphs': glyphs}, separators=(',', ':')) + '\n')
    print(f'wrote {OUT}')


def write_preview(sheets, path):
    s = 2
    cw, ch_ = BOX['width'] * s + 10, BOX['height'] * s + 10
    cols = 8
    sheet = Image.new('RGB', (cw * cols, ch_ * math.ceil(len(sheets) / cols)), 'white')
    colours = [(231, 76, 60), (46, 134, 222), (39, 174, 96), (142, 68, 173)]
    for i, (ch, im, paths) in enumerate(sheets):
        ox, oy = (i % cols) * cw + 5, (i // cols) * ch_ + 5
        glyph = im.resize((BOX['width'] * s, BOX['height'] * s)).point(lambda v: 255 - v * 0.25)
        sheet.paste(glyph.convert('RGB'), (ox, oy))
        d = ImageDraw.Draw(sheet)
        for y in (TOP, MID, BASE, DESC):
            d.line([(ox, oy + y * s), (ox + BOX['width'] * s, oy + y * s)], fill=(170, 200, 235))
        for n, p in enumerate(paths):
            c = colours[n % 4]
            d.line([(ox + x * s, oy + y * s) for x, y in p], fill=c, width=3)
            sx, sy = ox + p[0][0] * s, oy + p[0][1] * s
            d.ellipse([sx - 6, sy - 6, sx + 6, sy + 6], fill=c)
            d.text((sx + 7, sy - 14), str(n + 1), fill='black')
            ex, ey = ox + p[-1][0] * s, oy + p[-1][1] * s
            d.rectangle([ex - 3, ey - 3, ex + 3, ey + 3], outline=c, width=2)
    sheet.save(path)
    print(f'preview {path}')


if __name__ == '__main__':
    main()
