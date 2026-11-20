// Build runtime strips from the reference-based, transparent art sheets.
// Run from the repository root. Only public/avatar is served to visitors.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const source = 'src/assets/media/avatar/source';
const out = 'public/avatar';
await mkdir(out + '/props', { recursive: true });
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const opts = { quality: 87, alphaQuality: 100, effort: 6 };
const frame = (width, height) =>
  sharp({ create: { width, height, channels: 4, background: transparent } });
async function crop(name, x, y, width, height) {
  return sharp(source + '/' + name + '.webp')
    .extract({ left: x, top: y, width, height })
    .png()
    .toBuffer();
}
async function strip(name, cells, width, height) {
  const overlays = await Promise.all(
    cells.map(async (input, i) => ({
      input: await sharp(input).resize(width, height, { fit: 'fill' }).png().toBuffer(),
      left: i * width,
      top: 0,
    })),
  );
  await frame(width * cells.length, height)
    .composite(overlays)
    .webp(opts)
    .toFile(out + '/' + name + '.webp');
}

// One horizontal strip per behavior, decoded only when an anchor can play it.
// Register the leaning elbow, seated pelvis and planted sole in each frame.
await strip(
  'lean-phone',
  await Promise.all([74, 505, 935, 1369, 1801].map((x) => crop('pocket', x, 0, 336, 724))),
  126,
  272,
);
await strip(
  'walk',
  await Promise.all(
    Array.from({ length: 8 }, (_, i) => crop('gait', (i % 4) * 384, i < 4 ? 0 : 516, 384, 492)),
  ),
  192,
  246,
);
const turning = await Promise.all(
  [
    [25, 467],
    [548, 234],
    [930, 291],
    [1359, 312],
  ].map(async ([x, width]) =>
    sharp(await crop('turn', x, 10, width, 862))
      .resize({ height: 246 })
      .png()
      .toBuffer({ resolveWithObject: true }),
  ),
);
const stopCells = await Promise.all(
  turning.map(({ data, info }) =>
    frame(144, 246)
      .composite([{ input: data, left: Math.round((144 - info.width) / 2), top: 0 }])
      .png()
      .toBuffer(),
  ),
);
await strip('turn', stopCells, 144, 246);
const phones = await Promise.all(
  [
    [113, 0, 326, 560],
    [607, 0, 326, 560],
    [1108, 0, 326, 560],
    [141, 546, 310, 478],
  ].map(async ([x, y, w, h], i) => {
    const buf = await crop('listening', x, y, w, h);
    // Remove the neighbouring figure's hair between the two shoes / shoes above the head.
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    for (let py = 0; py < h; py++)
      for (let px = 0; px < w; px++) {
        if (
          (i === 0 && py > 546 && px > 131 && px < 206) ||
          (i === 3 && py < 14 && (px < 105 || px > 192))
        )
          data[(py * w + px) * 4 + 3] = 0;
      }
    return sharp(data, { raw: info }).png().toBuffer();
  }),
);
// A nod moves the earcups, glasses and hair with the head, leaving the
// phone hand and seat stationary. The last two cells share the phone pose.
const nod = await flex(phones[3], [[145, 59, 69, 85, 0, 8]]);
await strip('listen', [...phones, nod], 155, 252);
for (const [name, x, y, w, h, render] of [
  ['galaxy-s20-plus', 695, 600, 167, 404, 180],
  ['ath-m20xbt', 1100, 610, 324, 400, 180],
])
  await sharp(await crop('listening', x, y, w, h))
    .resize({ height: render })
    .webp(opts)
    .toFile(out + '/props/' + name + '.webp');

// Small, local mesh offsets keep the contacts fixed. Keys are defined in source
// pixels as [centre X/Y, horizontal/vertical radius, X/Y displacement].
async function flex(input, points) {
  const { data, info } = await sharp(input).raw().toBuffer({ resolveWithObject: true });
  const result = Buffer.from(data);
  for (const [cx, cy, rx, ry, dx, dy] of points) {
    for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(info.height, cy + ry); y++) {
      for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(info.width, cx + rx); x++) {
        const weight = Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2) ** 2;
        const sx = Math.round(x - weight * dx),
          sy = Math.round(y - weight * dy);
        if (sx < 0 || sy < 0 || sx >= info.width || sy >= info.height) continue;
        const at = (sy * info.width + sx) * 4;
        data.copy(result, (y * info.width + x) * 4, at, at + 4);
      }
    }
  }
  return sharp(result, { raw: info }).png().toBuffer();
}
for (const [name, rect, w, h, keys] of [
  [
    'phone',
    [526, 22, 366, 701],
    136,
    260,
    [
      [171, 254, 35, 36, 4, -5],
      [106, 610, 62, 100, 5, 0],
    ],
  ],
  [
    'typing',
    [968, 24, 640, 700],
    220,
    240,
    [
      [354, 299, 56, 26, -2, 6],
      [416, 288, 44, 24, 2, -5],
    ],
  ],
  [
    'inspect',
    [1640, 103, 490, 615],
    182,
    228,
    [
      [362, 540, 66, 70, -4, -12],
      [297, 110, 110, 106, -3, -3],
    ],
  ],
]) {
  const still = await crop('poses', ...rect);
  const opposite = keys.map(([x, y, rx, ry, dx, dy]) => [x, y, rx, ry, -dx, -dy]);
  await strip(name, [still, await flex(still, keys), still, await flex(still, opposite)], w, h);
}
await sharp('src/assets/media/street/source/nikolay-master.webp')
  .extract({ left: 230, top: 10, width: 520, height: 1520 })
  .resize({ height: 260 })
  .webp(opts)
  .toFile(out + '/standing.webp');

