(async function(){
"use strict";
try{await Promise.race([Promise.all([document.fonts.load('700 40px "Barlow Semi Condensed"'),document.fonts.load('600 40px "Barlow Semi Condensed"'),document.fonts.load('500 40px "Barlow Semi Condensed"')]),new Promise(r=>setTimeout(r,2500))]);}catch(e){}
const FONT='"Barlow Semi Condensed","Arial Narrow",Arial,sans-serif';

/* ---------- basics ---------- */
const P=0.76;            // platform and floor height (m)
const DECK=6.6;          // footbridge walking height
const EYE=1.62;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd=(()=>{let a=1873;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();

const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x05070d);
scene.fog=new THREE.FogExp2(0x0a0f1c,0.0078);
const camera=new THREE.PerspectiveCamera(68,1,0.05,1200);
camera.rotation.order='YXZ';
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
const ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());

/* ---------- textures ---------- */
function ctex(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=ANISO;return t;}
function grain(g,w,h,n,a){for(let i=0;i<n;i++){const v=rnd()<.5?0:255;g.fillStyle=`rgba(${v},${v},${v},${a*rnd()})`;g.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*2);}}
const TX={};
TX.brick=ctex(512,512,(g,w,h)=>{g.fillStyle='#4a3d35';g.fillRect(0,0,w,h);const rows=15,bh=h/rows,bw=w/5;for(let r=0;r<rows;r++){const off=(r%2)?bw/2:0;for(let c=-1;c<6;c++){const v=rnd();g.fillStyle=`hsl(${6+v*12},${36+rnd()*20}%,${23+rnd()*13}%)`;g.fillRect(c*bw+off+3,r*bh+3,bw-5,bh-5);}}grain(g,w,h,9000,.07);});
TX.stone=ctex(256,256,(g,w,h)=>{g.fillStyle='#737a82';g.fillRect(0,0,w,h);grain(g,w,h,6000,.1);for(let i=0;i<260;i++){g.fillStyle=`rgba(${rnd()<.5?210:30},${rnd()<.5?215:35},220,${.08+rnd()*.12})`;g.beginPath();g.ellipse(rnd()*w,rnd()*h,1+rnd()*3,1+rnd()*1.5,rnd()*3,0,7);g.fill();}g.strokeStyle='rgba(60,50,40,.35)';g.lineWidth=2;for(let x=0;x<w;x+=128)g.strokeRect(x,0,128,h);});
TX.plaster=ctex(256,256,(g,w,h)=>{g.fillStyle='#cdc6b4';g.fillRect(0,0,w,h);for(let i=0;i<40;i++){g.fillStyle=`rgba(${rnd()<.5?80:255},${rnd()<.5?70:250},60,.025)`;g.beginPath();g.arc(rnd()*w,rnd()*h,20+rnd()*60,0,7);g.fill();}grain(g,w,h,3000,.04);});
TX.paving=ctex(512,512,(g,w,h)=>{const n=4,s=w/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=rnd()*10;g.fillStyle=`hsl(30,4%,${38+v}%)`;g.fillRect(i*s,j*s,s,s);}g.strokeStyle='#2c2a27';g.lineWidth=4;for(let i=0;i<=n;i++){g.beginPath();g.moveTo(i*s,0);g.lineTo(i*s,h);g.stroke();g.beginPath();g.moveTo(0,i*s);g.lineTo(w,i*s);g.stroke();}grain(g,w,h,14000,.09);});
TX.conc=ctex(256,256,(g,w,h)=>{g.fillStyle='#6e6b66';g.fillRect(0,0,w,h);grain(g,w,h,7000,.1);});
TX.ballast=ctex(256,256,(g,w,h)=>{g.fillStyle='#3e3b38';g.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const l=22+rnd()*30;g.fillStyle=`hsl(25,${4+rnd()*6}%,${l}%)`;g.beginPath();g.ellipse(rnd()*w,rnd()*h,2+rnd()*3,1.5+rnd()*2.5,rnd()*3,0,7);g.fill();}});
TX.grass=ctex(256,256,(g,w,h)=>{g.fillStyle='#141a12';g.fillRect(0,0,w,h);for(let i=0;i<5000;i++){g.fillStyle=`hsla(${80+rnd()*40},20%,${8+rnd()*12}%,.6)`;g.fillRect(rnd()*w,rnd()*h,1,3);}});
TX.floor=ctex(512,512,(g,w,h)=>{const n=8,s=w/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){g.fillStyle=((i+j)%2)?'#8a6a48':'#c9bfa9';g.fillRect(i*s,j*s,s,s);if((i+j)%2===0){g.fillStyle='#2b2723';g.beginPath();g.moveTo(i*s+s/2,j*s+s*.22);g.lineTo(i*s+s*.78,j*s+s/2);g.lineTo(i*s+s/2,j*s+s*.78);g.lineTo(i*s+s*.22,j*s+s/2);g.fill();}}g.strokeStyle='rgba(30,25,20,.6)';g.lineWidth=2;for(let i=0;i<=n;i++){g.beginPath();g.moveTo(i*s,0);g.lineTo(i*s,h);g.stroke();g.beginPath();g.moveTo(0,i*s);g.lineTo(w,i*s);g.stroke();}grain(g,w,h,8000,.06);});
TX.wood=ctex(256,256,(g,w,h)=>{const n=6,s=h/n;for(let j=0;j<n;j++){g.fillStyle=`hsl(26,${32+rnd()*10}%,${24+rnd()*8}%)`;g.fillRect(0,j*s,w,s);for(let k=0;k<30;k++){g.strokeStyle='rgba(20,10,0,.18)';g.beginPath();const y=j*s+rnd()*s;g.moveTo(0,y);g.bezierCurveTo(w*.3,y+rnd()*4-2,w*.6,y+rnd()*4-2,w,y);g.stroke();}g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,j*s,w,2);}});
TX.slate=ctex(256,256,(g,w,h)=>{g.fillStyle='#22262d';g.fillRect(0,0,w,h);const rows=8,rh=h/rows,cw=w/6;for(let r=0;r<rows;r++){const off=(r%2)?cw/2:0;for(let c=-1;c<7;c++){g.fillStyle=`hsl(220,${6+rnd()*6}%,${15+rnd()*9}%)`;g.fillRect(c*cw+off+1,r*rh+1,cw-2,rh-2);}}});
TX.cobble=ctex(256,256,(g,w,h)=>{g.fillStyle='#1e1d1c';g.fillRect(0,0,w,h);const n=10,s=w/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){g.fillStyle=`hsl(30,5%,${22+rnd()*12}%)`;g.beginPath();g.ellipse(i*s+s/2+(j%2)*s/2,j*s+s/2,s*.44,s*.42,0,0,7);g.fill();}});
TX.lattice=ctex(256,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#ffffff';g.lineCap='square';g.lineWidth=7;g.beginPath();g.moveTo(0,0);g.lineTo(w,h);g.moveTo(w,0);g.lineTo(0,h);g.stroke();g.lineWidth=9;g.beginPath();g.moveTo(0,0);g.lineTo(0,h);g.moveTo(w,0);g.lineTo(w,h);g.stroke();g.lineWidth=12;g.beginPath();g.moveTo(0,4);g.lineTo(w,4);g.moveTo(0,h-4);g.lineTo(w,h-4);g.stroke();},false);
TX.valance=ctex(256,64,(g,w,h)=>{g.clearRect(0,0,w,h);const n=8,s=w/n;for(let i=0;i<n;i++){g.fillStyle=i%2?'#e7e1d2':'#ddd6c5';g.beginPath();g.moveTo(i*s+2,0);g.lineTo(i*s+s-2,0);g.lineTo(i*s+s-2,h*.62);g.lineTo(i*s+s/2,h);g.lineTo(i*s+2,h*.62);g.closePath();g.fill();}});
TX.pool=ctex(128,128,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.45)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,h);});
TX.pool.wrapS=TX.pool.wrapT=THREE.ClampToEdgeWrapping;

function facadeTex(seed){return ctex(256,256,(g,w,h)=>{g.fillStyle=['#3b2d27','#4a3b31','#5a5249','#3a3430'][seed%4];g.fillRect(0,0,w,h);grain(g,w,h,4000,.08);for(let f=0;f<3;f++)for(let k=0;k<3;k++){const x=28+k*76,y=34+f*78;const lit=rnd()<.13;g.fillStyle=lit?(rnd()<.5?'#f2c27a':'#e9d9b0'):'#0b0d12';g.fillRect(x,y,38,54);if(lit){g.fillStyle='rgba(60,30,10,.35)';g.fillRect(x,y,38,18);}g.fillStyle='#8f8576';g.fillRect(x-3,y-6,44,5);}});}

/* ---------- materials ---------- */
function M(o,s){const m=new THREE.MeshStandardMaterial(o);m.userData.s=s||0;return m;}
const MAT={
  brick:M({map:TX.brick,roughness:.93},1.1),
  stone:M({map:TX.stone,roughness:.85},1.6),
  plaster:M({map:TX.plaster,roughness:.95},2.2),
  paving:M({map:TX.paving,roughness:.9},1.2),
  conc:M({map:TX.conc,roughness:.95},2),
  coping:M({color:0xb3aea4,roughness:.8}),
  ballast:M({map:TX.ballast,roughness:1},1.4),
  grass:M({map:TX.grass,roughness:1},5),
  floor:M({map:TX.floor,roughness:.6},0.9),
  wood:M({map:TX.wood,roughness:.75},0.9),
  slate:M({map:TX.slate,roughness:.7,color:0xcfd4dc},1.2),
  cobble:M({map:TX.cobble,roughness:.9},1.0),
  iron:M({color:0x1f3631,roughness:.55,metalness:.4}),
  steel:M({color:0x9aa1a8,roughness:.35,metalness:.75}),
  dark:M({color:0x15171b,roughness:.8}),
  rail:M({color:0x6a6c70,roughness:.3,metalness:.85}),
  sleeper:M({color:0x67635d,roughness:.95}),
  frame:M({color:0xd8d1bf,roughness:.6}),
  doorGreen:M({color:0x1d3b2f,roughness:.55}),
  white:M({color:0xe9e6df,roughness:.6}),
  black:M({color:0x101010,roughness:.5}),
  glass:new THREE.MeshStandardMaterial({color:0x9db2c6,roughness:.08,metalness:.1,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}),
  glassDark:M({color:0x0c1018,roughness:.15,metalness:.2}),
  lampWarm:new THREE.MeshBasicMaterial({color:0xffd8a0,toneMapped:false}),
  lampCool:new THREE.MeshBasicMaterial({color:0xeef3ff,toneMapped:false}),
  lampOff:M({color:0xbfb6a2,roughness:.3}),
  lattice:new THREE.MeshStandardMaterial({color:0x1f3631,roughness:.6,metalness:.3,alphaMap:TX.lattice,alphaTest:.5,side:THREE.DoubleSide}),
};
MAT.lattice.alphaMap.wrapS=MAT.lattice.alphaMap.wrapT=THREE.RepeatWrapping;

