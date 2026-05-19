const { exec } = require('child_process');
exec('npx tsc --noEmit', { cwd: __dirname }, (error, stdout, stderr) => {
  const fs = require('fs');
  fs.writeFileSync('tsc-output.txt', stdout + '\n' + stderr);
});
