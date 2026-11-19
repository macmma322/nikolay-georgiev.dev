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

// ---------- Café scenario 8-frame strip (public/avatar/cafe.webp) ----------
// 0: idle (hands on walnut tabletop, coffee cup on saucer, Samsung S20+ on table)
// 1: glance (subtle head turn toward the café window while seated)
// 2: coffee-reach (right hand moves across tabletop and contacts the coffee cup)
// 3: coffee-sip (cup lifted in right hand for a sip, saucer stays on table)
// 4: phone-check (Samsung S20+ Arasaka picked up in right hand, cup on table)
// 5: phone-scroll (thumb scrolling on Samsung S20+ with subtle head movement)
// 6: laptop-type-a (dark anodized laptop open on table, typing keystroke A)
// 7: laptop-type-b (dark anodized laptop open on table, typing keystroke B)
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
  for (let y = 268; y < 316; y++) {
    for (let x = 20; x < 120; x++) {
      const idx = (y * 326 + x) * 4;
      const r = phoneNeckHeadphonesBuf[idx],
        g = phoneNeckHeadphonesBuf[idx + 1],
        b = phoneNeckHeadphonesBuf[idx + 2],
        a = phoneNeckHeadphonesBuf[idx + 3];
      if (a === 0) continue;
      const isSkinOrChain = (r > 72 && r - g >= 10) || (y >= 278 && (r > 50 || g > 50 || b > 54));
      if (!isSkinOrChain) continue;
      if (x < 58) {
        phoneNeckHeadphonesBuf[idx + 3] = 0;
      } else {
        phoneNeckHeadphonesBuf[idx] = 22;
        phoneNeckHeadphonesBuf[idx + 1] = 22;
        phoneNeckHeadphonesBuf[idx + 2] = 26;
      }
    }
  }
  const phoneBasePng = await sharp(phoneNeckHeadphonesBuf, { raw: raw0.info }).png().toBuffer();
  const cleanPhonePose = await flex(phoneBasePng, [[160, 82, 72, 82, -1, 5]]);
  const scrollPhonePose = await flex(phoneBasePng, [
    [160, 82, 72, 82, 1, 6],
    [138, 200, 38, 36, 3, -4],
  ]);

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
  const sipFlexed = await flex(coffeeBasePng, [
    [160, 82, 74, 84, -2, 6],
    [136, 204, 54, 50, 2, -8],
  ]);

  const sipCupOverlay =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <defs>
      <linearGradient id="cupBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#38333a"/>
        <stop offset="0.45" stop-color="#252228"/>
        <stop offset="1" stop-color="#17151a"/>
      </linearGradient>
    </defs>
    <path d="M138 181 C129 181 129 194 139 194" fill="none" stroke="#d98a4e" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M138 175 H162 L160 203 C160 206 140 206 140 203 Z" fill="url(#cupBody)" stroke="#c4814e" stroke-width="1.3"/>
    <ellipse cx="150" cy="175" rx="12" ry="3.4" fill="#3b271c" stroke="#d98a4e" stroke-width="1.2"/>
    <ellipse cx="150" cy="175.5" rx="9.2" ry="2.2" fill="#96582e"/>
  </svg>`);

  const rawSip = await sharp(sipFlexed).raw().toBuffer({ resolveWithObject: true });
  const fingersBuf = Buffer.alloc(rawSip.data.length);
  for (let y = 178; y < 218; y++) {
    for (let x = 128; x < 168; x++) {
      const idx = (y * 326 + x) * 4;
      const r = rawSip.data[idx],
        g = rawSip.data[idx + 1],
        b = rawSip.data[idx + 2],
        a = rawSip.data[idx + 3];
      if (r > 84 && r - g >= 11 && g - b >= 6) {
        fingersBuf[idx] = r;
        fingersBuf[idx + 1] = g;
        fingersBuf[idx + 2] = b;
        fingersBuf[idx + 3] = a;
      }
    }
  }
  const fingersPng = await sharp(fingersBuf, { raw: rawSip.info }).png().toBuffer();

  async function extractTableArms(
    imgBuf,
    { includeRight = true, includeLeft = true, rightShiftX = 0 } = {},
  ) {
    const { data, info } = await sharp(imgBuf).raw().toBuffer({ resolveWithObject: true });
    const outBuf = Buffer.alloc(data.length);
    for (let y = 238; y < 328; y++) {
      for (let x = 25; x < 300; x++) {
        const idx = (y * 326 + x) * 4;
        const r = data[idx],
          g = data[idx + 1],
          b = data[idx + 2],
          a = data[idx + 3];
        if (a < 20) continue;
        const isSkin = r > 80 && r - g >= 11 && g - b >= 6;
        const inRightZone =
          includeRight && x >= 32 && x <= 122 + rightShiftX && y >= 242 && y <= 325;
        const inLeftZone = includeLeft && x >= 165 && x <= 290 && y >= 244 && y <= 325;
        if (!inRightZone && !inLeftZone) continue;
        let keep = false;
        if (inRightZone) {
          const inUpperRightCuff = y < 276 && x >= 34 && x <= 84 + rightShiftX;
          if (isSkin || inUpperRightCuff) keep = true;
        }
        if (inLeftZone) {
          const wx = (x - 234) / 21,
            wy = (y - 281) / 16;
          const inWatch = wx * wx + wy * wy <= 1;
          const inUpperLeftCuff = y < 284 && x >= 232 && x <= 286;
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

  const chairBackSvg =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <defs>
      <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#452e20"/>
        <stop offset="0.5" stop-color="#2c1d15"/>
        <stop offset="1" stop-color="#1a110c"/>
      </linearGradient>
      <linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#28272d"/>
        <stop offset="1" stop-color="#151519"/>
      </linearGradient>
    </defs>
    <ellipse cx="163" cy="534" rx="132" ry="14" fill="rgba(4,5,10,0.72)"/>
    <path d="M84 352 L66 518 M242 352 L260 518 M98 358 L92 500 M228 358 L234 500" stroke="#1b1716" stroke-width="7.5" stroke-linecap="round"/>
    <path d="M84 352 L66 518 M242 352 L260 518" stroke="#85583c" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>
    <rect x="56" y="174" width="214" height="114" rx="28" fill="url(#wood)" stroke="#63412b" stroke-width="2"/>
    <rect x="64" y="182" width="198" height="100" rx="22" fill="url(#leather)" stroke="#38363e" stroke-width="1.4"/>
    <ellipse cx="163" cy="350" rx="104" ry="21" fill="url(#wood)" stroke="#63412b" stroke-width="2"/>
    <ellipse cx="163" cy="345" rx="96" ry="16" fill="url(#leather)"/>
  </svg>`);

  const tableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">
    <defs>
      <linearGradient id="tableTop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4e3424"/>
        <stop offset="0.48" stop-color="#372318"/>
        <stop offset="1" stop-color="#22150f"/>
      </linearGradient>
      <linearGradient id="tableRim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#5e3d2b"/>
        <stop offset="0.35" stop-color="#c28457"/>
        <stop offset="0.7" stop-color="#6e4832"/>
        <stop offset="1" stop-color="#3a251a"/>
      </linearGradient>
      <linearGradient id="pedestal" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#141418"/>
        <stop offset="0.4" stop-color="#363640"/>
        <stop offset="1" stop-color="#101014"/>
      </linearGradient>
    </defs>
    <ellipse cx="163" cy="521" rx="50" ry="8.5" fill="rgba(4,5,10,0.75)"/>
    <ellipse cx="163" cy="518" rx="44" ry="7.5" fill="url(#pedestal)" stroke="#4f3b2f" stroke-width="1.3"/>
    <ellipse cx="163" cy="516.5" rx="34" ry="4.5" fill="#25252d"/>
    <rect x="155.5" y="330" width="15" height="187" fill="url(#pedestal)"/>
    <path d="M134 334 L163 355 L192 334" fill="#18181e"/>
    <ellipse cx="163" cy="340" rx="134" ry="22" fill="rgba(5,5,9,0.58)"/>
    <ellipse cx="163" cy="322" rx="143" ry="26" fill="url(#tableRim)"/>
    <ellipse cx="163" cy="316" rx="143" ry="25" fill="url(#tableTop)" stroke="#8c5d3c" stroke-width="1.5"/>
    <ellipse cx="152" cy="312" rx="100" ry="14" fill="none" stroke="rgba(235,175,115,0.14)" stroke-width="2"/>
    <ellipse cx="82" cy="314" rx="22" ry="5.5" fill="rgba(8,6,5,0.48)"/>
    <ellipse cx="204" cy="315" rx="24" ry="5.5" fill="rgba(8,6,5,0.48)"/>
  </svg>`);

  function buildPropsSvg({
    cupOnTable = true,
    phoneOnTable = true,
    laptopOpen = false,
    cupX = 118,
  }) {
    const saucerAndCup = `
      <ellipse cx="${cupX}" cy="321" rx="19" ry="5" fill="rgba(6,5,5,0.6)"/>
      <ellipse cx="${cupX}" cy="318.5" rx="17" ry="4.6" fill="#2d2b30" stroke="#5c5660" stroke-width="1"/>
      <ellipse cx="${cupX}" cy="317.8" rx="11" ry="2.8" fill="#1d1c20"/>
      ${
        cupOnTable
          ? `
        <path d="M${cupX - 10} 304 C${cupX - 17} 304 ${cupX - 17} 314 ${cupX - 9} 314" fill="none" stroke="#d98a4e" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M${cupX - 10} 299 H${cupX + 10} L${cupX + 8.5} 317.5 C${cupX + 8.5} 319.5 ${cupX - 8.5} 319.5 ${cupX - 8.5} 317.5 Z" fill="#262328" stroke="#b5784a" stroke-width="1.2"/>
        <ellipse cx="${cupX}" cy="299" rx="10" ry="3" fill="#3b271c" stroke="#d98a4e" stroke-width="1.2"/>
        <ellipse cx="${cupX}" cy="299.5" rx="7.8" ry="2" fill="#8c522b"/>
      `
          : ''
      }
    `;
    const phone = phoneOnTable
      ? `
      <g transform="translate(248, 316) rotate(-14)">
        <rect x="-14" y="-8.5" width="28" height="17" rx="3" fill="rgba(5,5,8,0.62)" transform="translate(1,2)"/>
        <rect x="-14" y="-8.5" width="28" height="17" rx="3" fill="#18181d" stroke="#3e3e48" stroke-width="1"/>
        <rect x="-11" y="-6" width="7" height="4.2" rx="1" fill="#0c0c10" stroke="#2d2d35" stroke-width="0.6"/>
        <circle cx="3" cy="0" r="3.5" fill="none" stroke="#d12b2b" stroke-width="1.1"/>
        <circle cx="3" cy="0" r="1.2" fill="#d12b2b"/>
      </g>
    `
      : '';
    const laptop = laptopOpen
      ? `
      <defs>
        <linearGradient id="lid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#32343d"/>
          <stop offset="0.5" stop-color="#202229"/>
          <stop offset="1" stop-color="#15161b"/>
        </linearGradient>
      </defs>
      <ellipse cx="163" cy="318" rx="58" ry="11" fill="rgba(5,5,8,0.68)"/>
      <polygon points="109,311 217,311 226,321 100,321" fill="#2a2c34" stroke="#4d505e" stroke-width="1"/>
      <polygon points="114,248 212,248 218,313 108,313" rx="4" fill="url(#lid)" stroke="#565968" stroke-width="1.4"/>
      <line x1="115" y1="250" x2="211" y2="250" stroke="rgba(255,220,180,0.22)" stroke-width="1"/>
      <rect x="159" y="278" width="8" height="2.4" rx="1" fill="#e08b46" opacity="0.9"/>
    `
      : '';
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="326" height="550">${saucerAndCup}${phone}${laptop}</svg>`,
    );
  }

  const idleArms = await extractTableArms(clean0, { includeRight: true, includeLeft: true });
  const glanceBody = await flex(clean0, [[160, 82, 74, 84, -4, -1]]);
  const reachBody = await flex(clean0, [[82, 294, 42, 42, 16, -6]]);
  const reachArms = await extractTableArms(reachBody, {
    includeRight: true,
    includeLeft: true,
    rightShiftX: 18,
  });
  const phoneLeftArm = await extractTableArms(clean0, { includeRight: false, includeLeft: true });

  const laptopBodyA = await flex(clean0, [
    [163, 86, 75, 86, -1, 5],
    [82, 294, 44, 44, 24, -8],
    [208, 296, 44, 44, -22, -6],
  ]);
  const laptopArmsA = await extractTableArms(laptopBodyA, {
    includeRight: true,
    includeLeft: true,
    rightShiftX: 24,
  });

  const laptopBodyB = await flex(clean0, [
    [163, 86, 75, 86, 1, 5],
    [82, 294, 44, 44, 22, -6],
    [208, 296, 44, 44, -24, -9],
  ]);
  const laptopArmsB = await extractTableArms(laptopBodyB, {
    includeRight: true,
    includeLeft: true,
    rightShiftX: 24,
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
      shoesPng,
      idleArms,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: false, cupX: 118 }),
    ]),
    // 1: glance
    composeCafeCell([
      chairBackSvg,
      glanceBody,
      tableSvg,
      shoesPng,
      idleArms,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: false, cupX: 118 }),
    ]),
    // 2: coffee-reach
    composeCafeCell([
      chairBackSvg,
      reachBody,
      tableSvg,
      shoesPng,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: false, cupX: 108 }),
      reachArms,
    ]),
    // 3: coffee-sip
    composeCafeCell([
      chairBackSvg,
      sipFlexed,
      sipCupOverlay,
      fingersPng,
      tableSvg,
      shoesPng,
      phoneLeftArm,
      buildPropsSvg({ cupOnTable: false, phoneOnTable: true, laptopOpen: false, cupX: 118 }),
    ]),
    // 4: phone-check
    composeCafeCell([
      chairBackSvg,
      cleanPhonePose,
      tableSvg,
      shoesPng,
      phoneLeftArm,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: false, laptopOpen: false, cupX: 118 }),
    ]),
    // 5: phone-scroll
    composeCafeCell([
      chairBackSvg,
      scrollPhonePose,
      tableSvg,
      shoesPng,
      phoneLeftArm,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: false, laptopOpen: false, cupX: 118 }),
    ]),
    // 6: laptop-type-a
    composeCafeCell([
      chairBackSvg,
      laptopBodyA,
      tableSvg,
      shoesPng,
      laptopArmsA,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: true, cupX: 58 }),
    ]),
    // 7: laptop-type-b
    composeCafeCell([
      chairBackSvg,
      laptopBodyB,
      tableSvg,
      shoesPng,
      laptopArmsB,
      buildPropsSvg({ cupOnTable: true, phoneOnTable: true, laptopOpen: true, cupX: 58 }),
    ]),
  ]);

  await strip('cafe', cafeCells, 224, 378);
}