/* ---------- geometry helpers ---------- */
function worldUV(g,cx,cy,cz,s){const p=g.attributes.position,uv=g.attributes.uv;for(let f=0;f<6;f++){const sc=s[f];if(!sc)continue;for(let i=0;i<4;i++){const k=f*4+i;const x=p.getX(k)+cx,y=p.getY(k)+cy,z=p.getZ(k)+cz;let u,v;if(f<2){u=z;v=y;}else if(f<4){u=x;v=z;}else{u=x;v=y;}uv.setXY(k,u/sc,v/sc);}}uv.needsUpdate=true;}
function bmm(x0,y0,z0,x1,y1,z1,mat,parent){if(x1<x0)[x0,x1]=[x1,x0];if(y1<y0)[y0,y1]=[y1,y0];if(z1<z0)[z0,z1]=[z1,z0];const w=x1-x0,h=y1-y0,d=z1-z0;const g=new THREE.BoxGeometry(w,h,d);const cx=(x0+x1)/2,cy=(y0+y1)/2,cz=(z0+z1)/2;const arr=Array.isArray(mat)?mat:[mat,mat,mat,mat,mat,mat];worldUV(g,cx,cy,cz,arr.map(m=>m.userData.s||0));const m=new THREE.Mesh(g,mat);m.position.set(cx,cy,cz);(parent||scene).add(m);return m;}
function cyl(x,y0,z,r,h,mat,seg=12,parent){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),mat);m.position.set(x,y0+h/2,z);(parent||scene).add(m);return m;}
function slabX(x0,x1,za,ya,zb,yb,th,mat){const dz=zb-za,dy=yb-ya,L=Math.hypot(dz,dy);const g=new THREE.BoxGeometry(x1-x0,th,L);const s=mat.userData.s;if(s)worldUV(g,0,0,0,[0,0,s,s,0,0]);const m=new THREE.Mesh(g,mat);m.position.set((x0+x1)/2,(ya+yb)/2,(za+zb)/2);m.rotation.x=-Math.atan2(dy,dz);scene.add(m);return m;}
function slabZ(z0,z1,xa,ya,xb,yb,th,mat){const dx=xb-xa,dy=yb-ya,L=Math.hypot(dx,dy);const g=new THREE.BoxGeometry(L,th,z1-z0);const s=mat.userData.s;if(s)worldUV(g,0,0,0,[0,0,s,s,0,0]);const m=new THREE.Mesh(g,mat);m.position.set((xa+xb)/2,(ya+yb)/2,(z0+z1)/2);m.rotation.z=Math.atan2(dy,dx);scene.add(m);return m;}
function plane(w,h,mat,x,y,z,ry,parent){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.y=ry||0;(parent||scene).add(m);return m;}
function inst(geo,mat,list){const im=new THREE.InstancedMesh(geo,mat,list.length);const o=new THREE.Object3D();list.forEach((t,i)=>{o.position.set(t[0],t[1],t[2]);o.rotation.set(t[3]||0,t[4]||0,t[5]||0);o.updateMatrix();im.setMatrixAt(i,o.matrix);});scene.add(im);return im;}

/* walls with openings. axis 'x': runs along x at z=c. axis 'z': runs along z at x=c */
function wall(axis,c,a0,a1,y0,y1,t,mat,holes=[]){holes=holes.slice().sort((p,q)=>p.a-q.a);let cur=a0;const piece=(a,b,ya,yb)=>{if(b-a<1e-3||yb-ya<1e-3)return;if(axis==='x')bmm(a,ya,c-t/2,b,yb,c+t/2,mat);else bmm(c-t/2,ya,a,c+t/2,yb,b,mat);};for(const h of holes){piece(cur,h.a,y0,y1);piece(h.a,h.b,y0,h.y0);piece(h.a,h.b,h.y1,y1);cur=h.b;}piece(cur,a1,y0,y1);}
/* window or door dressing: frame, glass, stone lintel and sill on the outward side (out = +1 or -1 along the wall normal) */
function dress(axis,c,h,out,opts={}){const t=0.3,fw=0.07;const along=(a,b,ya,yb,n0,n1,mat)=>axis==='x'?bmm(a,ya,c+n0,b,yb,c+n1,mat):bmm(c+n0,ya,a,c+n1,yb,b,mat);const mid=(h.a+h.b)/2;
  if(!opts.door){
    along(h.a,h.a+fw,h.y0,h.y1,-.05,.05,MAT.frame);along(h.b-fw,h.b,h.y0,h.y1,-.05,.05,MAT.frame);along(h.a,h.b,h.y0,h.y0+fw,-.05,.05,MAT.frame);along(h.a,h.b,h.y1-fw,h.y1,-.05,.05,MAT.frame);
    along(mid-.025,mid+.025,h.y0,h.y1,-.04,.04,MAT.frame);const ty=h.y1-Math.min(.55,(h.y1-h.y0)*.25);along(h.a,h.b,ty-.025,ty+.025,-.04,.04,MAT.frame);
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(h.b-h.a,h.y1-h.y0),opts.dark?MAT.glassDark:MAT.glass);if(axis==='x'){gl.position.set(mid,(h.y0+h.y1)/2,c);}else{gl.position.set(c,(h.y0+h.y1)/2,mid);gl.rotation.y=Math.PI/2;}scene.add(gl);
    if(opts.dark){gl.position[axis==='x'?'z':'x']-=out*.06;}
    along(h.a-.08,h.b+.08,h.y0-.09,h.y0,out*t/2,out*(t/2+.08),MAT.stone);
  }
  along(h.a-.15,h.b+.15,h.y1,h.y1+.26,out*t/2-out*.01,out*(t/2+.05),MAT.stone);
  along(mid-.11,mid+.11,h.y1-.06,h.y1+.32,out*t/2,out*(t/2+.08),MAT.stone);
}

/* ---------- signs, boards, clocks ---------- */
function signTex(lines,wpx,hpx,opt={}){return ctex(wpx,hpx,(g,w,h)=>{g.fillStyle=opt.bg||'#14407f';g.fillRect(0,0,w,h);g.strokeStyle=opt.fg||'#fff';g.lineWidth=Math.max(4,h*.04);const ins=h*.07;g.strokeRect(ins,ins,w-2*ins,h-2*ins);g.fillStyle=opt.fg||'#fff';g.textBaseline='middle';g.textAlign=opt.align||'center';const total=lines.reduce((s,l)=>s+l.size,0);let y=h/2-total*h/2;for(const l of lines){let fs=l.size*h*.86;g.font=`${l.w||600} ${fs}px ${FONT}`;while(g.measureText(l.t).width>w*.86&&fs>8){fs-=2;g.font=`${l.w||600} ${fs}px ${FONT}`;}const x=opt.align==='left'?w*.08:w/2;g.fillText(l.t,x,y+l.size*h/2);y+=l.size*h;}});}
function sign(lines,w,h,x,y,z,ry,opt={}){const tex=signTex(lines,Math.min(2048,Math.round(320*w/h)),320,opt);const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.5,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:opt.glow??.18});const grp=new THREE.Group();const f=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);f.position.z=.026;grp.add(f);if(opt.double){const b=f.clone();b.rotation.y=Math.PI;b.position.z=-.026;grp.add(b);}const back=new THREE.Mesh(new THREE.BoxGeometry(w+.04,h+.04,.05),MAT.steel);grp.add(back);grp.position.set(x,y,z);grp.rotation.y=ry||0;scene.add(grp);return grp;}

function dotBoard(lines,cols){const rowsPer=11,pad=2;const lw=cols,lh=rowsPer*lines.length;const small=document.createElement('canvas');small.width=lw;small.height=lh;const sg=small.getContext('2d');sg.fillStyle='#000';sg.fillRect(0,0,lw,lh);sg.fillStyle='#fff';sg.textBaseline='top';lines.forEach((ln,i)=>{(Array.isArray(ln)?ln:[[ln,1]]).forEach(([t,col])=>{sg.font=`600 11px ${FONT}`;sg.fillText(t,col,i*rowsPer+1);});});const px=sg.getImageData(0,0,lw,lh).data;const D=10;return ctex(lw*D+pad*2*D,lh*D+pad*2*D,(g,w,h)=>{g.fillStyle='#0d0905';g.fillRect(0,0,w,h);for(let cx=0;cx<lw;cx+=7){g.fillStyle='#090603';g.fillRect(pad*D+cx*D-2,pad*D,3,lh*D);}for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){const on=px[(y*lw+x)*4]>120;g.fillStyle=on?'#ffb12e':'#24170a';if(on){g.shadowColor='rgba(255,170,40,.9)';g.shadowBlur=8;}else g.shadowBlur=0;g.beginPath();g.arc(pad*D+x*D+D/2,pad*D+y*D+D/2,on?3.6:3,0,7);g.fill();}g.shadowBlur=0;});}
function boardMesh(lines,cols,x,y,z,ry,double){const tex=dotBoard(lines,cols);const img=tex.image;const h=0.62*lines.length/3,w=h*img.width/img.height;const grp=new THREE.Group();bmm(-w/2-.08,-h/2-.08,-.09,w/2+.08,h/2+.08,.09,MAT.steel,grp);const mat=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});const f=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);f.position.z=.092;grp.add(f);if(double){const b=f.clone();b.rotation.y=Math.PI;b.position.z=-.092;grp.add(b);}grp.position.set(x,y,z);grp.rotation.y=ry||0;scene.add(grp);return {grp,mat,w,h};}

const clockFaceTex=ctex(512,512,(g,w,h)=>{g.fillStyle='#f4f3ee';g.beginPath();g.arc(256,256,250,0,7);g.fill();g.fillStyle='#171717';for(let i=0;i<60;i++){g.save();g.translate(256,256);g.rotate(i*Math.PI/30);if(i%5===0)g.fillRect(-11,-236,22,70);else g.fillRect(-4,-236,8,22);g.restore();}});
const CLOCKS=[];
function clock(x,y,z,ry,opt={}){const r=opt.r||0.42;const grp=new THREE.Group();const drum=new THREE.Mesh(new THREE.CylinderGeometry(r+.035,r+.035,opt.single?.12:.22,40),MAT.steel);drum.rotation.x=Math.PI/2;grp.add(drum);const faceMat=new THREE.MeshStandardMaterial({map:clockFaceTex,emissive:0xffffff,emissiveMap:clockFaceTex,emissiveIntensity:.42,roughness:.4});const sides=opt.single?[1]:[1,-1];const hands=[];
  for(const s of sides){const face=new THREE.Group();face.rotation.y=s>0?0:Math.PI;face.position.z=s*(opt.single?.061:.111);const disc=new THREE.Mesh(new THREE.CircleGeometry(r,48),faceMat);face.add(disc);
    const mk=(len,back,wd,mat,zz)=>{const piv=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(wd,len+back,.008),mat);b.position.y=(len-back)/2;piv.add(b);piv.position.z=zz;face.add(piv);return piv;};
    const hr=mk(r*.6,r*.14,r*.11,MAT.black,.006),mn=mk(r*.86,r*.16,r*.085,MAT.black,.014);const red=new THREE.MeshStandardMaterial({color:0xc4211b,roughness:.4});const sc=mk(r*.8,r*.2,r*.025,red,.022);const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.075,r*.017,8,24),red);ring.position.y=r*.18;ring.position.z=0;sc.add(ring);const cap=new THREE.Mesh(new THREE.CylinderGeometry(r*.035,r*.035,.01,12),red);cap.rotation.x=Math.PI/2;cap.position.z=.028;face.add(cap);
    grp.add(face);hands.push({hr,mn,sc});}
  if(opt.hang){const rod=bmm(-.025,r+.03,-.025,.025,r+opt.hang,.025,MAT.steel,grp);}
  grp.position.set(x,y,z);grp.rotation.y=ry||0;scene.add(grp);CLOCKS.push({hands,grp,off:0,seen:false,away:false,wrong:false});return grp;}
