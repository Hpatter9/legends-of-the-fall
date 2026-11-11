# LIVING-FIELDS: lay two runs of the armies' table (`npm run balance -- --armies-only ...`) side by side: the mean share of attempts
# that won a wave, and each army's clear rate by level.
#   python3 tools/living-fields/compare.py <off.log> <on.log>
import re, sys

def parse(path):
    out, army = {}, None
    for line in open(path):
        m = re.match(r'^(\S.*?)  \((\d+) waves', line)
        if m:
            army = m.group(1)
            continue
        m = re.match(r'^  (\d+)\s+([\d. ]+)$', line)
        if m and army:
            out[(army, int(m.group(1)))] = [float(x) for x in m.group(2).split()]
    return out

a, b = parse(sys.argv[1]), parse(sys.argv[2])
keys = [k for k in a if k in b]
wa = sum(sum(a[k][:-1]) for k in keys)
wb = sum(sum(b[k][:-1]) for k in keys)
n = sum(len(a[k]) - 1 for k in keys)
print('mean wave-win: %.2f%% against %.2f%% over %d cells' % (wa / n, wb / n, n))
print('mean clear:    %.2f%% against %.2f%% over %d rows' % (sum(a[k][-1] for k in keys) / len(keys), sum(b[k][-1] for k in keys) / len(keys), len(keys)))
for army in sorted({k[0] for k in keys}):
    rows = sorted(k for k in keys if k[0] == army)
    print('%-22s clear by level  %s  |  %s' % (army, ' '.join('%3.0f' % a[k][-1] for k in rows), ' '.join('%3.0f' % b[k][-1] for k in rows)))