// ---------- Café scenario 10-frame strip (public/avatar/cafe.webp) ----------
// 0: idle          (complete hands resting naturally on walnut tabletop, cup on left saucer, Samsung S20+ on right)
// 1: glance        (head turned subtly toward evening café window while seated)
// 2: coffee-reach  (right hand slides across tabletop and contacts the espresso cup on saucer)
// 3: coffee-lift   (cup lifted cleanly off saucer to mid-chest height, empty saucer stays on table)
// 4: coffee-sip    (cup lifted right to lips/mouth with natural head lean for a genuine sip)
// 5: phone-reach   (right hand reaches toward Samsung S20+ Arasaka on table, cup on saucer)
// 6: phone-check   (Samsung S20+ Arasaka held in right hand, tabletop right side 100% clear of phone)
// 7: phone-scroll  (thumb scrolling on Samsung S20+ Arasaka, tabletop right side 100% clear of phone)
// 8: laptop-type-a (dark anodized laptop open on center of table, hands typing keystroke A)
// 9: laptop-type-b (dark anodized laptop open on center of table, hands typing keystroke B)
{
  const raw0 = await sharp(source + '/listening.webp')
    .extract({ left: 113, top: 0, width: 326, height: 550 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = 544; y < 550; y++) {
    for (let x = 128; x < 210; x++) raw0.data[(y * 326 + x) * 4 + 3] = 0;
  }
  const clean0 = await sharp(raw0.data, { raw: raw0.info }).png().toBuffer();

  const raw3 = await sharp(source + '/listening.webp')
    .extract({ left: 141, top: 546, width: 310, height: 478 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 310; x++) {
      if (x < 105 || x > 192) raw3.data[(y * 310 + x) * 4 + 3] = 0;
    }
  }
  const clean3Scaled = await sharp(raw3.data, { raw: raw3.info })
    .resize(336, 518, { fit: 'fill' })
    .extract({ left: 5, top: 0, width: 326, height: 518 })
    .extend({ top: 10, bottom: 22, left: 0, right: 0, background: transparent })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const armMaskSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <polygon points="10,145 118,145 176,145 178,242 156,282 10,282" fill="#fff"/>
  </svg>`);
  const raisedArmMask = await sharp(armMaskSvg).blur(3).extractChannel('alpha').raw().toBuffer();

  const phoneNeckHeadphonesBuf = Buffer.from(raw0.data);
  for (let i = 0; i < raisedArmMask.length; i++) {
    const m = raisedArmMask[i] / 255;
    if (m <= 0) continue;
    const idx = i * 4;
    for (let c = 0; c < 4; c++) {
      phoneNeckHeadphonesBuf[idx + c] = Math.round(
        clean3Scaled.data[idx + c] * m + raw0.data[idx + c] * (1 - m),
      );
    }
  }
  // Clean lowered right forearm (from raw0) and pocket-chain highlight (from raw3)
  // in the wedge between the raised right elbow and the left curve of the tabletop.
  for (let y = 266; y < 328; y++) {
    for (let x = 18; x < 126; x++) {
      const idx = (y * 326 + x) * 4;
      const r = phoneNeckHeadphonesBuf[idx],
        g = phoneNeckHeadphonesBuf[idx + 1],
        b = phoneNeckHeadphonesBuf[idx + 2],
        a = phoneNeckHeadphonesBuf[idx + 3];
      if (a === 0) continue;
      const isSkinOrChain = (r > 70 && r - g >= 9) || (y >= 276 && (r > 48 || g > 48 || b > 52));
      if (!isSkinOrChain) continue;
      if (x < 108) {
        phoneNeckHeadphonesBuf[idx + 3] = 0;
      } else {
        // Blend smoothly into dark hoodie shadow right near the hip/pocket chain
        phoneNeckHeadphonesBuf[idx] = 20;
        phoneNeckHeadphonesBuf[idx + 1] = 20;
        phoneNeckHeadphonesBuf[idx + 2] = 24;
      }
    }
  }
  const phoneBasePng = await sharp(phoneNeckHeadphonesBuf, { raw: raw0.info }).png().toBuffer();
  const cleanPhonePose = await flex(phoneBasePng, [[160, 82, 72, 82, -1, 5]]);
  const scrollPhonePose = await flex(phoneBasePng, [
    [160, 82, 72, 82, 1, 6],
    [138, 200, 38, 36, 3, -4],
  ]);

  // Coffee base: remove the phone silhouette behind the raised right hand using raw0 torso/headphones
  const coffeeHandBuf = Buffer.from(phoneNeckHeadphonesBuf);
  for (let y = 140; y < 208; y++) {
    for (let x = 122; x < 178; x++) {
      const idx = (y * 326 + x) * 4;
      const r = coffeeHandBuf[idx],
        g = coffeeHandBuf[idx + 1],
        b = coffeeHandBuf[idx + 2];
      const isSkin = r > 86 && r - g >= 11 && g - b >= 6;
      if (!isSkin) {
        coffeeHandBuf[idx] = raw0.data[idx];
        coffeeHandBuf[idx + 1] = raw0.data[idx + 1];
        coffeeHandBuf[idx + 2] = raw0.data[idx + 2];
        coffeeHandBuf[idx + 3] = raw0.data[idx + 3];
      }
    }
  }
  const coffeeBasePng = await sharp(coffeeHandBuf, { raw: raw0.info }).png().toBuffer();

  // Frame 3: coffee-lift (mid-chest lift off the saucer)
  const liftFlexed = await flex(coffeeBasePng, [
    [160, 82, 74, 84, -1, 3],
    [136, 204, 54, 50, 2, -6],
  ]);

  const liftCupOverlay =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <defs>
      <linearGradient id="cupLiftBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#403a42"/>
        <stop offset="0.45" stop-color="#27242a"/>
        <stop offset="1" stop-color="#17151a"/>
      </linearGradient>
    </defs>
    <path d="M138 183 C129 183 129 196 139 196" fill="none" stroke="#d98a4e" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M138 177 H162 L160 205 C160 208 140 208 140 205 Z" fill="url(#cupLiftBody)" stroke="#c4814e" stroke-width="1.3"/>
    <ellipse cx="150" cy="177" rx="12" ry="3.4" fill="#3b271c" stroke="#d98a4e" stroke-width="1.2"/>
    <ellipse cx="150" cy="177.5" rx="9.2" ry="2.2" fill="#96582e"/>
  </svg>`);

  const rawLift = await sharp(liftFlexed).raw().toBuffer({ resolveWithObject: true });
  const liftFingersBuf = Buffer.alloc(rawLift.data.length);
  for (let y = 180; y < 220; y++) {
    for (let x = 128; x < 168; x++) {
      const idx = (y * 326 + x) * 4;
      const r = rawLift.data[idx],
        g = rawLift.data[idx + 1],
        b = rawLift.data[idx + 2],
        a = rawLift.data[idx + 3];
      if (r > 84 && r - g >= 11 && g - b >= 6) {
        liftFingersBuf[idx] = r;
        liftFingersBuf[idx + 1] = g;
        liftFingersBuf[idx + 2] = b;
        liftFingersBuf[idx + 3] = a;
      }
    }
  }
  const liftFingersPng = await sharp(liftFingersBuf, { raw: rawLift.info }).png().toBuffer();

  // Frame 4: coffee-sip (physically convincing sip — right arm & tilted espresso cup lifted right to mouth/lips!)
  // Extract the raised right sleeve + forearm + hand from rawLift and lift it cleanly by (dx=+10, dy=-50)
  // with feathered lower-sleeve alpha blending so there is no hard step at the elbow.
  const sipArmBuf = Buffer.alloc(rawLift.data.length);
  for (let y = 158; y < 274; y++) {
    for (let x = 44; x < 170; x++) {
      const idx = (y * 326 + x) * 4;
      const r = rawLift.data[idx],
        g = rawLift.data[idx + 1],
        b = rawLift.data[idx + 2],
        a = rawLift.data[idx + 3];
      if (a < 20) continue;
      const isSkin = r > 78 && r - g >= 10 && g - b >= 5;
      const inSleeve = x >= 48 && x <= 144 && y >= 196 && y <= 270;
      if (!isSkin && !inSleeve) continue;
      const dx = 10;
      const dy = -50;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= 326 || ny < 0 || ny >= 550) continue;
      // Smoothly feather the lower edge of the shifted sleeve (y=248..270) into the torso hoodie
      const feather = !isSkin && y > 246 ? Math.max(0, 1 - (y - 246) / 24) : 1;
      const nidx = (ny * 326 + nx) * 4;
      sipArmBuf[nidx] = r;
      sipArmBuf[nidx + 1] = g;
      sipArmBuf[nidx + 2] = b;
      sipArmBuf[nidx + 3] = Math.round(a * feather);
    }
  }
  const sipArmPng = await sharp(sipArmBuf, { raw: rawLift.info }).png().toBuffer();

  // Clean torso under the lifted sip arm: use phoneNeckHeadphonesBuf (which already has the lowered
  // right forearm removed cleanly!) and clear any outer left-elbow pixels outside x<74, y>256.
  const sipTorsoBuf = Buffer.from(phoneNeckHeadphonesBuf);
  for (let y = 175; y < 328; y++) {
    for (let x = 18; x < 176; x++) {
      const idx = (y * 326 + x) * 4;
      const r = sipTorsoBuf[idx],
        g = sipTorsoBuf[idx + 1],
        b = sipTorsoBuf[idx + 2],
        a = sipTorsoBuf[idx + 3];
      if (a === 0) continue;
      const isRaisedPhoneOrHand = x >= 92 && x <= 176 && y >= 145 && y <= 262;
      if (isRaisedPhoneOrHand) {
        sipTorsoBuf[idx] = raw0.data[idx];
        sipTorsoBuf[idx + 1] = raw0.data[idx + 1];
        sipTorsoBuf[idx + 2] = raw0.data[idx + 2];
        sipTorsoBuf[idx + 3] = raw0.data[idx + 3];
      }
      const r2 = sipTorsoBuf[idx],
        g2 = sipTorsoBuf[idx + 1],
        b2 = sipTorsoBuf[idx + 2];
      const isSkinOrChain =
        (y >= 240 && r2 > 70 && r2 - g2 >= 9) ||
        (y >= 274 && x < 126 && (r2 > 48 || g2 > 48 || b2 > 52));
      if (isSkinOrChain) {
        if (x < 108) {
          sipTorsoBuf[idx + 3] = 0;
        } else {
          sipTorsoBuf[idx] = 20;
          sipTorsoBuf[idx + 1] = 20;
          sipTorsoBuf[idx + 2] = 24;
        }
      }
    }
  }
  const sipTorsoBase = await sharp(sipTorsoBuf, { raw: raw0.info }).png().toBuffer();
  const sipTorsoFlexed = await flex(sipTorsoBase, [[162, 84, 74, 86, -2, 8]]);

  // Tilted espresso cup right at his mouth/lips (cx=160, rim y=124)
  const sipCupAtMouthSvg =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <defs>
      <linearGradient id="sipCupBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#453f48"/>
        <stop offset="0.45" stop-color="#2a262d"/>
        <stop offset="1" stop-color="#18161b"/>
      </linearGradient>
    </defs>
    <g transform="translate(160, 138) rotate(-14)">
      <path d="M-12 -6 C-21 -6 -21 7 -11 7" fill="none" stroke="#d98a4e" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M-12 -12 H12 L10 15 C10 18 -10 18 -10 15 Z" fill="url(#sipCupBody)" stroke="#d08a54" stroke-width="1.3"/>
      <ellipse cx="0" cy="-12" rx="12" ry="3.2" fill="#3b271c" stroke="#e09457" stroke-width="1.2"/>
      <ellipse cx="0" cy="-11.5" rx="9" ry="2.1" fill="#9c5c30"/>
    </g>
  </svg>`);

  // Foreground gripping fingers wrapped around the tilted cup at mouth level
  const sipFingersBuf = Buffer.alloc(sipArmBuf.length);
  for (let y = 128; y < 174; y++) {
    for (let x = 136; x < 178; x++) {
      const idx = (y * 326 + x) * 4;
      const r = sipArmBuf[idx],
        g = sipArmBuf[idx + 1],
        b = sipArmBuf[idx + 2],
        a = sipArmBuf[idx + 3];
      if (a > 20 && r > 84 && r - g >= 11 && g - b >= 6) {
        sipFingersBuf[idx] = r;
        sipFingersBuf[idx + 1] = g;
        sipFingersBuf[idx + 2] = b;
        sipFingersBuf[idx + 3] = a;
      }
    }
  }
  const sipFingersPng = await sharp(sipFingersBuf, { raw: rawLift.info }).png().toBuffer();

  // Extract COMPLETE forearms, wrists, watch and full unchopped fingers (y=238..maxY) resting ON TOP of tabletop
  async function extractTableArms(
    imgBuf,
    { includeRight = true, includeLeft = true, rightShiftX = 0, rightShiftY = 0, maxY = 346 } = {},
  ) {
    const { data, info } = await sharp(imgBuf).raw().toBuffer({ resolveWithObject: true });
    const outBuf = Buffer.alloc(data.length);
    for (let y = 238; y < Math.min(348, maxY + 2); y++) {
      for (let x = 25; x < 302; x++) {
        const idx = (y * 326 + x) * 4;
        const r = data[idx],
          g = data[idx + 1],
          b = data[idx + 2],
          a = data[idx + 3];
        if (a < 20) continue;
        const isSkin = r > 74 && r - g >= 9 && g - b >= 4;
        const inRightZone =
          includeRight &&
          x >= 30 &&
          x <= 128 + rightShiftX &&
          y >= 242 + rightShiftY &&
          y <= Math.min(maxY, 344 + rightShiftY);
        const inLeftZone = includeLeft && x >= 166 && x <= 292 && y >= 244 && y <= maxY;
        if (!inRightZone && !inLeftZone) continue;
        let keep = false;
        if (inRightZone) {
          const inUpperRightCuff = y < 280 + rightShiftY && x >= 34 && x <= 88 + rightShiftX;
          if (isSkin || inUpperRightCuff) keep = true;
        }
        if (inLeftZone) {
          const wx = (x - 234) / 22,
            wy = (y - 281) / 17;
          const inWatch = wx * wx + wy * wy <= 1;
          const inUpperLeftCuff = y < 286 && x >= 230 && x <= 286;
          if (isSkin || inWatch || inUpperLeftCuff) keep = true;
        }
        if (keep) {
          outBuf[idx] = r;
          outBuf[idx + 1] = g;
          outBuf[idx + 2] = b;
          outBuf[idx + 3] = a;
        }
      }
    }
    return sharp(outBuf, { raw: info }).png().toBuffer();
  }

  const shoeMaskSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <rect x="0" y="458" width="326" height="92" fill="#fff"/>
  </svg>`);
  const shoeMask = await sharp(shoeMaskSvg).blur(1).extractChannel('alpha').raw().toBuffer();
  const shoeBuf = Buffer.from(raw0.data);
  for (let i = 0; i < shoeMask.length; i++) {
    shoeBuf[i * 4 + 3] = Math.round((raw0.data[i * 4 + 3] * shoeMask[i]) / 255);
  }
  const shoesPng = await sharp(shoeBuf, { raw: raw0.info }).png().toBuffer();

  // Rich, unmistakably visible dark-walnut & brushed-brass evening café armchair supporting Nikolay
  const chairBackSvg =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <defs>
      <linearGradient id="chairWood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6b472f"/>
        <stop offset="0.45" stop-color="#3f281b"/>
        <stop offset="1" stop-color="#1e130d"/>
      </linearGradient>
      <linearGradient id="chairRim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#7c5337"/>
        <stop offset="0.3" stop-color="#c98c5c"/>
        <stop offset="0.7" stop-color="#9e6a43"/>
        <stop offset="1" stop-color="#4e3220"/>
      </linearGradient>
      <linearGradient id="chairLeather" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#332b29"/>
        <stop offset="0.5" stop-color="#211c1b"/>
        <stop offset="1" stop-color="#131113"/>
      </linearGradient>
    </defs>
    <!-- Ground contact ambient shadow beneath chair legs, sneakers and table base -->
    <ellipse cx="163" cy="535" rx="146" ry="15" fill="rgba(4,5,10,0.78)"/>
    <ellipse cx="44" cy="527" rx="16" ry="4.5" fill="rgba(4,5,10,0.82)"/>
    <ellipse cx="282" cy="527" rx="16" ry="4.5" fill="rgba(4,5,10,0.82)"/>
    <!-- Back and front tapered walnut legs with warm brushed-brass foot ferrules -->
    <path d="M74 352 L44 526 M252 352 L282 526 M96 360 L82 508 M230 360 L244 508" stroke="#241710" stroke-width="9" stroke-linecap="round"/>
    <path d="M74 352 L44 526 M252 352 L282 526" stroke="#a16c46" stroke-width="2.2" stroke-linecap="round" opacity="0.72"/>
    <path d="M47 508 L44 526 M279 508 L282 526" stroke="#c88d5c" stroke-width="6.5" stroke-linecap="round"/>
    <!-- Curved bentwood top backrest hoop rising visibly behind/above his hoodie shoulders -->
    <path d="M36 286 C30 198 54 140 163 140 C272 140 296 198 290 286 L276 350 H50 Z" fill="url(#chairWood)" stroke="url(#chairRim)" stroke-width="3.5"/>
    <path d="M48 282 C44 206 66 154 163 154 C260 154 282 206 278 282 L268 342 H58 Z" fill="url(#chairLeather)" stroke="#523828" stroke-width="1.6"/>
    <!-- Visible wooden armrests flanking hips/elbows -->
    <path d="M38 258 C24 260 22 292 34 350 L54 354" fill="none" stroke="url(#chairRim)" stroke-width="9" stroke-linecap="round"/>
    <path d="M288 258 C302 260 304 292 292 350 L272 354" fill="none" stroke="url(#chairRim)" stroke-width="9" stroke-linecap="round"/>
    <!-- Padded seat rim visibly supporting thighs -->
    <ellipse cx="163" cy="356" rx="116" ry="22" fill="url(#chairWood)" stroke="url(#chairRim)" stroke-width="2.4"/>
    <ellipse cx="163" cy="351" rx="108" ry="17" fill="url(#chairLeather)"/>
  </svg>`);

  // Refined dark-walnut & brushed-copper round bistro table lowered slightly (cy=330) so complete hands rest ON TOP
  const tableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <defs>
      <linearGradient id="tableTop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#583a28"/>
        <stop offset="0.48" stop-color="#3c261a"/>
        <stop offset="1" stop-color="#241610"/>
      </linearGradient>
      <linearGradient id="tableRim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#694530"/>
        <stop offset="0.32" stop-color="#d49464"/>
        <stop offset="0.68" stop-color="#7c5238"/>
        <stop offset="1" stop-color="#3d271c"/>
      </linearGradient>
      <linearGradient id="pedestal" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#141418"/>
        <stop offset="0.4" stop-color="#3a3a45"/>
        <stop offset="1" stop-color="#101014"/>
      </linearGradient>
    </defs>
    <!-- Cast-iron weighted pedestal base grounded on floor -->
    <ellipse cx="163" cy="524" rx="54" ry="9" fill="rgba(4,5,10,0.8)"/>
    <ellipse cx="163" cy="521" rx="46" ry="7.5" fill="url(#pedestal)" stroke="#684a36" stroke-width="1.4"/>
    <ellipse cx="163" cy="519.5" rx="35" ry="4.6" fill="#282832"/>
    <rect x="155" y="344" width="16" height="176" fill="url(#pedestal)"/>
    <path d="M132 348 L163 369 L194 348" fill="#18181e"/>
    <!-- Tabletop underside shadow cast onto thighs -->
    <ellipse cx="163" cy="353" rx="138" ry="22" fill="rgba(5,5,9,0.62)"/>
    <!-- Thick brushed-copper bevelled tabletop rim -->
    <ellipse cx="163" cy="336" rx="147" ry="25" fill="url(#tableRim)"/>
    <!-- Polished walnut tabletop surface -->
    <ellipse cx="163" cy="330" rx="147" ry="24" fill="url(#tableTop)" stroke="#a36d47" stroke-width="1.5"/>
    <!-- Warm overhead pendant reflection ring on polished walnut -->
    <ellipse cx="154" cy="326" rx="108" ry="14" fill="none" stroke="rgba(245,190,130,0.18)" stroke-width="2.2"/>
    <ellipse cx="163" cy="331" rx="124" ry="18" fill="none" stroke="rgba(18,11,7,0.3)" stroke-width="1"/>
  </svg>`);

  function buildHandShadowsSvg({ rightHand = true, leftHand = true, rightX = 84, leftX = 204 }) {
    const r = rightHand
      ? `<ellipse cx="${rightX}" cy="336" rx="26" ry="6.5" fill="rgba(8,5,4,0.58)"/>`
      : '';
    const l = leftHand
      ? `<ellipse cx="${leftX}" cy="338" rx="28" ry="6.5" fill="rgba(8,5,4,0.58)"/>`
      : '';
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">${r}${l}</svg>`,
    );
  }

  function buildPropsSvg({
    cupOnTable = true,
    phoneOnTable = true,
    laptopOpen = false,
    cupX = 114,
  }) {
    const saucerAndCup = `
      <ellipse cx="${cupX}" cy="334" rx="19" ry="5" fill="rgba(6,5,5,0.62)"/>
      <ellipse cx="${cupX}" cy="331.5" rx="17" ry="4.6" fill="#2d2b30" stroke="#645e6a" stroke-width="1"/>
      <ellipse cx="${cupX}" cy="330.8" rx="11" ry="2.8" fill="#1d1c20"/>
      ${
        cupOnTable
          ? `
        <path d="M${cupX - 10} 317 C${cupX - 17} 317 ${cupX - 17} 327 ${cupX - 9} 327" fill="none" stroke="#d98a4e" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M${cupX - 10} 312 H${cupX + 10} L${cupX + 8.5} 330.5 C${cupX + 8.5} 332.5 ${cupX - 8.5} 332.5 ${cupX - 8.5} 330.5 Z" fill="#28252b" stroke="#c4814e" stroke-width="1.25"/>
        <ellipse cx="${cupX}" cy="312" rx="10" ry="3" fill="#3b271c" stroke="#e09457" stroke-width="1.2"/>
        <ellipse cx="${cupX}" cy="312.5" rx="7.8" ry="2" fill="#94572d"/>
      `
          : ''
      }
    `;
    const phone = phoneOnTable
      ? `
      <g transform="translate(250, 329) rotate(-14)">
        <rect x="-14" y="-8.5" width="28" height="17" rx="3" fill="rgba(5,5,8,0.65)" transform="translate(1,2)"/>
        <rect x="-14" y="-8.5" width="28" height="17" rx="3" fill="#18181d" stroke="#454552" stroke-width="1"/>
        <rect x="-11" y="-6" width="7" height="4.2" rx="1" fill="#0c0c10" stroke="#2d2d35" stroke-width="0.6"/>
        <circle cx="3" cy="0" r="3.5" fill="none" stroke="#d12b2b" stroke-width="1.15"/>
        <circle cx="3" cy="0" r="1.25" fill="#d12b2b"/>
      </g>
    `
      : '';
    const laptop = laptopOpen
      ? `
      <defs>
        <linearGradient id="lid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#383b46"/>
          <stop offset="0.5" stop-color="#22242c"/>
          <stop offset="1" stop-color="#15161c"/>
        </linearGradient>
      </defs>
      <ellipse cx="163" cy="332" rx="59" ry="11" fill="rgba(5,5,8,0.7)"/>
      <polygon points="109,324 217,324 226,334 100,334" fill="#2c2e38" stroke="#535766" stroke-width="1"/>
      <polygon points="114,260 212,260 218,326 108,326" rx="4" fill="url(#lid)" stroke="#5c6070" stroke-width="1.4"/>
      <line x1="115" y1="262" x2="211" y2="262" stroke="rgba(255,220,180,0.26)" stroke-width="1"/>
      <rect x="159" y="290" width="8" height="2.4" rx="1" fill="#e08b46" opacity="0.92"/>
    `
      : '';
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">${saucerAndCup}${phone}${laptop}</svg>`,
    );
  }

  const idleArms = await extractTableArms(clean0, { includeRight: true, includeLeft: true });
  const glanceBody = await flex(clean0, [[160, 82, 74, 84, -5, -1]]);
  const coffeeReachBody = await flex(clean0, [[82, 294, 46, 48, 16, -4]]);
  const coffeeReachArms = await extractTableArms(coffeeReachBody, {
    includeRight: true,
    includeLeft: true,
    rightShiftX: 18,
  });
  const phoneReachBody = await flex(clean0, [
    [160, 82, 74, 84, 5, 4],
    [206, 306, 48, 48, 22, -4],
  ]);
  const phoneReachArms = await extractTableArms(phoneReachBody, {
    includeRight: true,
    includeLeft: true,
  });
  const leftArmOnly = await extractTableArms(clean0, { includeRight: false, includeLeft: true });

  const laptopBodyA = await flex(clean0, [
    [163, 86, 75, 86, -1, 5],
    [82, 294, 46, 48, 24, -8],
    [208, 296, 46, 48, -20, -10],
  ]);
  const laptopArmsA = await extractTableArms(laptopBodyA, {
    includeRight: true,
    includeLeft: true,
    rightShiftX: 24,
    maxY: 324,
  });

  const laptopBodyB = await flex(clean0, [
    [163, 86, 75, 86, 1, 5],
    [82, 294, 46, 48, 22, -6],
    [208, 296, 46, 48, -22, -12],
  ]);
  const laptopArmsB = await extractTableArms(laptopBodyB, {
    includeRight: true,
    includeLeft: true,
    rightShiftX: 24,
    maxY: 324,
  });

  async function composeCafeCell(layers) {
    return frame(326, 550)
      .composite(layers.map((input) => ({ input, left: 0, top: 0 })))
      .png()
      .toBuffer();
  }

  const cafeCells = await Promise.all([
    // 0: idle
    composeCafeCell([
      chairBackSvg,
      clean0,
      tableSvg,
      buildHandShadowsSvg({ rightHand: true, leftHand: true, rightX: 84, leftX: 204 }),
      shoesPng,
      idleArms,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: false, cupX: 114 }),
    ]),
    // 1: glance
    composeCafeCell([
      chairBackSvg,
      glanceBody,
      tableSvg,
      buildHandShadowsSvg({ rightHand: true, leftHand: true, rightX: 84, leftX: 204 }),
      shoesPng,
      idleArms,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: false, cupX: 114 }),
    ]),
    // 2: coffee-reach (hand moves directly to espresso cup on saucer)
    composeCafeCell([
      chairBackSvg,
      coffeeReachBody,
      tableSvg,
      buildHandShadowsSvg({ rightHand: true, leftHand: true, rightX: 98, leftX: 204 }),
      shoesPng,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: false, cupX: 108 }),
      coffeeReachArms,
    ]),
    // 3: coffee-lift (cup lifted off saucer to mid-chest height)
    composeCafeCell([
      chairBackSvg,
      liftFlexed,
      liftCupOverlay,
      liftFingersPng,
      tableSvg,
      buildHandShadowsSvg({ rightHand: false, leftHand: true, leftX: 204 }),
      shoesPng,
      leftArmOnly,
      buildPropsSvg({ cupOnTable: false, phoneOnTable: true, laptopOpen: false, cupX: 114 }),
    ]),
    // 4: coffee-sip (cup lifted all the way to lips/mouth with natural forward lean)
    composeCafeCell([
      chairBackSvg,
      sipTorsoFlexed,
      sipArmPng,
      sipCupAtMouthSvg,
      sipFingersPng,
      tableSvg,
      buildHandShadowsSvg({ rightHand: false, leftHand: true, leftX: 204 }),
      shoesPng,
      leftArmOnly,
      buildPropsSvg({ cupOnTable: false, phoneOnTable: true, laptopOpen: false, cupX: 114 }),
    ]),
    // 5: phone-reach (transitional reach before lifting phone off tabletop)
    composeCafeCell([
      chairBackSvg,
      phoneReachBody,
      tableSvg,
      buildHandShadowsSvg({ rightHand: true, leftHand: true, rightX: 104, leftX: 204 }),
      shoesPng,
      phoneReachArms,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: false, cupX: 114 }),
    ]),
    // 6: phone-check (Samsung S20+ Arasaka in hand — phoneOnTable strictly false!)
    composeCafeCell([
      chairBackSvg,
      cleanPhonePose,
      tableSvg,
      buildHandShadowsSvg({ rightHand: false, leftHand: true, leftX: 204 }),
      shoesPng,
      leftArmOnly,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: false, laptopOpen: false, cupX: 114 }),
    ]),
    // 7: phone-scroll (thumb scroll on phone in hand — phoneOnTable strictly false!)
    composeCafeCell([
      chairBackSvg,
      scrollPhonePose,
      tableSvg,
      buildHandShadowsSvg({ rightHand: false, leftHand: true, leftX: 204 }),
      shoesPng,
      leftArmOnly,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: false, laptopOpen: false, cupX: 114 }),
    ]),
    // 8: laptop-type-a
    composeCafeCell([
      chairBackSvg,
      laptopBodyA,
      tableSvg,
      buildHandShadowsSvg({ rightHand: true, leftHand: true, rightX: 102, leftX: 210 }),
      shoesPng,
      laptopArmsA,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: true, cupX: 56 }),
    ]),
    // 9: laptop-type-b
    composeCafeCell([
      chairBackSvg,
      laptopBodyB,
      tableSvg,
      buildHandShadowsSvg({ rightHand: true, leftHand: true, rightX: 100, leftX: 208 }),
      shoesPng,
      laptopArmsB,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: true, cupX: 56 }),
    ]),
  ]);

  await strip('cafe', cafeCells, 224, 378);
}

