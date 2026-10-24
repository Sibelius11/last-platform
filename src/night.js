/* The night: one scripted night at Fond-des-Prés, about four minutes from entering.
   Three trains, the ways out, the stranger, and waking.
   Nothing here is ever labelled for the player. Names below are for us. */
(function () {
'use strict';
function boot() { if (window.LPStation) night(window.LPStation); }
if (window.LPStation) boot(); else addEventListener('lp-station', boot, { once: true });

function night(S) {
const THREE = S.THREE, P = S.P, pl = S.pl, scene = S.scene, camera = S.camera;
const params = new URLSearchParams(location.search);

/* ---------- the night's timeline (seconds after entering) ----------
   Tune here after testing. */
const T = {
  throughCall: 45,      // chime + announcement, voie 2
  throughPass: 58,      // through train's nose at x = 0
  passengerCall: 100,   // chime + announcement, voie 1
  openStop: 118,        // open train at rest on voie 3, never announced
  passengerStop: 124,   // passenger train at rest on voie 1, a few seconds later
  doorsOpen: 127,
  depart: 186,          // passenger leaves; the open train leaves with it unless someone is waiting on it
  stayed: 266           // nobody boarded anything: the night ends here
};
const STRANGER_DELAY = 4;  // seconds aboard before he appears out of the dark
const STAY_ABOARD = 8;     // seconds aboard, uninterrupted, still needed once he has sat down
const BOARD_TO_GO = 7;     // boarding the passenger train: doors close and it leaves this soon after

/* placeholder words. French must be checked by a native speaker; the stranger's lines are Martin's to write */
const SAY = {
  through: 'Attention, voie deux. Un train va passer sans arrêt. Veuillez vous éloigner de la bordure du quai.',
  passenger: 'Voie un. Le train L à destination de Namur, via Yvoir, va entrer en gare. Veuillez vous éloigner de la bordure du quai.',
  greeting: null,  // English, the stranger's greeting
  toast: null      // English, the toast line
};

let nt = 0;            // night time
let ended = null;      // set once an ending has begun
const st = { called: {}, passengerDepart: T.depart, openDepart: null, onPassenger: false, riding: false,
  aboardSince: null, strangerState: 'none', strangerT: 0, rideT: 0, glimpseSeen: false };
if (S.DEV && params.has('t')) nt = +params.get('t') || 0;

/* ---------- geometry helpers ---------- */
function mergeGeos(gs) {
  let n = 0; for (const g of gs) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const size = gs[0].attributes[k].itemSize, arr = new Float32Array(n * size); let o = 0;
    for (const g of gs) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
    out.setAttribute(k, new THREE.BufferAttribute(arr, size));
  }
  out.computeBoundingSphere(); return out;
}
function Builder() {
  const parts = new Map();
  const put = (mat, g) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); };
  return {
    box(mat, x0, y0, z0, x1, y1, z1) {
      if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; if (z1 < z0) [z0, z1] = [z1, z0];
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).toNonIndexed();
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); put(mat, g);
    },
    cyl(mat, x, y0, z, r, h, seg, axis) {
      const g = new THREE.CylinderGeometry(r, r, h, seg || 12).toNonIndexed();
      if (axis === 'z') g.rotateX(Math.PI / 2); g.translate(x, y0 + (axis === 'z' ? 0 : h / 2), z); put(mat, g);
    },
    build(group) { for (const [mat, gs] of parts) group.add(new THREE.Mesh(mergeGeos(gs), mat)); return group; }
  };
}
/* a wall along x at z = c, with openings */
function wallX(B, mat, c, t, a0, a1, y0, y1, holes) {
  holes = holes.slice().sort((p, q) => p.a - q.a); let cur = a0;
  const piece = (a, b, ya, yb) => { if (b - a > 1e-3 && yb - ya > 1e-3) B.box(mat, a, ya, c - t / 2, b, yb, c + t / 2); };
  for (const h of holes) { piece(cur, h.a, y0, y1); piece(h.a, h.b, y0, h.y0); piece(h.a, h.b, h.y1, y1); cur = h.b; }
  piece(cur, a1, y0, y1);
}
const std = (o) => new THREE.MeshStandardMaterial(o);
const glowMats = {};
function glow(color, size, opacity, fog) {
  const k = color + '_' + opacity + '_' + fog;
  const m = glowMats[k] || (glowMats[k] = new THREE.SpriteMaterial({ map: S.TX.pool, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: !!fog }));
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
}

/* ---------- kinematics ---------- */
// arriving along dir, braking over `brake` seconds to stop with its nose at xs at time ts
function arrive(t, xs, ts, v, brake, dir) {
  const r = ts - t; if (r <= 0) return xs; const a = v / brake;
  if (r <= brake) return xs - dir * 0.5 * a * r * r;
  return xs - dir * (0.5 * v * brake + v * (r - brake));
}
function leave(t, x0, td, a, vmax, dir) {
  const d = t - td; if (d <= 0) return x0; const ta = vmax / a;
  if (d <= ta) return x0 + dir * 0.5 * a * d * d;
  return x0 + dir * (0.5 * a * ta * ta + vmax * (d - ta));
}

/* ---------- materials for the trains ---------- */
const TM = {
  body: std({ color: 0xc9cdd2, roughness: .45, metalness: .25 }),
  band: std({ color: 0x1b2129, roughness: .35, metalness: .3 }),
  skirt: std({ color: 0x2b2f35, roughness: .7 }),
  roof: std({ color: 0x6d7379, roughness: .6, metalness: .3 }),
  under: std({ color: 0x141619, roughness: .9 }),
  door: std({ color: 0x2c6b70, roughness: .45, metalness: .2 }),
  stripe: std({ color: 0xb8862d, roughness: .5 }),
  lining: std({ color: 0xd8d4c8, roughness: .8, emissive: 0xfff0d6, emissiveIntensity: .32 }),
  floor: std({ color: 0x3a3c40, roughness: .9, emissive: 0xfff0d6, emissiveIntensity: .05 }),
  seat: std({ color: 0x3e5470, roughness: .9, emissive: 0x9fb4d6, emissiveIntensity: .12 }),
  seatBack: std({ color: 0x4a6080, roughness: .9, emissive: 0x9fb4d6, emissiveIntensity: .1 }),
  ceilLamp: new THREE.MeshBasicMaterial({ color: 0xfff6e6, toneMapped: false }),
  glass: std({ color: 0x8fa3b8, roughness: .05, metalness: .3, transparent: true, opacity: .42, depthWrite: false, side: THREE.DoubleSide, emissive: 0x223040, emissiveIntensity: .25 }),
  screen: std({ color: 0x0b0f14, roughness: .1, metalness: .4 }),
  head: new THREE.MeshBasicMaterial({ color: 0xfff7e8, toneMapped: false }),
  tail: new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false }),
  // the through train: dark, long, its windows a lit strip
  tBody: std({ color: 0x343b47, roughness: .5, metalness: .35 }),
  // the open train
  loco: std({ color: 0x1c2621, roughness: .7, metalness: .3 }),
  locoTrim: std({ color: 0x5a4a32, roughness: .6 }),
  deck: S.MAT.wood,
  post: std({ color: 0x23302b, roughness: .55, metalness: .45 }),
  canopy: std({ color: 0x2a2620, roughness: .9 }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xffc98a, toneMapped: false })
};
const winTex = S.ctex(256, 32, (g, w, h) => {
  g.fillStyle = '#10141a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) { g.fillStyle = i === 2 ? '#7f8a96' : '#c9d3dc'; g.fillRect(i * 64 + 6, 6, 52, 20); }
});
const winMat = new THREE.MeshBasicMaterial({ map: winTex, color: 0xb9c4cf, toneMapped: false });

