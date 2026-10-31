"""Makes the Eidolon pixel-art sprite sheets with Gemini (see PROMPTS.md).
Use: python3 generate.py <id> models/gemini-3-pro-image [suffix]   (suffix e.g. -try2; empty keeps <id>-sheet.png)
     python3 generate.py prompt <id>   prints the prompt.
The request carries a dummy key; the session proxy adds the real one."""
import json, sys, base64, urllib.request, os
import pathlib
OUT=str(pathlib.Path(__file__).resolve().parent)
E={
'nivra':("serpentine ice dragon","Nivra the Rime Wyrm","A long, legless wyrm whose body coils in an S-curve, covered in translucent pale-blue ice-crystal scales with jagged frost spikes along the spine and a crest of icicle horns. Its scales glow a cold icy cyan from within, its eyes shine bright white-blue, and frost mist drifts from its jaws. Mood: noble, ancient and serene, not demonic.","slither, the body rippling in waves","rise, the coils lifting the head and body high","frost breath pouring out to the right in a cone of icy white-blue mist and ice shards"),
'aurelan':("lion","Aurelan the Lion of Dawn","A great golden lion with a radiant flowing mane of gold, amber and rose-pink, a cream-white chest and a tufted tail. A halo of sunlight rays shines behind its head and its eyes glow warm gold. Mood: noble, proud and heroic, not demonic.","run, a powerful bounding gallop","leap, springing up with forelegs reaching forward","a roaring burst of golden sunlight, rays and light blasting out to the right from its open jaws"),
'voltara':("copper storm goddess","Voltara the Copper Goddess","A tall clockwork goddess in burnished copper and brass armour with coiled copper wire wrapped round her arms, a blindfold-mask over her eyes, a halo ring of small copper gears floating behind her head, and glowing blue electric coils in her chest. Crackling blue lightning arcs between her raised hands. Mood: noble, calm and divine, not demonic.","glide, floating forward just above the ground with her skirt of copper plates swaying","rise, lifting into the air with arms raised and lightning crackling","a lightning strike, a jagged blue-white bolt hurled from her hands out to the right"),
'gorm':("stone titan golem","Gorm the Quarry Titan","A massive hulking golem built of grey quarried stone blocks bound with iron chains, with moss on its shoulders and glowing molten-orange cracks running between the stones. Its small eyes glow amber and it carries a huge stone-block hammer. Mood: noble, steadfast guardian, not demonic.","walk, a heavy stomping stride","leap, a heavy jump with the hammer raised overhead","a ground-shaking hammer slam to the right, cracking the earth with flying rocks and a burst of orange dust"),
'vaelkhar':("dragon","Vaelkhar the Dragon King","A towering black-scaled dragon standing on its hind legs with great leathery bat-like wings, curved horns, a golden crown, and a ring of violet flame floating above its head like a halo. Glowing violet-purple light shines through the cracks between its dark scales and in its eyes, wing membranes tinged purple. Mood: noble, regal and majestic, not demonic.","fly, wings beating as it glides forward","rise, wings spread wide taking off upward","a stream of dark violet shadow-fire breath pouring out to the right"),
}
def prompt(k):
    c,n,d,g,r,a=E[k]
    return (f"Pixel art sprite sheet of a mythical {c} called {n}, for a 2D fantasy game. The creature: {d} "
      f"Layout: side view, facing right. One row per animation, each row 6 frames of equal size, evenly spaced on a grid: "
      f"Row 1: idle; Row 2: move ({g}); Row 3: {r}; Row 4: {a}. "
      "Style: crisp retro pixel art, about 64x64 pixels per frame, limited palette, clean dark outline, no anti-aliasing blur, "
      "consistent size and position in every frame. Keep the whole creature inside each frame. Plain solid magenta background (#FF00FF). "
      "No text, no labels, no grid lines, no watermark.")
def gen(k,model,tag):
    body={"contents":[{"parts":[{"text":prompt(k)}]}],"generationConfig":{"responseModalities":["IMAGE","TEXT"]}}
    req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent",
      data=json.dumps(body).encode(),headers={"Content-Type":"application/json","x-goog-api-key":"dummy"})
    r=json.load(urllib.request.urlopen(req,timeout=300))
    for p in r["candidates"][0]["content"]["parts"]:
        if "inlineData" in p:
            mt=p["inlineData"]["mimeType"]; data=base64.b64decode(p["inlineData"]["data"])
            fn=f"{OUT}/{k}-sheet{tag}.{mt.split('/')[-1]}"; open(fn,'wb').write(data); return fn,mt
    raise Exception("no image: "+json.dumps(r)[:500])
if __name__=='__main__':
    k,model=sys.argv[1:3]; tag=sys.argv[3] if len(sys.argv)>3 else ''
    if k=='prompt': print(prompt(model)); sys.exit()
    print(gen(k,model,tag))
