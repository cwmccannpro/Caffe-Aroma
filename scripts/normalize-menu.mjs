// Normalizes the one-time Clover snapshot (data/menu.raw.json) into data/menu.json.
//
// Clover semantics are kept: an item's final price = item.price + the sum of the chosen option prices.
// Everything we changed is listed in menu.json -> review[] so the owner can approve it.
//
//   node scripts/normalize-menu.mjs

import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('data/menu.raw.json', 'utf8'));
const rawItems = Object.fromEntries(raw.items.map((i) => [i.id, i]));
const rawMods = {};
for (const m of raw.modifiers) (rawMods[m.groupId] ??= []).push(m);
for (const k in rawMods) rawMods[k].sort((a, b) => a.sortOrder - b.sortOrder);

const slug = (s) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cents = (n) => Math.round(n);
const review = [];
const note = (msg) => review.push(msg);

// ───────────────────────── groups ─────────────────────────
const groups = {};
const addGroup = (g) => {
  groups[g.id] = {
    min: 0,
    max: 1,
    ...g,
    options: g.options.map((o) => ({ id: slug(o.name), price: 0, ...o })),
  };
  return g.id;
};
const optsFrom = (rawGroupId, { rename = {}, drop = [], priceFix = {} } = {}) =>
  (rawMods[rawGroupId] ?? [])
    .filter((m) => !drop.includes(m.name.trim()))
    .map((m) => {
      const name = (rename[m.name.trim()] ?? m.name.trim()).replace(/\s+/g, ' ');
      return { name, price: priceFix[m.name.trim()] ?? m.price };
    });

// milk (single) + boosts (multi)
addGroup({
  id: 'milk',
  name: 'Milk',
  kind: 'milk',
  options: [
    { name: 'Whole', price: 0 },
    { name: 'Skim', price: 0 },
    { name: 'Oat', price: 140 },
    { name: 'Almond', price: 135 },
    { name: 'Coconut', price: 145 },
  ],
  default: 'whole',
});
addGroup({
  id: 'milk-alt',
  name: 'Milk',
  kind: 'milk',
  options: [
    { name: 'Whole', price: 0 },
    { name: 'Oat', price: 75 },
    { name: 'Almond', price: 75 },
    { name: 'Coconut', price: 0 },
  ],
  default: 'whole',
});
addGroup({
  id: 'boost',
  name: 'Boost it',
  kind: 'boost',
  max: 4,
  options: [
    { name: 'Decaf espresso', price: 50 },
    { name: 'Extra shot', price: 150 },
    { name: 'Extra double shot', price: 225 },
    { name: "Lion's mane powder", price: 200 },
  ],
});
addGroup({ id: 'boost-lm', name: 'Boost it', kind: 'boost', max: 1, options: [{ name: "Lion's mane powder", price: 200 }] });

// flavors
const flavorOpts = optsFrom('5Z2CGZQTNQXMC', { drop: ['Any Flavor'], priceFix: { Orange: 75 } });
addGroup({ id: 'flavor', name: 'Add a flavor shot', kind: 'flavor', max: 3, options: flavorOpts });
note('Orange flavor had no price in Clover (all other flavors are +$0.75). We priced it at +$0.75; "Any Flavor" was dropped.');
addGroup({
  id: 'flavor-included',
  name: 'Flavor',
  kind: 'flavor',
  options: optsFrom('S54JE5DS7Q1NE'),
});
addGroup({
  id: 'flavor-included-req',
  name: 'Choose a flavor',
  kind: 'flavor',
  min: 1,
  options: optsFrom('S54JE5DS7Q1NE'),
});

// make-it-your-way (details), filtered by how the drink is served
const D = optsFrom('Q5SEH1AXFJPA2');
const pick = (names) => D.filter((o) => names.includes(o.name));
addGroup({ id: 'details-hot', name: 'Make it your way', kind: 'detail', max: 4, options: pick(['Long Pull', 'Leave Room', 'Extra Hot', 'Not Too Hot']) });
addGroup({ id: 'details-iced', name: 'Make it your way', kind: 'detail', max: 4, options: pick(['Light Ice', 'Extra Ice', 'Long Pull', 'Leave Room']) });

