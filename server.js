import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Master Timer & Display State
let timerState = {
  mode: 'digital', // 'digital' | 'analog' | 'clock'
  status: 'stopped', // 'running' | 'paused' | 'stopped' | 'ended'
  durationSeconds: 1800,
  remainingSeconds: 1800,
  title: 'Pre-Service Prayer',
  activeItemId: null,
  stageMessage: '',
  stageMessageVisible: false,
  stageMessageFlash: false,
  blackout: false,
  warningThresholdSec: 300, // 5 mins -> yellow
  criticalThresholdSec: 60,  // 1 min -> red
  theme: 'dark' // 'dark' | 'light' | 'oled'
};

// Connected SSE clients
const sseClients = new Set();

function broadcastState() {
  const data = `data: ${JSON.stringify({ type: 'TIMER_STATE', payload: timerState })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

function broadcastEvent(eventType, payload) {
  const data = `data: ${JSON.stringify({ type: eventType, payload })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Master Clock / Timer Engine Interval
setInterval(() => {
  if (timerState.status === 'running') {
    if (timerState.remainingSeconds > 0) {
      timerState.remainingSeconds -= 1;
      if (timerState.remainingSeconds === 0) {
        timerState.status = 'ended'; // Time is up! No overtime count-up.
        broadcastEvent('TIMES_UP', { title: timerState.title });
      }
      broadcastState();
    }
  }
}, 1000);

// Helper to get local network IP addresses
function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

// JSON file helpers
function readJson(filePath, defaultVal) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultVal;
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // CORS headers for LAN/local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE Stream endpoint
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify({ type: 'TIMER_STATE', payload: timerState })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // Network info endpoint
  if (pathname === '/api/network-info' && req.method === 'GET') {
    const ips = getNetworkAddresses();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      port: PORT,
      addresses: ips,
      stageUrls: ips.map(ip => `http://${ip.address}:${PORT}/stage`),
      localStageUrl: `http://localhost:${PORT}/stage`
    }));
    return;
  }

  // Version and system attribution endpoint
  if (pathname === '/api/version' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'Grace Flow',
      version: '1.0.0',
      author: 'Peter Olatunji',
      instagram: '@_mayowapeter',
      instagramUrl: 'https://instagram.com/_mayowapeter',
      releaseDate: '2026-09-27',
      latestVersion: '1.0.0'
    }));
    return;
  }

  // Get current state
  if (pathname === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(timerState));
    return;
  }

  // Update timer state
  if (pathname === '/api/state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const update = JSON.parse(body);
        timerState = { ...timerState, ...update };
        broadcastState();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, state: timerState }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Schedule endpoints
  if (pathname === '/api/schedule') {
    if (req.method === 'GET') {
      const schedule = readJson(SCHEDULE_FILE, { activeSchedule: [], activeItemIndex: -1 });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(schedule));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const scheduleData = JSON.parse(body);
          writeJson(SCHEDULE_FILE, scheduleData);
          broadcastEvent('SCHEDULE_UPDATED', scheduleData);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, schedule: scheduleData }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // Templates endpoints
  if (pathname === '/api/templates') {
    if (req.method === 'GET') {
      const templates = readJson(TEMPLATES_FILE, []);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(templates));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const newTemplate = JSON.parse(body);
          const templates = readJson(TEMPLATES_FILE, []);
          const existingIndex = templates.findIndex(t => t.name.toLowerCase() === newTemplate.name.toLowerCase() || t.id === newTemplate.id);
          if (existingIndex >= 0) {
            templates[existingIndex] = newTemplate;
          } else {
            templates.push(newTemplate);
          }
          writeJson(TEMPLATES_FILE, templates);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, templates }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    if (req.method === 'DELETE') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { id } = JSON.parse(body);
          let templates = readJson(TEMPLATES_FILE, []);
          templates = templates.filter(t => t.id !== id);
          writeJson(TEMPLATES_FILE, templates);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, templates }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // Stage route alias
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, 'public', 'index.html');
  } else if (pathname === '/stage' || pathname === '/stage.html') {
    filePath = path.join(__dirname, 'public', 'stage.html');
  } else {
    filePath = path.join(__dirname, 'public', pathname);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  🕊️  GRACE FLOW — Church Countdown & Service System`);
  console.log(`======================================================`);
  console.log(`  Control Panel:  http://localhost:${PORT}`);
  console.log(`  Stage Output:   http://localhost:${PORT}/stage`);
  
  const addresses = getNetworkAddresses();
  if (addresses.length > 0) {
    console.log(`\n  Local Network / NDI / Stage Monitor URLs:`);
    for (const addr of addresses) {
      console.log(`  - http://${addr.address}:${PORT}/stage   (${addr.name})`);
    }
  }
  console.log(`======================================================\n`);
});
