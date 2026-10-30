"""Validate healer source sheets, without importing or changing the game. Requires Pillow."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent


def check():
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    report = {}
    for key, spec in manifest.items():
        path = ROOT / f'{key}.png'
        faults, rows = [], []
        if not path.exists():
            report[key] = {'faults': ['Missing sheet']}
            continue
        sheet = Image.open(path).convert('RGBA')
        w, h = sheet.size
        if h != 256 * len(spec['rows']) or w % 256:
            faults.append('Expected 256 px square cells and one row per part')
        else:
            for r, part in enumerate(spec['rows']):
                used, ended = 0, False
                for c in range(w // 256):
                    frame = sheet.crop((c * 256, r * 256, (c + 1) * 256, (r + 1) * 256))
                    alpha = frame.getchannel('A')
                    if alpha.getbbox() is None:
                        ended = True
                        continue
                    if ended:
                        faults.append(f"{part['part']}: used cell after an empty cell")
                    used += 1
                    if max(alpha.getpixel(p) for p in [(0, 0), (255, 0), (0, 255), (255, 255)]) >= 8:
                        faults.append(f"{part['part']} frame {c + 1}: opaque corner")
                    if alpha.crop((0, 0, 256, 20)).getbbox() or alpha.crop((0, 236, 256, 256)).getbbox():
                        faults.append(f"{part['part']} frame {c + 1}: missing vertical margin")
                    if alpha.crop((0, 0, 20, 256)).getbbox() or alpha.crop((236, 0, 256, 256)).getbbox():
                        faults.append(f"{part['part']} frame {c + 1}: missing horizontal margin")
                if not part['min'] <= used <= part['max']:
                    faults.append(f"{part['part']}: {used} frames outside {part['min']}–{part['max']}")
                rows.append({'part': part['part'], 'frames': used})
        report[key] = {'size': [w, h], 'rows': rows, 'faults': faults}
    (ROOT / 'checks.json').write_text(json.dumps(report, indent=2) + '\n')
    for key, result in report.items():
        print(f"{key}: {'; '.join(result['faults']) if result['faults'] else 'PASS'}")
    return int(any(result['faults'] for result in report.values()))


if __name__ == '__main__':
    raise SystemExit(check())