addGroup({
  id: 'whip',
  name: 'Whipped cream',
  kind: 'topping',
  options: [{ name: 'Whipped cream' }, { name: 'No whipped cream' }],
});
addGroup({ id: 'choc', name: 'Chocolate', kind: 'choice', options: [{ name: 'White chocolate' }] });
addGroup({ id: 'tea', name: 'Choose your tea', kind: 'choice', min: 1, options: optsFrom('2ASY4PCJJTNKM', { rename: { 'Chamomile Lemon': 'Chamomile Lemon', 'Earl Greyer': 'Earl Grey' } }) });
addGroup({ id: 'matcha-sweet', name: 'Sweetness', kind: 'choice', min: 1, options: optsFrom('NN6JED3EMTN70') });
addGroup({ id: 'iced-tea-flavor', name: 'Choose your iced tea', kind: 'choice', min: 1, options: optsFrom('TWW9GAX0A575A') });
addGroup({ id: 'smoothie-flavor', name: 'Flavor', kind: 'choice', min: 1, options: optsFrom('0XZR1JWKDP8F6') });
addGroup({ id: 'smoothie-add', name: 'Add-ins', kind: 'boost', max: 2, options: optsFrom('88CB1NT99WQ6J') });
addGroup({ id: 'bread', name: 'Choose your bread', kind: 'choice', min: 1, options: optsFrom('RB7FV039EK5X4', { rename: { 'Butter Croissant sliced': 'Butter croissant' } }) });
addGroup({
  id: 'spreads',
  name: 'Spreads & fillings',
  kind: 'extra',
  max: 13,
  options: optsFrom('81H7RQVS36QB2', { rename: { 'Bacon 2 slices': 'Bacon (2 slices)', 'flavored crm chz': 'Flavored cream cheese', 'Mozzarella Ball Slices': 'Fresh mozzarella' } }),
});
addGroup({ id: 'side', name: 'Add a side', kind: 'extra', options: optsFrom('GMM76QDWY2K7T') });
addGroup({ id: 'box-milk', name: 'Milk alternative for the box', kind: 'milk', options: optsFrom('T4FA9JZ3G5WGW', { rename: { 'Almond milk': 'Almond', 'Oat milk': 'Oat' } }) });
addGroup({
  id: 'kit',
  name: 'What comes with it',
  kind: 'size',
  min: 1,
  options: [
    { name: 'Coffee only, in a to-go container', price: 2700 },
    { name: 'Box + 10 cups, half & half and sugar', price: 3100 },
  ],
});
// Shared size groups (Clover has a different group per drink; same S / M / L idea).
const SIZE_GROUPS = {
  RN4ZJMTVJV9S8: 'Choose Size',
  '7KSDZ53XYNY9M': 'Special Latte Size',
  VSCH8A7SRVZNC: 'San Pel Water Size',
  A6D8J12RG3FGA: '1- Espresso Size',
  HPAVRT0W4P66W: 'Au Lait Size',
  B7YZGGDWKVBAR: '1- Flavored Tea Latte Size',
  AED172EFSVZ00: 'Hot Chocolate Size',
  SCHMST612HMSE: 'Red Eye Size',
  '1R0PB2GKG85AC': '1- Americano Size',
  '6D5MFHEPGXTKP': '1-Breve Size',
  KVW9GT0PN25MM: 'Size specialty drink',
  Z5APV47YYJ7JG: '1-Size',
  P0XHHV08EC8J6: 'Shakerato',
};
const SIZE_ORDER = { Small: 0, Single: 0, '16.9 oz': 0, Medium: 1, Large: 2, Double: 2, Doppio: 2 };
for (const rawId of Object.keys(SIZE_GROUPS)) {
  const opts = optsFrom(rawId, {
    rename: {
      'Small Red Eye': 'Small',
      'Medium Red Eye': 'Medium',
      'Large Red Eye': 'Large',
      'Large - 3 shots': 'Large (3 shots)',
      '16.9 oz (500ml)': '16.9 oz',
      'Double Shakerato': 'Double',
      'Single Shakerato': 'Single',
    },
  }).sort((a, b) => (SIZE_ORDER[a.name.split(' (')[0]] ?? 9) - (SIZE_ORDER[b.name.split(' (')[0]] ?? 9) || a.price - b.price);
  addGroup({ id: `size-${rawId.toLowerCase()}`, name: rawId === 'P0XHHV08EC8J6' ? 'Single or double' : 'Size', kind: 'size', min: 1, options: opts });
}
// Drip coffee: Clover sells three separate items, we sell one item with a size.
addGroup({
  id: 'size-drip',
  name: 'Size',
  kind: 'size',
  min: 1,
  options: [
    { name: 'Small', price: 275 },
    { name: 'Medium', price: 295 },
    { name: 'Large', price: 349 },
  ],
});
note('Coffee Small / Medium / Large (3 Clover items) are merged into one "Drip Coffee" item with a size choice. Prices unchanged.');

