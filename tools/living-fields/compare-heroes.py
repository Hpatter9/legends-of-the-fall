# LIVING-FIELDS: lay two runs of the hero value table (`npm run balance -- --heroes-only ...`) side by side: the teams' mean win rate, and how
# far each hero's "vs avg" moved (its mean and largest move, to hold against the move between two samples of the same rules).
#   python3 tools/living-fields/compare-heroes.py <a.log> <b.log>
import re, sys

def parse(path):
    out = {}
    for line in open(path):
        m = re.match(r'^(\S.*?)\s{2,}([\d.]+)\s+([\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+\d+\s+\d+', line)
        if m:
            out[m.group(1)] = (float(m.group(2)), float(m.group(3)), float(m.group(5)))
    return out

a, b = parse(sys.argv[1]), parse(sys.argv[2])
keys = [k for k in a if k in b]
mean = lambda xs: sum(xs) / len(xs)
moves = [abs(a[k][2] - b[k][2]) for k in keys]
print('%d heroes; mean win without the hero: %.1f%% against %.1f%%' % (len(keys), mean([a[k][1] for k in keys]), mean([b[k][1] for k in keys])))
print('"vs avg" moved by a mean of %.1f points, at most %.1f (%s)' % (mean(moves), max(moves), max(keys, key=lambda k: abs(a[k][2] - b[k][2]))))
print('beyond 6 points of the average: %d against %d' % (sum(abs(a[k][2]) > 6 for k in keys), sum(abs(b[k][2]) > 6 for k in keys)))