/* Dream clocks. A fixed night time, not the device's. While a clock is watched it keeps
   good time; after the station has gone unwatched for a while, the time has moved on when
   you look back. Only the waiting-room clock (the first one built) is wrong on a second look. */
const DREAM={t:23*3600+38*60+40,unseen:0,since:0,lastSlip:-1e9};
const _fr=new THREE.Frustum(),_pm=new THREE.Matrix4(),_cv=new THREE.Vector3();
function tickClocks(dt){
  DREAM.since+=dt;DREAM.t+=dt;
  camera.updateMatrixWorld();_pm.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);_fr.setFromProjectionMatrix(_pm);
  let watched=false;
  CLOCKS.forEach((c,i)=>{c.grp.getWorldPosition(_cv);const v=entered&&_cv.distanceTo(camera.position)<45&&_fr.containsPoint(_cv);
    if(v){watched=true;if(i===0&&c.away&&!c.wrong){c.wrong=true;c.off=-(17*60+30);}c.seen=true;c.away=false;}else if(c.seen)c.away=true;});
  if(watched){if(DREAM.unseen>8&&DREAM.since-DREAM.lastSlip>40){DREAM.t+=60*(1+Math.floor(Math.random()*5));DREAM.lastSlip=DREAM.since;}DREAM.unseen=0;}
  else if(entered)DREAM.unseen+=dt;
  for(const c of CLOCKS){const t=((DREAM.t+c.off)%86400+86400)%86400;const sec=t%60,min=Math.floor(t/60)%60,hr=Math.floor(t/3600)%12;
    const sa=Math.min(sec/57,1)*Math.PI*2,ma=min/60*Math.PI*2,ha=(hr+min/60)/12*Math.PI*2;
    for(const h of c.hands){h.sc.rotation.z=-sa;h.mn.rotation.z=-ma;h.hr.rotation.z=-ha;}}}

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0x2c3a5c,0x0b0907,0.75));
const starlight=new THREE.DirectionalLight(0x7e8fc4,0.28);starlight.position.set(60,90,-40);scene.add(starlight); // faint fill from the northern sky
function plight(x,y,z,color,int,dist){const l=new THREE.PointLight(color,int,dist,1.6);l.position.set(x,y,z);scene.add(l);return l;}
const poolMats={};
function pool(x,y,z,r,color,op){const key=color+'_'+op;const m=poolMats[key]||(poolMats[key]=new THREE.MeshBasicMaterial({map:TX.pool,color,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));const p=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),m);p.rotation.x=-Math.PI/2;p.position.set(x,y,z);scene.add(p);return p;}

/* ---------- sky: a Belgian midsummer night ----------
   Compass: the valley runs south-west to north-east along x. +x is north-east (down the line,
   where the glow and later the sunrise are), the town hill (-z) is north-west, the river (+z) south-east.
   The sky is fixed to 25 June, 02:00 local (00:00 UT), 50.4°N 4.9°E: Vega near the zenith, the Plough
   as low in the north-west as it gets on a June night, the glow due north. It need not agree with the clocks. */
