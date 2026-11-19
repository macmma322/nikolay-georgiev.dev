import { clips, loadClip, type CharacterState, type Clip } from './clips';
import { observePlaybackState } from '../playback-state';

const preference = 'nikolay.avatar.motion';
type Pose = 'walk' | 'lean' | 'sit' | 'typing' | 'inspect';
type Frame = { clip: Clip; index: number; state: CharacterState; ms: number; x?: number };
type Anchor = { element: HTMLElement; pose: Pose; scene: string };
const frames = (clip: Clip, state: CharacterState, indices: number[], times: number[]): Frame[] =>
  indices.map((index, i) => ({ clip, state, index, ms: times[i] ?? times[0]! }));

function sequence(pose: Pose, returning: boolean, music: boolean): Frame[] {
  switch (pose) {
    case 'walk': {
      const stand = frames('standing', 'stop', [0], [240]);
      if (returning) return stand;
      // Measure the rearward displacement of the planted sole at each drawing.
      // Advance the root at the same instant as the foot changes, in either direction.
      const travel = [0, .15, .235, .38, .50, .65, .735, .88];
      const left = Math.random() < .5;
      const steps: Frame[] = Array.from({length: 16}, (_, i) => {
        const distance = ((i >= 8 ? 1 : 0) + travel[i % 8]!) / 2;
        return {clip:'walk',index:i % 8,state:left ? 'walk-left' : 'walk-right',
          ms: 115, x: left ? 1-distance : distance};
      });
      return [...steps, { ...stand[0]!, x: left ? 0 : 1 }];
    }
    case 'lean':
      return [...frames('lean-phone','lean',[0],[2000]),
        ...frames('lean-phone','phone',[1,2,3,4,3,2,1],[180,170,1700,1100,280,180,160]),
        ...frames('lean-phone','lean',[0],[0])];
    case 'sit':
      if (music) return [...frames('listen','sit',[0],[1100]),
        ...frames('listen','interact',[1,2],[250,700]), ...frames('listen','phone',[3],[2900]),
        ...frames('listen','react',[2],[800]), ...frames('listen','sit',[1,0],[230,0])];
      return [...frames('phone','sit',[0],[1250]), ...frames('phone','phone',[1,0,3,0],[340,900,350,0])];
    case 'typing':
      return frames('typing','typing',[0,1,2,3,0,1,2,3,0],[980,170,280,190,480,215,150,190,0]);
    case 'inspect':
      return [...frames('inspect','inspect',[0,3],[750,650]), ...frames('inspect','interact',[1],[260]),
        ...frames('inspect','react',[0,2],[400,0])];
  }
}