/* ---------- passenger train, voie 1 ---------- */
const PZ = S.TRACKS[0], CAR = 24, GAP = .8, W = 2.84, TOP = P + 2.95;
const DOOR_X = [-9, 9];
function passengerCar(front, rear) {
  const B = Builder(), g = new THREE.Group(), h = CAR / 2;
  const holes = [];
  for (let x = -h + 2.3; x <= h - 2.2; x += 2.1) { if (DOOR_X.some(d => Math.abs(x - d) < 1.6)) continue; holes.push({ a: x - .82, b: x + .82, y0: P + .95, y1: P + 2.05 }); }
  const doors = DOOR_X.map(d => ({ a: d - .65, b: d + .65, y0: P + .02, y1: P + 2.12 }));
  for (const s of [-1, 1]) {
    wallX(B, TM.body, s * (W / 2 - .04), .08, -h, h, P - .02, TOP, holes.concat(doors));
    wallX(B, TM.lining, s * (W / 2 - .1), .02, -h + .1, h - .1, P, TOP - .05, holes.concat(doors));
    for (const hl of holes) B.box(TM.glass, hl.a, hl.y0, s * (W / 2 - .05) - .006, hl.b, hl.y1, s * (W / 2 - .05) + .006);
    B.box(TM.stripe, -h, P + .62, s * W / 2 - .002, h, P + .7, s * W / 2 + .002);
    B.box(TM.band, -h, P + .9, s * W / 2 - .003, h, P + .95, s * W / 2 + .003);
    B.box(TM.band, -h, P + 2.05, s * W / 2 - .003, h, P + 2.1, s * W / 2 + .003);
  }
  // ends
  for (const e of [-1, 1]) B.box(TM.body, e * h - .05, P - .02, -W / 2, e * h + .05, TOP, W / 2);
  // roof, floor, underframe, bogies
  B.box(TM.roof, -h, TOP, -W / 2, h, TOP + .14, W / 2); B.box(TM.roof, -h + .3, TOP + .14, -1.05, h - .3, TOP + .42, 1.05);
  B.box(TM.floor, -h, P - .06, -W / 2 + .06, h, P, W / 2 - .06);
  B.box(TM.skirt, -h, .52, -W / 2 + .1, h, P - .06, W / 2 - .1);
  for (const bx of [-h + 3.2, h - 3.2]) { B.box(TM.under, bx - 1.4, .2, -1.15, bx + 1.4, .62, 1.15); for (const wx of [-.9, .9]) for (const wz of [-.72, .72]) B.cyl(TM.under, bx + wx, .47, PZ * 0 + wz, .45, .12, 14, 'z'); }
  // interior: rows of seats facing the way of travel (+x), a lit ceiling
  B.box(TM.lining, -h + .1, TOP - .08, -W / 2 + .1, h - .1, TOP - .02, W / 2 - .1);
  B.box(TM.ceilLamp, -h + 1, TOP - .1, -.42, h - 1, TOP - .08, -.32); B.box(TM.ceilLamp, -h + 1, TOP - .1, .32, h - 1, TOP - .08, .42);
  for (let x = -h + 2.3; x <= h - 2.2; x += 2.1) {
    if (DOOR_X.some(d => Math.abs(x - d) < 1.6)) continue;
    for (const [z0, z1] of [[-1.3, -.3], [.3, 1.3]]) {
      B.box(TM.seat, x - .3, P, z0, x + .25, P + .47, z1);
      B.box(TM.seatBack, x - .38, P + .47, z0, x - .26, P + 1.18, z1);
    }
  }
  // cab or tail
  if (front) {
    B.box(TM.screen, h + .05, P + 1.15, -1.25, h + .07, P + 2.25, 1.25);
    B.box(TM.band, h + .05, P - .02, -W / 2, h + .55, P + 1.1, W / 2);
    for (const z of [-1.0, 1.0]) { B.box(TM.head, h + .55, P + .55, z - .14, h + .57, P + .7, z + .14); const gl = glow(0xfff2dc, 3.2, .9, false); gl.position.set(h + .7, P + .62, z); g.add(gl); }
    const big = glow(0xfff6e8, 9, .35, false); big.position.set(h + 1, P + .8, 0); g.add(big);
  }
  if (rear) for (const z of [-1.0, 1.0]) { B.box(TM.tail, -h - .07, P + .55, z - .1, -h - .05, P + .68, z + .1); const gl = glow(0xff3020, 1.1, .7, true); gl.position.set(-h - .15, P + .62, z); g.add(gl); }
  B.build(g);
  // door leaves on the platform side (-z) slide open; the far side stays shut
  const leaves = [];
  for (const d of DOOR_X) for (const s of [-1, 1]) {
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.66, 2.1, .05), TM.door);
      m.position.set(d + side * .33, P + 1.07, s * (W / 2 - .04)); g.add(m);
      const win = new THREE.Mesh(new THREE.BoxGeometry(.4, .8, .06), TM.glass); win.position.set(0, .35, 0); m.add(win);
      if (s < 0) leaves.push({ m, x0: d + side * .33, side });
    }
  }
  // warm light the windows throw on the platform
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 2, 2.2), new THREE.MeshBasicMaterial({ map: S.TX.pool, color: 0xffe9c8, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  spill.material.map = S.TX.pool; spill.rotation.x = -Math.PI / 2; spill.position.set(0, P + .013 - 0, -2.6); spill.scale.set(1, 1, 1); g.add(spill);
  return { g, leaves };
}
const passenger = { g: new THREE.Group(), cars: [], x: -9999 };
for (let i = 0; i < 3; i++) { const c = passengerCar(i === 0, i === 2); c.g.position.x = -CAR / 2 - i * (CAR + GAP); passenger.g.add(c.g); passenger.cars.push(c); }
passenger.g.position.set(-9999, 0, PZ); scene.add(passenger.g);
const P_STOP = 39.5;              // nose of the passenger train at rest
const SEAT_P = { x: -CAR / 2 - (CAR + GAP) - 3.35, z: 1.08 }; // a window seat, middle car, valley side

/* ---------- through train, voie 2: from the north-east, does not stop ---------- */
const through = { g: new THREE.Group() };
{
  const B = Builder(), n = 6, L = 20, Z = S.TRACKS[1] * 0, w = 2.9, top = P + 3.0;
  for (let i = 0; i < n; i++) {
    const x0 = i * (L + .6), x1 = x0 + L;
    B.box(TM.tBody, x0, .6, -w / 2, x1, top, w / 2);
    B.box(TM.roof, x0, top, -1.1, x1, top + .35, 1.1);
    B.box(TM.under, x0 + 1, .2, -1.1, x0 + 4, .6, 1.1); B.box(TM.under, x1 - 4, .2, -1.1, x1 - 1, .6, 1.1);
    if (i > 0) for (const s of [-1, 1]) { const pane = new THREE.Mesh(new THREE.PlaneGeometry(L - 2, .9), winMat); pane.position.set((x0 + x1) / 2, P + 1.55, s * (w / 2 + .01)); pane.rotation.y = s > 0 ? 0 : Math.PI; through.g.add(pane); }
  }
  winTex.repeat.set(5, 1);
  B.box(TM.screen, -.06, P + 1.2, -1.2, 0, P + 2.3, 1.2);
  B.build(through.g);
  for (const z of [-1.0, 1.0]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.05, .18, .3), TM.head); h.position.set(-.06, P + .55, z); through.g.add(h); }
  through.light = glow(0xfff8ec, 8, .42, false); through.light.position.set(-1.5, P + .9, 0); through.g.add(through.light);
  through.g.position.set(9999, 0, S.TRACKS[1]); scene.add(through.g);
}
const THROUGH_V = 33;

