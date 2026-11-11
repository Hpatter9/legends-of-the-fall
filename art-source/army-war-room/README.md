# Army War Room

`room-source.png` is the original OpenAI-generated environment selected for the approved War Room direction. Prompt: [army-war-room-art-prompts.md](../../docs/notes/army-war-room-art-prompts.md). No labels, characters or controls are baked into the room.

Production asset: `src/art/ui/war-room.png`, resized from 1024×1536 to 768×1152 with Pillow's default resize and saved as optimised RGB PNG. The existing build UI loop copies and precaches it. Army banner artwork reuses the game's existing boss keepsakes from `src/art/trophies/`.
