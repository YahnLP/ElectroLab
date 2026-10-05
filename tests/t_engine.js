// validation du moteur contre des solutions analytiques
const NS=require('./load')(); const {Circuit,Sim}=NS;
let bad=0; const near=(name,got,exp,tol)=>{const ok=Math.abs(got-exp)<=tol*Math.max(1,Math.abs(exp)); if(!ok) bad++; console.log((ok?'ok   ':'FAIL ')+name+' = '+got.toPrecision(5)+' (attendu '+exp+')');};
function mk(){ const c=new Circuit(); return c; }
// 1. diviseur
{ const c=mk(); c.add('battery',0,0,{V:10,Ri:0.001},'G1'); c.add('resistor',0,0,{R:1000,tol:0},'R1'); c.add('resistor',0,0,{R:3000,tol:0},'R2'); c.add('ground',0,0);
  c.parts.forEach(p=>p.dev=0);
  c.link('G1','+','R1','A'); c.link('R1','B','R2','A'); c.link('R2','B','G1','−'); c.link(c.parts[3],'G','G1','−');
  const s=new Sim(c); s.settle(0.1); near('diviseur V(R1.B)',s.vPin('R1','B'),7.5,1e-3); }
// 2. RC charge
{ const c=mk(); c.add('battery',0,0,{V:5,Ri:0.001},'G1'); c.add('resistor',0,0,{R:1000,tol:0},'R1'); c.add('capacitor',0,0,{C:1e-6,esr:0.0001,tol:0},'C1'); const g=c.add('ground',0,0);
  c.parts.forEach(p=>p.dev=0); c.link('G1','+','R1','A'); c.link('R1','B','C1','A'); c.link('C1','B','G1','−'); c.link(g,'G','G1','−');
  const s=new Sim(c); s.advance(1e-3); near('RC v(τ)',s.vPin('C1','A'),5*(1-Math.exp(-1)),0.01); s.advance(4e-3); near('RC v(5τ)',s.vPin('C1','A'),5*(1-Math.exp(-5)),0.005); }
// 3. diode + R
{ const c=mk(); c.add('battery',0,0,{V:5,Ri:0.001},'G1'); c.add('resistor',0,0,{R:1000,tol:0},'R1'); c.add('diode',0,0,{model:'1N4148'},'D1'); const g=c.add('ground',0,0); c.parts.forEach(p=>p.dev=0);
  c.link('G1','+','R1','A'); c.link('R1','B','D1','A'); c.link('D1','K','G1','−'); c.link(g,'G','G1','−');
  const s=new Sim(c); s.settle(0.05); const vd=s.vPin('D1','A'); console.log('Vd 1N4148 @4.3mA =',vd.toFixed(3)); if(vd<0.55||vd>0.75){bad++;console.log('FAIL vd');} }
// 4. LED + R
{ const c=mk(); c.add('battery',0,0,{V:5,Ri:0.001},'G1'); c.add('resistor',0,0,{R:150,tol:0},'R1'); c.add('led',0,0,{model:'LED rouge'},'D1'); const g=c.add('ground',0,0); c.parts.forEach(p=>p.dev=0);
  c.link('G1','+','R1','A'); c.link('R1','B','D1','A'); c.link('D1','K','G1','−'); c.link(g,'G','G1','−');
  const s=new Sim(c); s.settle(0.05); const I=s.el('D1').I; near('LED I (5V,150Ω)',I,0.0207,0.05); console.log('Vf LED',s.vPin('D1','A').toFixed(3)); }
// 5. LED sans résistance → grillée
{ const c=mk(); c.add('battery',0,0,{V:5,Ri:0.5},'G1'); c.add('led',0,0,{model:'LED rouge'},'D1'); const g=c.add('ground',0,0); c.parts.forEach(p=>p.dev=0);
  c.link('G1','+','D1','A'); c.link('D1','K','G1','−'); c.link(g,'G','G1','−'); const s=new Sim(c); s.settle(0.5); console.log('LED sans R brûlée ?',s.c.byRef('D1').burnt); if(!s.c.byRef('D1').burnt){bad++;console.log('FAIL burn');} }