/* ---------- open train, voie 3: never announced, arrives without a sound ---------- */
const OZ = S.TRACKS[2], O_STOP = 34, OCAR = 14, DECK = P + .1;
const open = { g: new THREE.Group(), x: -9999 };
const CAR_A = { x0: -9.5 - OCAR, x1: -9.5 }, CAR_B = { x0: -10 - 2 * OCAR, x1: -10 - OCAR };
const SEAT_S = -18.5;  // the stranger's place, train-local x
{
  const B = Builder();
  // engine: a low dark hood unit, one small warm lamp
  B.box(TM.under, -9, .3, -1.2, 0, P + .05, 1.2);
  B.box(TM.loco, -6, P + .05, -1.0, -.2, P + 1.85, 1.0);
  B.box(TM.loco, -9, P + .05, -1.35, -6, P + 2.75, 1.35);
  B.box(TM.screen, -6.05, P + 1.9, -1.1, -6.0, P + 2.5, 1.1);
  B.box(TM.screen, -8.6, P + 1.9, 1.351, -6.4, P + 2.5, 1.36); B.box(TM.screen, -8.6, P + 1.9, -1.36, -6.4, P + 2.5, -1.351);
  B.box(TM.loco, -9.1, P + 2.75, -1.45, -5.9, P + 2.9, 1.45);
  B.box(TM.locoTrim, -9, P + .05, -1.36, 0, P + .18, 1.36);
  for (const bx of [-7.2, -1.8]) B.box(TM.under, bx - 1.2, .2, -1.1, bx + 1.2, .6, 1.1);
  B.box(TM.lamp, -.18, P + 1.25, -.09, -.12, P + 1.43, .09);
  // two open cars: a deck, slim posts, a light roof, rails only at the ends. No walls, no doors.
  for (const c of [CAR_A, CAR_B]) {
    B.box(TM.under, c.x0 + .2, .45, -1.2, c.x1 - .2, P + .02, 1.2);
    B.box(TM.deck, c.x0, P + .02, -1.3, c.x1, DECK, 1.3);
    for (const bx of [c.x0 + 2.4, c.x1 - 2.4]) B.box(TM.under, bx - 1.2, .2, -1.1, bx + 1.2, .6, 1.1);
    for (const x of [c.x0 + .1, (c.x0 + c.x1) / 2, c.x1 - .1]) for (const z of [-1.24, 1.24]) B.box(TM.post, x - .04, DECK, z - .04, x + .04, P + 2.55, z + .04);
    B.box(TM.canopy, c.x0 - .1, P + 2.55, -1.45, c.x1 + .1, P + 2.62, 1.45);
    for (const x of [c.x0 + .05, c.x1 - .05]) { B.box(TM.post, x - .03, DECK + .9, -1.24, x + .03, DECK + .95, 1.24); B.box(TM.post, x - .03, DECK + .45, -1.24, x + .03, DECK + .49, 1.24); }
  }
  B.build(open.g);
  const lg = glow(0xffc98a, 1.2, .6, true); lg.position.set(-.3, P + 1.34, 0); open.g.add(lg);
  // the lamp beside him
  open.lamp = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.BoxGeometry(.01, .5, .01), TM.post); cord.position.y = .25; open.lamp.add(cord);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), TM.lamp); open.lamp.add(bulb);
  open.lampGlow = glow(0xffc27a, 1.6, .55, true); open.lamp.add(open.lampGlow);
  open.lamp.position.set(SEAT_S + .5, P + 2.05, 0); open.g.add(open.lamp);
  const deckPool = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.2), new THREE.MeshBasicMaterial({ map: S.TX.pool, color: 0xffc27a, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  deckPool.rotation.x = -Math.PI / 2; deckPool.position.set(SEAT_S + .5, DECK + .01, 0); open.g.add(deckPool);
  open.g.position.set(-9999, 0, OZ); scene.add(open.g);
}
// a little more line to the north-east, so the open train has somewhere to go
{
  const sl = []; for (let x = 168; x <= 470; x += .6) sl.push(x);
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.24, .16, 2.5), S.MAT.sleeper, sl.length); const o = new THREE.Object3D();
  sl.forEach((x, i) => { o.position.set(x, .24, OZ); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); scene.add(im);
  const B = Builder(); B.box(S.MAT.ballast, 168, 0, OZ - 1.9, 470, .16, OZ + 2.1); for (const o2 of [-.7175, .7175]) B.box(S.MAT.rail, 168, .32, OZ + o2 - .035, 470, .47, OZ + o2 + .035); B.build(scene);
}

