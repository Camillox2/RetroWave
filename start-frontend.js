process.chdir('E:\\RetroWave\\client');
const { createServer } = require('vite');
createServer({
  root: 'E:\\RetroWave\\client',
  server: { host: true, port: 5173 }
}).then(server => server.listen());