// ───────────────────────── group derivation ─────────────────────────
const GROUP_ORDER = ['size', 'kit', 'tea', 'matcha', 'iced-tea', 'smoothie', 'bread', 'choose', 'milk', 'choc', 'flavor', 'boost', 'spreads', 'side', 'details', 'whip'];
const orderOf = (id) => {
  const i = GROUP_ORDER.findIndex((p) => id.startsWith(p));
  return i === -1 ? 50 : i;
};
function deriveGroups(rawItem, serve, force = {}) {
  const has = new Set(rawItem.modifierGroupIds);
  const out = [];
  const add = (id) => id && !out.includes(id) && out.push(id);
  for (const gid of rawItem.modifierGroupIds) {
    if (SIZE_GROUPS[gid]) add(`size-${gid.toLowerCase()}`);
  }
  if (has.has('GGSX8QXTR1XQ2')) {
    add('milk');
    add('boost');
  } else {
    if (has.has('PBKQVMCPHR3JP')) add('milk-alt');
    if (has.has('RWE5QVFP4XXQW')) add('boost-lm');
  }
  if (has.has('5Z2CGZQTNQXMC') || has.has('M96BJQW5D7804')) add('flavor');
  if (has.has('S54JE5DS7Q1NE')) add(force.flavorRequired ? 'flavor-included-req' : 'flavor-included');
  if (has.has('GGA18XM62A5XW')) add('choc');
  if (has.has('2ASY4PCJJTNKM')) add('tea');
  if (has.has('NN6JED3EMTN70')) add('matcha-sweet');
  if (has.has('TWW9GAX0A575A')) add('iced-tea-flavor');
  if (has.has('0XZR1JWKDP8F6')) add('smoothie-flavor');
  if (has.has('88CB1NT99WQ6J')) add('smoothie-add');
  if (has.has('RB7FV039EK5X4')) add('bread');
  if (has.has('81H7RQVS36QB2')) add('spreads');
  if (has.has('GMM76QDWY2K7T')) add('side');
  if (has.has('Q5SEH1AXFJPA2') && serve !== 'none') add(serve === 'iced' ? 'details-iced' : 'details-hot');
  if (has.has('GPGYQMBJQM9PA')) add('whip');
  if (has.has('T4FA9JZ3G5WGW')) add('box-milk');
  return out.sort((a, b) => orderOf(a) - orderOf(b));
}

// ───────────────────────── categories ─────────────────────────
const categories = [
  { id: 'specials', name: "Today's Specials", blurb: 'Seasonal pours and off-menu favorites.', daypart: 'any' },
  { id: 'coffee', name: 'Coffee', blurb: 'Brewed by the cup.', daypart: 'morning' },
  { id: 'espresso', name: 'Espresso Bar', blurb: 'Pulled to order, hot.', daypart: 'morning' },
  { id: 'iced', name: 'Iced & Blended', blurb: 'Over ice or blended.', daypart: 'day' },
  { id: 'tea', name: 'Tea, Soda & More', blurb: 'Loose-leaf tea, chai, matcha, cocoa.', daypart: 'day' },
  { id: 'breakfast', name: 'Bagels & Breakfast', blurb: 'Served all day.', daypart: 'morning' },
  { id: 'sweets', name: 'Sweets', blurb: 'Biscotti, cookies and cake.', daypart: 'any' },
  { id: 'cocktails', name: 'Coffee Cocktails', blurb: 'After five the espresso machine moonlights.', daypart: 'night' },
  { id: 'beer', name: 'Beer', blurb: 'Cold, canned and bottled.', daypart: 'night' },
  { id: 'wine', name: 'Wine', blurb: 'By the bottle.', daypart: 'night' },
  { id: 'box', name: 'Coffee Box', blurb: 'Joe to go, for the office or the park.', daypart: 'any' },
];

// ───────────────────────── items ─────────────────────────
// vessel -> the little 3D preview / glyph. liquid -> color of the drink.
const L = { espresso: '#3a2112', americano: '#4a2c19', coffee: '#4f3320', latte: '#b98a5e', cap: '#c49a6c', mocha: '#6a3f2c', chai: '#b0743c', matcha: '#7f9a4e', golden: '#e3a82b', fog: '#cdbba0', cocoa: '#4a281c', tea: '#b86a2c', juice: '#e8922a', water: '#cfe6ee', soda: '#d9486b', blueberry: '#5b4a8f', cherry: '#7c2a35', pumpkin: '#b9722f', rum: '#a3622f', smoothie: '#d6546a' };
const spec = [];
const S = (o) => spec.push(o);