/* ---------- the stranger ---------- */
const SM = {
  jacket: std({ color: 0x4d4437, roughness: .95 }), shirt: std({ color: 0x7b8487, roughness: .9 }),
  trousers: std({ color: 0x24262b, roughness: .9 }), boots: std({ color: 0x1b1612, roughness: .8 }),
  skin: std({ color: 0xa98a73, roughness: .7 }), hair: std({ color: 0x3a3029, roughness: .9 }),
  glass: std({ color: 0xd7c9a6, roughness: .05, metalness: .1, transparent: true, opacity: .55 }),
  wine: std({ color: 0x6e2a1c, roughness: .2, transparent: true, opacity: .85 })
};
for (const k in SM) { SM[k].emissive = new THREE.Color(0xffb070); SM[k].emissiveIntensity = 0; }
function makeStranger() {
  const g = new THREE.Group(), hips = new THREE.Group(); hips.position.y = .92; g.add(hips);
  const box = (w, h, d, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
  box(.34, .16, .21, SM.trousers, 0, 0, 0, hips);
  const legs = [-1, 1].map(s => { const th = new THREE.Group(); th.position.set(s * .095, -.04, 0); hips.add(th); box(.14, .45, .15, SM.trousers, 0, -.225, 0, th);
    const kn = new THREE.Group(); kn.position.y = -.45; th.add(kn); box(.12, .42, .13, SM.trousers, 0, -.21, 0, kn); box(.13, .08, .27, SM.boots, 0, -.44, .05, kn); return { th, kn }; });
  const torso = new THREE.Group(); torso.position.y = .07; hips.add(torso);
  box(.41, .56, .24, SM.jacket, 0, .3, 0, torso); box(.15, .32, .02, SM.shirt, 0, .37, .121, torso);
  box(.42, .07, .25, SM.jacket, 0, .6, 0, torso);
  box(.07, .08, .07, SM.skin, 0, .67, 0, torso);
  const head = new THREE.Group(); head.position.y = .7; torso.add(head);
  const sk = new THREE.Mesh(new THREE.SphereGeometry(.105, 16, 12), SM.skin); sk.scale.set(.88, 1.12, .98); sk.position.y = .1; head.add(sk);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(.112, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), SM.hair); hr.position.set(0, .125, -.012); hr.scale.set(.9, 1.0, 1.02); head.add(hr);
  const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * .245, .55, 0); torso.add(sh); box(.11, .31, .12, SM.jacket, 0, -.15, 0, sh);
    const el = new THREE.Group(); el.position.y = -.3; sh.add(el); box(.1, .27, .11, SM.jacket, 0, -.135, 0, el); box(.08, .09, .07, SM.skin, 0, -.31, 0, el); return { sh, el }; });
  // a glass in his right hand (the right hand is on -x when he faces +z)
  const glassG = new THREE.Group(); const gl = new THREE.Mesh(new THREE.CylinderGeometry(.034, .028, .1, 12, 1, true), SM.glass); glassG.add(gl);
  const wn = new THREE.Mesh(new THREE.CylinderGeometry(.03, .027, .05, 12), SM.wine); wn.position.y = -.02; glassG.add(wn);
  glassG.position.set(0, -.37, .04); arms[0].el.add(glassG);
  return { g, hips, legs, torso, head, arms, glassG };
}
const man = makeStranger(); man.g.visible = false; scene.add(man.g);
function pose(name, ph) {
  const L = man.legs, A = man.arms;
  man.hips.position.set(0, .92, 0); man.torso.rotation.set(0, 0, 0); man.head.rotation.set(0, 0, 0);
  for (const l of L) { l.th.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); }
  for (const a of A) { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); }
  if (name === 'walk') {
    const s = Math.sin(ph); L[0].th.rotation.x = -.42 * s; L[1].th.rotation.x = .42 * s;
    L[0].kn.rotation.x = Math.max(0, .7 * Math.sin(ph + 1.4)); L[1].kn.rotation.x = Math.max(0, -.7 * Math.sin(ph + 1.4));
    A[0].sh.rotation.x = .3 * s; A[1].sh.rotation.x = -.3 * s; A[0].el.rotation.x = -.25; A[1].el.rotation.x = -.25;
    man.hips.position.y = .92 + .015 * Math.abs(Math.cos(ph));
  } else if (name === 'greet') {
    A[1].sh.rotation.set(-.2, 0, .9 + .12 * Math.sin(ph * 6)); A[1].el.rotation.x = -.6; man.head.rotation.x = -.18;
  } else if (name === 'sit' || name === 'raise' || name === 'toast') {
    man.hips.position.set(0, .09, -.12);
    for (const l of L) { l.th.rotation.x = -Math.PI / 2 + .12; l.kn.rotation.x = Math.PI / 2 - .05; }
    L[1].th.rotation.y = .06; L[0].th.rotation.y = -.04; L[1].kn.rotation.x = Math.PI / 2 + .15;
    man.torso.rotation.x = -.06;
    A[1].sh.rotation.x = -.35; A[1].el.rotation.x = -.7;
    A[0].sh.rotation.x = -.35; A[0].el.rotation.x = -.85;
    if (name === 'raise') { A[0].sh.rotation.set(-1.15, 0, -.55 - .04 * Math.sin(ph)); A[0].el.rotation.x = -.55; man.head.rotation.y = -.55; }
    if (name === 'toast') { const k = ph; A[0].sh.rotation.set(-.35 - .95 * k, 0, -.35 * k); A[0].el.rotation.x = -.85 + .25 * k; man.head.rotation.y = -.7 * k; }
  }
}

/* ---------- walkable additions: door thresholds and the open train's deck ---------- */
const dyn = {};
function setRegions(key, on, list) {
  if (on && !dyn[key]) { dyn[key] = list.map(([n, x0, x1, z0, z1, y]) => ({ n, x0, x1, z0, z1, y })); dyn[key].forEach(r => S.R.push(r)); }
  if (!on && dyn[key]) { dyn[key].forEach(r => { const i = S.R.indexOf(r); if (i >= 0) S.R.splice(i, 1); }); dyn[key] = null; }
}
const DOORS_WORLD = []; for (let i = 0; i < 3; i++) for (const d of DOOR_X) DOORS_WORLD.push(P_STOP - CAR / 2 - i * (CAR + GAP) + d);

/* ---------- veil, used for every crossing into waking ---------- */
const veil = document.createElement('div'); veil.className = 'veil'; document.body.appendChild(veil);
let veilA = 0; const setVeil = (a, color) => { veilA = a; if (color) veil.style.background = color; veil.style.opacity = a; };

