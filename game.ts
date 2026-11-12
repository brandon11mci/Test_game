export const WORLD = 2400;
export const MAX_PLAYERS = 8;
export const COLORS = ['#e9b65b','#7bcab7','#bc9ee8','#ed8d81','#7eaee4','#d7d57d','#e591c2','#8fc987'];
export const WEAPONS = ['rifle','shotgun','grenade'] as const;
export type Weapon = typeof WEAPONS[number];
export type Upgrade = 'damage'|'speed'|'health'|'haste'|'magnet';
export const UPGRADES:Record<Upgrade,{name:string;description:string;icon:string}> = {
 damage:{name:'Heavy rounds',description:'+25% weapon damage',icon:'✦'},speed:{name:'Lightweight boots',description:'+15% movement speed',icon:'»'},health:{name:'Field medicine',description:'+25 maximum HP and heal 50 HP',icon:'+'},haste:{name:'Rapid mechanism',description:'15% faster automatic fire',icon:'≋'},magnet:{name:'Scavenger',description:'+60 pickup radius',icon:'◇'}
};
export interface Input {x:number;y:number;angle:number;manual:boolean}
export interface Player {id:string;name:string;color:string;x:number;y:number;angle:number;hp:number;maxHp:number;level:number;xp:number;nextXp:number;kills:number;connected:boolean;spectator:boolean;weapon:Weapon;upgrades:number;damage:number;speed:number;haste:number;magnet:number}
export interface Enemy {id:number;x:number;y:number;hp:number;maxHp:number;kind:'runner'|'brute'|'swarm'|'boss';radius:number}
export interface Bullet {id:number;x:number;y:number;vx:number;vy:number;owner:string;damage:number;life:number;kind:Weapon}
export interface Pickup {id:number;x:number;y:number;kind:'xp'|'health';value:number}
export interface Blast {id:number;x:number;y:number;radius:number;life:number}
export interface Snapshot {code:string;name:string;private:boolean;host:string;phase:'lobby'|'playing'|'ended';time:number;wave:number;players:Player[];enemies:Enemy[];bullets:Bullet[];pickups:Pickup[];blasts:Blast[];victory:boolean}
export interface LobbySummary {code:string;name:string;count:number;phase:Snapshot['phase']}
export interface JoinRequest {name:string;token:string;code?:string;private?:boolean;weapon?:Weapon}
export type Reply = {ok:true;code:string;id:string}|{ok:false;error:string};
export interface Stats {games:number;kills:number;best:number;wins:number}
