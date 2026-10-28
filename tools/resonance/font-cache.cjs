// Keep preview font caches in the writable task workspace, outside game assets.
const fs = require('node:fs');
if (!process.env.FONTCONFIG_FILE) {
  fs.mkdirSync('/tmp/resonance-font-cache', { recursive: true });
  fs.writeFileSync('/tmp/resonance-fonts.conf', '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>/usr/share/fonts</dir><dir>/usr/local/share/fonts</dir><cachedir>/tmp/resonance-font-cache</cachedir></fontconfig>');
  process.env.FONTCONFIG_FILE = '/tmp/resonance-fonts.conf';
}