/* ---------- sound ---------- */
let A = null;
function audio() {
  if (A) return A; const au = S.audio; if (!au) return null;
  const ctx = au.ctx, bus = ctx.createGain(); bus.gain.value = S.soundOn ? 1 : 0; bus.connect(ctx.destination);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  A = { ctx, bus, noise: nb, amb: au.master }; return A;
}
S.onSound.push(on => { if (A) A.bus.gain.setTargetAtTime(on ? 1 : 0, A.ctx.currentTime, .2); if (!on && window.speechSynthesis) speechSynthesis.cancel(); });
function where() {
  if (st.onPassenger) return { level: .45, cut: 900 };
  const a = pl.area; if (a === S.N.bridge) return { level: .28, cut: 1800 };
  if (a === S.N.stair) return { level: .65, cut: 3000 };
  if (a === S.N.wr || a === S.N.hall) return { level: .4, cut: 700 };
  return { level: 1, cut: 6000 };
}
function noise(dur, filterType, freq, q, peak, attack, out) {
  const a = audio(); if (!a) return; const t = a.ctx.currentTime;
  const src = a.ctx.createBufferSource(); src.buffer = a.noise; src.loop = true;
  const f = a.ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q || .7;
  const g = a.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(f).connect(g).connect(out || a.bus); src.start(t); src.stop(t + dur + .1); return f;
}
/* an original three-note chime: soft bells, rising then settling. Not the railway's jingle. */
function chime() {
  const a = audio(); if (!a) return; const w = where(), t0 = a.ctx.currentTime + .05;
  const lp = a.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = w.cut; lp.connect(a.bus);
  const out = a.ctx.createGain(); out.gain.value = .22 * w.level; out.connect(lp);
  [[587.33, 0], [783.99, .55], [659.25, 1.1]].forEach(([f, dt]) => {
    for (const [mult, amp] of [[1, 1], [2.76, .25], [5.4, .08]]) {
      const o = a.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mult; const g = a.ctx.createGain();
      g.gain.setValueAtTime(0, t0 + dt); g.gain.linearRampToValueAtTime(amp, t0 + dt + .01); g.gain.exponentialRampToValueAtTime(.0005, t0 + dt + 1.9);
      o.connect(g).connect(out); o.start(t0 + dt); o.stop(t0 + dt + 2);
    }
  });
}
function speak(text, lang, delay) {
  if (!text || !window.speechSynthesis || !S.soundOn) return;
  setTimeout(() => {
    if (ended || !S.soundOn) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = .92; u.pitch = 1; u.volume = Math.min(1, where().level);
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)) && /BE|FR/i.test(v.lang)) || speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    if (v) u.voice = v; speechSynthesis.speak(u);
  }, delay || 0);
}
function announce(key) { chime(); speak(SAY[key], 'fr-BE', 1900); }
function clink() {
  const a = audio(); if (!a) return; const t = a.ctx.currentTime;
  for (const [f, amp] of [[2637, .09], [3951, .05], [5274, .03]]) { const o = a.ctx.createOscillator(); o.frequency.value = f; const g = a.ctx.createGain(); g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(.0001, t + .9); o.connect(g).connect(a.bus); o.start(t); o.stop(t + 1); }
}
function beeps() { const a = audio(); if (!a) return; const t = a.ctx.currentTime; for (let i = 0; i < 3; i++) { const o = a.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1180; const g = a.ctx.createGain(); g.gain.setValueAtTime(0, t + i * .32); g.gain.linearRampToValueAtTime(.05 * where().level, t + i * .32 + .01); g.gain.linearRampToValueAtTime(0, t + i * .32 + .2); o.connect(g).connect(a.bus); o.start(t + i * .32); o.stop(t + i * .32 + .25); } }
let tickTimer = 0;
function ticking(level) {
  clearInterval(tickTimer); const a = audio(); if (!a || !level) return;
  const tick = () => { const t = a.ctx.currentTime; const src = a.ctx.createBufferSource(); src.buffer = a.noise; const f = a.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 6; const g = a.ctx.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(.0001, t + .03); src.connect(f).connect(g).connect(a.bus); src.start(t, Math.random()); src.stop(t + .05); };
  tick(); tickTimer = setInterval(tick, 1000);
}
function breath() { noise(2.4, 'bandpass', 900, .9, .07, 1.1); }
function street() { const f = noise(5, 'lowpass', 300, .7, .06, 2.4); if (f) f.frequency.linearRampToValueAtTime(900, A.ctx.currentTime + 2.6); }
function bird() { const a = audio(); if (!a) return; const t0 = a.ctx.currentTime + .8; for (let i = 0; i < 3; i++) { const t = t0 + i * .22; const o = a.ctx.createOscillator(); o.frequency.setValueAtTime(3300, t); o.frequency.exponentialRampToValueAtTime(4700, t + .09); const g = a.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.025, t + .02); g.gain.linearRampToValueAtTime(0, t + .11); o.connect(g).connect(a.bus); o.start(t); o.stop(t + .12); } }
function ambience(on, secs) { S.ambOff = !on; const a = audio(); if (a && a.amb) a.amb.gain.setTargetAtTime(on && S.soundOn ? .5 : 0, a.ctx.currentTime, secs || .5); }

/* ---------- the bedroom: one room for every ending, only light and time differ ---------- */
const bed = (() => {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(58, 1, .05, 50);
  cam.position.set(-1.05, .8, -.55); cam.lookAt(1.4, .98, -.12);
  const plaster = std({ color: 0xd9d2c4, roughness: .95 }), wood = std({ color: 0x6b4a33, roughness: .7 }), linen = std({ color: 0xe8e4dc, roughness: 1 }), duvet = std({ color: 0x8c9aa8, roughness: 1 }),
    curtain = std({ color: 0x7a6b5c, roughness: 1, side: THREE.DoubleSide }), metal = std({ color: 0x2c2f33, roughness: .4, metalness: .6 }), floorM = std({ color: 0x5a4636, roughness: .8 });
  const B = Builder();
  B.box(floorM, -2, -.05, -1.8, 2, 0, 1.8); B.box(plaster, -2, 2.6, -1.8, 2, 2.65, 1.8);
  B.box(plaster, -2.05, 0, -1.8, -2, 2.6, 1.8); B.box(plaster, -2, 0, -1.85, 2, 2.6, -1.8); B.box(plaster, -2, 0, 1.8, 2, 2.6, 1.85);
  // window wall at x = 1.9 with an opening z -0.3..0.9, y 0.95..2.15
  B.box(plaster, 1.9, 0, -1.8, 1.95, 2.6, -.3); B.box(plaster, 1.9, 0, .9, 1.95, 2.6, 1.8); B.box(plaster, 1.9, 0, -.3, 1.95, .95, .9); B.box(plaster, 1.9, 2.15, -.3, 1.95, 2.6, .9);
  B.box(wood, 1.86, .92, -.36, 1.98, .97, .96); B.box(wood, 1.88, 1.53, -.3, 1.92, 1.57, .9); B.box(wood, 1.88, .95, .28, 1.92, 2.15, .32);
  // bed in the foreground
  B.box(wood, -2, 0, -1.25, -.35, .32, 1.2); B.box(duvet, -2, .32, -1.2, -.38, .56, 1.15); B.box(linen, -1.9, .56, -1.15, -1.3, .7, -.25);
  // bedside table and a chair
  B.box(wood, -.2, 0, -1.4, .35, .55, -.85); B.box(wood, -.22, .55, -1.42, .37, .58, -.83);
  B.box(wood, 1.0, .45, 1.0, 1.45, .5, 1.45); for (const [x, z] of [[1.03, 1.03], [1.42, 1.03], [1.03, 1.42], [1.42, 1.42]]) B.box(wood, x - .02, 0, z - .02, x + .02, .45, z + .02); B.box(wood, 1.42, .5, 1.0, 1.45, 1.0, 1.45);
  B.box(duvet, 1.0, .5, 1.02, 1.4, .58, 1.43);
  B.build(sc);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x0b1220, toneMapped: false })); sky.position.set(1.97, 1.55, .3); sky.rotation.y = -Math.PI / 2; sc.add(sky);
  for (const z of [-.45, .95]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(.5, 1.6), curtain); c.position.set(1.84, 1.45, z + (z < 0 ? .2 : -.2)); c.rotation.y = -Math.PI / 2; sc.add(c); }
  // the clock
  const cc = document.createElement('canvas'); cc.width = cc.height = 256; const ctex = new THREE.CanvasTexture(cc); ctex.encoding = THREE.sRGBEncoding;
  const face = std({ map: ctex, roughness: .5, emissive: 0xffffff, emissiveMap: ctex, emissiveIntensity: .05 });
  const clk = new THREE.Group(); const drum = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .05, 28), metal); drum.rotation.x = Math.PI / 2; clk.add(drum);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.066, 28), face); disc.position.z = .026; clk.add(disc);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal); b.position.set(s * .05, .07, 0); b.rotation.z = -s * .4; clk.add(b); const leg = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .03, 6), metal); leg.position.set(s * .045, -.085, 0); clk.add(leg); }
  clk.position.set(.05, .68, -1.12); clk.lookAt(cam.position.x, .7, cam.position.z); sc.add(clk);
  function drawClock(h, m, sec) {
    const g = cc.getContext('2d'); g.clearRect(0, 0, 256, 256); g.fillStyle = '#efe9dc'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    g.fillStyle = '#222'; for (let i = 0; i < 12; i++) { g.save(); g.translate(128, 128); g.rotate(i * Math.PI / 6); g.fillRect(-4, -116, 8, i % 3 ? 16 : 26); g.restore(); }
    const hand = (ang, len, w, col) => { g.save(); g.translate(128, 128); g.rotate(ang); g.fillStyle = col; g.fillRect(-w / 2, -len, w, len + 14); g.restore(); };
    hand((h % 12 + m / 60) / 12 * Math.PI * 2, 62, 10, '#1b1b1b'); hand((m + sec / 60) / 60 * Math.PI * 2, 94, 7, '#1b1b1b'); hand(sec / 60 * Math.PI * 2, 100, 2, '#9d2a1e');
    g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(128, 128, 8, 0, 7); g.fill(); ctex.needsUpdate = true;
  }
  const amb = new THREE.AmbientLight(0xffffff, .2); sc.add(amb);
  const sun = new THREE.DirectionalLight(0xffffff, 1); sun.position.set(6, 2.2, .8); sun.target.position.set(-1, .3, -.6); sc.add(sun); sc.add(sun.target);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), new THREE.MeshBasicMaterial({ map: S.TX.pool, color: 0xffb070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  beam.position.set(-.6, .57, -.1); beam.rotation.x = -Math.PI / 2; beam.rotation.z = .3; sc.add(beam);
  const LOOK = {
    dark: { amb: [0x24304a, .16], sun: [0xffb46a, .18], sky: 0x0a101c, beam: 0, exp: 1.2, face: .02 },
    morning: { amb: [0xdde1e6, .62], sun: [0xf2f4f6, .7], sky: 0xd4dae0, beam: 0, exp: 1.05, face: .1 },
    first: { amb: [0xffc39a, .38], sun: [0xffa860, 1.5], sky: 0xffc48a, beam: .45, exp: 1.18, face: .12 }
  };
  let clockT = 0, last = -1;
  return {
    set(kind, secs) { const L = LOOK[kind]; amb.color.setHex(L.amb[0]); amb.intensity = L.amb[1]; sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sky.material.color.setHex(L.sky); beam.material.opacity = L.beam; face.emissiveIntensity = L.face; this.exp = L.exp; clockT = secs; last = -1; },
    tick(dt) { clockT += dt; const s = Math.floor(clockT); if (s !== last) { last = s; drawClock(Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60); } },
    render(r, jolt) { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); cam.position.y = .8 + jolt; r.toneMappingExposure = this.exp; r.render(sc, cam); },
    exp: 1.2
  };
})();

