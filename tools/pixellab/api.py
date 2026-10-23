# Tiny PixelLab helpers: style references from the game's Craftpix sheets, job submit (job id saved first) and poll.
import base64,io,json,os,subprocess,time,urllib.request,urllib.error
from PIL import Image
API='https://api.pixellab.ai/v2'
def b64(im):
    b=io.BytesIO();im.save(b,'PNG');return base64.b64encode(b.getvalue()).decode()
def ref(sheet,row,canvas):
    """First frame of a row of a game sheet, cropped to the figure and padded onto a canvas (feet at the bottom)."""
    e=json.load(open('src/art/units/sheets.json'))[sheet];im=Image.open('src/art/units/%s.png'%sheet).convert('RGBA')
    w,h=e['w'],e['h'];r=e['rows'].index(row);f=im.crop((0,r*h,w,(r+1)*h)).crop(im.crop((0,r*h,w,(r+1)*h)).getbbox())
    c=Image.new('RGBA',(canvas,canvas));c.paste(f,((canvas-f.width)//2,canvas-f.height));return c
def post(path,body,save):
    req=urllib.request.Request(API+path,json.dumps(body).encode(),{'Content-Type':'application/json'})
    for wait in(5,15,30,60,120,240,None):   # the service caps concurrent jobs (HTTP 429): wait and try again
        try:r=json.load(urllib.request.urlopen(req,timeout=120));break
        except urllib.error.HTTPError as e:
            if e.code!=429 or wait is None:raise
            time.sleep(wait)
    open(save,'w').write(json.dumps(r));return r
def poll(job,timeout=900):
    t=time.time()
    while time.time()-t<timeout:
        r=json.load(urllib.request.urlopen(API+'/background-jobs/'+job,timeout=60))
        if r.get('status') not in('processing','queued','pending'):return r
        time.sleep(8)
