const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
// Keep this key private. Set it only in the hosting service's environment variables.
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function ensureConfig(res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    sendJSON(res, 500, {
      error: 'Website chưa được cấu hình kết nối dữ liệu. Vui lòng kiểm tra SUPABASE_URL và SUPABASE_SECRET_KEY trên dịch vụ lưu trữ.'
    });
    return false;
  }
  return true;
}

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data && (data.message || data.details || data.hint) || 'Không thể kết nối cơ sở dữ liệu';
    throw new Error(message);
  }
  return data;
}

function mapWish(row) {
  return {
    id: String(row.id),
    name: row.name,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null
  };
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
  };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Không tìm thấy trang'); return; }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = url.parse(req.url).pathname;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (pathname === '/api/wishes') {
    if (!ensureConfig(res)) return;
    try {
      if (req.method === 'GET') {
        const rows = await supabaseRequest('wishes?select=id,name,message,created_at,updated_at&order=created_at.desc');
        return sendJSON(res, 200, rows.map(mapWish));
      }
      if (req.method === 'POST') {
        const body = await parseBody(req);
        const name = String(body.name || '').trim();
        const message = String(body.message || '').trim();
        if (!name || !message) return sendJSON(res, 400, { error: 'Tên và lời chúc là bắt buộc' });
        const rows = await supabaseRequest('wishes?select=id,name,message,created_at,updated_at', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ name, message })
        });
        return sendJSON(res, 201, mapWish(rows[0]));
      }
    } catch (error) {
      return sendJSON(res, 500, { error: error.message || 'Có lỗi khi xử lý dữ liệu' });
    }
  }

  if (pathname.startsWith('/api/wishes/') && req.method === 'DELETE') {
    if (!ensureConfig(res)) return;
    try {
      const id = pathname.split('/').pop();
      await supabaseRequest(`wishes?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return sendJSON(res, 200, { success: true });
    } catch (error) {
      return sendJSON(res, 500, { error: error.message || 'Xóa lời chúc thất bại' });
    }
  }

  let filePath;
  if (pathname === '/' || pathname === '/index.html') filePath = path.join(PUBLIC_DIR, 'index.html');
  else if (pathname === '/admin' || pathname === '/admin.html') filePath = path.join(PUBLIC_DIR, 'admin.html');
  else filePath = path.join(PUBLIC_DIR, pathname.replace(/^\/+/, ''));

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(PUBLIC_DIR) + path.sep) && resolved !== path.join(path.resolve(PUBLIC_DIR), 'index.html')) {
    res.writeHead(403); res.end('Không được phép'); return;
  }
  serveStatic(res, resolved);
});

server.listen(PORT, () => {
  console.log('Birthday Wishes server đang chạy tại cổng ' + PORT);
  if (!SUPABASE_URL || !SUPABASE_KEY) console.log('Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY.');
});
