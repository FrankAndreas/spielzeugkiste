"""Generate Memory themes: theme.json and one card picture per pair.

    python3 scripts/memory/generate.py [OUT_DIR]

OUT_DIR defaults to public/content/memory. A card is an emoji on a coloured
square, like the existing Tiere and Einhorn cards. Only emoji up to Unicode 13
are used, so every card shows on the iPad and on older laptops too.
"""
import json, sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public/content/memory'

# Soft card colours, used in turn
COLOURS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9A3C', '#4ECDC4', '#FF6FC8']

# theme id: (name, spoken intro, [(card id, emoji, label)])
THEMES = {
    'winter': ('Winterwelt', 'Winter-Memory! Finde alle Paare.', [
        ('schneemann', '⛄', 'Schneemann'), ('schneeflocke', '❄️', 'Schneeflocke'), ('handschuhe', '🧤', 'Handschuhe'),
        ('schal', '🧣', 'Schal'), ('ski', '🎿', 'Ski'), ('schlittschuh', '⛸️', 'Schlittschuh'),
        ('schlitten', '🛷', 'Schlitten'), ('berg', '🏔️', 'Berg'), ('eis', '🧊', 'Eiswürfel'),
        ('hirsch', '🦌', 'Hirsch'), ('pinguin', '🐧', 'Pinguin'), ('eisbaer', '🐻‍❄️', 'Eisbär'),
        ('tannenbaum', '🎄', 'Tannenbaum'), ('geschenk', '🎁', 'Geschenk'), ('stern', '⭐', 'Stern'),
        ('glocke', '🔔', 'Glocke'), ('kerze', '🕯️', 'Kerze'), ('tasse', '☕', 'Tasse'),
        ('keks', '🍪', 'Keks'), ('socken', '🧦', 'Socken'), ('snowboard', '🏂', 'Snowboard'),
        ('samichlaus', '🎅', 'Samichlaus'), ('eule', '🦉', 'Eule'), ('eichhoernchen', '🐿️', 'Eichhörnchen'),
        ('kastanie', '🌰', 'Kastanie'), ('mandarine', '🍊', 'Mandarine'), ('teddy', '🧸', 'Teddybär'),
    ]),
    'fahrzeuge': ('Fahrzeuge', 'Fahrzeug-Memory! Finde alle Paare.', [
        ('feuerwehrauto', '🚒', 'Feuerwehrauto'), ('krankenwagen', '🚑', 'Krankenwagen'), ('polizei', '🚓', 'Polizeiauto'),
        ('taxi', '🚕', 'Taxi'), ('bus', '🚌', 'Bus'), ('traktor', '🚜', 'Traktor'),
        ('lokomotive', '🚂', 'Lokomotive'), ('flugzeug', '✈️', 'Flugzeug'), ('helikopter', '🚁', 'Helikopter'),
        ('rakete', '🚀', 'Rakete'), ('segelboot', '⛵', 'Segelboot'), ('velo', '🚲', 'Velo'),
        ('trottinett', '🛴', 'Trottinett'), ('motorrad', '🏍️', 'Motorrad'), ('auto', '🚗', 'Auto'),
        ('lastwagen', '🚚', 'Lastwagen'), ('rennauto', '🏎️', 'Rennauto'), ('motorboot', '🚤', 'Motorboot'),
        ('schiff', '🛳️', 'Schiff'), ('seilbahn', '🚠', 'Seilbahn'), ('tram', '🚃', 'Tram'),
        ('ufo', '🛸', 'Ufo'), ('kleinbus', '🚐', 'Kleinbus'), ('roller', '🛵', 'Roller'),
        ('kanu', '🛶', 'Kanu'), ('fallschirm', '🪂', 'Fallschirm'),
    ]),
    'musik': ('Musik & Tanz', 'Musik-Memory! Finde alle Paare.', [
        ('note', '🎵', 'Note'), ('noten', '🎶', 'Noten'), ('mikrofon', '🎤', 'Mikrofon'),
        ('kopfhoerer', '🎧', 'Kopfhörer'), ('gitarre', '🎸', 'Gitarre'), ('klavier', '🎹', 'Klavier'),
        ('trompete', '🎺', 'Trompete'), ('saxofon', '🎷', 'Saxofon'), ('trommel', '🥁', 'Trommel'),
        ('banjo', '🪕', 'Banjo'), ('geige', '🎻', 'Geige'), ('handorgel', '🪗', 'Handorgel'),
        ('ballettschuhe', '🩰', 'Ballettschuhe'), ('taenzerin', '💃', 'Tänzerin'), ('taenzer', '🕺', 'Tänzer'),
        ('theater', '🎭', 'Theater'), ('zirkus', '🎪', 'Zirkus'), ('radio', '📻', 'Radio'),
        ('glocke', '🔔', 'Glocke'), ('notenblatt', '🎼', 'Notenblatt'), ('schleife', '🎀', 'Schleife'),
        ('party', '🎉', 'Party'), ('konfetti', '🎊', 'Konfetti'), ('vogel', '🐦', 'Vogel'),
        ('karussell', '🎠', 'Karussell'),
    ]),
    'essen': ('Essen', 'Ess-Memory! Finde alle Paare.', [
        ('apfel', '🍎', 'Apfel'), ('banane', '🍌', 'Banane'), ('trauben', '🍇', 'Trauben'),
        ('erdbeere', '🍓', 'Erdbeere'), ('melone', '🍉', 'Melone'), ('kirschen', '🍒', 'Kirschen'),
        ('pfirsich', '🍑', 'Pfirsich'), ('ananas', '🍍', 'Ananas'), ('kiwi', '🥝', 'Kiwi'),
        ('rueebli', '🥕', 'Rüebli'), ('mais', '🌽', 'Mais'), ('brokkoli', '🥦', 'Brokkoli'),
        ('tomate', '🍅', 'Tomate'), ('gurke', '🥒', 'Gurke'), ('pizza', '🍕', 'Pizza'),
        ('hamburger', '🍔', 'Hamburger'), ('pommes', '🍟', 'Pommes'), ('hotdog', '🌭', 'Hotdog'),
        ('brezel', '🥨', 'Brezel'), ('kaese', '🧀', 'Käse'), ('ei', '🥚', 'Ei'),
        ('glace', '🍦', 'Glace'), ('donut', '🍩', 'Donut'), ('keks', '🍪', 'Keks'),
        ('torte', '🎂', 'Torte'), ('schokolade', '🍫', 'Schokolade'), ('honig', '🍯', 'Honig'),
        ('milch', '🥛', 'Milch'), ('brot', '🍞', 'Brot'), ('gipfeli', '🥐', 'Gipfeli'),
        ('birne', '🍐', 'Birne'), ('zitrone', '🍋', 'Zitrone'),
    ]),
    'meer': ('Meer', 'Meer-Memory! Finde alle Paare.', [
        ('tropenfisch', '🐠', 'Tropenfisch'), ('fisch', '🐟', 'Fisch'), ('kugelfisch', '🐡', 'Kugelfisch'),
        ('hai', '🦈', 'Hai'), ('krake', '🐙', 'Krake'), ('tintenfisch', '🦑', 'Tintenfisch'),
        ('krabbe', '🦀', 'Krabbe'), ('hummer', '🦞', 'Hummer'), ('garnele', '🦐', 'Garnele'),
        ('delfin', '🐬', 'Delfin'), ('wal', '🐳', 'Wal'), ('robbe', '🦭', 'Robbe'),
        ('schildkroete', '🐢', 'Schildkröte'), ('muschel', '🐚', 'Muschel'), ('segelboot', '⛵', 'Segelboot'),
        ('insel', '🏝️', 'Insel'), ('welle', '🌊', 'Welle'), ('anker', '⚓', 'Anker'),
        ('flamingo', '🦩', 'Flamingo'), ('pinguin', '🐧', 'Pinguin'), ('otter', '🦦', 'Otter'),
        ('strand', '🏖️', 'Strand'), ('meerjungfrau', '🧜‍♀️', 'Meerjungfrau'), ('krokodil', '🐊', 'Krokodil'),
        ('eimer', '🪣', 'Eimer'), ('sonnenuntergang', '🌅', 'Sonnenuntergang'),
    ]),
    'bauernhof': ('Bauernhof', 'Bauernhof-Memory! Finde alle Paare.', [
        ('kuh', '🐄', 'Kuh'), ('schwein', '🐖', 'Schwein'), ('schaf', '🐑', 'Schaf'),
        ('ziege', '🐐', 'Ziege'), ('hahn', '🐓', 'Hahn'), ('huhn', '🐔', 'Huhn'),
        ('kueken', '🐣', 'Küken'), ('ente', '🦆', 'Ente'), ('pferd', '🐴', 'Pferd'),
        ('hase', '🐇', 'Hase'), ('katze', '🐈', 'Katze'), ('hund', '🐕', 'Hund'),
        ('maus', '🐁', 'Maus'), ('truthahn', '🦃', 'Truthahn'), ('biene', '🐝', 'Biene'),
        ('weizen', '🌾', 'Weizen'), ('sonnenblume', '🌻', 'Sonnenblume'), ('traktor', '🚜', 'Traktor'),
        ('ei', '🥚', 'Ei'), ('milch', '🥛', 'Milch'), ('kaese', '🧀', 'Käse'),
        ('apfel', '🍎', 'Apfel'), ('rueebli', '🥕', 'Rüebli'), ('haus', '🏡', 'Bauernhaus'),
        ('marienkaefer', '🐞', 'Marienkäfer'), ('eule', '🦉', 'Eule'), ('schnecke', '🐌', 'Schnecke'),
        ('frosch', '🐸', 'Frosch'), ('igel', '🦔', 'Igel'),
    ]),
}


def card(emoji, colour):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n'
            f'  <rect width="100" height="100" rx="12" fill="{colour}"/>\n'
            f'  <text x="50" y="65" text-anchor="middle" font-size="50">{emoji}</text>\n'
            f'</svg>\n')


def main():
    for theme_id, (name, tts, cards) in THEMES.items():
        folder = ROOT / theme_id
        (folder / 'images').mkdir(parents=True, exist_ok=True)
        pairs = []
        for i, (card_id, emoji, label) in enumerate(cards):
            (folder / 'images' / f'{card_id}.svg').write_text(card(emoji, COLOURS[i % len(COLOURS)]))
            pairs.append({'id': card_id, 'image': f'images/{card_id}.svg', 'label': label, 'tts': label})
        theme = {'name': name, 'tts': tts, 'gridSize': '4x4', 'pairs': pairs}
        (folder / 'theme.json').write_text(json.dumps(theme, ensure_ascii=False, indent=2) + '\n')
        print(f'{theme_id}: {len(pairs)} pairs')


if __name__ == '__main__':
    main()