const NORTH=new THREE.Vector3(1,0,-1).normalize(),EAST=new THREE.Vector3(1,0,1).normalize(),UPV=new THREE.Vector3(0,1,0);
function skyDir(azD,altD){const az=azD*Math.PI/180,al=altD*Math.PI/180;return new THREE.Vector3().addScaledVector(NORTH,Math.cos(az)*Math.cos(al)).addScaledVector(EAST,Math.sin(az)*Math.cos(al)).addScaledVector(UPV,Math.sin(al));}
const LAT=50.4*Math.PI/180;
const LST=(()=>{const D=(Date.UTC(2026,5,25,0,0)-Date.UTC(2000,0,1,12))/864e5;return(((18.697374558+24.06570982441908*D+4.9/15)%24)+24)%24;})();
function altaz(raH,decD){const H=(LST-raH)*Math.PI/12,d=decD*Math.PI/180;const alt=Math.asin(Math.sin(d)*Math.sin(LAT)+Math.cos(d)*Math.cos(LAT)*Math.cos(H));const az=Math.atan2(-Math.cos(d)*Math.sin(H),Math.sin(d)*Math.cos(LAT)-Math.cos(d)*Math.sin(LAT)*Math.cos(H));return[az*180/Math.PI,alt*180/Math.PI];}
const SUN=altaz(6.22,23.4);
const dirOf=(ra,de)=>{const[az,al]=altaz(ra,de);return skyDir(az,al);};
const sky=new THREE.Mesh(new THREE.SphereGeometry(800,64,32),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{sun:{value:skyDir(SUN[0],0)},gp:{value:dirOf(12.857,27.128)},gc:{value:dirOf(17.761,-29.008)},g90:{value:dirOf(21.2,48.33)}},
  vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform vec3 sun,gp,gc,g90;varying vec3 vD;
  float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  void main(){vec3 d=normalize(vD);float h=d.y;
    vec3 c=mix(vec3(.045,.06,.105),vec3(.006,.009,.026),smoothstep(-.02,.6,h));
    // the glow along the northern horizon that never quite goes at midsummer
    float a=max(dot(normalize(vec3(d.x,0.,d.z)+1e-5),sun),0.);
    c+=vec3(.15,.19,.21)*pow(a,1.3)*exp(-max(h,0.)*4.5);
    // the Milky Way: a soft band, brightest through Cygnus, with the dark rift beside it
    float sb=dot(d,gp),l=atan(dot(d,g90),dot(d,gc));
    float band=exp(-pow(sb/.15,2.));
    float w=.35+.85*exp(-pow((l-1.31)/.7,2.))+.5*exp(-pow(l/.55,2.));
    float rift=1.-.6*smoothstep(.75,.95,l)*(1.-smoothstep(1.55,1.75,l))*exp(-pow((sb-.03)/.035,2.));
    float n=.55+.45*vnoise(d*9.)+.25*vnoise(d*23.)-.12;
    c+=vec3(.042,.048,.064)*band*w*rift*n*smoothstep(.02,.25,h);
    c=mix(c,vec3(.015,.018,.025),smoothstep(0.,-.12,h));
    gl_FragColor=vec4(c,1.);}`}));
sky.renderOrder=-1;scene.add(sky);
{const R=700,srnd=(()=>{let a=621;return()=>{a=(a*16807)%2147483647;return(a-1)/2147483646;};})();
 // the bright stars of a June night: Summer Triangle, Cygnus, Lyra, Aquila, the Plough, Cassiopeia, Arcturus, Polaris and their neighbours
 const STARS=[[18.615,38.78,0],[20.690,45.28,1.25],[19.846,8.87,.77],[14.261,19.18,-.05],[16.490,-26.43,1.06],[13.420,-11.16,.97],[5.278,46.0,.08],[2.530,89.26,1.98],
  [11.062,61.75,1.8],[11.031,56.38,2.37],[11.897,53.69,2.44],[12.257,57.03,3.3],[12.900,55.96,1.77],[13.399,54.93,2.23],[13.792,49.31,1.86],
  [20.370,40.26,2.23],[20.770,33.97,2.48],[19.512,27.96,3.05],[19.750,45.13,2.87],[18.835,33.36,3.5],[18.982,32.69,3.25],[19.771,10.61,2.72],[19.922,6.41,3.7],
  [.675,56.54,2.24],[.153,59.15,2.28],[.945,60.72,2.15],[1.430,60.24,2.66],[1.907,63.67,3.35],[15.578,26.71,2.22],[17.582,12.56,2.07],[16.504,21.49,2.78],
  [23.079,15.21,2.49],[23.063,28.08,2.42],[.220,15.18,2.83],[.140,29.09,2.06],[14.845,74.16,2.08],[17.943,51.49,2.23],[17.507,52.30,2.79],[14.750,27.07,2.35],[18.403,-34.38,1.85],[3.405,49.86,1.79]];
 const groups=[[],[],[],[]],cuts=[.5,1.6,2.5,9],sizes=[3.4,2.6,2,1.6],ops=[1,.95,.85,.7];
 for(const[ra,de,m]of STARS){const[az,al]=altaz(ra,de);if(al<-1)continue;const v=skyDir(az,al).multiplyScalar(R);groups[cuts.findIndex(c=>m<c)].push(v.x,v.y,v.z);}
 const field=[];for(let i=0;i<1700;i++){const u=srnd()*2-1,th=srnd()*Math.PI*2,r=Math.sqrt(1-u*u);if(u<.01)continue;field.push(r*Math.cos(th)*R,u*R,r*Math.sin(th)*R);}
 const addPts=(arr,size,op,color)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const pts=new THREE.Points(g,new THREE.PointsMaterial({color,size,sizeAttenuation:false,fog:false,transparent:true,opacity:op,depthWrite:false,toneMapped:false}));scene.add(pts);return pts;};
 groups.forEach((g,i)=>addPts(g,sizes[i],ops[i],0xf2f4ff));
 addPts(field,1.1,.45,0xcfd8ff);
 // a faint Milky Way along the galactic plane, brightest through Cygnus and the rift beside it left dark
 const aG=192.85948*Math.PI/180,dG=27.12825*Math.PI/180,lN=122.93192*Math.PI/180,mw=[];
 for(let i=0;i<14000&&mw.length<3500*3;i++){const l=srnd()*360;let b=(srnd()+srnd()+srnd()-1.5)*12;
  const dc=((l-75+540)%360-180)/38,ds=(((l+180)%360)-180)/28;const w=.25+.75*Math.exp(-dc*dc)+.55*Math.exp(-ds*ds);if(srnd()>w)continue;
  if(l>45&&l<95&&b>-.5&&b<4&&srnd()<.7)continue;
  const L=l*Math.PI/180,B=b*Math.PI/180;const sd=Math.sin(B)*Math.sin(dG)+Math.cos(B)*Math.cos(dG)*Math.cos(lN-L);const de=Math.asin(sd);
  const ra=aG+Math.atan2(Math.cos(B)*Math.sin(lN-L),Math.sin(B)*Math.cos(dG)-Math.cos(B)*Math.sin(dG)*Math.cos(lN-L));
  const[az,al]=altaz(((ra*12/Math.PI)%24+24)%24,de*180/Math.PI);if(al<0)continue;const v=skyDir(az,al).multiplyScalar(R+20);mw.push(v.x,v.y,v.z);}
 const mwp=addPts(mw,1.3,.09,0xb9c5ea);mwp.material.blending=THREE.AdditiveBlending;}

/* ---------- ground, tracks ---------- */
/* valley terrain: river beyond track 3, wooded slope above it, town on the hill behind the station */
const sstep=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
function terrainH(x,z){if(z>21&&z<46)return -1.4*sstep(21,25,z)*(1-sstep(42,46,z));if(z>=46)return 115*sstep(46,230,z)+6*Math.sin(x*.021)*sstep(60,120,z)+3*Math.sin(x*.05+z*.03);if(z<-46)return 75*sstep(-46,-240,z)+4*Math.sin(x*.03)*sstep(-70,-140,z);return -.04;}
{const g=new THREE.PlaneGeometry(900,800,150,160);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,terrainH(x,z));uv.setXY(i,x/5,z/5);}g.computeVertexNormals();scene.add(new THREE.Mesh(g,MAT.grass));}
{const water=new THREE.Mesh(new THREE.PlaneGeometry(900,22),new THREE.MeshStandardMaterial({color:0x060a12,roughness:.12,metalness:.7}));water.rotation.x=-Math.PI/2;water.position.set(0,-.55,33.5);scene.add(water);const rm=new THREE.MeshBasicMaterial({map:TX.pool,color:0xb9c3e0,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});const r=new THREE.Mesh(new THREE.PlaneGeometry(14,3),rm);r.rotation.x=-Math.PI/2;r.position.set(-30,-.53,36);scene.add(r);}
bmm(-40,0,-30,40,.02,-15,MAT.cobble);
bmm(-170,0,0.35,170,.16,8.3,MAT.ballast);
bmm(-170,0,14.8,170,.16,18.6,MAT.ballast);
const TRACKS=[2.0,6.5,16.5];
{const sl=[];for(const tz of TRACKS)for(let x=-165;x<=165;x+=0.6)sl.push([x,.24,tz]);inst(new THREE.BoxGeometry(.24,.16,2.5),MAT.sleeper,sl);
 for(const tz of TRACKS)for(const o of[-.7175,.7175]){bmm(-168,.32,tz+o-.035,168,.47,tz+o+.035,MAT.rail);}}

/* ---------- platforms ---------- */
const pfMat=[MAT.conc,MAT.conc,MAT.paving,MAT.conc,MAT.conc,MAT.conc];
bmm(-58,0,-6,58,P-.01,0.0,pfMat);
bmm(-58,0,0.0,58,P,0.35,MAT.coping);
bmm(-45,0,8.65,45,P-.01,14.45,pfMat);
bmm(-45,0,8.3,45,P,8.65,MAT.coping);bmm(-45,0,14.45,45,P,14.8,MAT.coping);
const lineMat=new THREE.MeshBasicMaterial({color:0xd9d6cc});
bmm(-58,P-.009,-.62,58,P-.004,-.52,lineMat);
bmm(-45,P-.009,9.12,45,P-.004,9.22,lineMat);bmm(-45,P-.009,13.88,45,P-.004,13.98,lineMat);

/* ---------- station building ---------- */
const B={x0:-14,x1:14,z0:-15,z1:-6};
bmm(-14.2,0,-15.2,14.2,P,-6,[MAT.stone,MAT.stone,MAT.floor,MAT.stone,MAT.stone,MAT.stone]);
const WING_H=P+4.8,CORE_H=P+8;
// front wall z=-6.15 (outside +z)
const fW=[MAT.brick,MAT.brick,MAT.brick,MAT.brick,MAT.brick,MAT.plaster];
const frontHoles={L:[{a:-12.85,b:-11.55,y0:P+.9,y1:P+3.3},{a:-10.2,b:-8.8,y0:P,y1:P+2.75},{a:-7.45,b:-6.15,y0:P+.9,y1:P+3.3}],
  C:[{a:-3.6,b:-2.4,y0:P+.9,y1:P+3.4},{a:-.9,b:.9,y0:P,y1:P+3.0},{a:2.4,b:3.6,y0:P+.9,y1:P+3.4},{a:-3.4,b:-2.2,y0:P+5.5,y1:P+7.3},{a:2.2,b:3.4,y0:P+5.5,y1:P+7.3}],
  R:[{a:6.2,b:8.4,y0:P+.8,y1:P+3.3},{a:10.6,b:12.8,y0:P+.8,y1:P+3.3}]};
wall('x',-6.15,-14,-5,P-.01,WING_H,.3,fW,frontHoles.L);
wall('x',-6.15,-5,5,P-.01,CORE_H,.3,fW,frontHoles.C);
wall('x',-6.15,5,14,P-.01,WING_H,.3,fW,frontHoles.R);
frontHoles.L.forEach((h,i)=>dress('x',-6.15,h,1,{door:i===1}));
frontHoles.C.forEach((h,i)=>dress('x',-6.15,h,1,{door:i===1,dark:i>=3}));
frontHoles.R.forEach(h=>dress('x',-6.15,h,1));
// back wall z=-14.85 (outside -z)
const bW=[MAT.brick,MAT.brick,MAT.brick,MAT.brick,MAT.plaster,MAT.brick];
const backHoles={L:[{a:-12.6,b:-11.4,y0:P+.9,y1:P+3.3},{a:-7.6,b:-6.4,y0:P+.9,y1:P+3.3}],
  C:[{a:.6,b:2.4,y0:P,y1:P+3.0},{a:-3.4,b:-2.2,y0:P+5.5,y1:P+7.3},{a:2.2,b:3.4,y0:P+5.5,y1:P+7.3}],
  R:[{a:6.6,b:7.8,y0:P+.9,y1:P+3.3},{a:11,b:12.2,y0:P+.9,y1:P+3.3}]};
wall('x',-14.85,-14,-5,0,WING_H,.3,bW,backHoles.L);
wall('x',-14.85,-5,5,0,CORE_H,.3,bW,backHoles.C);
wall('x',-14.85,5,14,0,WING_H,.3,bW,backHoles.R);
backHoles.L.forEach(h=>dress('x',-14.85,h,-1));
backHoles.C.forEach((h,i)=>dress('x',-14.85,h,-1,{door:i===0,dark:i>0}));
backHoles.R.forEach(h=>dress('x',-14.85,h,-1));
// street door, closed
bmm(.62,P,-14.9,1.49,P+2.98,-14.8,MAT.doorGreen);bmm(1.51,P,-14.9,2.38,P+2.98,-14.8,MAT.doorGreen);
[[.75,1.36],[1.64,2.25]].forEach(([a,b])=>{const g=plane(b-a,1.1,MAT.glass,(a+b)/2,P+2.1,-14.79);});
// side walls
const holesSide=[{a:-11.2,b:-9.8,y0:P+.9,y1:P+3.3}];
wall('z',-13.85,-15,-6,0,WING_H,.3,[MAT.plaster,MAT.brick,MAT.brick,MAT.brick,MAT.brick,MAT.brick],holesSide);holesSide.forEach(h=>dress('z',-13.85,h,-1));
wall('z',13.85,-15,-6,0,WING_H,.3,[MAT.brick,MAT.plaster,MAT.brick,MAT.brick,MAT.brick,MAT.brick],holesSide);holesSide.forEach(h=>dress('z',13.85,h,1));
// internal walls
wall('z',-5,-14.7,-6.3,P,P+5.2,.3,MAT.plaster,[{a:-11,b:-9,y0:P,y1:P+2.75}]);
wall('z',-5,-15,-6,P+5.2,CORE_H,.3,MAT.brick);
wall('z',5,-14.7,-6.3,P,P+5.2,.3,MAT.plaster,[{a:-13.4,b:-7.4,y0:P+.9,y1:P+3.2}]);
wall('z',5,-15,-6,P+5.2,CORE_H,.3,MAT.brick);
{const g=plane(6,2.3,MAT.glass,5,P+2.05,-10.4,Math.PI/2);for(const zz of[-13.4,-11.4,-9.4,-7.4])bmm(4.95,P+.9,zz-.04,5.05,P+3.2,zz+.04,MAT.frame);bmm(4.95,P+3.16,-13.4,5.05,P+3.24,-7.4,MAT.frame);bmm(4.86,P+.82,-13.45,5.14,P+.92,-7.35,MAT.wood);}
// doorway trims (interior)
bmm(-5.2,P+2.75,-11.1,-4.8,P+2.95,-8.9,MAT.wood);
// ceilings
bmm(-13.7,P+4.6,-14.7,-5.15,P+4.7,-6.3,MAT.plaster);
bmm(-4.85,P+5.2,-14.7,4.85,P+5.3,-6.3,MAT.plaster);
bmm(5.15,P+4.6,-14.7,13.7,P+4.7,-6.3,MAT.plaster);
// stone bands
for(const [z0,z1] of[[-6.02,-5.94],[-15.06,-14.98]]){bmm(-14.1,P+4.55,z0,14.1,P+4.8,z1,MAT.stone);bmm(-5.1,P+7.75,z0,5.1,P+8.0,z1,MAT.stone);}
bmm(-14.1,P-.01,-6.02,14.1,P+.35,-5.94,MAT.stone);
bmm(-14.25,0,-15.15,14.25,P+.5,-14.98,MAT.stone);
for(const x of[-14,14]){bmm(x-.12,0,-15.12,x+.12,WING_H,-14.88,MAT.stone);bmm(x-.12,P,-6.12,x+.12,WING_H,-5.88,MAT.stone);}
for(const x of[-5,5])for(const z of[-6,-15])bmm(x-.16,P-.01,z-.14,x+.16,CORE_H,z+.14,MAT.stone);
// wing roofs (ridge along x)
const ridgeZ=-10.5,RY=P+7.4;
for(const [a,b] of[[-14.35,-5],[5,14.35]]){slabX(a,b,-5.55,WING_H-.1,ridgeZ,RY,.14,MAT.slate);slabX(a,b,-15.45,WING_H-.1,ridgeZ,RY,.14,MAT.slate);bmm(a,RY-.05,ridgeZ-.08,b,RY+.12,ridgeZ+.08,MAT.dark);}
// wing gable triangles
function triZ(x,zA,zB,y0,y1,th,mat){const sh=new THREE.Shape();sh.moveTo(zA,y0);sh.lineTo(zB,y0);sh.lineTo((zA+zB)/2,y1);sh.closePath();const g=new THREE.ExtrudeGeometry(sh,{depth:th,bevelEnabled:false});const m=new THREE.Mesh(g,mat);m.rotation.y=-Math.PI/2;m.position.set(x+th/2,0,0);scene.add(m);return m;}
triZ(-13.85,-15,-6,WING_H,RY-.05,.3,MAT.brick);triZ(13.85,-15,-6,WING_H,RY-.05,.3,MAT.brick);
// centre roof (ridge along z) and stepped gables
const CR=P+11.6;
slabZ(-15.35,-5.65,-5.4,CORE_H-.1,0,CR,.14,MAT.slate);slabZ(-15.35,-5.65,5.4,CORE_H-.1,0,CR,.14,MAT.slate);
bmm(-.1,CR-.05,-15.35,.1,CR+.12,-5.65,MAT.dark);
function stepped(zc){const rl=x=>CORE_H+(5.3-Math.abs(x))*((CR-CORE_H)/5.3);let prev=CORE_H;const hws=[5.3,4.3,3.3,2.3,1.3,.5];for(let k=0;k<hws.length;k++){const hw=hws[k],nxt=hws[k+1]??0;const top=k===hws.length-1?CR+.9:rl(nxt)+.45;bmm(-hw,prev,zc-.17,hw,top,zc+.17,MAT.brick);bmm(-hw-.06,top,zc-.21,-nxt,top+.12,zc+.21,MAT.stone);bmm(nxt,top,zc-.21,hw+.06,top+.12,zc+.21,MAT.stone);prev=top;}bmm(-.18,prev+.12,zc-.18,.18,prev+.6,zc+.18,MAT.stone);}
stepped(-6.15);stepped(-14.85);
// date stone
{const t=ctex(256,128,(g,w,h)=>{g.fillStyle='#7a828b';g.fillRect(0,0,w,h);grain(g,w,h,2000,.1);g.fillStyle='#2a2f35';g.font=`600 76px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('1873',w/2,h/2+4);});plane(1.1,.55,new THREE.MeshStandardMaterial({map:t,roughness:.9}),0,P+8.9,-5.97);}
// chimneys
bmm(-10.2,RY-1,-11.6,-9.5,RY+1.3,-10.9,MAT.brick);bmm(9.5,RY-1,-9.9,10.2,RY+1.3,-9.2,MAT.brick);