// specials
S({ id: '0ZN6195FVNB30', cat: 'specials', name: 'Peppered Pumpkin Cortado', desc: 'Pumpkin spice pulled into espresso, a pinch of black pepper steamed with the milk, cinnamon on top.', vessel: 'cup', liquid: L.pumpkin, serve: 'hot', tags: ['special', 'seasonal'] });
S({ id: '4ZG4Q946TN5RP', cat: 'specials', name: 'Chocolate Cherry Latte', desc: 'Our mocha mix with cherry and espresso, topped off with steamed milk.', vessel: 'cup', liquid: L.cherry, serve: 'hot', tags: ['special'], fixRaw: 'Clover name: "Chocolate Cherrt Latte Aka Mocha Mix Choc Cheery With Espresso Then Add Milk" (typo + recipe in the name).', sizeGroup: 'KVW9GT0PN25MM' });
S({ id: 'K3JZS8Y6Q7PAP', cat: 'specials', name: 'Rose London Fog', desc: 'Earl grey and rose with steamed milk. The Lucy Dacus special.', vessel: 'cup', liquid: L.fog, serve: 'hot', tags: ['special'], sizeGroup: 'B7YZGGDWKVBAR', noFlavor: true, review: 'Clover name is "Lucy Dacus Rose London Fog": confirm the name/story is OK to publish.' });
S({ id: 'N88X2MCTXW68Y', cat: 'specials', name: 'Frittata & Coffee Mimosa', desc: 'The weekend special: a baked frittata with a coffee mimosa.', vessel: 'plate', liquid: L.juice, serve: 'none', tags: ['special'], ageRestricted: true, review: 'Clover calls this "Special Frittata Coffee Mimossa" ($16.50) and does not flag it 21+. We treat it as alcohol (mimosa) until confirmed.' });

// coffee
S({ id: 'DRIP', cat: 'coffee', name: 'Drip Coffee', desc: 'Fresh-brewed house coffee, hot all day.', vessel: 'cup', liquid: L.coffee, serve: 'hot', tags: ['popular'], synth: { price: 0, sizeGroup: 'size-drip', from: 'EB7R4BNPAGZV0' } });
S({ id: 'JJ4RRAT1M65V2', cat: 'coffee', name: 'Café au Lait', desc: 'Brewed coffee with steamed milk.', vessel: 'cup', liquid: L.latte, serve: 'hot', tags: [] });

// espresso bar
S({ id: 'ESPRESSO', cat: 'espresso', name: 'Espresso', desc: 'A single or a doppio, pulled to order.', vessel: 'demi', liquid: L.espresso, serve: 'hot', tags: [], synth: { price: 0, from: '6EW49FCKV8FXC' }, review: 'Clover only has "extra Espresso" ($1.75 + a required Single $2.95 / Doppio $3.50). We list it as a standalone Espresso at the single/doppio prices. Confirm.' });
S({ id: 'H7VAPRXP6YG5G', cat: 'espresso', name: 'Americano', desc: 'Espresso lengthened with hot water.', vessel: 'cup', liquid: L.americano, serve: 'hot', tags: [] });
S({ id: '0651TFGT50J06', cat: 'espresso', name: 'Cappuccino', desc: 'Espresso, steamed milk and a thick cap of foam.', vessel: 'cup', liquid: L.cap, serve: 'hot', foam: true, tags: ['popular'] });
S({ id: '0AFD7VSKFJP48', cat: 'espresso', name: 'Cortado', desc: 'Espresso cut with a splash of warm milk.', vessel: 'demi', liquid: L.cap, serve: 'hot', tags: [] });
S({ id: '44M3T47PQ5GPG', cat: 'espresso', name: 'Macchiato', desc: 'Espresso marked with a spoonful of foam.', vessel: 'demi', liquid: L.cap, serve: 'hot', tags: [] });
S({ id: 'G6NYW4QD995P2', cat: 'espresso', name: 'Latte', desc: 'Espresso with silky steamed milk.', vessel: 'cup', liquid: L.latte, serve: 'hot', foam: true, tags: ['popular'] });
S({ id: 'TFEPH7J76446J', cat: 'espresso', name: 'Mocha', desc: 'Espresso, chocolate and steamed milk.', vessel: 'cup', liquid: L.mocha, serve: 'hot', tags: [] });
S({ id: 'P30TT73Q3E10J', cat: 'espresso', name: 'Breve', desc: 'Espresso with steamed half-and-half.', vessel: 'cup', liquid: L.latte, serve: 'hot', tags: [] });
S({ id: 'REYHQAFTD555W', cat: 'espresso', name: 'Red Eye', desc: 'Brewed coffee with a shot of espresso.', vessel: 'cup', liquid: L.americano, serve: 'hot', tags: [] });
S({ id: 'MN8E5PF093CPE', cat: 'espresso', name: 'Espresso con Panna', desc: 'Espresso crowned with whipped cream.', vessel: 'demi', liquid: L.espresso, serve: 'hot', whip: true, tags: [] });
S({ id: '8JGBZ5X35J2ZG', cat: 'espresso', name: 'Shakerato', desc: 'Espresso shaken over ice until frothy. The Italian summer classic, served cold.', vessel: 'coupe', liquid: L.cap, serve: 'iced', tags: ['italian'] });
S({ id: 'KESN1Z0HCDX2R', cat: 'espresso', name: 'Golden Milk Latte', desc: 'Turmeric, ginger and warm spices with steamed milk. Caffeine-free.', vessel: 'cup', liquid: L.golden, serve: 'hot', tags: [], review: 'Description assumes the standard turmeric-based golden milk. Confirm recipe and caffeine claim.' });