/* ---------- endings ---------- */
const hms = (h, m, s) => h * 3600 + m * 60 + (s || 0);
function end(kind, stat, how) {
  if (ended) return; ended = { kind, stat, how, t: 0, phase: 'leave' };
  pl.frozen = true; if (window.speechSynthesis) speechSynthesis.cancel();
  const color = how === 'white' ? '#f6f3ea' : how === 'warm' ? '#ffd9ae' : '#000';
  veil.style.background = color; ended.leave = how === 'white' ? .7 : how === 'warm' ? 2.2 : how === 'fall' ? .9 : how === 'slow' ? 4.5 : 1.2;
  document.getElementById('cross').hidden = true; ended.cross = true;
  if (window.LPStats) LPStats.ending(stat);
  if (how !== 'warm') ambience(false, how === 'slow' ? 1.5 : .25);
}
function endingFrame(dt) {
  const e = ended; e.t += dt;
  if (e.phase === 'leave') {
    const k = Math.min(1, e.t / e.leave); setVeil(k);
    if (e.how === 'fall') { pl.f -= dt * 2.6 * k; pl.pitch = Math.max(-1.2, pl.pitch - dt * .5); }
    if (e.how === 'white') through.light.scale.setScalar(8 + 160 * k * k);
    if (e.t >= e.leave) { e.phase = 'gap'; e.t = 0; if (e.how !== 'warm') { veil.style.background = '#000'; } ambience(false, .1); }
  } else if (e.phase === 'gap') {
    if (e.t > .9) {
      e.phase = 'wake'; e.t = 0;
      const clock = e.kind === 'dark' ? hms(3, 12, 20) : e.kind === 'morning' ? hms(7, 41, 5) : st.openClock;
      bed.set(e.kind, clock); S.render = (r) => { bed.render(r, e.how === 'fall' ? Math.max(0, .035 * (1 - e.t / .35)) : 0); return true; };
      breath(); ticking(e.kind === 'dark' ? .05 : .025); if (e.kind === 'morning') setTimeout(street, 1200); if (e.kind === 'first') bird();
      setVeil(1, e.kind === 'first' ? '#ffd9ae' : '#000');
    }
  } else if (e.phase === 'wake') {
    bed.tick(dt);
    const inT = e.kind === 'first' ? 3 : 2.2;
    setVeil(Math.max(0, 1 - e.t / inT));
    if (e.t > 8.5) { e.phase = 'out'; e.t = 0; veil.style.background = '#000'; }
  } else if (e.phase === 'out') {
    bed.tick(dt); setVeil(Math.min(1, e.t / 3));
    if (e.t > 3.2) { e.phase = 'done'; clearInterval(tickTimer); S.render = () => true; }
  }
}

/* ---------- per-frame ---------- */
const _v = new THREE.Vector3(), _fr = new THREE.Frustum(), _pm = new THREE.Matrix4();
let pushEdge = 0, pushEnd = 0, pushDoor = 0, lastBoardFrame = false;
function onOpenDeck() { return pl.z > 15.15 && pl.f > P + .05 && ((pl.x > open.x + CAR_A.x0 && pl.x < open.x + CAR_A.x1) || (pl.x > open.x + CAR_B.x0 && pl.x < open.x + CAR_B.x1)); }

S.onEnter.push(() => { audio(); if (window.LPStats) LPStats.event('start'); });
S.devLabel = () => Math.floor(nt) + 's' + (ended ? ' · ' + ended.stat : st.riding ? ' · ride' : st.onPassenger ? ' · passenger' : '');