function overlaps(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// Use the actual text runs: the blank half of a bilingual grid cell is usable.
function obstructs(rect: DOMRect, scope: Element) {
  for (const el of scope.querySelectorAll('a, button, input, h1, h2, h3, p, dt, dd, .plate-fig, .plate-strip')) {
    if (el.closest('[data-avatar-anchor], [aria-hidden=true]:not(.project-plate)') ||
        el.classList.contains('visually-hidden')) continue;
    if (el.matches('a,button,input')) {
      if (overlaps(rect,el.getBoundingClientRect())) return true;
    } else {
      const nodes = document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      for(let text=nodes.nextNode();text;text=nodes.nextNode()){
        if(!text.textContent?.trim()) continue;
        const range=document.createRange(); range.selectNodeContents(text);
        if([...range.getClientRects()].some(box=>overlaps(rect,box))) return true;
      }
    }
  }
  return false;
}

class AvatarRuntime extends HTMLElement {
  #cleanup: (() => void) | undefined;
  connectedCallback() {
    if(this.#cleanup) return;
    const toggle=this.querySelector<HTMLButtonElement>('[data-avatar-toggle]');
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    if(!ctx || !toggle || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
    canvas.setAttribute('aria-hidden','true');
    canvas.className='avatar-drawing';
    const bubble=document.createElement('button');
    bubble.type='button'; bubble.className='avatar-remark';
    bubble.title=this.dataset['dismiss']!;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const anchors: Anchor[]=Array.from(document.querySelectorAll<HTMLElement>('[data-avatar-anchor]'),
      element=>({element,pose:element.dataset['pose'] as Pose,scene:element.dataset['avatarAnchor']!}));
    const stage=document.querySelector<HTMLElement>('[data-stage]');
    const visible=new Set<Element>();
    const visits=new Map<Anchor,number>();
    const said=new Set<string>();
    const events=new AbortController();
    const { signal }=events;
    let active: Anchor | undefined, token=0, timer=0, remarkTimer=0, pending=0;
    let lastEgg=-Infinity, lastRemark=-Infinity, playing=false, disabled=false;
    try { disabled=localStorage.getItem(preference)==='off'; } catch { /* private session */ }

    const scope=(a: Anchor)=>a.element.closest('article.chapter,.case-hero,.hero,.finale,section') ?? a.element.parentElement!;
    function dismiss() {
      clearTimeout(remarkTimer);
      bubble.remove();
    }
    function cancel() {
      token++; clearTimeout(timer); dismiss(); canvas.remove(); active=undefined;
      delete document.documentElement.dataset['avatarAway'];
    }
    function safe(anchor: Anchor) {
      const rect=anchor.element.getBoundingClientRect();
      return rect.width>0 && rect.height>0 && rect.top>=0 && rect.bottom<=innerHeight &&
        rect.left>=0 && rect.right<=document.documentElement.clientWidth && !obstructs(rect,scope(anchor));
    }
    function speak(anchor: Anchor, line: string) {
      if(!line || said.has(line) || performance.now()-lastRemark<45000) return;
      bubble.textContent=line+' ×';
      bubble.setAttribute('aria-label',line+' — '+bubble.title);
      anchor.element.append(bubble);
      const r=bubble.getBoundingClientRect();
      if(r.left<4 || r.right>innerWidth-4 || r.top<4 || obstructs(r,scope(anchor))) { dismiss();return; }
      said.add(line); lastRemark=performance.now(); remarkTimer=window.setTimeout(dismiss,4200);
    }
    const musicLine=this.dataset['music']!;
    function play(anchor: Anchor) {
      active=anchor;
      const generation=++token;
      const previous=visits.get(anchor);
      const returning=previous!==undefined && performance.now()-previous<60000;
      const rare=!returning && performance.now()-lastEgg>75000 &&
        (playing || (anchor.pose==='sit' && Math.random()<.12));
      if(rare) lastEgg=performance.now();
      const plan=sequence(anchor.pose,returning,rare);
      async function draw(i: number) {
        const step=plan[i]; if(!step || generation!==token) return;
        const img=await loadClip(step.clip);
        if(generation!==token || !anchor.element.isConnected) return;
        const {width,height}=anchor.element.getBoundingClientRect();
        if (!width || !height) { cancel(); return; }
        const density=Math.min(2,devicePixelRatio||1);
        const w=Math.round(width*density), h=Math.round(height*density);
        if(canvas.width!==w || canvas.height!==h) {canvas.width=w;canvas.height=h;}
        const clip=clips[step.clip], sw=img.naturalWidth/clip.frames;
        const dw=h*sw/img.naturalHeight;
        let x=(w-dw)/2, y=0;
        if(anchor.pose==='walk'){
          const stride=h*1.96;
          const center=w/2+((step.x ?? .5)-.5)*Math.min(stride*.96,w-h*.81);
          x=center-dw/2; y=h*(.99-clip.contact);
        } else if(anchor.pose==='sit') y=h*(.61-clip.contact);
        ctx!.clearRect(0,0,w,h); ctx!.save();
        if(step.state==='walk-left'){ctx!.translate(2*x+dw,0);ctx!.scale(-1,1);}
        ctx!.drawImage(img,step.index*sw,0,sw,img.naturalHeight,x,y,dw,h);
        ctx!.restore();
        canvas.dataset['state']=step.state;
        canvas.dataset['frame']=String(step.index);
        if(canvas.parentElement!==anchor.element) {
          anchor.element.prepend(canvas);
          document.documentElement.dataset['avatarAway']='';
          visits.set(anchor,performance.now());
        }
        if(step.state==='interact' && anchor.pose==='inspect' && !returning) {
          const field=anchor.element.parentElement?.querySelector('circuit-field');
          const box=anchor.element.getBoundingClientRect();
          field?.dispatchEvent(new CustomEvent('avatar-contact',{detail:{x:box.left+box.width*.75,y:box.top+box.height*.92}}));
        }
        if(i===1 && !returning && (rare || (anchor.pose!=='walk' && Math.random()<.22))) {
          speak(anchor,rare && anchor.pose==='sit'?musicLine:anchor.element.dataset['line']!);
        }
        if(i+1<plan.length) timer=window.setTimeout(()=>startFrame(i+1),step.ms);
        else if(anchor.pose==='walk') canvas.dataset['state']='idle';
      }
      function startFrame(i: number) {
        void draw(i).catch(()=>{if(generation===token) cancel();});
      }
      timer=window.setTimeout(()=>startFrame(0),350);
    }
    function reconcile() {
      pending=0;
      if(disabled || motion.matches || document.hidden || document.querySelector('dialog[open]') ||
        (stage && visible.has(stage))) {cancel();return;}
      const candidates=anchors.filter(a=>visible.has(a.element) && safe(a));
      const selected=candidates.find(a=>a===active) ?? candidates.sort((a,b)=>{
        const distance=(item: Anchor)=>Math.abs(item.element.getBoundingClientRect().top-innerHeight*.45);
        return distance(a)-distance(b);
      })[0];
      if(active!==selected){cancel();if(selected)play(selected);}
      else if(active && bubble.isConnected && obstructs(bubble.getBoundingClientRect(),scope(active))) dismiss();
    }
    function schedule() { if(!pending) pending=requestAnimationFrame(reconcile); }
    function syncPreference() {
      toggle!.hidden=false;toggle!.disabled=motion.matches;
      toggle!.setAttribute('aria-pressed',String(!disabled && !motion.matches));
      document.documentElement.toggleAttribute('data-avatar-still',disabled||motion.matches);
      cancel();schedule();
    }
    const observer=new IntersectionObserver(entries=>{
      for(const e of entries) {
        if(e.isIntersecting) visible.add(e.target);else visible.delete(e.target);
      }
      schedule();
    },{threshold:[0,.5,1]});
    for(const anchor of anchors) observer.observe(anchor.element);
    if(stage) observer.observe(stage);
    const resize=new ResizeObserver(()=>{cancel();schedule();});
    resize.observe(document.body);
    for(const anchor of anchors) resize.observe(anchor.element);
    // Handle scroll within the visibility thresholds, sticky headers and zoom.
    window.addEventListener('scroll',schedule,{passive:true,signal});
    window.addEventListener('resize',schedule,{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden) cancel();else schedule();},{signal});
    document.addEventListener('toggle',schedule,{capture:true,signal});
    motion.addEventListener('change',syncPreference,{signal});
    const unwatch=observePlaybackState(state=>{playing=state==='playing';});
    bubble.addEventListener('click',dismiss,{signal});
    document.addEventListener('keydown',e=>{if(e.key==='Escape') dismiss();},{signal});
    toggle.addEventListener('click',()=>{
      disabled=!disabled;
      try {localStorage.setItem(preference,disabled?'off':'on');} catch { /* in-memory preference */ }
      syncPreference();
    },{signal});
    window.addEventListener('storage',e=>{
      if(e.key===preference || e.key===null){disabled=e.newValue==='off';syncPreference();}
    },{signal});
    syncPreference();
    this.#cleanup=()=>{events.abort();observer.disconnect();resize.disconnect();unwatch();cancel();cancelAnimationFrame(pending);};
  }
  disconnectedCallback(){this.#cleanup?.();this.#cleanup=undefined;}
}
if(!customElements.get('avatar-runtime')) customElements.define('avatar-runtime',AvatarRuntime);