// iced & blended
S({ id: 'E64NZ9F13VPTY', cat: 'iced', name: 'Iced Coffee', desc: 'Brewed strong, poured over ice.', vessel: 'tall', liquid: L.coffee, serve: 'iced', ice: true, tags: [] });
S({ id: '4KW97CR7PARRJ', cat: 'iced', name: 'Iced Americano', desc: 'Two shots of espresso over ice and water.', vessel: 'tall', liquid: L.americano, serve: 'iced', ice: true, tags: [], fixRaw: 'Clover name: "Iced Americano - 2 shots".' });
S({ id: 'W8KD3Z80TQB9C', cat: 'iced', name: 'Iced Latte', desc: 'Espresso and cold milk over ice.', vessel: 'tall', liquid: L.latte, serve: 'iced', ice: true, tags: [] });
S({ id: 'PTT0MB1JRPKBC', cat: 'iced', name: 'Iced Mocha', desc: 'Espresso, chocolate and cold milk over ice.', vessel: 'tall', liquid: L.mocha, serve: 'iced', ice: true, tags: [] });
S({ id: 'TV8T2XJ9ZJQ0Y', cat: 'iced', name: 'Iced Red Eye', desc: 'Iced coffee with a shot of espresso.', vessel: 'tall', liquid: L.americano, serve: 'iced', ice: true, tags: [] });
S({ id: 'WEQ9YHXKEEZKP', cat: 'iced', name: 'Honey Iced Espresso', desc: 'Espresso sweetened with honey, shaken over ice.', vessel: 'tall', liquid: L.golden, serve: 'iced', ice: true, tags: [], review: 'Description is our guess from the name (honey + espresso over ice).' });
S({ id: 'SP81FSTB28XE2', cat: 'iced', name: 'Flavored Iced Latte', desc: 'Iced latte with your choice of syrup.', vessel: 'tall', liquid: L.latte, serve: 'iced', ice: true, tags: [], flavorRequired: true });
S({ id: 'QR34ACF31R6M4', cat: 'iced', name: 'Iced Chai', desc: 'Spiced chai and cold milk over ice.', vessel: 'tall', liquid: L.chai, serve: 'iced', ice: true, tags: [] });
S({ id: 'BMTAS905BYE62', cat: 'iced', name: 'Iced Matcha Latte', desc: 'Whisked matcha and cold milk over ice.', vessel: 'tall', liquid: L.matcha, serve: 'iced', ice: true, tags: [] });
S({ id: 'Y9YX38WWNZRGR', cat: 'iced', name: 'Iced Golden Milk Latte', desc: 'Golden milk, poured over ice.', vessel: 'tall', liquid: L.golden, serve: 'iced', ice: true, tags: [] });
S({ id: '2YYVVRG39TFVW', cat: 'iced', name: 'Iced Tea', desc: 'Loose-leaf iced tea, brewed fresh.', vessel: 'tall', liquid: L.tea, serve: 'iced', ice: true, tags: [] });
S({ id: '885F7SETSPSK0', cat: 'iced', name: 'Blended Mocha', desc: 'Espresso and chocolate, blended icy.', vessel: 'tall', liquid: L.mocha, serve: 'iced', blended: true, whip: true, tags: [] });
S({ id: 'SZ6JNM12WDKVC', cat: 'iced', name: 'Blended Frozen Latte', desc: 'A frozen latte with your choice of syrup.', vessel: 'tall', liquid: L.latte, serve: 'iced', blended: true, tags: [], flavorRequired: true });
S({ id: 'S6GWXZ9SF3W2J', cat: 'iced', name: 'Smoothie', desc: 'Blended fruit smoothie, strawberry or mango.', vessel: 'tall', liquid: L.smoothie, serve: 'iced', blended: true, tags: [] });
S({ id: 'FYC8DH85RP2XC', cat: 'iced', name: 'Green Tea Shake', desc: 'Matcha blended thick and cold.', vessel: 'tall', liquid: L.matcha, serve: 'iced', blended: true, tags: [] });

