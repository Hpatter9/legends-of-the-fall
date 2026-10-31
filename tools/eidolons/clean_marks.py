# Removes the free-tier generator marks from the Dreamina source paintings (the owner's ask): the small "AI" badge in the top-left
# corner and the "Dreamina AI" wordmark in the bottom-right. Both sit at fixed places on every 2048 px image. Inside each box the mark's
# pixels are found (light, unsaturated, brighter than their surroundings), grown a little, and painted over from the pixels around them.
# Usage: python3 tools/eidolons/clean_marks.py <in-dir> <out-dir>
import sys, os, glob
import numpy as np, cv2

BOXES = [(18, 18, 120, 104), (1355, 1895, 2035, 2015)]   # (x0, y0, x1, y1) at 2048 px

def clean(path, out):
    im = cv2.imread(path)
    h, w = im.shape[:2]
    s = w / 2048
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    mask = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1 in BOXES:
        x0, y0, x1, y1 = int(x0 * s), int(y0 * s), int(x1 * s), int(y1 * s)
        v = hsv[y0:y1, x0:x1, 2].astype(np.int16)
        sat = hsv[y0:y1, x0:x1, 1]
        local = cv2.blur(v.astype(np.uint8), (31, 31)).astype(np.int16)
        light = ((v - local > 18) & (sat < 60)) | ((v > 170) & (sat < 45))
        # (the lettering's soft drop shadow: darker than its surroundings, hugging the light strokes)
        near = cv2.dilate(light.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
        shadow = near & (v - local < -8)
        mask[y0:y1, x0:x1] = (light | shadow).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((11, 11), np.uint8))
    res = cv2.inpaint(im, mask, 9, cv2.INPAINT_TELEA)
    cv2.imwrite(out, res, [cv2.IMWRITE_JPEG_QUALITY, 95])

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for p in sorted(glob.glob(os.path.join(src, '*.jpg'))):
    clean(p, os.path.join(dst, os.path.basename(p)))
    print('cleaned', os.path.basename(p))
