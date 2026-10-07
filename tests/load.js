const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function(files){
  const root=path.join(__dirname,'..','js'); globalThis.window=undefined;
  (files||['util','engine','models','models_ic','protocols','models_frames','parts','parts_ic','parts_frames','circuit','editor_ser','scenarios','cours','tp_base','tp_alim','tp_comp','tp_dep','tp_aop','coverage']).forEach(f=>{ const p=path.join(root,f+'.js'); if(!fs.existsSync(p)) return; vm.runInThisContext(fs.readFileSync(p,'utf8'),{filename:p}); });
  return globalThis.NS;
};