// tea, soda & more
S({ id: 'GENKY8B45XHJA', cat: 'tea', name: 'Chai Latte', desc: 'Spiced chai with steamed milk.', vessel: 'cup', liquid: L.chai, serve: 'hot', foam: true, tags: ['popular'] });
S({ id: 'YMRNRWC2A738Y', cat: 'tea', name: 'Matcha Latte', desc: 'Whisked matcha with steamed milk.', vessel: 'cup', liquid: L.matcha, serve: 'hot', tags: [] });
S({ id: '3WVJTZJ3QP3RY', cat: 'tea', name: 'Flavored Tea Latte', desc: 'Hot tea topped with steamed milk and a flavor shot of your choice.', vessel: 'cup', liquid: L.fog, serve: 'hot', tags: [], originalDesc: true });
S({ id: '3A3K7D8RDH4X4', cat: 'tea', name: 'Tea', desc: 'A pot-style cup of loose-leaf tea.', vessel: 'cup', liquid: L.tea, serve: 'hot', tags: [], review: 'Description is our guess.' });
S({ id: 'BS0AK65CADSNM', cat: 'tea', name: 'Hot Cocoa', desc: 'Rich hot chocolate, made to order.', vessel: 'mug', liquid: L.cocoa, serve: 'hot', whip: true, tags: [], sizeGroup: 'AED172EFSVZ00', forceRequiredSize: true });
S({ id: '3Q4HEBG6THKGE', cat: 'tea', name: 'Flavored Steamer', desc: 'Steamed milk with your choice of flavor. Caffeine-free.', vessel: 'mug', liquid: L.fog, serve: 'hot', tags: [], sizeGroup: 'AED172EFSVZ00', forceRequiredSize: true, flavorRequired: true });
S({ id: 'RRQ19SAX36K2Y', cat: 'tea', name: 'Italian Soda', desc: 'Sparkling water and your choice of flavor, over ice.', vessel: 'tall', liquid: L.soda, serve: 'iced', ice: true, tags: [], flavorRequired: true });
S({ id: 'CP25YZD7EGETA', cat: 'tea', name: 'Cremosa', desc: 'An Italian soda with cream. Pick your flavor.', vessel: 'tall', liquid: L.soda, serve: 'iced', ice: true, tags: [], flavorRequired: true, review: 'Description is our guess ("cremosa" = Italian soda + cream).' });
S({ id: 'CJ5SVYMQ2FGZP', cat: 'tea', name: 'Juice', desc: 'Bottled juice.', vessel: 'tall', liquid: L.juice, serve: 'none', tags: [] });
S({ id: 'KD8H1ES1EV4CY', cat: 'tea', name: 'Bottled Water', desc: 'Still water.', vessel: 'bottle', liquid: L.water, serve: 'none', tags: [] });
S({ id: 'CN4PK8EP6D8TJ', cat: 'tea', name: 'San Pellegrino', desc: 'Sparkling mineral water.', vessel: 'bottle', liquid: L.water, serve: 'none', tags: [], fixRaw: 'Clover name: "San Pel Water".' });

// breakfast
S({ id: 'FY0W5XMJAJ7KJ', cat: 'breakfast', name: 'Breakfast Sandwich', desc: 'Built on your choice of bagel, croissant or toast. Add bacon, ham, turkey and cheese.', vessel: 'sandwich', liquid: '#d9a441', serve: 'none', tags: ['popular'], review: 'Base price $6.99; the Clover fillings group (ham, turkey, bacon, cheeses) is offered as add-ons. Confirm what is included.' });
S({ id: 'WKKK6MM0HV8D4', cat: 'breakfast', name: 'Bagel', desc: 'A fresh bagel with your choice of spread.', vessel: 'bagel', liquid: '#d9a441', serve: 'none', tags: [] });
S({ id: 'BBY8GF96D6P54', cat: 'breakfast', name: 'Yogurt & Granola Parfait', desc: 'Yogurt layered with granola.', vessel: 'parfait', liquid: '#f1dfc2', serve: 'none', tags: [], review: 'Description is our guess.' });

// sweets
S({ id: 'BF1HGM5MXGC9G', cat: 'sweets', name: 'Biscotti', desc: 'Twice-baked Italian cookie, made for dunking.', vessel: 'cookie', liquid: '#c58b4b', serve: 'none', tags: ['popular'], fixRaw: 'Clover name: "Biscotti for Everybotti each".' });
S({ id: '1PTJ6FC705TX6', cat: 'sweets', name: 'Gluten-Free Biscotti', desc: 'The same dunker, gluten free.', vessel: 'cookie', liquid: '#c58b4b', serve: 'none', tags: ['gluten-free'], fixRaw: 'Clover name: "Biscotti for Everybotti Gluten Free Biscotti".' });
S({ id: 'M0B7W521Q9QSW', cat: 'sweets', name: "Amy's Cookie", desc: 'A small cookie baked at Amy’s.', vessel: 'cookie', liquid: '#b97a3d', serve: 'none', tags: [], fixRaw: 'Clover name: "Small Amys Cookie".', review: 'Clover links these bakes to "Amy’s". Confirm bakery relationship and wording.' });
S({ id: 'H878558BJZ4PW', cat: 'sweets', name: 'Snowball Cookies', desc: 'Two powdered-sugar snowball cookies.', vessel: 'cookie', liquid: '#f2ece0', serve: 'none', tags: [], fixRaw: 'Clover name: "Two Snowball Cookie".' });
S({ id: '5F7ZH38KDRDV6', cat: 'sweets', name: 'Carrot Cake', desc: 'A slice of housemade carrot cake from Amy’s.', vessel: 'cake', liquid: '#c9783a', serve: 'none', tags: [], fixRaw: 'Clover name: "Carrot cake housemade at Amy\'s".' });
S({ id: '5HXJ035MDRD5C', cat: 'sweets', name: 'Carrot Cake Minis', desc: 'Carrot-cake cupcake muffins.', vessel: 'cake', liquid: '#c9783a', serve: 'none', tags: [], fixRaw: 'Clover name: "Carrot Cake Minis Cupcake Muffins".' });

