import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// Explicit volume and stopped writers; no database backups or deletion is inferred.
const [volume,directory,image]=process.argv.slice(2);
try {
  if (!/^ryvix_[a-z-]+$/.test(volume||'') || !path.isAbsolute(directory||'') || !image || !/^[a-zA-Z0-9_./:@-]+$/.test(image)) throw new Error('Usage: backup-ai-volume.mjs ryvix_VOLUME ABSOLUTE_BACKUP_DIR REVIEWED_IMAGE');
  const run=args=>execFileSync('docker',args,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
  run(['volume','inspect',volume]);
  if (run(['ps','-q','--filter',`volume=${volume}`])) throw new Error('Stop all writers to this volume before backup');
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const output=`${volume}-${new Date().toISOString().replace(/[:.]/g,'-')}.tar.gz`;
  run(['run','--rm','--user','0:0','--network','none','--read-only','--cap-drop','ALL','--cap-add','DAC_READ_SEARCH','--security-opt','no-new-privileges',
    '--mount',`type=volume,source=${volume},target=/source,readonly`,
    '--mount',`type=bind,source=${directory},target=/backup`,'--entrypoint','tar',image,'-czf',`/backup/${output}`,'-C','/source','.']);
  fs.chmodSync(path.join(directory,output),0o600);
  console.log(`Backup created: ${output}. Copy to encrypted off-host storage and test restoration into a new volume.`);
} catch { console.error('Backup failed: verify arguments, Docker access, stopped writers and destination permissions.');process.exitCode=1; }