// 6. zener
{ const c=mk(); c.add('battery',0,0,{V:12,Ri:0.001},'G1'); c.add('resistor',0,0,{R:470,tol:0},'R1'); c.add('zener',0,0,{model:'BZX55C5V1'},'Z1'); const g=c.add('ground',0,0); c.parts.forEach(p=>p.dev=0);
  c.link('G1','+','R1','A'); c.link('R1','B','Z1','K'); c.link('Z1','A','G1','−'); c.link(g,'G','G1','−');
  const s=new Sim(c); s.settle(0.05); const v=s.vPin('R1','B'); console.log('Vz =',v.toFixed(3)); if(v<4.8||v>5.4){bad++;console.log('FAIL zener');} }
// 7. BJT commutation : IB via 10k depuis 5V, RC=1k
{ const c=mk(); c.add('battery',0,0,{V:5,Ri:0.001},'G1'); c.add('resistor',0,0,{R:10000,tol:0},'RB'); c.add('resistor',0,0,{R:1000,tol:0},'RC'); c.add('bjt',0,0,{model:'BC547B'},'Q1'); const g=c.add('ground',0,0); c.parts.forEach(p=>p.dev=0);
  c.link('G1','+','RB','A'); c.link('RB','B','Q1','B'); c.link('G1','+','RC','A'); c.link('RC','B','Q1','C'); c.link('Q1','E','G1','−'); c.link(g,'G','G1','−');
  const s=new Sim(c); s.settle(0.05); console.log('Vce sat =',s.vPin('Q1','C').toFixed(3),' Vbe=',s.vPin('Q1','B').toFixed(3)); if(s.vPin('Q1','C')>0.3){bad++;console.log('FAIL sat');} }
// 8. AOP inverseur gain -10 (LM358 ±? alim 12 V simple + masse virtuelle) ; version symétrique TL081 ±12
{ const c=mk(); c.add('battery',0,0,{V:12,Ri:0.001},'B1'); c.add('battery',0,0,{V:12,Ri:0.001},'B2'); c.add('battery',0,0,{V:1,Ri:0.001},'VIN'); c.add('resistor',0,0,{R:1000,tol:0},'R1'); c.add('resistor',0,0,{R:10000,tol:0},'R2'); c.add('opamp',0,0,{model:'TL081'},'U1'); const g=c.add('ground',0,0); c.parts.forEach(p=>p.dev=0);
  c.link('B1','−','B2','+'); c.link(g,'G','B1','−'); /* B1 est le négatif: +12 relatif au point milieu */ 
  // B2.+ = V−? Construction : masse au milieu : B1 donne +12 (B1.+ vs masse), B2 donne −12
  c.wires=[]; c.link(g,'G','B1','−'); c.link('B1','−','B2','+'); // masse = B1.- = B2.+
  c.link('B1','+','U1','V+'); c.link('B2','−','U1','V−');
  c.link('VIN','−','B1','−'); c.link('VIN','+','R1','A'); c.link('R1','B','U1','−'); c.link('R2','A','U1','−'); c.link('R2','B','U1','S'); c.link('U1','+','B1','−');
  const s=new Sim(c); s.settle(0.05); near('AOP inverseur Vs',s.vPin('U1','S'),-10,0.01); if(s.eng.warn) console.log('warn',s.eng.warn); }
// 9. comparateur (saturation)
{ const c=mk(); c.add('battery',0,0,{V:12,Ri:0.001},'B1'); c.add('battery',0,0,{V:2,Ri:0.001},'VIN'); c.add('battery',0,0,{V:1,Ri:0.001},'VR'); c.add('opamp',0,0,{model:'LM358'},'U1'); const g=c.add('ground',0,0); c.parts.forEach(p=>p.dev=0);
  c.link(g,'G','B1','−'); c.link('B1','+','U1','V+'); c.link('U1','V−','B1','−'); c.link('VIN','−','B1','−'); c.link('VR','−','B1','−'); c.link('VIN','+','U1','+'); c.link('VR','+','U1','−');
  const s=new Sim(c); s.settle(0.05); console.log('comparateur Vs =',s.vPin('U1','S').toFixed(2)); if(s.vPin('U1','S')<10){bad++;console.log('FAIL comp');} }
console.log(bad?'ECHECS '+bad:'moteur OK'); process.exit(bad?1:0);
