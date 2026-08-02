import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import fs from 'node:fs';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.get('/api/seismic-data', (req, res) => {
  try {
    const filePath = join(process.cwd(), 'tjma2020a.-00000');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const result: Record<string, { distance: number, pTime: number, sTime: number }[]> = {};
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length === 6 && parts[0] === 'P' && parts[2] === 'S') {
        const pTime = parseFloat(parts[1]);
        const sTime = parseFloat(parts[3]);
        const depth = parts[4];
        const distance = parseFloat(parts[5]);
        
        if (!result[depth]) {
          result[depth] = [];
        }
        result[depth].push({ distance, pTime, sTime });
      }
    }
    
    res.json(result);
  } catch (error) {
    console.warn('Failed to read seismic data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});


/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

app.get('/api/latest-time', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('http://www.kmoni.bosai.go.jp/webservice/server/pros/latest.json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const trimmed = text ? text.trim() : '';
    if (!trimmed || !trimmed.startsWith('{')) {
      throw new Error('Invalid JSON response body from kmoni');
    }
    const data = JSON.parse(trimmed);
    res.json(data);
  } catch {
    // kmoni 연결 타임아웃/실패 시 JST 현재 시각(-2초)을 계산하여 fallback 응답 반환
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000 - 2000); // JST (UTC+9)
    const yyyy = nowJST.getUTCFullYear();
    const mm = String(nowJST.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(nowJST.getUTCDate()).padStart(2, '0');
    const hh = String(nowJST.getUTCHours()).padStart(2, '0');
    const mi = String(nowJST.getUTCMinutes()).padStart(2, '0');
    const ss = String(nowJST.getUTCSeconds()).padStart(2, '0');

    const security_time = `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
    const latest_time = `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;

    res.json({
      security_time,
      latest_time,
      fallback: true
    });
  }
});

app.get('/api/acmap-img', async (req, res) => {
  try {
    const time = req.query['time'];
    const type = req.query['type'] === 'jma_b' ? 'acmap_b' : 'acmap_s';
    if (!time || typeof time !== 'string') {
      res.status(400).json({ error: 'Missing time parameter' });
      return;
    }
    const dateStr = time.substring(0, 8);
    const url = `http://www.kmoni.bosai.go.jp/data/map_img/RealTimeImg/${type}/${dateStr}/${time}.${type}.gif`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/gif');
    res.send(Buffer.from(buffer));
  } catch {
    res.status(504).json({ error: 'Failed to fetch image or timeout' });
  }
});

app.get('/api/realtime-img', async (req, res) => {
  try {
    const time = req.query['time'];
    const imgType = req.query['type'] === 'jma_b' ? 'jma_b' : 'jma_s';
    if (!time || typeof time !== 'string') {
      res.status(400).json({ error: 'Missing time parameter' });
      return;
    }
    const dateStr = time.substring(0, 8);
    const url = `http://www.kmoni.bosai.go.jp/data/map_img/RealTimeImg/${imgType}/${dateStr}/${time}.${imgType}.gif`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/gif');
    res.send(Buffer.from(buffer));
  } catch {
    res.status(504).json({ error: 'Failed to fetch image or timeout' });
  }
});

app.get('/api/pswave-img', async (req, res) => {
  try {
    const time = req.query['time'];
    if (!time || typeof time !== 'string') {
      res.status(400).json({ error: 'Missing time parameter' });
      return;
    }
    const dateStr = time.substring(0, 8);
    const url = `http://www.kmoni.bosai.go.jp/data/map_img/PSWaveImg/eew/${dateStr}/${time}.eew.gif`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/gif');
    res.send(Buffer.from(buffer));
  } catch {
    const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.send(transparentGif);
  }
});

app.get('/api/estshindo-img', async (req, res) => {
  try {
    const time = req.query['time'];
    if (!time || typeof time !== 'string') {
      res.status(400).json({ error: 'Missing time parameter' });
      return;
    }
    const dateStr = time.substring(0, 8);
    const url = `http://www.kmoni.bosai.go.jp/data/map_img/EstShindoImg/eew/${dateStr}/${time}.eew.gif`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/gif');
    res.send(Buffer.from(buffer));
  } catch {
    const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.send(transparentGif);
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  } as any),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  angularApp
    .handle(req as any)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
