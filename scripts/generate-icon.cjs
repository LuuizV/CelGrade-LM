// Converte o jasmim PNG em ICO de 256 px usando somente recursos nativos do Node.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const source=fs.readFileSync(path.join(__dirname,'../web/brand-original.png'));
if(source.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Ícone PNG inválido');
let pos=8,width=0,height=0,depth=0,color=0,palette,alpha,idats=[];
while(pos<source.length){
 const len=source.readUInt32BE(pos),type=source.toString('ascii',pos+4,pos+8),chunk=source.subarray(pos+8,pos+8+len);
 if(type==='IHDR'){width=chunk.readUInt32BE(0);height=chunk.readUInt32BE(4);depth=chunk[8];color=chunk[9]}
 if(type==='PLTE')palette=chunk;
 if(type==='tRNS')alpha=chunk;
 if(type==='IDAT')idats.push(chunk);
 pos+=len+12;if(type==='IEND')break;
}
if(depth!==8||color!==3||!palette||width<32||height<32)throw Error('Jasmim exige PNG com paleta de 8 bits');
const raw=zlib.inflateSync(Buffer.concat(idats)),rgba=Buffer.alloc(width*height*4),row=Buffer.alloc(width);let off=0,prev=Buffer.alloc(width);
for(let y=0;y<height;y++){
 const filter=raw[off++];for(let x=0;x<width;x++){
 const v=raw[off++],a=x?row[x-1]:0,b=prev[x],c=x?prev[x-1]:0;
 let predict=0;if(filter===1)predict=a;else if(filter===2)predict=b;else if(filter===3)predict=(a+b)>>1;else if(filter===4){const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);predict=da<=db&&da<=dc?a:db<=dc?b:c}else if(filter!==0)throw Error('Filtro PNG desconhecido');
 row[x]=(v+predict)&255;
 const i=row[x],di=(y*width+x)*4;
 rgba[di]=palette[i*3];rgba[di+1]=palette[i*3+1];rgba[di+2]=palette[i*3+2];rgba[di+3]=alpha?alpha[i]??255:255;
 }prev=Buffer.from(row);
}
const size=256,scan=Buffer.alloc((size*4+1)*size);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 // Recorta exclusivamente o jasmim original da extremidade esquerda da marca, sem redesenhá-lo.
 const fx=(x+.5)*55/size-.5,fy=(y+.5)*height/size-.5;
 const x0=Math.max(0,Math.floor(fx)),y0=Math.max(0,Math.floor(fy)),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1);
 const dx=Math.max(0,Math.min(1,fx-x0)),dy=Math.max(0,Math.min(1,fy-y0)),di=y*(size*4+1)+1+x*4;
 for(let c=0;c<4;c++){
 const a=rgba[(y0*width+x0)*4+c],b=rgba[(y0*width+x1)*4+c],d=rgba[(y1*width+x0)*4+c],e=rgba[(y1*width+x1)*4+c];
 scan[di+c]=Math.round((a*(1-dx)+b*dx)*(1-dy)+(d*(1-dx)+e*dx)*dy);
 }
}
// Ícone legível no Windows: o verde do CelGrade é o fundo, com cantos suavemente arredondados.
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const di=y*(size*4+1)+1+x*4;
 const a=scan[di+3]/255;
 const bg=[20,92,70];
 for(let c=0;c<3;c++)scan[di+c]=Math.round(scan[di+c]*a+bg[c]*(1-a));
 const margin=2,r=34;
 const px=Math.max(margin+r-x,0,x-(size-margin-r-1));
 const py=Math.max(margin+r-y,0,y-(size-margin-r-1));
 const dist=Math.hypot(px,py);
 scan[di+3]=Math.round(255*Math.max(0,Math.min(1,r+0.5-dist)));
}
const crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}
function crc(bytes){let v=0xffffffff;for(const b of bytes)v=crcTable[(v^b)&255]^(v>>>8);return (v^0xffffffff)>>>0}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,sum])}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(scan,{level:9})),chunk('IEND',Buffer.alloc(0))]);
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico[6]=0;ico[7]=0;ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);
fs.mkdirSync(path.join(__dirname,'../build'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../build/icon.ico'),Buffer.concat([ico,png]));
console.log('Ícone Windows 256x256 gerado do logotipo original com fundo verde e transparência nos cantos.');
