import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {networkInterfaces} from 'node:os';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
if(Number(process.versions.node.split('.')[0])<24){console.error('Install Node.js 24 or newer from https://nodejs.org, then run this launcher again.');process.exit(1);}
const npm=process.platform==='win32'?'npm.cmd':'npm';
function run(args){return new Promise((resolve,reject)=>{const child=spawn(npm,args,{stdio:'inherit',shell:process.platform==='win32'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`npm ${args.join(' ')} failed. Read the message above and try again.`)));});}
try{
 console.log('\nBULLET SURVIVORS — SERVER SETUP\n\n1/3 Installing game dependencies…');await run(['ci','--include=dev']);
 console.log('\n2/3 Building your game…');await run(['run','build']);
 console.log('\n3/3 Starting your server…\nKeep this window open while playing. Press Ctrl+C to stop.\n');
 const port=process.env.PORT||'3001';const url=`http://localhost:${port}`;
 const child=spawn(process.execPath,['dist/server/src/index.js'],{stdio:'inherit'});
 child.on('error',error=>{console.error(error.message);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??0;});
 const stop=()=>child.kill('SIGTERM');process.on('SIGINT',stop);process.on('SIGTERM',stop);
 let count=0;const timer=setInterval(async()=>{if(++count>30){clearInterval(timer);return;}try{const response=await fetch(url+'/api/health');if(!response.ok)return;clearInterval(timer);console.log(`\nYOUR GAME IS READY: ${url}\n`);for(const values of Object.values(networkInterfaces()))for(const value of values??[])if(value.family==='IPv4'&&!value.internal)console.log(`Same Wi-Fi friends: http://${value.address}:${port}`);console.log('\nFor friends outside your Wi-Fi, use the online setup at:\nhttps://bullet-survivors-dead-sector.yummyether10.chatgpt.site/?setup=1\n');if(process.env.BS_NO_OPEN!=='1'){const command=process.platform==='win32'?'cmd':process.platform==='darwin'?'open':'xdg-open';const args=process.platform==='win32'?['/c','start','',url]:[url];const opener=spawn(command,args,{stdio:'ignore'});opener.on('error',()=>{});}}catch{}},1000);
 child.once('exit',()=>clearInterval(timer));
}catch(error){console.error('\nSetup stopped: '+error.message+'\nCheck your internet connection and installed Node.js version, then try again.');process.exitCode=1;}
