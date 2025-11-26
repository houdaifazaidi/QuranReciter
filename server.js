#!/usr/bin/env node
/**
 * Simple Quran Audio Proxy Server
 * 
 * Proxies requests for Quran audio files from various sources,
 * bypassing CORS restrictions by fetching server-side.
 * 
 * Run: node server.js
 * Then visit: http://localhost:3000
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Audio source mirrors (in priority order)
const AUDIO_SOURCES = [
    'https://everyayah.com/quran/{num}.mp3',
    'https://data.alquran.cloud/files/audio/alafasy/{num}.mp3',
    'https://www.quranaudio.com/quran/{num}_Muhammad_al-Jibaly.mp3',
    'https://www.mp3quran.net/api/v3/files/get_file?file_id={num}_jbreen_128'
];

/**
 * Fetch audio from a remote source
 */
function fetchAudio(sourceUrl, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const protocol = sourceUrl.startsWith('https') ? https : http;
        const request = protocol.get(sourceUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: timeoutMs
        }, (response) => {
            // Check for success status
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode} from ${sourceUrl}`));
                return;
            }

            // Check content type is audio
            const contentType = response.headers['content-type'] || '';
            if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
                reject(new Error(`Invalid content-type: ${contentType}`));
                return;
            }

            resolve(response);
        });

        request.on('error', (err) => {
            reject(new Error(`Fetch failed: ${err.message}`));
        });

        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout fetching audio'));
        });
    });
}

/**
 * Try multiple sources until one succeeds
 */
async function getAudioFromSources(surahNum) {
    const paddedNum = String(surahNum).padStart(3, '0');

    for (const sourceTemplate of AUDIO_SOURCES) {
        const sourceUrl = sourceTemplate.replace('{num}', paddedNum);
        console.log(`[Surah ${surahNum}] Trying: ${sourceUrl}`);

        try {
            const response = await fetchAudio(sourceUrl);
            console.log(`[Surah ${surahNum}] ✅ Success from: ${sourceUrl}`);
            return response;
        } catch (err) {
            console.log(`[Surah ${surahNum}] ❌ Failed: ${err.message}`);
        }
    }

    throw new Error(`All audio sources failed for Surah ${surahNum}`);
}

/**
 * Serve static files (HTML, CSS, JS)
 */
function serveStaticFile(filePath, res) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath);
        const contentTypeMap = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.json': 'application/json; charset=utf-8'
        };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

/**
 * Main HTTP server
 */
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Enable CORS for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Audio proxy endpoint: /audio/surah/:number
    if (pathname.startsWith('/audio/surah/')) {
        const surahNum = parseInt(pathname.split('/').pop(), 10);

        if (!surahNum || surahNum < 1 || surahNum > 114) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid surah number' }));
            return;
        }

        try {
            console.log(`\n[Request] GET /audio/surah/${surahNum}`);
            const audioResponse = await getAudioFromSources(surahNum);

            // Forward the audio response with CORS headers
            res.writeHead(200, {
                'Content-Type': audioResponse.headers['content-type'] || 'audio/mpeg',
                'Content-Length': audioResponse.headers['content-length'] || '0',
                'Cache-Control': 'public, max-age=86400'
            });

            audioResponse.pipe(res);
        } catch (err) {
            console.error(`[Error] Surah ${surahNum}: ${err.message}`);
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Serve static files
    const staticRoot = __dirname;
    let filePath;

    if (pathname === '/' || pathname === '') {
        filePath = path.join(staticRoot, 'index.html');
    } else if (pathname.startsWith('/')) {
        filePath = path.join(staticRoot, pathname);
    } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
    }

    serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
    console.log(`\n✅ Quran Audio Player with Proxy Server`);
    console.log(`📻 Server running at http://localhost:${PORT}`);
    console.log(`🎵 Audio proxy: http://localhost:${PORT}/audio/surah/:number`);
    console.log(`\nPress Ctrl+C to stop\n`);
});
