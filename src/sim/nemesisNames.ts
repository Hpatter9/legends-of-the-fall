// The Nemesis War's names (`docs/design/legends-expansion.md`, section 2.2; `docs/notes/nemesis-1.md`): forty to each army, in its own
// voice: the orcs gruff, the dead cold, the beasts snarling, the Wildwood fey, the Labyrinth proud, the ogres dim, the pit grand, the yokai
// riddling and the golems formal. A newborn nemesis takes one its army has not given to a living or a fallen nemesis yet. Pure data.

export const NEMESIS_NAMES: Readonly<Record<string, readonly string[]>> = {
  orcs: [
    'Gash', 'Throg', 'Murzog', 'Skarr', 'Grishna', 'Uzgul', 'Bolg the Lesser', 'Krang', 'Ratbag', 'Lugdash', 'Snaga', 'Durgat', 'Hruk', 'Mogga',
    'Azgar', 'Brakk', 'Gorbag', 'Shagrat', 'Ugluk', 'Zogg', 'Nazgar', 'Grubnak', 'Morgash', 'Thrak', 'Bugrash', 'Drogg', 'Kurgan', 'Lurz', 'Mukk',
    'Ogdar', 'Pug', 'Rukh', 'Skulg', 'Tarvok', 'Ulgra', 'Vorg', 'Wraz', 'Yagga', 'Zurn', 'Grimbol',
  ],
  undead: [
    'Morrow', 'Sister Ash', 'Old Hollin', 'Veyne', 'the Pale Clerk', 'Grieve', 'Marrowin', 'Lady Cinder', 'Tallow', 'Brother Silt', 'Ossian', 'Wick',
    'Mournwell', 'Hask', 'Sallow Jen', 'Corvin', 'the Widow Rue', 'Dreg', 'Lantern Tom', 'Sexton', 'Ebb', 'Gravel', 'Halloway', 'Ivo Dust', 'Kell',
    'Lorn', 'Mother Thorn', 'Nell Bane', 'Orrin', 'Pell', 'Quill', 'Rattle', 'Shroud', 'Tithe', 'Umber', 'Vesper', 'Whisper', 'Yew', 'Zeal', 'Barrow',
  ],
  beasts: [
    'Rend', 'Old Scar', 'Gristle', 'Ash-Pelt', 'Howl', 'Snarl', 'Ripjaw', 'Grey Mother', 'Fang', 'Blacktongue', 'Mange', 'Gnash', 'Moonbite', 'Scruff',
    'Torn-Ear', 'Bristle', 'Rook', 'Ember-Eye', 'Hackle', 'Slaver', 'Wolfsbane', 'Night-Runner', 'Bone-Gnaw', 'Cinderpaw', 'Dusk', 'Fell', 'Grizzle',
    'Hunger', 'Ironjaw', 'Kill-Song', 'Lurk', 'Muzzle', 'Notch', 'Prowl', 'Quarry', 'Red Morning', 'Stalk', 'Thistle', 'Umbra', 'Wither',
  ],
  wildwood: [
    'Briar', 'Thistledown', 'Mother Moss', 'Quickthorn', 'Old Rowan', 'Puck-in-the-Hollow', 'Bramblewick', 'Sorrel', 'Hazelmere', 'Nettle', 'Vey of the Thorns',
    'Lady Fennick', 'Mistletoe', 'Ashling', 'Burdock', 'Catkin', 'Dewfall', 'Elderberry', 'Foxglove', 'Gorse', 'Hemlock', 'Ivy Long', 'Juniper',
    'Kestrel', 'Larkspur', 'Mugwort', 'Nightshade', 'Oakapple', 'Pipewort', 'Reedling', 'Sloe', 'Tansy', 'Underleaf', 'Vervain', 'Willowisp', 'Yarrow',
    'Bluebell Jack', 'Cowslip', 'Dandel', 'Wren-of-the-Ring',
  ],
  labyrinth: [
    'Asterion the Proud', 'Kerys', 'Daedra', 'Minos the Younger', 'Pasiphon', 'Stheno', 'Euryal', 'Labrys', 'Taurok', 'Ariadnos', 'Phaedon', 'Ikaros',
    'Kretheus', 'Gorgona', 'Medon', 'Argos', 'Brontes', 'Charon', 'Dexios', 'Erebon', 'Hippos', 'Iolas', 'Kallias', 'Lykon', 'Menos', 'Nikias',
    'Orthos', 'Pyrrhos', 'Rhodos', 'Skiron', 'Telamon', 'Xanthos', 'Zelos', 'Aethra', 'Chryse', 'Delos', 'Helike', 'Korinna', 'Thaleia', 'Xenia',
  ],
  ogres: [
    'Big Mung', 'Lumpy', 'Grub', 'Thudd', 'Bonk', 'Old Belly', 'Krumble', 'Mudge', 'Gristlegut', 'Dunk', 'Hobb', 'Snorrt', 'Bludge', 'Clod', 'Drool',
    'Flab', 'Gorm', 'Hulk', 'Jowl', 'Knuckle', 'Lard', 'Mash', 'Nob', 'Oaf', 'Plod', 'Rubble', 'Slab', 'Tump', 'Ugg', 'Wallop', 'Yob', 'Grumbletum',
    'Boulderbum', 'Cudd', 'Dimm', 'Gobble', 'Hoof', 'Lump-Lump', 'Mottle', 'Squat',
  ],
  infernal: [
    'Malphar the Unquenched', 'Ishtrel', 'Vasharre', 'Zorvath', 'Lady Brimstone', 'Azrakel', 'Belphegon', 'Cinderath', 'Dagrozz', 'Eshkaal', 'Furcas',
    'Gaapir', 'Hastarre', 'Infernia', 'Jezrael', 'Kharnox', 'Lilivex', 'Mammorth', 'Naberus', 'Orobath', 'Phenex', 'Raumel', 'Sabnock', 'Tchort',
    'Uvall', 'Valefar', 'Xaphan', 'Zepar', 'Andromal', 'Bifron', 'Caim', 'Decarabis', 'Gremory', 'Haures', 'Ipos', 'Leraje', 'Marchos', 'Ose',
    'Purson', 'Vepar',
  ],
  yokai: [
    'Kurenai-of-the-Lantern', 'Who-Laughs-Under-Bridges', 'Hoshi', 'Tsukiyo', 'Aogiri', 'The Umbrella that Walks', 'Kagerou', 'Shiranui', 'Yukime',
    'Oboro', 'Hotaru', 'Kitsunebi', 'Mononoke', 'Nue', 'Rokuro', 'Tenko', 'Ubume', 'Yamabiko', 'Zashiki', 'Akaname', 'Bakeneko', 'Enenra', 'Futakuchi',
    'Gashadokuro', 'Hitodama', 'Ittan', 'Jorogumo', 'Kamaitachi', 'Kodama', 'Mikoshi', 'Nopperabo', 'Onibi', 'Raiju', 'Sazae', 'Tanuki-who-Lies',
    'Ungaikyo', 'Wanyudo', 'Yatagarasu', 'Amefuri', 'Ninth Lantern',
  ],
  golems: [
    'Unit Seventeen', 'The Warden of Lintels', 'Ashlar', 'Corbel', 'Plinth', 'Keystone', 'The Ninth Mould', 'Mortise', 'Tenon', 'Quoin', 'Gable',
    'Architrave', 'Buttress', 'Cornice', 'Dentil', 'Entablature', 'Fillet', 'Gargoyle Prime', 'Hammerbeam', 'Impost', 'Jamb', 'Kerf', 'Lintel',
    'Mullion', 'Newel', 'Ogee', 'Pilaster', 'Quarrel', 'Rivet', 'Spandrel', 'Truss', 'Undercroft', 'Voussoir', 'Wainscot', 'Corner-of-the-Forge',
    'Assay', 'Bellows', 'Crucible', 'Dross', 'Ingot',
  ],
};
