import {io} from 'socket.io-client';
export const serverOrigin=new URL(localStorage.getItem('bs-server')||import.meta.env.VITE_SERVER_URL||window.location.origin).origin;
export const socket=io(serverOrigin,{transports:['websocket'],autoConnect:false,reconnection:true});
export const token=localStorage.getItem('bs-token')||crypto.randomUUID();localStorage.setItem('bs-token',token);