S.onFrame(dt => {
  if (!S.entered) return;
  if (ended && ended.phase !== 'leave') { endingFrame(dt); updateTrains(dt, true); return; }
  nt += dt;

  /* announcements */
  if (nt >= T.throughCall && !st.called.through) { st.called.through = 1; announce('through'); }
  if (nt >= T.passengerCall && !st.called.passenger) { st.called.passenger = 1; announce('passenger'); S.DREAM.floor = Math.max(S.DREAM.floor || 0, hms(23, 46, 10)); }

  updateTrains(dt, false);
  if (!ended) choices(dt);

  strangerFrame(dt);
  if (st.riding) rideFrame(dt);
  if (st.onPassenger) passengerFrame(dt);

  if (ended) endingFrame(dt);
  /* nobody boarded anything */
  else if (nt > T.stayed && !st.riding && !st.onPassenger) end('dark', 'stayed', 'slow');
});

function choices(dt) {
  if (st.riding || st.onPassenger) return;
  /* --- the ways out --- */
  const want = pl.want, mv = Math.hypot(want.x, want.z) > .2;
  // walking into the through train's light, from the edge of the island platform
  const tx = through.g.position.x, ahead = tx - pl.x;
  if (pl.area === S.N.p2 && pl.z < 9.0 && mv && want.z < -.3 && ahead > -2 && ahead < 170) pushEdge += dt; else pushEdge = Math.max(0, pushEdge - dt);
  if (pushEdge > .3) { end('dark', 'reckless', 'white'); return; }
  // stepping off the end of platform 1, away from the track
  const atEnd = pl.area === S.N.p1 && pl.z < -.5 && ((pl.x > 57.3 && want.x > .3) || (pl.x < -57.3 && want.x < -.3));
  pushEnd = atEnd ? pushEnd + dt : 0; if (pushEnd > .45) { end('dark', 'reckless', 'fall'); return; }
  // the street door
  const atDoor = pl.area === S.N.hall && pl.z < -14.15 && pl.x > .65 && pl.x < 2.35 && want.z < -.3;
  pushDoor = atDoor ? pushDoor + dt : 0; if (pushDoor > .3) { noise(1.4, 'lowpass', 500, .7, .08, .5); end('dark', 'exit', 'black'); return; }

  /* --- boarding the passenger train --- */
  if (!st.onPassenger && dyn.doors && pl.z > .55 && pl.z < 1.2 && pl.f < P + .05 && DOORS_WORLD.some(x => Math.abs(pl.x - x) < .7)) {
    st.onPassenger = true; st.passengerDepart = Math.min(st.passengerDepart, Math.max(nt + BOARD_TO_GO, T.doorsOpen + 4));
    pl.frozen = true; setVeil(1, '#000'); st.boardFade = 1.1;
  }

  /* --- the open train: boarding means waiting --- */
  if (!st.riding && open.stopped) {
    if (onOpenDeck()) { if (st.aboardSince === null) st.aboardSince = nt; } else st.aboardSince = null;
    const aboard = st.aboardSince === null ? 0 : nt - st.aboardSince;
    if (st.strangerState === 'none' && aboard > STRANGER_DELAY) startStranger();
    if (st.strangerState === 'seated' && aboard > STAY_ABOARD && aboard > (st.strangerSatAboard || 0)) beginRide();
  }
}


function updateTrains(dt, frozenWorld) {
  /* through train */
  through.g.position.x = THROUGH_V * (T.throughPass - nt);
  through.g.visible = through.g.position.x > -700 && through.g.position.x < 520;
  if (!st.called.whoosh && Math.abs(through.g.position.x - pl.x) < 75 && nt > T.throughCall) { st.called.whoosh = 1; noise(5.5, 'lowpass', 520, .6, .2 * where().level, 2.2); }

  /* passenger train */
  let px; const pd = st.passengerDepart;
  if (nt < pd) px = arrive(nt, P_STOP, T.passengerStop, 18, 10, 1); else px = leave(nt, P_STOP, pd, .6, 16, 1);
  passenger.g.position.x = px; passenger.g.visible = px > -560 && px < 700;
  const doorsOpen = nt >= T.doorsOpen && nt < pd - 3;
  const dk = doorsOpen ? 1 : 0; passenger.k = passenger.k === undefined ? 0 : passenger.k;
  if (dk && passenger.k === 0 && !st.called.hiss) { st.called.hiss = 1; noise(1.2, 'highpass', 2500, .7, .05 * where().level, .05); }
  if (!dk && passenger.k > .99 && !st.called.beeps) { st.called.beeps = 1; beeps(); }
  passenger.k += ((dk) - passenger.k) * Math.min(1, dt * 3);
  for (const c of passenger.cars) for (const l of c.leaves) l.m.position.x = l.x0 + l.side * .62 * passenger.k;
  setRegions('doors', doorsOpen && !st.onPassenger, DOORS_WORLD.map(x => [S.N.p1, x - .62, x + .62, -.05, 1.0, P]));
  if (nt > pd + 1 && !st.called.board) { st.called.board = 1; const blank = S.dotBoard([[['', 1]], [['', 1]], [['', 1]]], 96); S.board1.mat.map = blank; S.board1.mat.needsUpdate = true; }

  /* open train */
  let ox;
  if (st.openDepart === null) {
    ox = arrive(nt, O_STOP, T.openStop, 10, 12, 1);
    // without anyone waiting on it, it leaves with the passenger train
    if (nt >= pd && !st.riding && st.aboardSince === null && open.stopped) {
      st.openDepart = nt;
      // if he had not yet sat down, he goes back into the dark
      if (st.strangerState !== 'none' && st.strangerState !== 'seated') { st.strangerState = 'none'; man.g.visible = false; }
      if (!frozenWorld && st.onPassenger) placeForGlimpse();
    }
  } else ox = leave(nt, O_STOP, st.openDepart, st.riding ? .32 : .38, st.riding ? 9 : 10, 1);
  open.x = ox; open.g.position.x = ox; open.g.visible = ox > -560 && ox < 560;
  open.stopped = st.openDepart === null && nt >= T.openStop;
  setRegions('deck', open.stopped && !st.riding, [
    ['Voie 3', O_STOP + CAR_A.x0 + .3, O_STOP + CAR_A.x1 - .3, 14.25, 15.3, P], ['Voie 3', O_STOP + CAR_B.x0 + .3, O_STOP + CAR_B.x1 - .3, 14.25, 15.3, P],
    ['Voie 3', O_STOP + CAR_A.x0 + .25, O_STOP + CAR_A.x1 - .25, 15.25, 17.55, DECK], ['Voie 3', O_STOP + CAR_B.x0 + .25, O_STOP + CAR_B.x1 - .25, 15.25, 17.55, DECK]]);
  if (st.strangerOnTrain) { man.g.position.set(ox + st.manLocal.x, st.manLocal.y, OZ + st.manLocal.z); }
}