// ---------- Painterly Street Foreground Crowd Atlas (public/avatar/crowd-fg.webp) ----------
// 4 richly illustrated evening pedestrians × 8 biomechanical walk-cycle frames (1440 × 1296, 180 × 324 per cell).
// Rendered at 2× supersampling (360 × 648 -> 180 × 324) with soft volumetric cylindrical shading, warm streetlamp rim light,
// natural 7.5-head adult proportions, and NO cartoon black outlines so foreground walkers passing in front
// of Nikolay blend seamlessly with his illustrated portrait even on 2× Retina displays.
{
  const COLS = 8;
  const ROWS = 4;
  const CELL_W = 180;
  const CELL_H = 324;
  const SUP = 2;

  const archetypes = [
    {
      skin: ['#d8a98a', '#b68367', '#7f5540'],
      hair: ['#2d2018', '#19120e', '#593d2b'],
      coat: ['#313744', '#1e222b', '#12141a'],
      coatBack: ['#20242e', '#14171e'],
      pants: ['#232732', '#151820'],
      pantsBack: ['#181b23', '#101218'],
      shoe: ['#2a2322', '#171313'],
      sole: '#4a3d38',
      accent: ['#a85337', '#6c321f'],
      bag: ['#3a2820', '#201511'],
      style: 'overcoat',
      hairStyle: 'cropped',
      rim: 'rgba(246,196,134,0.42)',
    },
    {
      skin: ['#c79272', '#a16f54', '#714a36'],
      hair: ['#1f1916', '#110e0c', '#3d302a'],
      coat: ['#3d4944', '#262f2b', '#171d1a'],
      coatBack: ['#29322e', '#181e1b'],
      pants: ['#25282e', '#17191e'],
      pantsBack: ['#1b1d22', '#111317'],
      shoe: ['#28292f', '#17181c'],
      sole: '#b5b2ac',
      accent: ['#1d1e23', '#383a42'],
      bag: ['#2e333c', '#1a1d24'],
      style: 'parka',
      hairStyle: 'wavy',
      rim: 'rgba(242,190,128,0.4)',
    },
    {
      skin: ['#dfb295', '#be8c70', '#8b5f49'],
      hair: ['#382419', '#1e130d', '#6e4731'],
      coat: ['#846c56', '#5a4838', '#362b22'],
      coatBack: ['#5a4939', '#382d23'],
      pants: ['#22242c', '#14161c'],
      pantsBack: ['#171920', '#0f1015'],
      shoe: ['#262020', '#141111'],
      sole: '#423632',
      accent: ['#202229', '#121318'],
      bag: ['#422c23', '#261813'],
      style: 'trench',
      hairStyle: 'swept',
      rim: 'rgba(252,208,148,0.48)',
    },
    {
      skin: ['#b57d5c', '#8e5d42', '#603c29'],
      hair: ['#181515', '#0d0b0b', '#2e2727'],
      coat: ['#324056', '#1f2838', '#131823'],
      coatBack: ['#222c3c', '#141a24'],
      pants: ['#2a2c32', '#1a1c20'],
      pantsBack: ['#1e2025', '#131418'],
      shoe: ['#24262c', '#15161a'],
      sole: '#c4bfb6',
      accent: ['#7d5e43', '#4e3927'],
      bag: ['#2c2827', '#1a1716'],
      style: 'jacket',
      hairStyle: 'beanie',
      rim: 'rgba(244,192,130,0.42)',
    },
  ];

  function limbPath(x1, y1, x2, y2, r1, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    return `M${(x1 + nx * r1).toFixed(1)},${(y1 + ny * r1).toFixed(1)} L${(x2 + nx * r2).toFixed(1)},${(y2 + ny * r2).toFixed(1)} A${r2.toFixed(1)},${r2.toFixed(1)} 0 1 1 ${(x2 - nx * r2).toFixed(1)},${(y2 - ny * r2).toFixed(1)} L${(x1 - nx * r1).toFixed(1)},${(y1 - ny * r1).toFixed(1)} A${r1.toFixed(1)},${r1.toFixed(1)} 0 1 1 ${(x1 + nx * r1).toFixed(1)},${(y1 + ny * r1).toFixed(1)} Z`;
  }

  function renderPedestrianSvg(arch, frameIdx) {
    const w = CELL_W * SUP;
    const h = CELL_H * SUP;
    const phase = (frameIdx / COLS) * Math.PI * 2;
    const bob = -Math.abs(Math.cos(phase)) * 6;
    const cx = 120;
    const groundY = 414;
    const hipY = 230 + bob;
    const shoulderY = 120 + bob;
    const headY = 72 + bob;
    const lean = 5;

    function legPose(p) {
      const s = Math.sin(p);
      const c = Math.cos(p);
      const hipAngle = s * 0.44 + 0.04;
      const kneeFlex = Math.max(0, -c) * 0.5 + 0.08;
      const thighLen = 84;
      const shinLen = 84;
      const kx = cx + Math.sin(hipAngle) * thighLen;
      const ky = hipY + Math.cos(hipAngle) * thighLen;
      const shinAngle = hipAngle - kneeFlex;
      const ax = kx + Math.sin(shinAngle) * shinLen;
      const ay = Math.min(groundY - 12, ky + Math.cos(shinAngle) * shinLen);
      const footTilt = Math.max(-0.2, Math.min(0.26, -s * 0.24));
      return { kx, ky, ax, ay, footTilt };
    }

    function armPose(p, isHoldingCup = false) {
      if (isHoldingCup) {
        const ex = cx + lean - 6;
        const ey = shoulderY + 58;
        const hx = ex + 40;
        const hy = ey - 10;
        return { ex, ey, hx, hy };
      }
      const s = Math.sin(p);
      const upperAngle = -s * 0.36;
      const elbowBend = 0.24 + Math.max(0, s) * 0.28;
      const upperLen = 58;
      const lowerLen = 52;
      const ex = cx + lean + Math.sin(upperAngle) * upperLen;
      const ey = shoulderY + Math.cos(upperAngle) * upperLen;
      const hx = ex + Math.sin(upperAngle + elbowBend) * lowerLen;
      const hy = ey + Math.cos(upperAngle + elbowBend) * lowerLen;
      return { ex, ey, hx, hy };
    }

    const frontLeg = legPose(phase);
    const backLeg = legPose(phase + Math.PI);
    const frontArm = armPose(phase, arch.style === 'jacket');
    const backArm = armPose(phase + Math.PI, false);

    const coatHemY =
      arch.style === 'overcoat' || arch.style === 'trench'
        ? hipY + 80
        : arch.style === 'parka'
          ? hipY + 38
          : hipY + 22;
    const hemSwing = Math.sin(phase) * 10;

    const shoeSvg = (leg, isFront) => {
      const rot = (leg.footTilt * 180) / Math.PI;
      const fillId = isFront ? 'shoeF' : 'shoeB';
      return `<g transform="translate(${leg.ax.toFixed(1)},${leg.ay.toFixed(1)}) rotate(${rot.toFixed(1)})">
        <path d="M-14,-4 C-15,7 -13,13 -7,14 L29,14 C34,14 35,8 29,5 L11,-4 Z" fill="url(#${fillId})"/>
        <path d="M-12,10 L31,10 C32,12.5 31,14.5 27,14.5 L-10,14.5 Z" fill="${arch.sole}" opacity="${isFront ? '0.94' : '0.68'}"/>
        ${isFront ? `<path d="M5,0 L25,7" stroke="${arch.rim}" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>` : ''}
      </g>`;
    };

    const hairSvg = (() => {
      if (arch.hairStyle === 'beanie') {
        return `
          <path d="M${cx + lean - 24},${headY - 5} C${cx + lean - 27},${headY - 37} ${cx + lean + 22},${headY - 38} ${cx + lean + 24},${headY - 7} C${cx + lean + 11},${headY - 12} ${cx + lean - 11},${headY - 10} ${cx + lean - 24},${headY - 5} Z" fill="url(#hairGrad)"/>
          <path d="M${cx + lean - 25},${headY - 9} Q${cx + lean},${headY - 16} ${cx + lean + 24},${headY - 10} L${cx + lean + 23},${headY - 3} Q${cx + lean},${headY - 8} ${cx + lean - 24},${headY - 2} Z" fill="${arch.accent[0]}"/>
          <path d="M${cx + lean - 14},${headY - 26} Q${cx + lean + 5},${headY - 32} ${cx + lean + 18},${headY - 18}" fill="none" stroke="${arch.rim}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        `;
      }
      if (arch.hairStyle === 'swept') {
        return `
          <path d="M${cx + lean - 32},${headY + 30} C${cx + lean - 38},${headY - 20} ${cx + lean - 8},${headY - 37} ${cx + lean + 20},${headY - 24} C${cx + lean + 28},${headY - 14} ${cx + lean + 17},${headY - 5} ${cx + lean + 4},${headY - 7} C${cx + lean - 9},${headY - 3} ${cx + lean - 11},${headY + 24} ${cx + lean - 20},${headY + 38} Z" fill="url(#hairGrad)"/>
          <path d="M${cx + lean - 12},${headY - 27} Q${cx + lean + 8},${headY - 29} ${cx + lean + 21},${headY - 16}" fill="none" stroke="${arch.rim}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        `;
      }
      return `
        <path d="M${cx + lean - 24},${headY + 5} C${cx + lean - 27},${headY - 28} ${cx + lean + 2},${headY - 37} ${cx + lean + 23},${headY - 19} C${cx + lean + 26},${headY - 12} ${cx + lean + 15},${headY - 7} ${cx + lean + 2},${headY - 9} C${cx + lean - 11},${headY - 7} ${cx + lean - 13},${headY + 7} ${cx + lean - 19},${headY + 12} Z" fill="url(#hairGrad)"/>
        <path d="M${cx + lean - 10},${headY - 27} Q${cx + lean + 8},${headY - 29} ${cx + lean + 20},${headY - 17}" fill="none" stroke="${arch.rim}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      `;
    })();

    const accessorySvg = (() => {
      if (arch.style === 'overcoat') {
        return `
          <path d="M${cx + lean - 18},${shoulderY - 10} Q${cx + lean + 12},${shoulderY - 5} ${cx + lean + 30},${shoulderY + 3} C${cx + lean + 28},${shoulderY + 18} ${cx + lean - 12},${shoulderY + 18} ${cx + lean - 22},${shoulderY + 9} Z" fill="url(#accentGrad)"/>
          <path d="M${cx + lean + 10},${shoulderY + 5} L${cx + lean + 20},${shoulderY + 50} L${cx + lean + 5},${shoulderY + 52} L${cx + lean - 1},${shoulderY + 9} Z" fill="url(#accentGrad)"/>
          <path d="M${cx + lean + 12},${shoulderY - 2} L${cx - 32},${hipY + 8}" stroke="${arch.bag[0]}" stroke-width="6.5" stroke-linecap="round"/>
          <rect x="${cx - 52}" y="${hipY - 4}" width="38" height="42" rx="7" fill="url(#bagGrad)"/>
        `;
      }
      if (arch.style === 'parka') {
        return `
          <path d="M${cx + lean - 28},${shoulderY - 6} C${cx + lean - 54},${shoulderY + 8} ${cx + lean - 56},${hipY - 14} ${cx + lean - 30},${hipY - 4} Z" fill="url(#bagGrad)"/>
          <path d="M${cx + lean - 6},${headY - 26} C${cx + lean - 15},${headY - 18} ${cx + lean - 11},${headY - 2} ${cx + lean - 4},${headY + 3}" fill="none" stroke="#18191e" stroke-width="5" stroke-linecap="round"/>
          <ellipse cx="${cx + lean - 4}" cy="${headY + 5}" rx="8.5" ry="10.5" fill="#23252c" stroke="#565b68" stroke-width="1.4"/>
        `;
      }
      if (arch.style === 'trench') {
        return `
          <path d="M${frontArm.hx - 9},${frontArm.hy + 4} Q${frontArm.hx},${frontArm.hy + 20} ${frontArm.hx + 9},${frontArm.hy + 4}" fill="none" stroke="${arch.bag[0]}" stroke-width="3.5"/>
          <path d="M${frontArm.hx - 22},${frontArm.hy + 15} L${frontArm.hx + 22},${frontArm.hy + 15} L${frontArm.hx + 18},${frontArm.hy + 56} L${frontArm.hx - 18},${frontArm.hy + 56} Z" fill="url(#bagGrad)"/>
        `;
      }
      return `
        <g transform="translate(${frontArm.hx + 7},${frontArm.hy - 8})">
          <path d="M-8,-10 H8 L6.5,11 H-6.5 Z" fill="#dcd3c8"/>
          <rect x="-7.5" y="-3" width="15" height="8" fill="#9a6440"/>
          <rect x="-9" y="-13.5" width="18" height="4" rx="1.6" fill="#202026"/>
        </g>
      `;
    })();

    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 240 432">
      <defs>
        <linearGradient id="skinF" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stop-color="${arch.skin[2]}"/>
          <stop offset="0.48" stop-color="${arch.skin[1]}"/>
          <stop offset="1" stop-color="${arch.skin[0]}"/>
        </linearGradient>
        <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${arch.hair[1]}"/>
          <stop offset="0.65" stop-color="${arch.hair[0]}"/>
          <stop offset="1" stop-color="${arch.hair[2]}"/>
        </linearGradient>
        <linearGradient id="coatF" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stop-color="${arch.coat[2]}"/>
          <stop offset="0.52" stop-color="${arch.coat[1]}"/>
          <stop offset="1" stop-color="${arch.coat[0]}"/>
        </linearGradient>
        <linearGradient id="coatB" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${arch.coatBack[1]}"/>
          <stop offset="1" stop-color="${arch.coatBack[0]}"/>
        </linearGradient>
        <linearGradient id="pantsF" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${arch.pants[1]}"/>
          <stop offset="0.82" stop-color="${arch.pants[0]}"/>
          <stop offset="1" stop-color="#3c4250"/>
        </linearGradient>
        <linearGradient id="pantsB" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${arch.pantsBack[1]}"/>
          <stop offset="1" stop-color="${arch.pantsBack[0]}"/>
        </linearGradient>
        <linearGradient id="shoeF" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${arch.shoe[1]}"/>
          <stop offset="1" stop-color="${arch.shoe[0]}"/>
        </linearGradient>
        <linearGradient id="shoeB" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#0f0e10"/>
          <stop offset="1" stop-color="${arch.shoe[1]}"/>
        </linearGradient>
        <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${arch.accent[1]}"/>
          <stop offset="1" stop-color="${arch.accent[0]}"/>
        </linearGradient>
        <linearGradient id="bagGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${arch.bag[1]}"/>
          <stop offset="1" stop-color="${arch.bag[0]}"/>
        </linearGradient>
      </defs>

      <path d="${limbPath(cx + lean + 6, shoulderY + 8, backArm.ex, backArm.ey, 17, 13.5)}" fill="url(#coatB)"/>
      <path d="${limbPath(backArm.ex, backArm.ey, backArm.hx, backArm.hy, 13, 9.5)}" fill="url(#coatB)"/>
      <circle cx="${backArm.hx.toFixed(1)}" cy="${backArm.hy.toFixed(1)}" r="8.5" fill="${arch.skin[2]}"/>

      <path d="${limbPath(cx - 2, hipY, backLeg.kx, backLeg.ky, 23, 17)}" fill="url(#pantsB)"/>
      <path d="${limbPath(backLeg.kx, backLeg.ky, backLeg.ax, backLeg.ay, 16.5, 11.5)}" fill="url(#pantsB)"/>
      ${shoeSvg(backLeg, false)}

      <path d="${limbPath(cx + 3, hipY, frontLeg.kx, frontLeg.ky, 24.5, 18)}" fill="url(#pantsF)"/>
      <path d="${limbPath(frontLeg.kx, frontLeg.ky, frontLeg.ax, frontLeg.ay, 17, 12)}" fill="url(#pantsF)"/>
      <path d="M${(cx + 21).toFixed(1)},${(hipY + 12).toFixed(1)} L${(frontLeg.kx + 14).toFixed(1)},${frontLeg.ky.toFixed(1)} L${(frontLeg.ax + 8).toFixed(1)},${(frontLeg.ay - 8).toFixed(1)}" fill="none" stroke="${arch.rim}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
      ${shoeSvg(frontLeg, true)}

      <path d="M${cx + lean - 9},${headY + 14} L${cx + lean + 9},${headY + 14} L${cx + lean + 12},${shoulderY + 8} L${cx + lean - 13},${shoulderY + 8} Z" fill="${arch.skin[1]}"/>
      <path d="M${cx + lean - 19},${headY - 12} C${cx + lean - 19},${headY - 28} ${cx + lean + 17},${headY - 27} ${cx + lean + 21},${headY - 8} C${cx + lean + 23},${headY - 2} ${cx + lean + 26},${headY + 2} ${cx + lean + 22},${headY + 6} C${cx + lean + 20},${headY + 16} ${cx + lean + 15},${headY + 23} ${cx + lean + 5},${headY + 24} C${cx + lean - 9},${headY + 24} ${cx + lean - 19},${headY + 13} ${cx + lean - 19},${headY - 12} Z" fill="url(#skinF)"/>
      <path d="M${cx + lean + 11},${headY - 5} Q${cx + lean + 17},${headY - 5} ${cx + lean + 20},${headY - 2}" fill="none" stroke="${arch.skin[2]}" stroke-width="2" stroke-linecap="round"/>
      <path d="M${cx + lean + 15},${headY + 11} Q${cx + lean + 18},${headY + 12} ${cx + lean + 14},${headY + 14}" fill="none" stroke="${arch.skin[2]}" stroke-width="1.4" stroke-linecap="round" opacity="0.72"/>
      <path d="M${cx + lean - 2},${headY + 17} Q${cx + lean + 8},${headY + 21} ${cx + lean + 16},${headY + 16}" fill="none" stroke="${arch.skin[2]}" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
      <ellipse cx="${cx + lean - 4}" cy="${headY + 4}" rx="3.4" ry="5.5" fill="${arch.skin[1]}" stroke="${arch.skin[2]}" stroke-width="1.1" opacity="0.85"/>
      ${hairSvg}

      <path d="M${cx + lean - 32},${shoulderY + 4} C${cx + lean - 26},${shoulderY - 18} ${cx + lean + 20},${shoulderY - 18} ${cx + lean + 32},${shoulderY + 6} L${cx + 38 + hemSwing * 0.45},${coatHemY} Q${cx + 2},${coatHemY + 12} ${cx - 38 - hemSwing * 0.35},${coatHemY - 2} Z" fill="url(#coatF)"/>
      <!-- Structured coat collar, lapel fold, and hip pocket flap -->
      <path d="M${cx + lean - 12},${shoulderY - 14} L${cx + lean + 14},${shoulderY - 12} L${cx + lean + 24},${shoulderY + 14} L${cx + lean + 10},${shoulderY + 18} Z" fill="${arch.coat[2]}" opacity="0.72"/>
      <path d="M${cx + lean + 8},${shoulderY + 5} L${cx + 15 + hemSwing * 0.25},${coatHemY + 4}" fill="none" stroke="rgba(8,10,16,0.44)" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M${cx + lean - 10},${shoulderY + 18} L${cx - 12},${coatHemY - 6}" fill="none" stroke="rgba(8,10,16,0.34)" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M${cx + 4},${hipY + 8} H${cx + 26}" stroke="rgba(8,10,16,0.48)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M${cx + lean - 6},${shoulderY - 12} Q${cx + lean + 20},${shoulderY - 13} ${cx + lean + 30},${shoulderY + 10} L${cx + 34 + hemSwing * 0.4},${coatHemY - 10}" fill="none" stroke="${arch.rim}" stroke-width="2.2" stroke-linecap="round" opacity="0.62"/>

      ${arch.style === 'parka' ? accessorySvg : ''}

      <path d="${limbPath(cx + lean - 2, shoulderY + 12, frontArm.ex, frontArm.ey, 18.5, 14.5)}" fill="url(#coatF)"/>
      <path d="${limbPath(frontArm.ex, frontArm.ey, frontArm.hx, frontArm.hy, 14, 10.5)}" fill="url(#coatF)"/>
      <path d="M${(cx + lean + 10).toFixed(1)},${(shoulderY + 14).toFixed(1)} L${(frontArm.ex + 10).toFixed(1)},${frontArm.ey.toFixed(1)} L${(frontArm.hx + 6).toFixed(1)},${(frontArm.hy - 3).toFixed(1)}" fill="none" stroke="${arch.rim}" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
      <ellipse cx="${frontArm.hx.toFixed(1)}" cy="${(frontArm.hy + 3).toFixed(1)}" rx="9" ry="10" fill="url(#skinF)"/>

      ${arch.style !== 'parka' ? accessorySvg : ''}
    </svg>`);
  }

  const crowdComposites = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const svgBuf = renderPedestrianSvg(archetypes[r], c);
      const cellBuf = await sharp(svgBuf).resize(CELL_W, CELL_H).png().toBuffer();
      crowdComposites.push({ input: cellBuf, left: c * CELL_W, top: r * CELL_H });
    }
  }
  await frame(COLS * CELL_W, ROWS * CELL_H)
    .composite(crowdComposites)
    .webp({ quality: 84, alphaQuality: 92, effort: 6 })
    .toFile(out + '/crowd-fg.webp');
}
