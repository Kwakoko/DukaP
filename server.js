import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, 'dist');

const DEFAULT_NEON_URL = 'postgresql://neondb_owner:npg_h1k4wASpWoGx@ep-polished-dawn-axwcu8hf-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_POSTGRES_URL || DEFAULT_NEON_URL;

console.log(`[Neon Backend Engine] Initializing database connection pool to Neon PostgreSQL...`);
const sql = neon(DATABASE_URL);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm'
};

async function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const fullUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = fullUrl.pathname;

  // Set CORS Headers for multi-domain SaaS access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, x-user-id, x-branch-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ─── API BACKEND ROUTES CONNECTED TO NEON POSTGRESQL ───────────────────────
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      const tenantId = req.headers['x-tenant-id'] || fullUrl.searchParams.get('tenantId') || fullUrl.searchParams.get('tenant_id') || '';
      const emailParam = fullUrl.searchParams.get('email');
      const usernameParam = fullUrl.searchParams.get('username');

      // 1. GET /api/users
      if (pathname === '/api/users' && req.method === 'GET') {
        let users = [];
        if (emailParam) {
          users = await sql`SELECT * FROM users WHERE LOWER(email) = ${emailParam.toLowerCase()} OR LOWER(username) = ${emailParam.toLowerCase()} LIMIT 5`;
        } else if (usernameParam) {
          users = await sql`SELECT * FROM users WHERE LOWER(username) = ${usernameParam.toLowerCase()} LIMIT 5`;
        } else if (tenantId && tenantId !== 'tenant-admin-system') {
          users = await sql`SELECT * FROM users WHERE tenant_id = ${tenantId} AND (deleted_at IS NULL)`;
        } else {
          users = await sql`SELECT * FROM users LIMIT 100`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(users));
        return;
      }

      // 2. GET /api/tenants
      if (pathname === '/api/tenants' && req.method === 'GET') {
        let tenants = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          tenants = await sql`SELECT * FROM tenants WHERE id = ${tenantId} AND (deleted_at IS NULL)`;
        } else {
          tenants = await sql`SELECT * FROM tenants WHERE (deleted_at IS NULL)`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(tenants));
        return;
      }

      // 3. GET /api/branches
      if (pathname === '/api/branches' && req.method === 'GET') {
        let branches = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          branches = await sql`SELECT * FROM branches WHERE tenant_id = ${tenantId} AND (deleted_at IS NULL)`;
        } else {
          branches = await sql`SELECT * FROM branches WHERE (deleted_at IS NULL)`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(branches));
        return;
      }

      // 4. GET /api/userBranchRoles
      if (pathname === '/api/userBranchRoles' && req.method === 'GET') {
        let roles = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          roles = await sql`SELECT * FROM user_branch_roles WHERE tenant_id = ${tenantId}`;
        } else {
          roles = await sql`SELECT * FROM user_branch_roles LIMIT 200`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(roles));
        return;
      }

      // 5. GET /api/tenantModules
      if (pathname === '/api/tenantModules' && req.method === 'GET') {
        let modules = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          modules = await sql`SELECT * FROM tenant_modules WHERE tenant_id = ${tenantId}`;
        } else {
          modules = await sql`SELECT * FROM tenant_modules LIMIT 200`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(modules));
        return;
      }

      // 6. GET /api/tenantSettings
      if (pathname === '/api/tenantSettings' && req.method === 'GET') {
        let settings = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          settings = await sql`SELECT * FROM tenant_settings WHERE tenant_id = ${tenantId}`;
        } else {
          settings = await sql`SELECT * FROM tenant_settings LIMIT 200`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(settings));
        return;
      }

      // 7. GET /api/featureFlags
      if (pathname === '/api/featureFlags' && req.method === 'GET') {
        let flags = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          flags = await sql`SELECT * FROM feature_flags WHERE tenant_id = ${tenantId}`;
        } else {
          flags = await sql`SELECT * FROM feature_flags LIMIT 200`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(flags));
        return;
      }

      // 8. GET /api/products
      if (pathname === '/api/products' && req.method === 'GET') {
        let products = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          products = await sql`SELECT * FROM products WHERE tenant_id = ${tenantId} AND (deleted_at IS NULL)`;
        } else {
          products = await sql`SELECT * FROM products WHERE (deleted_at IS NULL) LIMIT 300`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(products));
        return;
      }

      // 9. GET /api/variants
      if (pathname === '/api/variants' && req.method === 'GET') {
        let variants = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          variants = await sql`SELECT * FROM product_variants WHERE tenant_id = ${tenantId} AND (deleted_at IS NULL)`;
        } else {
          variants = await sql`SELECT * FROM product_variants WHERE (deleted_at IS NULL) LIMIT 300`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(variants));
        return;
      }

      // 10. GET /api/stockLedger
      if (pathname === '/api/stockLedger' && req.method === 'GET') {
        let ledger = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          ledger = await sql`SELECT * FROM stock_ledger WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 200`;
        } else {
          ledger = await sql`SELECT * FROM stock_ledger ORDER BY created_at DESC LIMIT 200`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(ledger));
        return;
      }

      // 11. GET /api/userDevices
      if (pathname === '/api/userDevices' && req.method === 'GET') {
        const devices = await sql`SELECT * FROM user_devices ORDER BY last_seen_at DESC LIMIT 100`;
        res.writeHead(200);
        res.end(JSON.stringify(devices));
        return;
      }

      // 12. POST /api/userDevices
      if (pathname === '/api/userDevices' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const devId = payload.device_id || `dev-${Date.now()}`;
        const devName = payload.name || 'Web Browser Client';
        const os = payload.os || 'Unknown OS';
        const browser = payload.browser || 'Web Client';
        const userAgent = payload.user_agent || req.headers['user-agent'] || '';
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const now = Date.now();

        await sql`
          INSERT INTO user_devices (device_id, tenant_id, user_id, name, os, browser, user_agent, ip_address, last_seen_at, created_at)
          VALUES (${devId}, ${payload.tenant_id || tenantId || ''}, ${payload.user_id || ''}, ${devName}, ${os}, ${browser}, ${userAgent}, ${String(ip)}, ${now}, ${now})
          ON CONFLICT (device_id) DO UPDATE SET
            last_seen_at = EXCLUDED.last_seen_at,
            ip_address = EXCLUDED.ip_address,
            user_agent = EXCLUDED.user_agent;
        `;

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, device_id: devId }));
        return;
      }

      // 13. GET /api/sync (Master Incremental Sync from Neon PostgreSQL)
      if (pathname === '/api/sync' && req.method === 'GET') {
        const since = parseInt(fullUrl.searchParams.get('since') || '0', 10);
        const targetTenant = tenantId || fullUrl.searchParams.get('tenantId') || '';

        if (!targetTenant) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing tenantId parameter for sync' }));
          return;
        }

        const [prods, vars, ledger, brs, settings, modules, flags, devList] = await Promise.all([
          sql`SELECT * FROM products WHERE tenant_id = ${targetTenant} AND (updated_at > ${since} OR created_at > ${since})`,
          sql`SELECT * FROM product_variants WHERE tenant_id = ${targetTenant} AND (updated_at > ${since} OR created_at > ${since})`,
          sql`SELECT * FROM stock_ledger WHERE tenant_id = ${targetTenant} AND created_at > ${since}`,
          sql`SELECT * FROM branches WHERE tenant_id = ${targetTenant}`,
          sql`SELECT * FROM tenant_settings WHERE tenant_id = ${targetTenant}`,
          sql`SELECT * FROM tenant_modules WHERE tenant_id = ${targetTenant}`,
          sql`SELECT * FROM feature_flags WHERE tenant_id = ${targetTenant}`,
          sql`SELECT * FROM user_devices WHERE tenant_id = ${targetTenant}`
        ]);

        res.writeHead(200);
        res.end(JSON.stringify({
          serverTimestamp: Date.now(),
          tenantId: targetTenant,
          since,
          changes: {
            products: prods,
            productVariants: vars,
            stockLedger: ledger,
            branches: brs,
            tenantSettings: settings,
            tenantModules: modules,
            featureFlags: flags,
            userDevices: devList
          }
        }));
        return;
      }

      // 14. POST /api/sync/push (Batch Queue Sync to Neon PostgreSQL)
      if (pathname === '/api/sync/push' && req.method === 'POST') {
        const body = await parseRequestBody(req);
        const operations = body.operations || [];
        const deviceId = req.headers['x-device-id'] || body.deviceId || 'WEB-CLIENT';
        const now = Date.now();
        const processedIds = [];

        for (const op of operations) {
          const entity = op.entity || op.entityName || 'products';
          const payload = op.payload || {};
          const recordId = payload.id || op.entity_id;
          const action = op.operation || op.actionType || 'UPDATE';

          if (!recordId) continue;

          if (entity === 'products') {
            if (action === 'DELETE') {
              await sql`UPDATE products SET deleted_at = ${now}, updated_at = ${now} WHERE id = ${recordId}`;
            } else {
              await sql`
                INSERT INTO products (id, tenant_id, branch_id, name, category, category_id, sku, barcode, buying_price, selling_price, price, cost_price, stock, module, has_variants, origin, status, created_at, updated_at, version)
                VALUES (${recordId}, ${tenantId}, ${payload.branch_id || ''}, ${payload.name || 'Product'}, ${payload.category || 'General'}, ${payload.category_id || ''}, ${payload.sku || ''}, ${payload.barcode || ''}, ${payload.buyingPrice || payload.buying_price || 0}, ${payload.sellingPrice || payload.selling_price || 0}, ${payload.price || 0}, ${payload.costPrice || payload.cost_price || 0}, ${payload.stock || 0}, ${payload.module || 'Retail'}, ${payload.hasVariants || false}, ${payload.origin || 'PRODUCTION'}, ${payload.status || 'Active'}, ${payload.createdAt || payload.created_at || now}, ${now}, ${payload.version || 1})
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  stock = EXCLUDED.stock,
                  selling_price = EXCLUDED.selling_price,
                  buying_price = EXCLUDED.buying_price,
                  updated_at = ${now},
                  version = products.version + 1;
              `;
            }
            processedIds.push(op.id || recordId);
          } else if (entity === 'stockLedger' || entity === 'stock_ledger') {
            await sql`
              INSERT INTO stock_ledger (id, tenant_id, branch_id, product_id, variant_id, movement_type, quantity_before, quantity_change, quantity_after, unit_cost, total_cost, user_id, device_id, idempotency_key, created_at)
              VALUES (${recordId}, ${tenantId}, ${payload.branch_id || ''}, ${payload.product_id || ''}, ${payload.variant_id || ''}, ${payload.movement_type || 'ADJUSTMENT'}, ${payload.quantity_before || 0}, ${payload.quantity_change || 0}, ${payload.quantity_after || 0}, ${payload.unit_cost || 0}, ${payload.total_cost || 0}, ${payload.user_id || ''}, ${deviceId}, ${payload.idempotency_key || recordId}, ${payload.created_at || now})
              ON CONFLICT (id) DO NOTHING;
            `;
            processedIds.push(op.id || recordId);
          }
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          processedIds,
          serverTimestamp: now,
          deviceId
        }));
        return;
      }

      // Generic 404 for unrecognized API routes
      res.writeHead(404);
      res.end(JSON.stringify({ error: `API endpoint ${pathname} not found on Neon backend` }));
      return;
    } catch (apiErr) {
      console.error(`[Neon Backend API Error] ${pathname}:`, apiErr);
      res.writeHead(500);
      res.end(JSON.stringify({ error: apiErr.message || 'Internal Server Error' }));
      return;
    }
  }

  // ─── STATIC ASSET SERVING FOR FIREBASE APP HOSTING ─────────────────────────
  const reqUrl = req.url ? req.url.split('?')[0] : '/';
  let filePath = path.join(DIST_DIR, reqUrl === '/' ? 'index.html' : reqUrl);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': extname === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DukaPos Production Backend running on http://0.0.0.0:${PORT} connected to Neon PostgreSQL!`);
});