/* doors: open leaves for the two platform doors */
bmm(-10.2,P,-6.0,-10.15,P+2.6,-5.2,MAT.doorGreen);bmm(-8.85,P,-6.0,-8.8,P+2.6,-5.2,MAT.doorGreen);
bmm(-.9,P,-6.0,-.85,P+2.9,-5.1,MAT.doorGreen);bmm(.85,P,-6.0,.9,P+2.9,-5.1,MAT.doorGreen);

/* ---------- interiors ---------- */
const warm=0xffcf94;
// waiting room
for(const [x0,z0,x1,z1] of[[-13.68,-14.68,-5.18,-14.63],[-13.68,-14.6,-13.63,-6.32]])bmm(x0,P,z0,x1,P+1.15,z1,MAT.wood);
bmm(-13.68,P+1.12,-6.38,-5.18,P+1.2,-6.3,MAT.wood);
function bench(x0,z0,x1,z1,seatH,backSide){bmm(x0,P+seatH-.05,z0,x1,P+seatH,z1,MAT.wood);const n=Math.max(2,Math.round((x1-x0)/1.4)+1);for(let i=0;i<n;i++){const x=x0+.08+(x1-x0-.16)*i/(n-1);bmm(x-.03,P,z0+.05,x+.03,P+seatH-.05,z1-.05,MAT.iron);}if(backSide)bmm(x0,P+seatH,backSide[0],x1,P+seatH+.45,backSide[1],MAT.wood);}
function benchZ(x0,z0,x1,z1,seatH,back){bmm(x0,P+seatH-.05,z0,x1,P+seatH,z1,MAT.wood);for(const z of[z0+.1,(z0+z1)/2,z1-.1])bmm(x0+.05,P,z-.03,x1-.05,P+seatH-.05,z+.03,MAT.iron);if(back)bmm(back[0],P+seatH,z0,back[1],P+seatH+.45,z1,MAT.wood);}
bench(-13.3,-14.6,-6.0,-14.1,.45,[-14.66,-14.6]);
benchZ(-13.6,-12.9,-13.1,-7.4,.45,[-13.66,-13.6]);
// stove
cyl(-9.5,P,-10.4,.34,.9,MAT.dark,20);cyl(-9.5,P+.9,-10.4,.4,.06,MAT.dark,20);cyl(-9.5,P+.96,-10.4,.08,3.64,MAT.dark,10);bmm(-9.85,P,-10.75,-9.15,P+.04,-10.05,MAT.stone);
// timetable posters
function poster(x,y,z,ry,w,h,title,color){const t=ctex(256,Math.round(256*h/w),(g,W,H)=>{g.fillStyle=color;g.fillRect(0,0,W,H);g.fillStyle='#1d1d1d';g.font=`700 22px ${FONT}`;g.fillText(title,14,32);g.fillRect(14,42,W-28,3);g.font=`500 12px ${FONT}`;for(let i=0;i<Math.floor((H-70)/16);i++){const hh=5+Math.floor(rnd()*18),mm=Math.floor(rnd()*60);g.fillText(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`,14,66+i*16);g.fillRect(56,58+i*16,40+rnd()*(W-120),5);}});return plane(w,h,new THREE.MeshStandardMaterial({map:t,roughness:.8}),x,y,z,ry);}
poster(-9.9,P+1.9,-14.68,0,.9,1.25,'Départs','#f2d24b');poster(-8.9,P+1.9,-14.68,0,.9,1.25,'Arrivées','#f4f1e6');
clock(-5.17,P+3.0,-12.8,-Math.PI/2,{single:true,r:.3});
for(const z of[-12.5,-8.5]){cyl(-9.5,P+4.1,z,.01,.5,MAT.black,4);const b=new THREE.Mesh(new THREE.SphereGeometry(.17,16,10),MAT.lampWarm);b.position.set(-9.5,P+3.95,z);scene.add(b);}
plight(-9.5,P+3.7,-10.5,warm,1.1,11);
// hall
bmm(-3.9,P,-14.69,-2.1,P+3.0,-14.6,MAT.wood);
{const t=ctex(256,160,(g,w,h)=>{g.fillStyle='#efe6cf';g.fillRect(0,0,w,h);g.fillStyle='#9d1c16';g.fillRect(40,56,176,46);g.fillStyle='#fff';g.font=`600 30px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('Fermé',w/2,80);});plane(1.3,.8,new THREE.MeshBasicMaterial({map:t,toneMapped:false,color:0xcfc4ad}),-3,P+1.75,-14.58);}
bmm(-3.95,P+1.1,-14.6,-2.05,P+1.17,-14.3,MAT.wood);
sign([{t:'Guichets',size:1}],1.2,.3,-3,P+3.3,-14.62,0);
sign([{t:'Sortie  →',size:1}],1.1,.3,1.5,P+3.35,-14.62,0);
sign([{t:'Quais',size:1}],1.0,.3,0,P+3.35,-6.33,Math.PI);
benchZ(-4.6,-14.0,-4.2,-11.6,.45,[-4.75,-4.6]);
for(const z of[-12.5,-8.5]){cyl(0,P+4.6,z,.01,.6,MAT.black,4);const b=new THREE.Mesh(new THREE.SphereGeometry(.2,16,10),MAT.lampWarm);b.position.set(0,P+4.4,z);scene.add(b);}
plight(0,P+4.1,-10.5,warm,1.15,12);
// cafetaria (closed, one light on)
bmm(6,P,-14.3,13.3,P+1.05,-13.6,MAT.wood);bmm(5.95,P+1.05,-14.35,13.35,P+1.1,-13.5,MAT.stone);
bmm(6,P+1.6,-14.7,13.3,P+1.64,-14.45,MAT.wood);bmm(6,P+2.2,-14.7,13.3,P+2.24,-14.45,MAT.wood);
{const bottles=[];for(let i=0;i<34;i++){bottles.push([6.2+rnd()*7,P+1.64+.14,-14.58]);}inst(new THREE.CylinderGeometry(.035,.04,.28,8),new THREE.MeshStandardMaterial({color:0x2d4a3a,roughness:.2,metalness:.1}),bottles);}
bmm(11.6,P+1.1,-14.1,12.3,P+1.55,-13.7,MAT.steel);
const chairs=[];
for(const [tx,tz] of[[7.6,-11.2],[11.2,-11.2],[7.6,-8.2],[11.2,-8.2]]){cyl(tx,P,tz,.04,.72,MAT.black,8);cyl(tx,P+.72,tz,.42,.04,MAT.wood,24);cyl(tx,P,tz,.22,.03,MAT.black,16);
  for(const s of[-1,1]){const cz=tz+s*.18;const g=new THREE.Group();bmm(-.2,0,-.2,.2,.04,.2,MAT.wood,g);for(const lx of[-.17,.17])for(const lz of[-.17,.17])bmm(lx-.015,.04,lz-.015,lx+.015,.47,lz+.015,MAT.black,g);bmm(-.2,-.42,s*.17-.015,.2,0,s*.17+.015,MAT.wood,g);g.position.set(tx,P+.76,cz);scene.add(g);}}
for(const x of[7.6,11.2]){cyl(x,P+4.1,-9.7,.008,.5,MAT.black,4);const b=new THREE.Mesh(new THREE.SphereGeometry(.16,16,10),MAT.lampOff);b.position.set(x,P+3.95,-9.7);scene.add(b);}
{cyl(9.6,P+4.1,-13.9,.008,.7,MAT.black,4);const sh=new THREE.Mesh(new THREE.ConeGeometry(.22,.2,20,1,true),new THREE.MeshStandardMaterial({color:0x2d3a31,side:THREE.DoubleSide}));sh.position.set(9.6,P+3.35,-13.9);scene.add(sh);const b=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),MAT.lampWarm);b.position.set(9.6,P+3.27,-13.9);scene.add(b);plight(9.6,P+3.0,-13.6,0xffc27a,.75,7.5);pool(9.6,P+1.111,-13.95,.9,0xffc27a,.35);}
{const t=ctex(256,320,(g,w,h)=>{g.fillStyle='#202a24';g.fillRect(0,0,w,h);g.strokeStyle='#c9bfa6';g.lineWidth=4;g.strokeRect(10,10,w-20,h-20);g.fillStyle='#e7dfc8';g.font=`600 30px ${FONT}`;g.textAlign='center';g.fillText('Café',w/2,58);g.font=`500 20px ${FONT}`;g.textAlign='left';const it=[['Café','2,40'],['Thé','2,20'],['Chocolat chaud','2,80'],['Croque-monsieur','4,50'],['Potage du jour','3,90'],['Gaufre','3,20']];it.forEach(([a,b],i)=>{g.fillText(a,26,104+i*32);g.textAlign='right';g.fillText(b,w-26,104+i*32);g.textAlign='left';});});plane(.9,1.12,new THREE.MeshStandardMaterial({map:t,roughness:.8}),13.66,P+2.3,-12.3,-Math.PI/2);}
{const t=signTex([{t:'Fermé',size:1}],512,128,{bg:'#9d1c16'});plane(.5,.16,new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.15}),7.3,P+2.3,-6.0);}

