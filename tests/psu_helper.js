// circuit de référence : alimentation 5 V (utilisé par les tests et les TP de dépannage)
module.exports=function(NS,opt){ opt=opt||{}; const {Circuit}=NS; const c=new Circuit();
  const add=(t,r,p)=>c.add(t,0,0,p,r);
  add('mains','SEC',{}); add('fuse','F1',{I:0.1,fast:false}); add('transformer','TR1',{model:'230V / 12V · 10 VA'});
  ['D1','D2','D3','D4'].forEach(r=>add('diode',r,{model:'1N4007'}));
  add('capacitor','C1',{C:2.2e-3,Vmax:25,esr:0.05,pol:true,tol:20}); add('regulator','U1',{model:'7805'}); add('capacitor','C2',{C:1e-7,Vmax:50,esr:0.01,pol:false}); add('resistor','RL',{R:opt.RL||100,tol:5,W:2}); add('ground','GND',{});
  c.link('SEC','L','F1','A'); c.link('F1','B','TR1','P1'); c.link('SEC','N','TR1','P2');
  // pont : D1 (S1→+), D2 (S2→+), D3 (−→S1), D4 (−→S2)
  c.link('TR1','S1','D1','A'); c.link('TR1','S2','D2','A'); c.link('D1','K','D2','K');
  c.link('TR1','S1','D3','K'); c.link('TR1','S2','D4','K'); c.link('D3','A','D4','A');
  c.link('D1','K','C1','A'); c.link('D3','A','C1','B'); c.link('D1','K','U1','IN'); c.link('D3','A','U1','GND'); c.link('U1','OUT','C2','A'); c.link('C2','B','U1','GND');
  c.link('U1','OUT','RL','A'); c.link('RL','B','U1','GND'); c.link('GND','G','D3','A');
  c.parts.forEach(p=>{p.dev=0;}); return c; };
