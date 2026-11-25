"""PixelLab client for the game's art (PIXELLAB-ART).

Every request is written to tools/pixellab/requests.jsonl (the endpoint, the prompt, the seed and the reference files, never the
pixels) so a piece can be remade. The key is put on by the environment's proxy; no key is kept here.

Use:  from pl import call, b64, frames_of
"""
import base64, io, json, os, sys, time, urllib.request

API = 'https://api.pixellab.ai/v2'
HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, 'requests.jsonl')
TOKEN = os.environ.get('PIXELLAB_TOKEN', 'proxy-injected')


def _req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method,
                               headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(r, timeout=600) as res:
                return json.loads(res.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:800]
            if e.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(5 * (attempt + 1)); continue
            raise RuntimeError(f'{e.code} {path}: {msg}')
        except urllib.error.URLError:
            if attempt < 4: time.sleep(5 * (attempt + 1)); continue
            raise


def b64(img):
    """A PIL image as the API's base64 image."""
    buf = io.BytesIO(); img.save(buf, 'PNG')
    return {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode(), 'format': 'png'}


def unb64(o):
    from PIL import Image
    s = o['base64'] if isinstance(o, dict) else o
    if s.startswith('data:'): s = s.split(',', 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(s))).convert('RGBA')


def balance():
    return _req('GET', '/balance')


def call(path, body, piece, note='', refs=()):
    """POST, poll the job if one comes back, log it, and return the final response."""
    logged = {k: v for k, v in body.items() if k not in ('frames', 'edit_images', 'reference_image', 'style_images',
                                                         'image', 'inpainting_image', 'mask_image', 'init_image')}
    t0 = time.time()
    res = _req('POST', path, body)
    job = res.get('background_job_id') or (res.get('id') if res.get('status') in ('processing', 'pending', 'queued') else None)
    while job:
        time.sleep(6)
        j = _req('GET', f'/background-jobs/{job}')
        if j.get('status') == 'completed':
            res = j; break
        if j.get('status') in ('failed', 'cancelled', 'error'):
            raise RuntimeError(f'job {job} {j.get("status")}: {json.dumps(j)[:600]}')
    usage = res.get('usage')
    with open(LOG, 'a') as f:
        f.write(json.dumps({'piece': piece, 'endpoint': path, 'body': logged, 'refs': list(refs), 'note': note,
                            'usage': usage, 'secs': round(time.time() - t0)}) + '\n')
    return res


def images_of(res):
    """The images in a response, whatever the endpoint calls them."""
    r = res.get('last_response', res)
    for k in ('images', 'frames', 'edited_images'):
        if k in r and r[k]:
            return [unb64(x if not isinstance(x, dict) or 'base64' in x else x.get('image', x)) for x in r[k]]
    if 'image' in r: return [unb64(r['image'])]
    raise RuntimeError('no images in ' + json.dumps(r)[:400])