/* ---------- platform 1 canopy ---------- */
const CAN_Y=P+4.15;
slabX(-21,21,-6.0,CAN_Y-.12,-.2,CAN_Y+.28,.08,MAT.wood);
slabX(-21,21,-6.0,CAN_Y-.03,-.2,CAN_Y+.37,.06,MAT.slate);
{const v=TX.valance.clone();v.needsUpdate=true;v.repeat.set(42/.8,1);const vm=new THREE.MeshStandardMaterial({map:v,transparent:true,alphaTest:.5,side:THREE.DoubleSide,roughness:.7});plane(42,.5,vm,0,CAN_Y+.06,-.18);for(const sx of[-21,21]){const v2=TX.valance.clone();v2.needsUpdate=true;v2.repeat.set(5.8/.8,1);plane(5.8,.5,new THREE.MeshStandardMaterial({map:v2,transparent:true,alphaTest:.5,side:THREE.DoubleSide}),sx,CAN_Y-.15,-3.1,Math.PI/2);}}
const COLS=[];
for(let x=-20;x<=20;x+=5){COLS.push([x,-1.2]);if(Math.abs(x)>14)COLS.push([x,-5.6]);}
for(const [x,z] of COLS){cyl(x,P,z,.1,CAN_Y-P,MAT.iron,10);cyl(x,P,z,.17,.35,MAT.iron,10);bmm(x-.17,CAN_Y-.35,z-.17,x+.17,CAN_Y-.15,z+.17,MAT.iron);}
for(let x=-20;x<=20;x+=5){bmm(x-.04,CAN_Y-.12,-5.95,x+.04,CAN_Y-.0,-.25,MAT.iron);const br=new THREE.Mesh(new THREE.BoxGeometry(.05,1.1,.05),MAT.iron);br.position.set(x,CAN_Y-.45,-.75);br.rotation.x=.75;scene.add(br);const br2=br.clone();br2.position.z=-1.65;br2.rotation.x=-.75;scene.add(br2);}
bmm(-21,CAN_Y-.25,-1.26,21,CAN_Y-.1,-1.14,MAT.iron);
// led fixtures under canopy
for(let x=-17.5;x<=17.5;x+=5){bmm(x-.6,CAN_Y-.2,-3.06,x+.6,CAN_Y-.14,-2.94,MAT.lampCool);pool(x,P+.012,-3,3.2,0xcfdcff,.22);}
plight(-12,CAN_Y-.6,-3,0xdfe8ff,1.0,13);plight(0,CAN_Y-.6,-3,0xdfe8ff,1.0,13);plight(12,CAN_Y-.6,-3,0xdfe8ff,1.0,13);
// clock and departure board hanging from the canopy beam
bmm(8.95,CAN_Y-.75,-3.6,9.05,CAN_Y-.65,-.6,MAT.steel);
clock(9,CAN_Y-1.33,-.95,Math.PI/2,{hang:.21});
const board1=boardMesh([[['Namur',1]],[['via Yvoir',1]],[['23:47',1],['L',84]]],96,9,CAN_Y-1.15,-2.55,Math.PI/2,true);
bmm(8.98,CAN_Y-.86,-2.6,9.02,CAN_Y-.7,-2.5,MAT.steel);
// facade clock
clock(0,P+6.35,-5.9,0,{single:true,r:.55});
// station name and other signs
const NAME=[{t:'Fond-des-Prés',size:.72,w:700}];
sign(NAME,2.6,.82,-12,CAN_Y-.7,-.9,0,{double:true});for(const x of[-13.1,-10.9])bmm(x-.015,CAN_Y-.29,-.915,x+.015,CAN_Y+.2,-.885,MAT.steel);
sign(NAME,2.6,.82,30,P+2.6,-.95,0,{double:true});sign(NAME,2.6,.82,-32,P+2.6,-.95,0,{double:true});
for(const x of[30,-32]){cyl(x-1.1,P,-.95,.05,2.3,MAT.steel);cyl(x+1.1,P,-.95,.05,2.3,MAT.steel);}
sign([{t:'1',size:1,w:700}],.5,.5,-4,CAN_Y-.6,-2.2,Math.PI/2,{double:true});
sign([{t:'Salle d’attente',size:1}],1.5,.3,-9.5,P+3.05,-5.96,0);
sign([{t:'Sortie',size:1}],1.0,.3,0,P+3.38,-5.96,0);
sign([{t:'Cafétéria',size:1}],1.8,.36,9.5,P+3.75,-5.96,0);
sign([{t:'Quais 2 et 3',size:.55},{t:'↗',size:.45}],1.2,.62,17.2,P+2.3,-1.4,-Math.PI/2);cyl(17.25,P,-1.4,.05,2.0,MAT.steel);
// furniture and kit on platform 1
function metalBench(x,z,ry){const g=new THREE.Group();bmm(-.9,.42,-.22,.9,.46,.22,MAT.steel,g);bmm(-.9,.46,-.24,.9,.88,-.2,MAT.steel,g);for(const lx of[-.75,.75])bmm(lx-.03,0,-.2,lx+.03,.42,.2,MAT.dark,g);g.position.set(x,P,z);g.rotation.y=ry;scene.add(g);}
metalBench(-16,-5.25,0);metalBench(16.5,-5.25,0);metalBench(-3,-5.25,0);metalBench(4.2,-1.9,Math.PI);
{const g=new THREE.Group();bmm(-.35,0,-.3,.35,1.75,.3,M({color:0x2a2e35,roughness:.5}),g);const scr=new THREE.Mesh(new THREE.PlaneGeometry(.42,.32),new THREE.MeshBasicMaterial({color:0x6f95d6,toneMapped:false}));scr.position.set(0,1.28,.302);g.add(scr);bmm(-.3,.9,.3,.3,.98,.38,MAT.steel,g);g.position.set(4.6,P,-5.55);scene.add(g);}
for(const x of[-7.8,13.2]){cyl(x,P,-5.5,.2,.85,MAT.iron,14);}
// lamp posts outside the canopy
const LAMPS=[];
function lampPost(x,z,ry){cyl(x,P,z,.06,4.3,MAT.dark,8);const arm=bmm(x-.04,P+4.25,z-.04,x+.04,P+4.33,z+.5,MAT.dark);arm.rotation.y=ry||0;bmm(x-.18,P+4.2,z+.32,x+.18,P+4.3,z+.62,MAT.dark);bmm(x-.15,P+4.18,z+.35,x+.15,P+4.2,z+.59,MAT.lampCool);pool(x,P+.012,z+.45,4,0xcfdcff,.32);LAMPS.push([x,z]);}
for(const x of[-50,-40,-26,35,45,55])lampPost(x,-1.35);
// fence behind platform 1 beyond the building
for(const [a,b] of[[-58,-14.3],[14.3,58]]){bmm(a,P+1.05,-5.97,b,P+1.1,-5.92,MAT.iron);bmm(a,P+.15,-5.97,b,P+.2,-5.92,MAT.iron);const posts=[];for(let x=a;x<=b;x+=.18)posts.push([x,P+.62,-5.945]);inst(new THREE.BoxGeometry(.02,.95,.02),MAT.iron,posts);}

/* ---------- platform 2-3 shelter ---------- */
const SH_Y=P+3.4;
bmm(-12,SH_Y,9.1,12,SH_Y+.12,13.9,[MAT.wood,MAT.wood,MAT.slate,MAT.wood,MAT.wood,MAT.wood]);
for(let x=-10;x<=10;x+=5){cyl(x,P,11.5,.1,SH_Y-P,MAT.iron,10);cyl(x,P,11.5,.16,.3,MAT.iron,10);const a=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,4.6),MAT.iron);a.position.set(x,SH_Y-.05,11.5);scene.add(a);}
{const v=TX.valance.clone();v.needsUpdate=true;v.repeat.set(24/.8,1);const vm=new THREE.MeshStandardMaterial({map:v,transparent:true,alphaTest:.5,side:THREE.DoubleSide});plane(24,.42,vm,0,SH_Y-.1,9.08);plane(24,.42,vm,0,SH_Y-.1,13.92);}
for(let x=-7.5;x<=7.5;x+=5){bmm(x-.6,SH_Y-.06,11.44,x+.6,SH_Y,11.56,MAT.lampCool);pool(x,P+.012,11.5,3,0xcfdcff,.24);}
plight(-5,SH_Y-.4,11.5,0xdfe8ff,.85,11);plight(5,SH_Y-.4,11.5,0xdfe8ff,.85,11);
metalBench(-7.5,10.85,Math.PI);metalBench(2.5,12.15,0);metalBench(-2.5,10.85,Math.PI);
bmm(-.05,SH_Y-.75,11.45,.05,SH_Y-.05,11.55,MAT.steel);
clock(0,SH_Y-1.0,11.5,Math.PI/2,{});
const board2=boardMesh([[['Dinant',1]],[['',1]],[['23:52',1],['+0H04',30],['L',86]]],96,-3.2,SH_Y-.75,11.5,Math.PI/2,true);
bmm(-3.25,SH_Y-.46,11.45,-3.15,SH_Y,11.55,MAT.steel);
sign([{t:'2',size:1,w:700}],.5,.5,6.2,SH_Y-.5,9.4,0,{double:true});sign([{t:'3',size:1,w:700}],.5,.5,6.2,SH_Y-.5,13.6,0,{double:true});
sign(NAME,2.6,.82,-28,P+2.6,9.25,0,{double:true});sign(NAME,2.6,.82,34,P+2.6,13.75,0,{double:true});
for(const [x,z] of[[-28,9.25],[34,13.75]]){cyl(x-1.1,P,z,.05,2.3,MAT.steel);cyl(x+1.1,P,z,.05,2.3,MAT.steel);}
sign([{t:'Quai 1',size:.5},{t:'Sortie ↗',size:.5}],1.2,.62,17.2,P+2.3,10.0,-Math.PI/2);cyl(17.25,P,10.0,.05,2.0,MAT.steel);
for(const x of[-40,-20,32,42])lampPost(x,10.35);

/* ---------- footbridge ---------- */
const BX0=25.8,BX1=28.6,BZ0=-4.4,BZ1=13.6;
bmm(BX0,DECK-.12,BZ0,BX1,DECK,BZ1,[MAT.iron,MAT.iron,MAT.wood,MAT.iron,MAT.iron,MAT.iron]);
bmm(BX0-.08,DECK-.7,BZ0,BX0+.06,DECK,BZ1,MAT.iron);bmm(BX1-.06,DECK-.7,BZ0,BX1+.08,DECK,BZ1,MAT.iron);
function latticeZ(x,z0,z1,y0,h){const t=MAT.lattice.clone();t.alphaMap=TX.lattice.clone();t.alphaMap.needsUpdate=true;t.alphaMap.wrapS=t.alphaMap.wrapT=THREE.RepeatWrapping;t.alphaMap.repeat.set((z1-z0)/h,1);plane(z1-z0,h,t,x,y0+h/2,(z0+z1)/2,Math.PI/2);bmm(x-.05,y0+h-.02,z0,x+.05,y0+h+.06,z1,MAT.iron);}
latticeZ(BX1-.02,BZ0,BZ1,DECK,1.25);
latticeZ(BX0+.02,-2.2,11.4,DECK,1.25);latticeZ(BX0+.02,BZ0,-4.2,DECK,1.25);latticeZ(BX0+.02,13.4,BZ1,DECK,1.25);
{function latticeX(z,x0,x1,y0,h){const t=MAT.lattice.clone();t.alphaMap=TX.lattice.clone();t.alphaMap.needsUpdate=true;t.alphaMap.wrapS=t.alphaMap.wrapT=THREE.RepeatWrapping;t.alphaMap.repeat.set((x1-x0)/h,1);plane(x1-x0,h,t,(x0+x1)/2,y0+h/2,z,0);bmm(x0,y0+h-.02,z-.05,x1,y0+h+.06,z+.05,MAT.iron);}latticeX(BZ0+.02,BX0,BX1,DECK,1.25);latticeX(BZ1-.02,BX0,BX1,DECK,1.25);}
for(const z of[BZ0+.1,4.25,BZ1-.1])for(const x of[BX0+.05,BX1-.05]){const y0=(z===4.25)?0:P;cyl(x,y0,z,.11,DECK-.7-y0,MAT.iron,10);}
bmm(BX0,DECK-1.1,4.15,BX1,DECK-.7,4.35,MAT.iron);
// stairs (rising +x from x=18 to 26)
const STEPS=32,RUN=8/STEPS,RISE=(DECK-P)/STEPS;
function stair(z0,z1){const treads=[];for(let i=0;i<STEPS;i++){treads.push([18+(i+.5)*RUN,P+(i+1)*RISE-.03,(z0+z1)/2]);}inst(new THREE.BoxGeometry(RUN+.02,.06,z1-z0-.12),MAT.wood,treads);const ang=Math.atan2(DECK-P,8),L=Math.hypot(8,DECK-P);for(const z of[z0+.03,z1-.03]){const s=new THREE.Mesh(new THREE.BoxGeometry(L,.3,.06),MAT.iron);s.position.set(22,(P+DECK)/2-.12,z);s.rotation.z=ang;scene.add(s);const t=MAT.lattice.clone();t.alphaMap=TX.lattice.clone();t.alphaMap.needsUpdate=true;t.alphaMap.wrapS=t.alphaMap.wrapT=THREE.RepeatWrapping;t.alphaMap.repeat.set(L/1.1,1);const pl=new THREE.Mesh(new THREE.PlaneGeometry(L,1.0),t);pl.position.set(22,(P+DECK)/2+.55,z);pl.rotation.z=ang;scene.add(pl);const hr=new THREE.Mesh(new THREE.BoxGeometry(L,.06,.08),MAT.iron);hr.position.set(22,(P+DECK)/2+1.07,z);hr.rotation.z=ang;scene.add(hr);}for(const x of[20,23.5])cyl(x,P,(z0+z1)/2,.07,P+(x-18)/8*(DECK-P)-P-.2,MAT.iron,8);}
stair(-4.2,-2.2);stair(11.4,13.4);
{bmm(27.2-.25,DECK+2.5,4.25-.25,27.2+.25,DECK+2.6,4.25+.25,MAT.dark);bmm(27.2-.2,DECK+2.47,4.25-.2,27.2+.2,DECK+2.5,4.25+.2,MAT.lampWarm);bmm(27.17,DECK,4.22,27.23,DECK+2.5,4.28,MAT.dark);plight(27.2,DECK+2.2,4.25,0xffd9a8,.9,10);pool(27.2,DECK+.01,4.25,2.3,0xffd9a8,.3);}

