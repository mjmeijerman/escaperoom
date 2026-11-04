/* Checks the room shell and the collision test without a browser.
   Run: node test/rooms.mjs
   It reads index.html and evaluates the room/collision source against a stub
   of the three.js bits those functions touch, so a new room is verified the
   moment it is declared. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');

function cut(from, to) {
  const i = html.indexOf(from);
  const j = html.indexOf(to, i);
  if (i < 0 || j < 0) throw new Error('marker not found: ' + from);
  return html.slice(i, j);
}

const stub = `
class V3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z} set(x,y,z){this.x=x;this.y=y;this.z=z;return this} }
class Mesh { constructor(g,m){this.geometry=g;this.material=m;this.position=new V3();this.rotation=new V3();this.children=[]} add(o){this.children.push(o)} }
class Group { constructor(){this.position=new V3();this.rotation=new V3();this.children=[]} add(o){this.children.push(o)} }
const THREE = {
  Mesh, Group, Vector3: V3,
  PlaneGeometry: class { constructor(w,h){this.w=w;this.h=h} },
  BoxGeometry: class { constructor(w,h,d){this.w=w;this.h=h;this.d=d} },
  Box3: class { constructor(a,b){this.min=a;this.max=b} }
};
const scene = new Group();
const matWall = {}, matDarkWood = {}, matFloor = {};
function mat() { return {}; }
`;

const suite = `
const results = [];
const eq = (name, got, want) => results.push([name, got === want, got, want]);

// --- the shipped room, unchanged behaviour -------------------------------
eq('spawn is walkable', blocked(0, 3.1), false);
eq('back wall blocks', blocked(0, 3.9), true);
eq('side wall blocks', blocked(4.8, 0), true);
eq('desk blocks', blocked(2.5, 1.5), true);
eq('in front of the desk is free', blocked(1.0, 1.5), false);
eq('shelf blocks', blocked(4.7, -1.4), true);
eq('outside the house', blocked(8, 8), true);

// --- the same study with a doorway north --------------------------------
study.doors.push({ side: 'north', at: 0, width: 1.4 });
eq('door gap opens the wall', blocked(0, -3.9), false);
eq('jamb still blocks', blocked(1.2, -3.9), true);

// --- a second room through that doorway ---------------------------------
room({ id: 'library', name: 'Library', x0: -5, x1: 0, z0: -10, z1: -4,
       doors: [{ side: 'south', at: -2.5, width: 1.4 }] });
eq('second room is walkable', blocked(-2.5, -8), false);
eq('second room far wall blocks', blocked(-2.5, -9.9), true);
eq('second room is not a hole in space', blocked(2, -8), true);
eq('shell meshes were built', roomShell.children.length > 20, true);

const failed = results.filter(r => !r[1]);
for (const [name, ok, got, want] of results) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok ? '' : '  (got ' + got + ', want ' + want + ')'));
}
console.log(failed.length ? failed.length + ' failed' : 'all ' + results.length + ' passed');
process.exit(failed.length ? 1 : 0);
`;

new Function(stub + cut('const H = 3.2, DOOR_H', '/* ============================== lights')
  + cut('const obstacles = [', '/* ============================== input')
  + suite)();
