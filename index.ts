import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { Room } from './engine.js';
import { UPGRADES, type Reply } from '../../shared/game.js';
const app=express();const http=createServer(app);
const origins=(process.env.CLIENT_ORIGIN??'http://localhost:5173').split(',');
const io=new Server(http,{cors:{origin:origins},transports:['websocket'],maxHttpBufferSize:8192,allowRequest:(req,done)=>{const origin=req.headers.origin;done(null,!origin||origins.includes(origin)||origin===`http://${req.headers.host}`||origin===`https://${req.headers.host}`);}});
const rooms=new Map<string,Room>();const sessions=new Map<string,string>();
const data=process.env.DATA_DIR??'data';mkdirSync(data,{recursive:true});const db=new DatabaseSync(path.join(data,'stats.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS stats (token TEXT PRIMARY KEY, games INTEGER DEFAULT 0,kills INTEGER DEFAULT 0,best REAL DEFAULT 0,wins INTEGER DEFAULT 0)');
app.disable('x-powered-by');app.get('/api/health',(_,res)=>res.json({ok:true,rooms:rooms.size}));
const joinSchema=z.object({name:z.string().trim().min(1).max(18),token:z.string().uuid(),code:z.string().regex(/^[A-F0-9]{6}$/).optional(),private:z.boolean().optional(),weapon:z.enum(['rifle','shotgun','grenade']).optional()});
const inputSchema=z.object({x:z.number().finite().min(-1).max(1),y:z.number().finite().min(-1).max(1),angle:z.number().finite().min(-100).max(100),manual:z.boolean()});
const summaries=()=>[...rooms.values()].filter(r=>!r.private&&r.players.size<8).map(r=>({code:r.code,name:r.name,count:r.players.size,phase:r.phase}));
const ack=(fn:unknown,result:Reply)=>{if(typeof fn==='function')fn(result);};
io.on('connection',socket=>{
 socket.emit('welcome',{game:'bullet-survivors',protocol:1});
 let room:Room|undefined;let playerId='';let events=0;let windowStart=Date.now();let inputTime=0;
 socket.use((_,next)=>{if(Date.now()-windowStart>1000){events=0;windowStart=Date.now();}if(++events>90)return;next();});
 socket.emit('rooms',summaries());
 socket.on('list',()=>socket.emit('rooms',summaries()));
 socket.on('join',(raw,cb)=>{
  try{if(room)throw new Error('Leave your current squad first.');const req=joinSchema.parse(raw);
   const session=sessions.get(req.token);if(session&&session!==socket.id){const previous=io.sockets.sockets.get(session);previous?.disconnect(true);}
   let target:Room;if(req.code){const found=rooms.get(req.code);if(!found)throw new Error('Room not found. Check your code.');target=found;}else{if(rooms.size>=100)throw new Error('Server capacity reached. Try again later.');target=new Room(req.name,req.private??false);while(rooms.has(target.code))target=new Room(req.name,req.private??false);rooms.set(target.code,target);}
   const p=target.join(req.token,req.name,req.weapon);room=target;playerId=p.id;sessions.set(req.token,socket.id);socket.data.token=req.token;socket.join(room.code);socket.emit('state',room.snapshot());socket.emit('stats',db.prepare('SELECT games,kills,best,wins FROM stats WHERE token=?').get(req.token)??{games:0,kills:0,best:0,wins:0});ack(cb,{ok:true,code:room.code,id:p.id});io.emit('rooms',summaries());
  }catch(e){ack(cb,{ok:false,error:e instanceof z.ZodError?'Enter a username (1–18 characters) and a valid room code.':(e as Error).message});}
 });
 socket.on('input',raw=>{if(!room||Date.now()-inputTime<20)return;inputTime=Date.now();const value=inputSchema.safeParse(raw);if(value.success)room.inputs.set(playerId,value.data);});
 socket.on('start',()=>{if(room?.start(playerId)){io.to(room.code).emit('state',room.snapshot());io.emit('rooms',summaries());}});
 socket.on('upgrade',(key:unknown)=>{if(typeof key==='string'&&Object.hasOwn(UPGRADES,key))room?.upgrade(playerId,key as keyof typeof UPGRADES);});
 socket.on('leave',()=>{if(room){room.leave(playerId);socket.leave(room.code);room=undefined;playerId='';sessions.delete(socket.data.token);io.emit('rooms',summaries());}});
 socket.on('disconnect',()=>{room?.disconnect(playerId);if(sessions.get(socket.data.token)===socket.id)sessions.delete(socket.data.token);});
});
let previous=performance.now();let step=0;
const interval=setInterval(()=>{const now=performance.now();const dt=Math.min(.1,(now-previous)/1000);previous=now;for(const [code,room]of rooms){room.tick(dt);if(room.phase==='ended'&&!room.recorded){room.recorded=true;const save=db.prepare('INSERT INTO stats(token,games,kills,best,wins) VALUES (?,1,?,?,?) ON CONFLICT(token) DO UPDATE SET games=games+1,kills=kills+excluded.kills,best=MAX(best,excluded.best),wins=wins+excluded.wins');for(const [token,id]of room.tokens){const p=room.players.get(id);if(p&&!p.spectator)save.run(token,p.kills,room.time,room.victory?1:0);}}
 if(step%2===0)io.to(code).emit('state',room.snapshot());if((!room.players.size||[...room.players.values()].every(p=>!p.connected))&&now>=0&&Date.now()-room.updated>120000){rooms.delete(code);io.emit('rooms',summaries());}}
 step++;},1000/30);
app.use(express.static(path.resolve('dist/client')));app.get('*',(_,res)=>res.sendFile(path.resolve('dist/client/index.html')));
const port=Number(process.env.PORT??3001);http.listen(port,'0.0.0.0',()=>console.log(`Bullet Survivors listening on http://localhost:${port}`));
const stop=()=>{clearInterval(interval);io.close();http.close();db.close();process.exit(0);};process.on('SIGTERM',stop);process.on('SIGINT',stop);