// cocktails
S({ id: '4CD3792BH1HAG', cat: 'cocktails', name: 'Bahama Nada Latte', desc: 'Ritual rum and coconut in espresso with steamed milk and cinnamon on top.', vessel: 'cup', liquid: L.rum, serve: 'hot', tags: ['alcohol', 'signature'], ageRestricted: true, fixRaw: 'Clover name: "Bahama Nada Latte (Small)~ 1.5 Oz Ritual Rum + 1oz Coconut In Espresso// Steamed Milk\\\\ Cin Powder On Top".' });
S({ id: 'A9PPNJAN9TSQ6', cat: 'cocktails', name: 'Blueberry Mocktail', desc: 'Blueberry, lemon and basil muddled with vanilla and malt, shaken and finished with soda.', vessel: 'tall', liquid: L.blueberry, serve: 'iced', ice: true, tags: ['zero-proof'], fixRaw: 'Clover name: "Blueberry Mocktail~ 1 Scoop Blueb, Half Lemon, 1 Basilleaf Muddled\\\\ …".' });

// beer & wine
const beer = [
  ['8W53ZFWPW9HSJ', 'Surfside Half & Half', 'Iced tea and lemonade with vodka, canned.', 'can'],
  ['F74STS772ZW06', 'Surfside Blueberry Lemonade', 'Blueberry lemonade with vodka, canned.', 'can'],
  ['3BR0FCB1EXK5J', 'Modelito', 'A little Modelo, ice cold.', 'bottle'],
  ['8SYV7TBTAD95J', 'Modelito 4-for-12', 'Four Modelitos for twelve dollars.', 'bottle'],
  ['TWYYA7SQN44NC', 'Abita', 'Louisiana craft lager.', 'bottle'],
  ['FAKWXTEVTW564', 'Deschutes Black Butte Porter', 'Oregon’s dark, chocolatey porter.', 'bottle'],
  ['G2D5MMZX267WE', 'Spaten', 'Crisp Munich-style lager.', 'bottle'],
];
for (const [id, name, desc, vessel] of beer) S({ id, cat: 'beer', name, desc, vessel, liquid: '#c98a2b', serve: 'none', tags: ['alcohol'], ageRestricted: true, review: id === '3BR0FCB1EXK5J' || id === '8SYV7TBTAD95J' ? 'Clover spells it "Modelito". Confirm it is a small Modelo, and whether beer prices like $5.52 / $6.94 are tax-inclusive.' : undefined });
S({ id: '7VYE7WSCS29HT', cat: 'wine', name: 'La Marca Prosecco (187 ml)', desc: 'A single-serve split of sparkling prosecco.', vessel: 'flute', liquid: '#f0e2a3', serve: 'none', tags: ['alcohol'], ageRestricted: true, fixRaw: 'Clover shows this as Unavailable.' });

// box
S({ id: 'JOE', cat: 'box', name: 'Joe to Go', desc: 'A whole to-go container of fresh coffee.', vessel: 'box', liquid: L.coffee, serve: 'none', tags: [], synth: { price: 0, from: '74SFTT40DFT0M', kit: true } });