/* ---------- catenary ---------- */
for(const x of[-135,-90,-45,0,45,90,135]){for(const mz of[4.25,19.0]){bmm(x-.12,0,mz-.08,x+.12,7.2,mz+.08,MAT.steel);}bmm(x-.06,6.9,4.25,x+.06,7.0,19.0,MAT.steel);bmm(x-.06,6.9,-.2,x+.06,7.0,4.25,MAT.steel);}
{const wm=new THREE.LineBasicMaterial({color:0x2d3138});for(const tz of TRACKS)for(const y of[5.35,5.75]){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-170,y,tz),new THREE.Vector3(170,y,tz)]);scene.add(new THREE.Line(g,wm));}}

/* ---------- surroundings ---------- */
bmm(-170,.85,19.25,170,.9,19.3,MAT.iron);bmm(-170,.15,19.25,170,.2,19.3,MAT.iron);
{const fp=[];for(let x=-170;x<=170;x+=2.5)fp.push([x,.5,19.27]);inst(new THREE.BoxGeometry(.06,1,.06),MAT.iron,fp);}
{const n=1400;const geo=new THREE.ConeGeometry(1,1,7);geo.translate(0,.5,0);const tm=M({color:0x0c120e,roughness:1});const im=new THREE.InstancedMesh(geo,tm,n);const o=new THREE.Object3D();for(let k=0;k<n;k++){const x=-420+rnd()*840,z=48+rnd()*200;const h=7+rnd()*9;o.position.set(x,terrainH(x,z)-.5,z);o.scale.set(h*.34,h,h*.34);o.rotation.y=rnd()*6;o.updateMatrix();im.setMatrixAt(k,o.matrix);}scene.add(im);}
{const n=260;const geo=new THREE.SphereGeometry(1,7,5);const tm=M({color:0x0e1510,roughness:1});const im=new THREE.InstancedMesh(geo,tm,n);const o=new THREE.Object3D();for(let k=0;k<n;k++){const x=-300+rnd()*600,z=20.2+rnd()*3.5;const h=3+rnd()*4;o.position.set(x,terrainH(x,z)+h*.7,z);o.scale.set(h*.6,h*.75,h*.6);o.updateMatrix();im.setMatrixAt(k,o.matrix);}scene.add(im);}
const FAC=[0,1,2,3,4,5].map(facadeTex);
{let x=-52;let k=0;while(x<52){const w=7+rnd()*4.5,h=7+rnd()*5,d=10;const fm=new THREE.MeshStandardMaterial({map:FAC[k%FAC.length],roughness:.9,emissive:0xffffff,emissiveMap:FAC[k%FAC.length],emissiveIntensity:.25});const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[MAT.brick,MAT.brick,MAT.dark,MAT.dark,fm,MAT.dark]);m.position.set(x+w/2,h/2,-40);scene.add(m);const r=new THREE.Mesh(new THREE.BoxGeometry(w+.2,d/1.45,d/1.45),MAT.slate);r.rotation.x=Math.PI/4;r.position.set(x+w/2,h,-40);scene.add(r);x+=w+.15;k++;}}
for(const zr of[-62,-84,-108,-134]){let x=-150+rnd()*10,k=0;while(x<150){if(rnd()<.18){x+=6+rnd()*12;continue;}const w=7+rnd()*5,h=7+rnd()*5,d=9;const base=terrainH(x+w/2,zr+4)-1;const tex=FAC[(k+3)%FAC.length];const fm=new THREE.MeshStandardMaterial({map:tex,roughness:.9,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:.3});const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[MAT.brick,MAT.brick,MAT.dark,MAT.dark,fm,MAT.dark]);m.position.set(x+w/2,base+h/2,zr);scene.add(m);const r=new THREE.Mesh(new THREE.BoxGeometry(w+.2,d/1.45,d/1.45),MAT.slate);r.rotation.x=Math.PI/4;r.position.set(x+w/2,base+h,zr);scene.add(r);x+=w+.2+rnd()*2;k++;}}
{const pts=[];for(let i=0;i<170;i++){const z=-50-rnd()*120;const x=-200+rnd()*400;pts.push(x,terrainH(x,z)+3.5,z);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffc27a,size:2.2,sizeAttenuation:false,transparent:true,opacity:.85,fog:false,toneMapped:false})));}
for(const x of[-18,-6,6,18]){cyl(x,0,-22,.07,4.5,MAT.dark,8);const g=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),MAT.lampWarm);g.position.set(x,4.6,-22);scene.add(g);pool(x,.03,-22,5,0xffc98a,.35);}
{const tr=[[-30,-25],[28,-24],[-24,-31],[24,-31],[-36,-18],[36,-18]];const sm=new THREE.SphereGeometry(1,10,8);const tm=M({color:0x111a12,roughness:1});for(const [x,z] of tr){cyl(x,0,z,.18,3,MAT.dark,6);const c=new THREE.Mesh(sm,tm);c.scale.set(2.6,3.2,2.6);c.position.set(x,5,z);scene.add(c);}}

/* ---------- walkable areas ---------- */
const N={p1:'Quai 1',p2:'Quais 2 et 3',wr:'Salle d’attente',hall:'Hall',bridge:'Passerelle',stair:'Escalier'};
const R=[];function reg(n,x0,x1,z0,z1,y,h){R.push({n,x0,x1,z0,z1,y,h});}
const stairH=x=>P+Math.min(1,Math.max(0,(x-18)/8))*(DECK-P);
reg(N.p1,-57.7,57.7,-5.7,-4.45,P);reg(N.p1,-57.7,57.7,-1.95,0.0,P);reg(N.p1,-57.7,17.75,-4.45,-1.95,P);reg(N.p1,26.25,57.7,-4.45,-1.95,P);
reg(N.stair,17.7,26.2,-3.95,-2.45,0,stairH);reg(N.stair,17.7,26.2,11.65,13.15,0,stairH);
reg(N.bridge,26.1,28.3,-4.1,13.3,DECK);
reg(N.p2,-44.7,44.7,8.75,11.15,P);reg(N.p2,-44.7,44.7,13.65,14.3,P);reg(N.p2,-44.7,17.75,11.15,13.65,P);reg(N.p2,26.25,44.7,11.15,13.65,P);
reg(N.wr,-13.4,-5.5,-14.4,-6.65,P);reg(N.wr,-10.0,-9.0,-6.8,-5.55,P);
reg(N.hall,-4.5,4.5,-14.4,-6.65,P);reg(N.hall,-.6,.6,-6.8,-5.55,P);reg(N.hall,-5.6,-4.4,-10.85,-9.15,P);
const OBC=[];const OBB=[];
COLS.forEach(([x,z])=>OBC.push([x,z,.18]));for(let x=-10;x<=10;x+=5)OBC.push([x,11.5,.18]);LAMPS.forEach(([x,z])=>OBC.push([x,z,.1]));
OBC.push([-9.5,-10.4,.5],[-7.8,-5.5,.22],[13.2,-5.5,.22],[30-1.1,-.95,.06],[30+1.1,-.95,.06],[-32-1.1,-.95,.06],[-32+1.1,-.95,.06],[17.25,-1.4,.08],[17.25,10,.08]);
for(const z of[BZ0+.1,BZ1-.1])for(const x of[BX0+.05,BX1-.05])OBC.push([x,z,.13]);
OBB.push([-13.3,-6.0,-14.7,-14.1],[-13.7,-13.1,-12.9,-7.4],[-4.75,-4.2,-14,-11.6],[4.25,4.95,-5.85,-5.25],[-16.9,-15.1,-5.5,-5.0],[15.6,17.4,-5.5,-5.0],[-3.9,-2.1,-5.5,-5.0],[3.3,5.1,-2.15,-1.65],[-8.4,-6.6,10.6,11.1],[-3.4,-1.6,10.6,11.1],[1.6,3.4,11.9,12.4]);
function blocked(x,z,f){if(Math.abs(f-P)>.3)return false;const r=.28;for(const [cx,cz,cr] of OBC){const dx=x-cx,dz=z-cz;if(dx*dx+dz*dz<(cr+r)*(cr+r))return true;}for(const [x0,x1,z0,z1] of OBB){if(x>x0-r&&x<x1+r&&z>z0-r&&z<z1+r)return true;}return false;}
function floorAt(x,z,cur){let best=null,bn=null;for(const r of R){if(x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1){const h=r.h?r.h(x,z):r.y;if(Math.abs(h-cur)<.55&&(best===null||Math.abs(h-cur)<Math.abs(best-cur))){best=h;bn=r.n;}}}return best===null?null:{h:best,n:bn};}

/* ---------- player ---------- */
const VIEWS=[{x:-6,z:-2.9,f:P,yaw:-Math.PI/2+.12,pitch:.02},{x:-12.4,z:-13.6,f:P,yaw:-Math.PI*.78,pitch:-.05},{x:1.2,z:-7.4,f:P,yaw:.25,pitch:.02},{x:27.2,z:9.5,f:DECK,yaw:Math.PI/2+.25,pitch:-.2},{x:-6,z:12.9,f:P,yaw:.05,pitch:.05}];
const pl={x:0,z:0,f:P,y:P,yaw:0,pitch:0,area:N.p1,bob:0};
function go(i){const v=VIEWS[i];Object.assign(pl,{x:v.x,z:v.z,f:v.f,y:v.f,yaw:v.yaw,pitch:v.pitch});const r=floorAt(v.x,v.z,v.f);pl.area=r?r.n:pl.area;}
// testing aid: with ?dev in the URL, window.LPDev.place({x,z,f,yaw,pitch}) moves the camera
if(new URLSearchParams(location.search).has('dev'))window.LPDev={place(o){Object.assign(pl,o);if(o.f!==undefined)pl.y=o.f;},state:()=>({...pl,dreamTime:DREAM.t})};
go(0);

