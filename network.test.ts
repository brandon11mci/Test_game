import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {io,type Socket} from 'socket.io-client';
import type {Reply,Snapshot} from '../shared/game.js';
const port=32197,url=`http://localhost:${port}`;
const event=<T>(socket:Socket,name:string,filter:(value:T)=>boolean=()=>true):Promise<T>=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{socket.off(name,handler);reject(new Error(`Timed out: ${name}`));},6000);const handler=(value:T)=>{if(filter(value)){clearTimeout(timeout);socket.off(name,handler);resolve(value);}};socket.on(name,handler);});
const connect=()=>new Promise<Socket>((resolve,reject)=>{const s=io(url,{transports:['websocket'],forceNew:true,reconnection:false});s.once('connect',()=>resolve(s));s.once('connect_error',reject);});
const join=(s:Socket,data:unknown):Promise<Reply>=>new Promise(resolve=>s.emit('join',data,resolve));
test('real WebSocket server: validation, privacy, eight clients, spectators, reconnect, authority',async()=>{
 const dataDir=mkdtempSync(path.join(tmpdir(),'bullet-test-'));let child:ChildProcess|undefined;const clients:Socket[]=[];
 try{child=spawn(process.execPath,['--import','tsx','server/src/index.ts'],{env:{...process.env,PORT:String(port),DATA_DIR:dataDir},stdio:['ignore','pipe','pipe']});await new Promise<void>((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error('Server startup timeout: '+output)),10000);child!.stdout!.on('data',buf=>{output+=buf;if(output.includes('listening')){clearTimeout(timer);resolve();}});child!.stderr!.on('data',buf=>{output+=buf;});child!.once('exit',code=>{clearTimeout(timer);reject(new Error(`Server exited ${code}: ${output}`));});});
  const welcomeClient=io(url,{transports:['websocket'],forceNew:true,reconnection:false,autoConnect:false});clients.push(welcomeClient);const welcome=event<{game:string;protocol:number}>(welcomeClient,'welcome');welcomeClient.connect();assert.deepEqual(await welcome,{game:'bullet-survivors',protocol:1});welcomeClient.disconnect();clients.pop();
  const a=await connect();clients.push(a);assert.equal((await join(a,{name:'A',token:'forged'})).ok,false);
  const identity=randomUUID();const joined=await join(a,{name:'Alpha',token:identity,private:true,weapon:'rifle'});assert.equal(joined.ok,true);if(!joined.ok)throw Error('join failed');const code=joined.code;
  const listing=event<{code:string}[]>(a,'rooms');a.emit('list');assert.ok(!(await listing).some(r=>r.code===code));
  for(let i=1;i<8;i++){const s=await connect();clients.push(s);assert.equal((await join(s,{name:`Player${i}`,token:randomUUID(),code})).ok,true);}
  const ninth=await connect();clients.push(ninth);assert.equal((await join(ninth,{name:'Ninth',token:randomUUID(),code})).ok,false);
  const lobby=event<Snapshot>(a,'state',s=>s.players.length===8);assert.equal((await lobby).players.length,8);
  clients[1].emit('start');assert.equal((await event<Snapshot>(a,'state')).phase,'lobby');
  const playing=event<Snapshot>(a,'state',s=>s.phase==='playing');a.emit('start');await playing;
  a.emit('input',{x:999,y:0,angle:0,manual:false});a.emit('damage',{amount:999});const safe=await event<Snapshot>(a,'state');assert.equal(safe.players.find(p=>p.id===joined.id)?.hp,100);
  const initial=safe.players.find(p=>p.id===joined.id)!.x;a.emit('input',{x:1,y:0,angle:0,manual:false});assert.ok((await event<Snapshot>(a,'state',s=>s.players.find(p=>p.id===joined.id)!.x>initial+5)).time>0);
  a.disconnect();const resumed=await connect();clients.push(resumed);const re=await join(resumed,{name:'Renamed',token:identity,code});assert.equal(re.ok&&re.id,joined.id);const restored=await event<Snapshot>(resumed,'state');assert.equal(restored.players.find(p=>p.id===joined.id)?.name,'Alpha');assert.equal(restored.players.find(p=>p.id===joined.id)?.spectator,false);
  clients[7].emit('leave');await event<Snapshot>(resumed,'state',s=>s.players.length===7);assert.equal((await join(ninth,{name:'Spectator',token:randomUUID(),code})).ok,true);const spectated=await event<Snapshot>(resumed,'state',s=>s.players.some(p=>p.name==='Spectator'));assert.equal(spectated.players.find(p=>p.name==='Spectator')?.spectator,true);
  assert.equal((await fetch(url+'/api/health')).status,200);
 }finally{for(const c of clients)c.disconnect();child?.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,200));rmSync(dataDir,{recursive:true,force:true});}
});