// ───────────────────────── build ─────────────────────────
const items = [];
for (const s of spec) {
  const base = s.synth ? rawItems[s.synth.from] : rawItems[s.id];
  if (!base) throw new Error(`Missing raw item ${s.id}`);
  const price = s.synth ? s.synth.price : cents(base.price);
  const gids = deriveGroups(base, s.serve, { flavorRequired: s.flavorRequired });
  if (s.synth?.sizeGroup) gids.unshift(s.synth.sizeGroup);
  if (s.synth?.kit) {
    gids.length = 0;
    gids.push('kit', 'box-milk');
  }
  if (s.id === 'ESPRESSO') {
    gids.length = 0;
    gids.push('size-a6d8j12rg3fga', 'flavor');
  }
  if (s.noFlavor) {
    const i = gids.indexOf('flavor');
    if (i >= 0) gids.splice(i, 1);
    const j = gids.indexOf('flavor-included');
    if (j >= 0) gids.splice(j, 1);
  }
  if (s.sizeGroup && !gids.includes(`size-${s.sizeGroup.toLowerCase()}`)) {
    const sizeId = `size-${s.sizeGroup.toLowerCase()}`;
    gids.unshift(sizeId);
  }
  if (s.forceRequiredSize) {
    const sid = gids.find((g) => g.startsWith('size-'));
    if (sid && groups[sid].min === 0) groups[sid].min = 1;
  }
  // Items with $0 base price must have a required size/choice or they would be free.
  const requiresPrice = price === 0 && !gids.some((g) => groups[g]?.kind === 'size' && groups[g].min >= 1);
  if (requiresPrice) throw new Error(`Item ${s.name} has $0 base and no required size group`);

  const available = base.available !== false;
  const tags = [...(s.tags ?? [])];
  if (s.ageRestricted && !tags.includes('alcohol')) tags.push('alcohol');
  const item = {
    id: s.id,
    slug: slug(s.name),
    name: s.name,
    description: s.originalDesc ? base.description : s.desc,
    categoryId: s.cat,
    price,
    groups: gids,
    tags,
    ageRestricted: !!s.ageRestricted,
    available,
    serve: s.serve,
    preview: { vessel: s.vessel, liquid: s.liquid, foam: !!s.foam, ice: !!s.ice, whip: !!s.whip, blended: !!s.blended },
    draftedByUs: !s.originalDesc,
  };
  if (s.review) {
    item.review = s.review;
    note(`${s.name}: ${s.review}`);
  }
  if (s.fixRaw) note(`${s.name}: ${s.fixRaw}`);
  items.push(item);
}

// Only keep groups that are used.
const used = new Set(items.flatMap((i) => i.groups));
for (const gid of Object.keys(groups)) if (!used.has(gid)) delete groups[gid];
for (const [gid, g] of Object.entries(groups)) {
  if (g.min === undefined) g.min = 0;
  if (g.kind === 'size' || g.min >= 1) g.max = Math.max(1, g.max ?? 1);
}
// Required choice groups are single-select unless explicitly multi.
for (const g of Object.values(groups)) {
  if (g.kind === 'size' || g.kind === 'milk' || g.kind === 'choice') g.max = 1;
}

// POS-only entries we deliberately hide from online ordering.
const hiddenPos = ['X49QM8HK7V6XW', 'K76ARZXWHJMX2', '2HMTQRJPY6KNM', 'KVV3QNKDHZMDR', '675YWEVZJDWKA', '3PTH3GSFMESEA', 'N74FEJHFSMM08', 'BJE4V4Z0Y9JDG', '829YG5EGSTQDY'].map((id) => ({ id, name: rawItems[id].name, price: rawItems[id].price }));
note('Rum, Tequila, Gin, Bourbon, Irish Whiskey and Vodka are $0 POS buttons in Clover (no price). They are NOT orderable on the new site until the owner gives prices (e.g., as a "spike it" add-in).');
note('Bacon Side ($1.75), "oat milk" ($1.40) and "Food Extras" ($0) look like register add-on buttons, so they are hidden as standalone items. Bacon and oat milk are available as options instead.');
note('Clover has EMPTY online categories: Wine by glass, cocktails, SPRITZEZ, Digestivi, Gift Cards, merch, Coffee By The Pound, Buffalo Delights Bakery Items. The in-house bar menu is not online.');
note('No item is flagged 21+ in Clover, not even the beer. We flag all alcohol 21+ and restrict it to for-here orders (confirm license terms).');
note('Clover asks "To go / Here" on every item. On the new site it is a single order-level choice.');
note('Clover item groups for Decaf, Half Caff, Room 4, Temp, Alcohol Up, frittata are empty (no options) and were dropped; Candy Cane (seasonal) was dropped.');
note('All descriptions marked draftedByUs are our wording and need owner approval.');

const out = {
  meta: {
    source: 'Clover online ordering snapshot (public storefront JSON)',
    merchantSlug: 'the-caffe-elmwood-llc-buffalo',
    snapshotAt: new Date().toISOString(),
    currency: 'USD',
    note: 'Prices in cents. Final price = item.price + sum(selected option prices).',
  },
  categories,
  groups,
  items,
  hiddenPos,
  review,
};
fs.writeFileSync('data/menu.json', JSON.stringify(out, null, 2));

// ───────────────────────── report ─────────────────────────
const byCat = Object.groupBy(items, (i) => i.categoryId);
console.log(`items: ${items.length}  groups: ${Object.keys(groups).length}  categories: ${categories.length}`);
for (const c of categories) console.log(`  ${c.name.padEnd(20)} ${byCat[c.id]?.length ?? 0}`);
const from = (it) => it.price + it.groups.map((g) => groups[g]).filter((g) => g.min >= 1).reduce((a, g) => a + Math.min(...g.options.map((o) => o.price)), 0);
console.log('sample from-prices:', items.slice(0, 40).map((i) => `${i.name} $${(from(i) / 100).toFixed(2)}`).join(' | '));
console.log('review notes:', review.length);