/* ---------- input ---------- */
const keys={};let entered=false,locked=false,dragging=false,lastX=0,lastY=0;
const SENS=.0022;
const DEV=new URLSearchParams(location.search).has('dev');document.body.classList.toggle('dev',DEV);
addEventListener('keydown',e=>{if(!entered)return;keys[e.code]=true;if(DEV&&/^Digit[1-5]$/.test(e.code))go(+e.code.slice(5)-1);if(DEV&&e.code==='KeyM')togglePlan();});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
function look(dx,dy){pl.yaw-=dx*SENS;pl.pitch=Math.max(-1.35,Math.min(1.35,pl.pitch-dy*SENS));}
canvas.addEventListener('click',()=>{if(!entered||locked||matchMedia('(pointer: coarse)').matches)return;try{const p=canvas.requestPointerLock&&canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;canvas.classList.toggle('locked',locked);document.getElementById('cross').hidden=!locked||!entered;});
canvas.addEventListener('mousedown',e=>{if(locked)return;dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.style.cursor='grabbing';});
addEventListener('mouseup',()=>{dragging=false;canvas.style.cursor='';});
addEventListener('mousemove',e=>{if(!entered)return;if(locked)look(e.movementX,e.movementY);else if(dragging){look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;}});
// touch: left thumb walks, right thumb looks
const joy=document.getElementById('joy'),knob=document.getElementById('knob');let jt=null,lt=null,jv={x:0,y:0};
canvas.addEventListener('touchstart',e=>{if(!entered)return;for(const t of e.changedTouches){if(t.clientX<innerWidth*.45&&jt===null){jt={id:t.identifier,x:t.clientX,y:t.clientY};joy.style.left=t.clientX+'px';joy.style.top=t.clientY+'px';joy.hidden=false;}else if(lt===null){lt={id:t.identifier,x:t.clientX,y:t.clientY};}}e.preventDefault();},{passive:false});
canvas.addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(jt&&t.identifier===jt.id){let dx=t.clientX-jt.x,dy=t.clientY-jt.y;const l=Math.hypot(dx,dy),m=50;if(l>m){dx*=m/l;dy*=m/l;}jv={x:dx/m,y:dy/m};knob.style.transform=`translate(${dx}px,${dy}px)`;}else if(lt&&t.identifier===lt.id){look((t.clientX-lt.x)*1.4,(t.clientY-lt.y)*1.4);lt.x=t.clientX;lt.y=t.clientY;}}e.preventDefault();},{passive:false});
function endTouch(e){for(const t of e.changedTouches){if(jt&&t.identifier===jt.id){jt=null;jv={x:0,y:0};joy.hidden=true;knob.style.transform='';}if(lt&&t.identifier===lt.id)lt=null;}}
canvas.addEventListener('touchend',endTouch);canvas.addEventListener('touchcancel',endTouch);

/* ---------- ui ---------- */
const hint=document.getElementById('hint');let hintT=0;
function showHint(t,ms){hint.textContent=t;hint.hidden=false;hint.style.opacity=1;clearTimeout(hintT);hintT=setTimeout(()=>{hint.style.opacity=0;setTimeout(()=>hint.hidden=true,650);},ms||2600);}
document.querySelectorAll('#views button').forEach(b=>b.addEventListener('click',()=>{go(+b.dataset.v);b.blur();}));
const planC=document.getElementById('plan');let planOn=false;
function togglePlan(){planOn=!planOn;planC.hidden=!planOn;document.getElementById('btnPlan').setAttribute('aria-pressed',planOn);if(planOn&&locked)document.exitPointerLock();}
document.getElementById('btnPlan').addEventListener('click',e=>{togglePlan();e.currentTarget.blur();});
planC.addEventListener('click',togglePlan);
document.getElementById('btnKeys').addEventListener('click',e=>{e.currentTarget.blur();showHint(matchMedia('(pointer: coarse)').matches?'Left thumb walks. Right thumb looks.':'WASD to walk, Shift to hurry. Click to capture the mouse, Esc to free it. 1–5 viewpoints, M plan.',4200);});

/* sound: filtered noise for night air plus a faint electrical hum */
let actx=null,master=null,soundOn=true;
function startSound(){try{actx=new (window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.gain.value=0;master.connect(actx.destination);const len=actx.sampleRate*4,buf=actx.createBuffer(2,len,actx.sampleRate);for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2;}}const src=actx.createBufferSource();src.buffer=buf;src.loop=true;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;const g=actx.createGain();g.gain.value=.55;src.connect(lp).connect(g).connect(master);src.start();const o=actx.createOscillator();o.frequency.value=100;const og=actx.createGain();og.gain.value=.006;o.connect(og).connect(master);o.start();master.gain.linearRampToValueAtTime(.5,actx.currentTime+3);}catch(e){}}
document.getElementById('btnSound').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.setAttribute('aria-pressed',soundOn);e.currentTarget.blur();if(master&&actx)master.gain.setTargetAtTime(soundOn?.5:0,actx.currentTime,.3);});
document.getElementById('enter').addEventListener('click',()=>{entered=true;document.getElementById('intro').hidden=true;document.getElementById('hud').hidden=false;document.getElementById('views').hidden=false;startSound();const coarse=matchMedia('(pointer: coarse)').matches;if(!coarse){try{const p=canvas.requestPointerLock&&canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}showHint(coarse?'Left thumb walks. Right thumb looks.':'WASD to walk. Move the mouse to look.',2600);});

/* plan drawing */
function drawPlan(){const dpr=Math.min(devicePixelRatio||1,2);const W=planC.clientWidth,H=planC.clientHeight;if(planC.width!==W*dpr){planC.width=W*dpr;planC.height=H*dpr;}const g=planC.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const wx0=-60,wx1=60,wz0=-46,wz1=22;const pad=28;const s=Math.min((W-pad*2)/(wx1-wx0),(H-pad*2-40)/(wz1-wz0));const ox=W/2-(wx0+wx1)/2*s,oz=H/2+10-(wz0+wz1)/2*s;const X=x=>ox+x*s,Z=z=>oz+z*s;
  g.fillStyle='#eef0f4';g.font=`600 18px ${FONT}`;g.fillText('Fond-des-Prés · plan',pad,pad+6);g.font=`400 13px ${FONT}`;g.fillStyle='#97a1b4';g.fillText('Click or press M to close',pad,pad+24);
  const rect=(x0,z0,x1,z1,f,st)=>{if(f){g.fillStyle=f;g.fillRect(X(x0),Z(z0),(x1-x0)*s,(z1-z0)*s);}if(st){g.strokeStyle=st;g.lineWidth=1;g.strokeRect(X(x0),Z(z0),(x1-x0)*s,(z1-z0)*s);}};
  rect(-40,-30,40,-15,'#14161b');rect(-58,-6,58,.35,'#3a3a3d');rect(-45,8.3,45,14.8,'#3a3a3d');
  g.strokeStyle='#6c6f75';g.lineWidth=1.5;for(const tz of TRACKS){for(const o of[-.72,.72]){g.beginPath();g.moveTo(X(-60),Z(tz+o));g.lineTo(X(60),Z(tz+o));g.stroke();}}
  rect(-14,-15,14,-6,'#5a3a30','#8a6b5a');rect(-13.7,-14.7,-5.15,-6.3,'#6e5a46');rect(-4.85,-14.7,4.85,-6.3,'#6e5a46');rect(5.15,-14.7,13.7,-6.3,'#4a3d33');
  rect(-21,-6,21,-.2,'rgba(150,170,200,.12)');rect(-12,9.1,12,13.9,'rgba(150,170,200,.12)');
  rect(18,-4.2,26,-2.2,'#2f4a42');rect(18,11.4,26,13.4,'#2f4a42');rect(BX0,BZ0,BX1,BZ1,'#2f4a42','#5d8a7c');
  g.fillStyle='#cfd5e0';g.font=`500 ${Math.max(11,s*1.1)}px ${FONT}`;g.textAlign='center';
  const lab=(t,x,z)=>g.fillText(t,X(x),Z(z));lab('Salle d’attente',-9.4,-10);lab('Hall',0,-10);lab('Cafétéria',9.4,-10);lab('Quai 1',-38,-2.6);lab('Quais 2 et 3',-30,11.9);lab('Voie 1',-52,2.5);lab('Voie 2',-52,7);lab('Voie 3',-52,17);lab('Place de la Gare',0,-24);lab('Passerelle',27.2,-5.6);lab('Rivière',-40,30);g.textAlign='left';
  const px=X(pl.x),pz=Z(pl.z);const fx=-Math.sin(pl.yaw),fz=-Math.cos(pl.yaw);g.fillStyle='#ffb12e';g.beginPath();g.moveTo(px+fx*12,pz+fz*12);g.lineTo(px-fz*6-fx*5,pz+fx*6-fz*5);g.lineTo(px+fz*6-fx*5,pz-fx*6-fz*5);g.closePath();g.fill();g.beginPath();g.arc(px,pz,3,0,7);g.fill();}

/* ---------- loop ---------- */
const whereEl=document.getElementById('where');let lastArea='';let lastMin=-1;
const clockT=new THREE.Clock();
function frame(){const dt=Math.min(clockT.getDelta(),.05);
  if(entered&&!planOn){let ix=0,iz=0;if(keys.KeyW||keys.ArrowUp)iz-=1;if(keys.KeyS||keys.ArrowDown)iz+=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyQ)pl.yaw+=dt*1.6;if(keys.KeyE)pl.yaw-=dt*1.6;ix+=jv.x;iz+=jv.y;const l=Math.hypot(ix,iz);
    if(l>.05){if(l>1){ix/=l;iz/=l;}const sp=(keys.ShiftLeft||keys.ShiftRight)?3.1:1.55;const sn=Math.sin(pl.yaw),cs=Math.cos(pl.yaw);const dx=(ix*cs+iz*sn)*sp*dt,dz=(-ix*sn+iz*cs)*sp*dt;
      const tryAt=(x,z)=>{if(blocked(x,z,pl.f))return null;return floorAt(x,z,pl.f);};let r=tryAt(pl.x+dx,pl.z+dz),nx=pl.x+dx,nz=pl.z+dz;if(!r){r=tryAt(pl.x+dx,pl.z);nx=pl.x+dx;nz=pl.z;}if(!r){r=tryAt(pl.x,pl.z+dz);nx=pl.x;nz=pl.z+dz;}
      if(r){pl.x=nx;pl.z=nz;pl.f=r.h;pl.area=r.n;if(!reduceMotion)pl.bob+=dt*sp*5.2;}}}
  pl.y+=(pl.f-pl.y)*Math.min(1,dt*14);
  const bob=reduceMotion?0:Math.sin(pl.bob)*.022;
  camera.position.set(pl.x,pl.y+EYE+bob,pl.z);camera.rotation.y=pl.yaw;camera.rotation.x=pl.pitch;
  tickClocks(dt);
  if(pl.area!==lastArea){whereEl.textContent=pl.area;lastArea=pl.area;}
  renderer.render(scene,camera);
  if(planOn)drawPlan();
  requestAnimationFrame(frame);}
requestAnimationFrame(frame);
})();