/* ---------- the stranger arrives ---------- */
function startStranger() {
  st.strangerState = 'coming'; st.strangerT = 0; man.g.visible = true; st.strangerOnTrain = false;
  st.walk = { x0: O_STOP + SEAT_S + 13, x1: O_STOP + SEAT_S + .4, z: 18.75 };
  man.g.position.set(st.walk.x0, .1, st.walk.z); man.g.rotation.y = -Math.PI / 2; pose('walk', 0);
}
function strangerFrame(dt) {
  if (st.strangerState === 'none' || st.strangerState === 'seated' && !st.riding) { if (st.strangerState === 'seated') pose(st.toastK ? 'toast' : st.glimpse ? 'raise' : 'sit', st.toastK || nt); return; }
  st.strangerT += dt; const t = st.strangerT, w = st.walk;
  if (st.strangerState === 'coming') {
    const dur = (w.x0 - w.x1) / 1.3, k = Math.min(1, t / dur);
    man.g.position.x = w.x0 + (w.x1 - w.x0) * k; man.g.rotation.y = -Math.PI / 2; pose('walk', t * 5.2);
    if (k >= 1) { st.strangerState = 'greeting'; st.strangerT = 0; speak(SAY.greeting, 'en-GB', 300); }
  } else if (st.strangerState === 'greeting') {
    // he turns toward the train and lifts a hand
    const k = Math.min(1, t / .8); man.g.rotation.y = -Math.PI / 2 - (Math.PI / 2) * k; pose(t > .6 && t < 2.2 ? 'greet' : 'stand', t);
    if (t > 2.6) { st.strangerState = 'climbing'; st.strangerT = 0; }
  } else if (st.strangerState === 'climbing') {
    const k = Math.min(1, t / 1.6), e = k * k * (3 - 2 * k);
    man.g.position.set(w.x1 + (O_STOP + SEAT_S - w.x1) * e, .1 + (DECK - .1) * Math.min(1, e * 1.4), w.z + (OZ + 1.18 - w.z) * e);
    man.g.rotation.y = Math.PI - Math.PI * e; pose(k < .9 ? 'walk' : 'sit', t * 4);
    if (k >= 1) { st.strangerState = 'seated'; st.strangerOnTrain = true; st.manLocal = { x: SEAT_S, y: DECK, z: 1.18 }; man.g.rotation.y = 0; pose('sit');
      st.strangerSatAboard = st.aboardSince === null ? 0 : nt - st.aboardSince; }
  } else if (st.strangerState === 'seated') pose(st.toastK ? 'toast' : 'sit', st.toastK || 0);
}

/* ---------- the open train leaves, with you ---------- */
function beginRide() {
  st.riding = true; st.rideT = 0; pl.frozen = true;
  st.glideFrom = { x: pl.x - open.x, z: pl.z, y: pl.y, eye: pl.eye, yaw: pl.yaw, pitch: pl.pitch };
  setRegions('deck', false);
}
const SEAT_YOU = { x: SEAT_S - 1.6, z: OZ + 1.12 };
function rideFrame(dt) {
  st.rideT += dt; const t = st.rideT;
  // settle beside him: sitting at the open edge, the valley in front
  const g = Math.min(1, t / 2.4), e = g * g * (3 - 2 * g), f = st.glideFrom;
  const targetYaw = -2.2;  // down the line toward the morning, him in view
  let dy = targetYaw - f.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  if (g < 1) { pl.yaw = f.yaw + dy * e; pl.pitch = f.pitch + (-.05 - f.pitch) * e; }
  if (t > 2.6 && st.openDepart === null) { st.openDepart = nt; st.openClock = S.DREAM.t; }
  const lx = f.x + (SEAT_YOU.x - f.x) * e;
  pl.x = open.x + lx; pl.z = f.z + (SEAT_YOU.z - f.z) * e; pl.f = pl.y = f.y + (DECK - f.y) * e; pl.eye = f.eye + (.92 - f.eye) * e;
  // the toast, once moving
  const rt = st.openDepart === null ? 0 : nt - st.openDepart;
  if (rt > 7 && rt < 11) { const k = rt < 8.2 ? (rt - 7) / 1.2 : rt < 9.6 ? 1 : 1 - (rt - 9.6) / 1.4; st.toastK = Math.max(0, Math.min(1, k)); if (rt > 8.2 && !st.called.clink) { st.called.clink = 1; clink(); speak(SAY.toast, 'en-GB', 900); } }
  else st.toastK = 0;
  // morning comes up the valley
  const d = Math.max(0, Math.min(1, (rt - 3) / 24));
  dawn(d * d * (3 - 2 * d));
  for (const k in SM) SM[k].emissiveIntensity = .07 * (1 - d);
  if (rt > 27) end('first', 'unlisted', 'warm');
}
const _hemiN = S.hemi.color.clone(), _hemiD = new THREE.Color(0xffd2a8), _fogN = S.scene.fog.color.clone(), _fogD = new THREE.Color(0x8e8579), _bgN = S.scene.background.clone();
function dawn(k) {
  S.sky.material.uniforms.dawn.value = k;
  S.hemi.color.copy(_hemiN).lerp(_hemiD, k); S.hemi.intensity = .75 + .9 * k;
  S.scene.fog.color.copy(_fogN).lerp(_fogD, k); S.scene.fog.density = .0078 - .0035 * k; S.scene.background.copy(_bgN).lerp(_fogD, k);
  for (const p of S.STARPTS) p.material.opacity = p.userData.op * (1 - Math.min(1, k * 1.6));
  S.renderer.toneMappingExposure = 1.2 + .15 * k;
}

/* ---------- the passenger train, and the glimpse ---------- */
function placeForGlimpse() {
  // he is on the open train as it leaves, alone, a lamp beside him, raising a glass toward the empty place beside him
  st.glimpse = true; st.strangerState = 'seated'; st.strangerOnTrain = true; man.g.visible = true;
  st.manLocal = { x: SEAT_S, y: DECK, z: -1.18 }; man.g.rotation.y = Math.PI; pose('raise', 0);
  for (const k in SM) SM[k].emissiveIntensity = .12;
}
function passengerFrame(dt) {
  if (st.boardFade > 0) {
    st.boardFade -= dt;
    if (!st.seated && st.boardFade < .5) { st.seated = true; pl.yaw = Math.PI + .3; pl.pitch = -.03; pl.eye = 1.16; ambience(true); }
    if (st.boardFade <= 0) setVeil(0); else if (st.boardFade < .5) setVeil(st.boardFade / .5);
  }
  if (st.seated) {
    pl.x = passenger.g.position.x + SEAT_P.x; pl.z = PZ + SEAT_P.z; pl.f = pl.y = P;
    if (st.glimpse) pose('raise', nt * 1.3);
    // seen?
    if (st.glimpse && !st.glimpseSeen) {
      camera.updateMatrixWorld(); _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
      man.g.getWorldPosition(_v); _v.y += .9;
      if (_fr.containsPoint(_v) && _v.distanceTo(camera.position) < 28) { st.glimpseSeen = true; if (window.LPStats) LPStats.event('saw-glimpse'); }
    }
    if (nt > st.passengerDepart + 22) end('morning', 'passenger', 'black');
  }
}

/* ---------- dev ---------- */
if (S.DEV) {
  addEventListener('keydown', e => {
    if (!S.entered) return;
    if (e.code === 'KeyT') nt += 10;
    if (e.code === 'KeyR') location.reload();
  });
  window.LPNight = { get t() { return nt; }, set t(v) { nt = v; }, st, T, end, get ended() { return ended; } };
}
}
})();
