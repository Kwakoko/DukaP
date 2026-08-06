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

// Auto-initialize Neon PostgreSQL schema on startup
async function initDatabaseSchema() {
  try {
    console.log(`[Neon Backend Engine] Initializing database schema on Neon PostgreSQL...`);
    await sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        plan TEXT DEFAULT 'Basic',
        status TEXT DEFAULT 'Active',
        business_code TEXT,
        tenant_code TEXT,
        created_at BIGINT,
        deleted_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        branch_id TEXT,
        name TEXT,
        username TEXT,
        email TEXT,
        phone TEXT,
        role TEXT,
        created_at BIGINT,
        deleted_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        name TEXT,
        location TEXT,
        is_headquarters BOOLEAN DEFAULT false,
        created_at BIGINT,
        deleted_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        branch_id TEXT,
        name TEXT,
        category TEXT,
        category_id TEXT,
        sku TEXT,
        barcode TEXT,
        buying_price NUMERIC DEFAULT 0,
        selling_price NUMERIC DEFAULT 0,
        price NUMERIC DEFAULT 0,
        cost_price NUMERIC DEFAULT 0,
        stock NUMERIC DEFAULT 0,
        module TEXT DEFAULT 'Retail',
        has_variants BOOLEAN DEFAULT false,
        origin TEXT DEFAULT 'PRODUCTION',
        status TEXT DEFAULT 'Active',
        version INT DEFAULT 1,
        created_at BIGINT,
        updated_at BIGINT,
        deleted_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        tenant_id TEXT,
        branch_id TEXT,
        sku TEXT,
        barcode TEXT,
        buying_price NUMERIC DEFAULT 0,
        selling_price NUMERIC DEFAULT 0,
        stock NUMERIC DEFAULT 0,
        reserved_stock NUMERIC DEFAULT 0,
        reorder_level NUMERIC DEFAULT 5,
        status TEXT DEFAULT 'Active',
        attributes JSONB DEFAULT '{}'::jsonb,
        created_at BIGINT,
        updated_at BIGINT,
        deleted_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        branch_id TEXT,
        name TEXT,
        code TEXT,
        description TEXT,
        color TEXT,
        icon TEXT,
        status TEXT DEFAULT 'Active',
        created_by TEXT,
        updated_by TEXT,
        created_at BIGINT,
        updated_at BIGINT,
        deleted_at BIGINT,
        sync_version INT DEFAULT 1,
        sync_status TEXT DEFAULT 'SYNCED',
        last_synced_at BIGINT,
        parent_id TEXT
      );
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_tenant_name ON categories(tenant_id, LOWER(name)) WHERE deleted_at IS NULL;`;
    await sql`
      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        branch_id TEXT,
        name TEXT,
        code TEXT,
        description TEXT,
        color TEXT,
        icon TEXT,
        status TEXT DEFAULT 'Active',
        created_by TEXT,
        updated_by TEXT,
        created_at BIGINT,
        updated_at BIGINT,
        deleted_at BIGINT,
        sync_version INT DEFAULT 1,
        sync_status TEXT DEFAULT 'SYNCED',
        last_synced_at BIGINT
      );
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_tenant_name ON brands(tenant_id, LOWER(name)) WHERE deleted_at IS NULL;`;
    await sql`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        branch_id TEXT,
        product_id TEXT,
        variant_id TEXT,
        movement_type TEXT,
        quantity_before NUMERIC DEFAULT 0,
        quantity_change NUMERIC DEFAULT 0,
        quantity_after NUMERIC DEFAULT 0,
        unit_cost NUMERIC DEFAULT 0,
        total_cost NUMERIC DEFAULT 0,
        user_id TEXT,
        device_id TEXT,
        idempotency_key TEXT,
        created_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS user_branch_roles (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        user_id TEXT,
        branch_id TEXT,
        role_id TEXT,
        role_name TEXT,
        created_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_modules (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        module_name TEXT,
        is_enabled BOOLEAN DEFAULT true,
        updated_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        setting_key TEXT,
        setting_value TEXT,
        updated_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        flag_key TEXT,
        is_enabled BOOLEAN DEFAULT false,
        updated_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS user_devices (
        device_id TEXT PRIMARY KEY,
        tenant_id TEXT,
        user_id TEXT,
        name TEXT,
        os TEXT,
        browser TEXT,
        user_agent TEXT,
        ip_address TEXT,
        last_seen_at BIGINT,
        created_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS user_security (
        user_id TEXT PRIMARY KEY,
        tenant_id TEXT,
        pin_hash TEXT,
        password_hash TEXT,
        last_login_at BIGINT,
        failed_attempts INT DEFAULT 0,
        created_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS business_profiles (
        tenant_id TEXT PRIMARY KEY,
        business_name TEXT,
        tin_number TEXT,
        vrn_number TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        logo_url TEXT,
        currency TEXT DEFAULT 'TZS',
        updated_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_subscriptions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        plan_name TEXT,
        start_date BIGINT,
        end_date BIGINT,
        status TEXT DEFAULT 'ACTIVE',
        amount NUMERIC DEFAULT 0,
        updated_at BIGINT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        plan_code TEXT,
        name TEXT,
        monthly_price NUMERIC,
        yearly_price NUMERIC,
        features JSONB DEFAULT '{}'::jsonb
      );
    `;
    console.log(`[Neon Backend Engine] Schema initialization complete.`);
  } catch (err) {
    console.error(`[Neon Backend Engine] Error initializing schema:`, err);
  }
}

initDatabaseSchema();

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

      // 0. GET /api/ping — Health Ping Endpoint for Offline/Online Sync
      if (pathname === '/api/ping') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now(), database: 'Neon PostgreSQL' }));
        return;
      }

      // 1. GET /api/users & POST /api/users
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

      if (pathname === '/api/users' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const uid = payload.id || `usr-${Date.now()}`;
        const now = Date.now();
        await sql`
          INSERT INTO users (id, tenant_id, branch_id, name, username, email, phone, role, created_at)
          VALUES (${uid}, ${payload.tenant_id || tenantId || ''}, ${payload.branch_id || ''}, ${payload.name || ''}, ${payload.username || ''}, ${payload.email || ''}, ${payload.phone || ''}, ${payload.role || 'Cashier'}, ${payload.created_at || now})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone;
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: uid }));
        return;
      }

      // 2. GET /api/tenants & POST /api/tenants
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

      if (pathname === '/api/tenants' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const tid = payload.id || `tenant-${Date.now()}`;
        const now = Date.now();
        await sql`
          INSERT INTO tenants (id, name, plan, status, business_code, tenant_code, created_at)
          VALUES (${tid}, ${payload.name || 'Tenant'}, ${payload.plan || 'Basic'}, ${payload.status || 'Active'}, ${payload.business_code || ''}, ${payload.tenant_code || ''}, ${payload.created_at || now})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            plan = EXCLUDED.plan,
            status = EXCLUDED.status;
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: tid }));
        return;
      }

      // 3. GET /api/branches & POST /api/branches
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

      if (pathname === '/api/branches' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const bid = payload.id || `branch-${Date.now()}`;
        const now = Date.now();
        await sql`
          INSERT INTO branches (id, tenant_id, name, location, is_headquarters, created_at)
          VALUES (${bid}, ${payload.tenant_id || tenantId || ''}, ${payload.name || 'Branch'}, ${payload.location || ''}, ${payload.is_headquarters || false}, ${payload.created_at || now})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            location = EXCLUDED.location,
            is_headquarters = EXCLUDED.is_headquarters;
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: bid }));
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

      // 8. GET /api/products, POST /api/products, DELETE /api/products
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

      if (pathname === '/api/products' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const pid = payload.id || `prod-${Date.now()}`;
        const now = Date.now();
        await sql`
          INSERT INTO products (id, tenant_id, branch_id, name, category, category_id, sku, barcode, buying_price, selling_price, price, cost_price, stock, module, has_variants, origin, status, created_at, updated_at, version)
          VALUES (${pid}, ${payload.tenant_id || tenantId || ''}, ${payload.branch_id || ''}, ${payload.name || 'Product'}, ${payload.category || 'General'}, ${payload.category_id || ''}, ${payload.sku || ''}, ${payload.barcode || ''}, ${payload.buyingPrice || payload.buying_price || 0}, ${payload.sellingPrice || payload.selling_price || 0}, ${payload.price || 0}, ${payload.costPrice || payload.cost_price || 0}, ${payload.stock || 0}, ${payload.module || 'Retail'}, ${payload.hasVariants || false}, ${payload.origin || 'PRODUCTION'}, ${payload.status || 'Active'}, ${payload.createdAt || payload.created_at || now}, ${now}, ${payload.version || 1})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            stock = EXCLUDED.stock,
            selling_price = EXCLUDED.selling_price,
            buying_price = EXCLUDED.buying_price,
            updated_at = ${now},
            version = products.version + 1;
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: pid }));
        return;
      }

      if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
        const pid = pathname.replace('/api/products/', '');
        const now = Date.now();
        await sql`UPDATE products SET deleted_at = ${now}, updated_at = ${now} WHERE id = ${pid}`;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: pid }));
        return;
      }

      // 8b. POST /api/products/sync-batch
      if (pathname === '/api/products/sync-batch' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const productsList = payload.products || [];
        const now = Date.now();
        for (const p of productsList) {
          const pid = p.id || `prod-${Date.now()}`;
          await sql`
            INSERT INTO products (id, tenant_id, branch_id, name, category, category_id, sku, barcode, buying_price, selling_price, price, cost_price, stock, module, has_variants, origin, status, created_at, updated_at, version)
            VALUES (${pid}, ${p.tenant_id || tenantId || ''}, ${p.branch_id || ''}, ${p.name || 'Product'}, ${p.category || 'General'}, ${p.category_id || ''}, ${p.sku || ''}, ${p.barcode || ''}, ${p.buyingPrice || p.buying_price || 0}, ${p.sellingPrice || p.selling_price || 0}, ${p.price || 0}, ${p.costPrice || p.cost_price || 0}, ${p.stock || 0}, ${p.module || 'Retail'}, ${p.hasVariants || false}, ${p.origin || 'PRODUCTION'}, ${p.status || 'Active'}, ${p.createdAt || p.created_at || now}, ${now}, ${p.version || 1})
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              stock = EXCLUDED.stock,
              selling_price = EXCLUDED.selling_price,
              buying_price = EXCLUDED.buying_price,
              updated_at = ${now},
              version = products.version + 1;
          `;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, count: productsList.length }));
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

      // 11. GET & POST /api/userDevices
      if (pathname === '/api/userDevices' && req.method === 'GET') {
        const devices = await sql`SELECT * FROM user_devices ORDER BY last_seen_at DESC LIMIT 100`;
        res.writeHead(200);
        res.end(JSON.stringify(devices));
        return;
      }

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

      // 12. GET & POST /api/userSecurity
      if (pathname === '/api/userSecurity' && req.method === 'GET') {
        const security = await sql`SELECT * FROM user_security LIMIT 100`;
        res.writeHead(200);
        res.end(JSON.stringify(security));
        return;
      }

      if (pathname === '/api/userSecurity' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const userId = payload.user_id || payload.userId || '';
        const now = Date.now();
        await sql`
          INSERT INTO user_security (user_id, tenant_id, pin_hash, password_hash, last_login_at, created_at)
          VALUES (${userId}, ${payload.tenant_id || tenantId || ''}, ${payload.pin_hash || ''}, ${payload.password_hash || ''}, ${now}, ${now})
          ON CONFLICT (user_id) DO UPDATE SET
            pin_hash = EXCLUDED.pin_hash,
            last_login_at = EXCLUDED.last_login_at;
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, user_id: userId }));
        return;
      }

      // 13. GET & POST /api/businessProfiles
      if (pathname === '/api/businessProfiles' && req.method === 'GET') {
        let profiles = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          profiles = await sql`SELECT * FROM business_profiles WHERE tenant_id = ${tenantId}`;
        } else {
          profiles = await sql`SELECT * FROM business_profiles LIMIT 100`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(profiles));
        return;
      }

      if (pathname === '/api/businessProfiles' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const tId = payload.tenant_id || tenantId || '';
        const now = Date.now();
        await sql`
          INSERT INTO business_profiles (tenant_id, business_name, tin_number, vrn_number, address, phone, email, logo_url, currency, updated_at)
          VALUES (${tId}, ${payload.business_name || ''}, ${payload.tin_number || ''}, ${payload.vrn_number || ''}, ${payload.address || ''}, ${payload.phone || ''}, ${payload.email || ''}, ${payload.logo_url || ''}, ${payload.currency || 'TZS'}, ${now})
          ON CONFLICT (tenant_id) DO UPDATE SET
            business_name = EXCLUDED.business_name,
            address = EXCLUDED.address,
            updated_at = ${now};
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, tenant_id: tId }));
        return;
      }

      // 14. GET & POST /api/tenantSubscriptions
      if (pathname === '/api/tenantSubscriptions' && req.method === 'GET') {
        let subs = [];
        if (tenantId && tenantId !== 'tenant-admin-system') {
          subs = await sql`SELECT * FROM tenant_subscriptions WHERE tenant_id = ${tenantId}`;
        } else {
          subs = await sql`SELECT * FROM tenant_subscriptions LIMIT 100`;
        }
        res.writeHead(200);
        res.end(JSON.stringify(subs));
        return;
      }

      if (pathname === '/api/tenantSubscriptions' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const sid = payload.id || `sub-${Date.now()}`;
        const now = Date.now();
        await sql`
          INSERT INTO tenant_subscriptions (id, tenant_id, plan_name, start_date, end_date, status, amount, updated_at)
          VALUES (${sid}, ${payload.tenant_id || tenantId || ''}, ${payload.plan_name || 'Basic'}, ${payload.start_date || now}, ${payload.end_date || now + 365*86400000}, ${payload.status || 'ACTIVE'}, ${payload.amount || 0}, ${now})
          ON CONFLICT (id) DO UPDATE SET
            plan_name = EXCLUDED.plan_name,
            status = EXCLUDED.status,
            updated_at = ${now};
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: sid }));
        return;
      }

      // 15. GET /api/subscriptionPlans & POST /api/subscriptionPlans
      if (pathname === '/api/subscriptionPlans' && req.method === 'GET') {
        const plans = await sql`SELECT * FROM subscription_plans LIMIT 50`;
        res.writeHead(200);
        res.end(JSON.stringify(plans));
        return;
      }

      if (pathname === '/api/subscriptionPlans' && req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const pid = payload.id || `plan-${Date.now()}`;
        await sql`
          INSERT INTO subscription_plans (id, plan_code, name, monthly_price, yearly_price, features)
          VALUES (${pid}, ${payload.plan_code || 'BASIC'}, ${payload.name || 'Basic Plan'}, ${payload.monthly_price || 0}, ${payload.yearly_price || 0}, ${JSON.stringify(payload.features || {})})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            monthly_price = EXCLUDED.monthly_price;
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: pid }));
        return;
      }

      // 16. POST /api/production-cleanup
      if (pathname === '/api/production-cleanup' && req.method === 'POST') {
        console.log(`[Neon Backend] Maintenance cleanup executed.`);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Production cleanup completed' }));
        return;
      }

      // 17. GET /api/sync (Master Incremental Sync from Neon PostgreSQL)
      if (pathname === '/api/sync' && req.method === 'GET') {
        const since = parseInt(fullUrl.searchParams.get('since') || '0', 10);
        const targetTenant = tenantId || fullUrl.searchParams.get('tenantId') || '';

        if (!targetTenant) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing tenantId parameter for sync' }));
          return;
        }

        const [prods, vars, cats, brds, ledger, brs, settings, modules, flags, devList] = await Promise.all([
          sql`SELECT * FROM products WHERE tenant_id = ${targetTenant} AND (updated_at > ${since} OR created_at > ${since})`,
          sql`SELECT * FROM product_variants WHERE tenant_id = ${targetTenant} AND (updated_at > ${since} OR created_at > ${since})`,
          sql`SELECT * FROM categories WHERE tenant_id = ${targetTenant}`,
          sql`SELECT * FROM brands WHERE tenant_id = ${targetTenant}`,
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
            categories: cats,
            brands: brds,
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

      // 18. POST /api/sync/push (Batch Queue Sync to Neon PostgreSQL)
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
          } else if (entity === 'productVariants' || entity === 'product_variants') {
            if (action === 'DELETE') {
              await sql`DELETE FROM product_variants WHERE id = ${recordId}`;
            } else {
              await sql`
                INSERT INTO product_variants (id, tenant_id, branch_id, product_id, sku, barcode, attributes, buying_price, selling_price, stock, status, created_at, updated_at)
                VALUES (${recordId}, ${tenantId}, ${payload.branch_id || ''}, ${payload.productId || payload.product_id || ''}, ${payload.sku || ''}, ${payload.barcode || ''}, ${JSON.stringify(payload.attributes || {})}, ${payload.buyingPrice || payload.buying_price || 0}, ${payload.sellingPrice || payload.selling_price || 0}, ${payload.stock || 0}, ${payload.status || 'Active'}, ${payload.createdAt || payload.created_at || now}, ${now})
                ON CONFLICT (id) DO UPDATE SET
                  stock = EXCLUDED.stock,
                  selling_price = EXCLUDED.selling_price,
                  buying_price = EXCLUDED.buying_price,
                  updated_at = ${now};
              `;
            }
            processedIds.push(op.id || recordId);
          } else if (entity === 'categories') {
            if (action === 'DELETE') {
              await sql`UPDATE categories SET deleted_at = ${now}, updated_at = ${now}, sync_version = sync_version + 1 WHERE id = ${recordId}`;
            } else {
              await sql`
                INSERT INTO categories (id, tenant_id, branch_id, name, code, description, color, icon, status, created_by, updated_by, created_at, updated_at, sync_version, sync_status, parent_id)
                VALUES (
                  ${recordId},
                  ${tenantId},
                  ${payload.branch_id || null},
                  ${payload.name || ''},
                  ${payload.code || ''},
                  ${payload.description || ''},
                  ${payload.color || '#4f46e5'},
                  ${payload.icon || 'Folder'},
                  ${payload.status || 'Active'},
                  ${payload.created_by || 'usr-system'},
                  ${payload.updated_by || 'usr-system'},
                  ${payload.created_at || now},
                  ${now},
                  ${payload.sync_version || 1},
                  'SYNCED',
                  ${payload.parent_id || payload.parentId || null}
                )
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  description = EXCLUDED.description,
                  status = EXCLUDED.status,
                  updated_at = ${now},
                  sync_version = categories.sync_version + 1;
              `;
            }
            processedIds.push(op.id || recordId);
          } else if (entity === 'brands') {
            if (action === 'DELETE') {
              await sql`UPDATE brands SET deleted_at = ${now}, updated_at = ${now}, sync_version = sync_version + 1 WHERE id = ${recordId}`;
            } else {
              await sql`
                INSERT INTO brands (id, tenant_id, branch_id, name, code, description, color, icon, status, created_by, updated_by, created_at, updated_at, sync_version, sync_status)
                VALUES (
                  ${recordId},
                  ${tenantId},
                  ${payload.branch_id || null},
                  ${payload.name || ''},
                  ${payload.code || ''},
                  ${payload.description || ''},
                  ${payload.color || '#9333ea'},
                  ${payload.icon || 'Tag'},
                  ${payload.status || 'Active'},
                  ${payload.created_by || 'usr-system'},
                  ${payload.updated_by || 'usr-system'},
                  ${payload.created_at || now},
                  ${now},
                  ${payload.sync_version || 1},
                  'SYNCED'
                )
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  description = EXCLUDED.description,
                  status = EXCLUDED.status,
                  updated_at = ${now},
                  sync_version = brands.sync_version + 1;
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

      // 19. DELETE /api/products/:id
      if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
        const prodId = pathname.replace('/api/products/', '');
        if (prodId) {
          console.log(`[Neon Backend] Permanently deleting product ${prodId} and variants from PostgreSQL...`);
          await sql`DELETE FROM product_variants WHERE product_id = ${prodId}`;
          await sql`DELETE FROM products WHERE id = ${prodId}`;
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, id: prodId, message: 'Product and variants deleted from Neon PostgreSQL' }));
          return;
        }
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
