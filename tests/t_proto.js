const NS = require('./load')(['protocols']); const P = NS.PROTO;
let bad=0; const ok=(n,c,d)=>{ if(!c) bad++; console.log((c?'ok   ':'FAIL ')+n+(d?'  '+d:'')); };
// UART 9600 8N1 "Hi\r\n"
let u=P.uart({baud:9600,bits:8,parity:'N',stop:1,msg:'Hi\\r\\n',every:0.1}); let d=P.uartDecode(u.lines.TX,{baud:9600,bits:8,parity:'N',stop:1});
ok('UART 8N1 aller-retour', d.map(x=>x.byte).join()==='72,105,13,10' && !d.some(x=>x.err), d.map(x=>x.byte).join());
u=P.uart({baud:19200,bits:7,parity:'E',stop:2,msg:'A1',every:0.05}); d=P.uartDecode(u.lines.TX,{baud:19200,bits:7,parity:'E',stop:2}); ok('UART 7E2', d.map(x=>x.byte).join()==='65,49'&&!d.some(x=>x.err), d.map(x=>x.byte+(x.err||'')).join());
d=P.uartDecode(u.lines.TX,{baud:19200,bits:7,parity:'O',stop:2}); ok('UART mauvaise parité détectée', d.some(x=>x.err==='parité'));
d=P.uartDecode(u.lines.TX,{baud:9600,bits:7,parity:'E',stop:2}); ok('UART mauvais débit → données fausses', d.map(x=>x.byte).join()!=='65,49');
// Modbus
const m=P.rs485({baud:9600,parity:'E',stop:1,addr:1,func:3,reg:0,qty:2,regs:'230, 1013, 45',every:0.2}); const fr=P.modbusDecode(m.lines.A,{baud:9600,parity:'E',stop:1});
ok('Modbus 2 trames', fr.length===2 && fr.every(f=>f.ok), fr.map(f=>f.text).join(' || '));
ok('Modbus CRC exemple 01 03 00 00 00 02 C4 0B', P.crc16([1,3,0,0,0,2])===0x0BC4, P.crc16([1,3,0,0,0,2]).toString(16));
const mc=P.rs485({baud:9600,parity:'E',stop:1,addr:1,func:3,reg:0,qty:2,regs:'230,1013',corrupt:true}); ok('Modbus CRC corrompu détecté', P.modbusDecode(mc.lines.A,{baud:9600,parity:'E',stop:1}).some(f=>!f.ok));
const me=P.rs485({baud:9600,parity:'E',stop:1,addr:1,func:3,reg:10,qty:2,regs:'230,1013'}); ok('Modbus exception adresse illégale', /EXCEPTION/.test(P.modbusDecode(me.lines.A,{baud:9600,parity:'E',stop:1})[1].text));
// I2C
const i=P.i2c({freq:100000,addr:0x48,rw:'W',data:'01 A5',ack:true,every:0.05}); const di=P.i2cDecode(i.lines.SCL,i.lines.SDA);
ok('I2C écriture 0x48', di.length===1 && di[0].addr===0x48 && di[0].rw==='W' && di[0].bytes.map(b=>b.v).join()==='1,165' && di[0].bytes.every(b=>b.ack) && di[0].stop, JSON.stringify(di[0] && {a:di[0].addr,b:di[0].bytes}));
const i2=P.i2c({freq:400000,addr:0x3C,rw:'R',data:'12 34',ack:true}); const d2=P.i2cDecode(i2.lines.SCL,i2.lines.SDA); ok('I2C lecture + NACK final', d2[0].rw==='R' && d2[0].bytes.length===2 && d2[0].bytes[1].ack===false);
const i3=P.i2c({freq:100000,addr:0x50,rw:'W',data:'00',ack:false}); const d3=P.i2cDecode(i3.lines.SCL,i3.lines.SDA); ok('I2C esclave absent (NACK adresse)', d3[0].ack===false);
// SPI
for (const mode of [0,1,2,3]) { const s=P.spi({freq:1e6,mode,data:'A5 3C 00',reply:'11 22 33'}); const ds=P.spiDecode({cs:s.lines.CS,clk:s.lines.SCK,mosi:s.lines.MOSI,miso:s.lines.MISO},mode,8); ok('SPI mode '+mode, ds.length===1 && ds[0].mosi.join()==='165,60,0' && ds[0].miso.join()==='17,34,51', ds[0]&&ds[0].mosi.join()+' / '+ds[0].miso.join()); }
console.log(bad?bad+' ÉCHEC(S)':'PROTO OK'); process.exit(bad?1:0);
