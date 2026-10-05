// tous les TP : construction → vérifs « avant » → solution → vérifs « après » (doivent toutes passer)
const NS=require('./load')(); let bad=0; const only=process.argv[2];
for(const sc of NS.SCENARIOS){
  if(only && sc.id!==only) continue;
  const nv=sc.variants||1;
  for(let v=0; v<nv; v++){
    const c=new NS.Circuit(); try{ sc.build(c,{variant:v,rnd:NS.rng(1234+v)}); }catch(e){ console.log('FAIL build',sc.id,v,e.stack); bad++; continue; }
    c.parts.forEach(p=>{ if(!p.dev) p.dev=NS.rng(c.seq*31+p.type.length+v*7)()*2-1; });
    const t0=Date.now(); const before=NS.evalChecks(sc,c,{variant:v});
    try{ if(sc.solve){ const sim=new NS.Sim(c); const ctx=NS.makeCtx(sim); ctx.tp={variant:v}; sim.advance(sc.settle||1); sc.solve(c,ctx,v); } }catch(e){ console.log('FAIL solve',sc.id,v,e.stack); bad++; continue; }
    const after=NS.evalChecks(sc,c,{variant:v}); const ok=after.every(r=>r.ok); if(!ok) bad++;
    console.log((ok?'PASS ':'FAIL ')+sc.id+(nv>1?'#'+v:'')+'  avant='+before.map(r=>r.ok?1:0).join('')+' après='+after.map(r=>r.ok?1:0).join('')+'  ('+(Date.now()-t0)+' ms)');
    if(!ok) after.filter(r=>!r.ok).forEach(r=>console.log('    ✘ '+r.label));
    // questions : calculables ?
    if(sc.questions){ const sim=new NS.Sim(c); const ctx=NS.makeCtx(sim); ctx.tp={variant:v}; sim.advance(sc.settle||1); sc.questions.forEach((q,i)=>{ if(q.type==='choice'||q.type==='text') return; try{ const a=typeof q.answer==='function'?q.answer(ctx):q.answer; if(typeof q.correct==='function'){ q.correct(ctx);} else if(a===undefined||!isFinite(a)) { console.log('    ? question',i+1,'réponse non finie'); bad++; } }catch(e){ console.log('    ? question',i+1,e.message); bad++; } }); }
  }
}
console.log(bad?'ECHECS '+bad:'tous les TP OK'); process.exit(bad?1:0);
