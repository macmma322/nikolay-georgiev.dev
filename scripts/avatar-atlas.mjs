// Build runtime strips from the four reference-based, transparent art sheets.
// Run from the repository root. Only public/avatar is served to visitors.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const source = 'src/assets/media/avatar/source';
const out = 'public/avatar';
await mkdir(out + '/props', { recursive: true });
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const opts = { quality: 87, alphaQuality: 100, effort: 6 };
const frame = (width, height) => sharp({ create: { width, height, channels: 4, background: transparent } });
async function crop(name, x, y, width, height) {
  return sharp(source + '/' + name + '.webp').extract({ left: x, top: y, width, height }).png().toBuffer();
}
async function strip(name, cells, width, height) {
  const overlays = await Promise.all(cells.map(async (input, i) => ({
    input: await sharp(input).resize(width, height, { fit: 'fill' }).png().toBuffer(), left: i * width, top: 0,
  })));
  await frame(width * cells.length, height).composite(overlays).webp(opts).toFile(out + '/' + name + '.webp');
}

// One horizontal strip per behavior, decoded only when an anchor can play it.
// Register the leaning elbow, seated pelvis and planted sole in each frame.
await strip('lean-phone', await Promise.all([74,505,935,1369,1801].map(x => crop('pocket', x, 0, 336, 724))), 126, 272);
await strip('walk', await Promise.all(Array.from({ length: 8 }, (_,i) =>
  crop('gait', i % 4 * 384, i < 4 ? 0 : 516, 384, 492))), 192, 246);
const phones = await Promise.all([[113,0,326,560],[607,0,326,560],[1108,0,326,560],[141,546,310,478]].map(async ([x,y,w,h], i) => {
  const buf = await crop('listening',x,y,w,h);
  // Remove the neighbouring figure's hair between the two shoes / shoes above the head.
  const {data,info} = await sharp(buf).raw().toBuffer({resolveWithObject:true});
  for(let py=0;py<h;py++) for(let px=0;px<w;px++) {
    if ((i===0 && py>546 && px>131 && px<206) || (i===3 && py<14 && (px<105 || px>192))) data[(py*w+px)*4+3]=0;
  }
  return sharp(data,{raw:info}).png().toBuffer();
}));
await strip('listen', phones, 155, 252);
for(const [name, x,y,w,h,render] of [
  ['galaxy-s20-plus',695,600,167,404,180], ['ath-m20xbt',1100,610,324,400,180],
]) await sharp(await crop('listening',x,y,w,h)).resize({height:render}).webp(opts).toFile(out+'/props/'+name+'.webp');

// Small, local mesh offsets keep the contacts fixed. Keys are defined in source
// pixels as [centre X/Y, horizontal/vertical radius, X/Y displacement].
async function flex(input, points) {
  const {data,info} = await sharp(input).raw().toBuffer({resolveWithObject:true});
  const result = Buffer.from(data);
  for(const [cx,cy,rx,ry,dx,dy] of points) {
    for(let y=Math.max(0,Math.floor(cy-ry));y<Math.min(info.height,cy+ry);y++) {
      for(let x=Math.max(0,Math.floor(cx-rx));x<Math.min(info.width,cx+rx);x++) {
        const weight=Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2)**2;
        const sx=Math.round(x-weight*dx), sy=Math.round(y-weight*dy);
        if(sx<0||sy<0||sx>=info.width||sy>=info.height) continue;
        const at=(sy*info.width+sx)*4;
        data.copy(result,(y*info.width+x)*4,at,at+4);
      }
    }
  }
  return sharp(result,{raw:info}).png().toBuffer();
}
for(const [name, rect,w,h,keys] of [
  ['phone',[526,22,366,701],136,260,[[171,254,35,36,4,-5],[106,610,62,100,5,0]]],
  ['typing',[968,24,640,700],220,240,[[354,299,56,26,-2,6],[416,288,44,24,2,-5]]],
  ['inspect',[1640,103,490,615],182,228,[[362,540,66,70,-4,-12],[297,110,110,106,-3,-3]]],
]) {
  const still=await crop('poses',...rect);
  const opposite=keys.map(([x,y,rx,ry,dx,dy])=>[x,y,rx,ry,-dx,-dy]);
  await strip(name,[still,await flex(still,keys),still,await flex(still,opposite)],w,h);
}
await sharp('src/assets/media/street/source/nikolay-master.webp').extract({left:230,top:10,width:520,height:1520}).resize({height:260}).webp(opts).toFile(out+'/standing.webp');
