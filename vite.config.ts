import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.resolve(__dirname, 'cloud_db.json')

// Seed default data if database file does not exist or is empty
function ensureDbSeeded() {
  let dbExists = fs.existsSync(dbPath)
  let needSeed = false
  let db: any = { products: [], variants: [] }

  if (!dbExists) {
    needSeed = true
  } else {
    try {
      const content = fs.readFileSync(dbPath, 'utf-8').trim()
      if (!content || content === '{}') {
        needSeed = true
      } else {
        db = JSON.parse(content)
        if (db.isProductionLocked) {
          needSeed = false
        } else if (!db.products || !db.tenants || !db.users) {
          needSeed = true
        }
      }
    } catch (e) {
      needSeed = true
    }
  }

  if (needSeed) {
    const NOW = Date.now();

    const cleanProductionDbData = {
      isProductionLocked: true,
      cleanedAt: NOW,
      products: [],
      variants: [],
      tenants: [],
      branches: [],
      users: [
        {
          id: 'usr-superadmin',
          email: 'admin@dukapos.com',
          password_hash: 'admin123',
          is_super_admin: true,
          name: 'System Platform Owner',
          phone: '+255799999999',
          tenant_id: 'tenant-admin-system',
          created_at: NOW
        }
      ],
      userBranchRoles: [],
      tenantModules: [],
      tenantSettings: [],
      featureFlags: [],
      userSecurity: [
        { user_id: 'usr-superadmin', pin_hash: '0000', failed_attempts: 0, two_factor_enabled: false }
      ],
      subscriptionPlans: [
        {
          id: 'plan-trial',
          name: 'Free Trial',
          code: 'TRIAL',
          description: '14-day full platform access trial for new business evaluation.',
          price: 0,
          currency: 'TZS',
          billing_cycle: 'monthly',
          max_users: 2,
          max_branches: 1,
          max_products: 100,
          max_storage_mb: 100,
          is_trial: true,
          is_active: true,
          created_at: NOW,
          updated_at: NOW
        },
        {
          id: 'plan-starter',
          name: 'Starter Plan',
          code: 'STARTER',
          description: 'For small single-shop businesses looking to start digitization.',
          price: 12000,
          currency: 'TZS',
          billing_cycle: 'monthly',
          max_users: 3,
          max_branches: 1,
          max_products: 1000,
          max_storage_mb: 500,
          is_trial: false,
          is_active: true,
          created_at: NOW,
          updated_at: NOW
        },
        {
          id: 'plan-business',
          name: 'Business Plan',
          code: 'BUSINESS',
          description: 'Perfect for retail stores with multiple branches and staff teams.',
          price: 16000,
          currency: 'TZS',
          billing_cycle: 'monthly',
          max_users: 10,
          max_branches: 5,
          max_products: 50000,
          max_storage_mb: 2000,
          is_trial: false,
          is_active: true,
          created_at: NOW,
          updated_at: NOW
        },
        {
          id: 'plan-enterprise',
          name: 'Enterprise Plan',
          code: 'ENTERPRISE',
          description: 'Custom setups, infinite scale, and offline micro-service sync.',
          price: 30000,
          currency: 'TZS',
          billing_cycle: 'monthly',
          max_users: 9999,
          max_branches: 9999,
          max_products: 999999,
          max_storage_mb: 50000,
          is_trial: false,
          is_active: true,
          created_at: NOW,
          updated_at: NOW
        }
      ],
      subscriptions: [],
      auditLogs: []
    };
    fs.writeFileSync(dbPath, JSON.stringify(cleanProductionDbData, null, 2), 'utf-8');
    console.log('[DevServer API] Initialized pristine production cloud_db.json (0 demo data).');
  }
}

// Helper to read database
function readDb() {
  ensureDbSeeded()
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  } catch (e) {
    return { products: [], variants: [], tenants: [], branches: [], users: [], userBranchRoles: [], tenantModules: [], tenantSettings: [], featureFlags: [], userSecurity: [], subscriptionPlans: [], auditLogs: [] }
  }
}

// Helper to write database
function writeDb(data: any) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dukapos-mock-cloud-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Headers', '*')
            res.setHeader('Access-Control-Allow-Methods', '*')

            if (req.method === 'OPTIONS') {
              res.statusCode = 200
              res.end()
              return
            }

            // Parse URL safely
            const url = new URL(req.url, 'http://localhost')
            const db = readDb()

            // 1. Extract table name from URL and dynamically initialize if missing
            const pathParts = url.pathname.split('/')
            const entityNameFromUrl = pathParts[2] // /api/tableName
            if (entityNameFromUrl && entityNameFromUrl !== 'ping' && !db[entityNameFromUrl]) {
              db[entityNameFromUrl] = []
              writeDb(db)
            }

            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            res.setHeader('Pragma', 'no-cache')
            res.setHeader('Expires', '0')

            // 2. Parse multi-tenant headers case-insensitively or from search params
            const reqTenantId = (req.headers['x-tenant-id'] as string) ||
              (req.headers['X-Tenant-ID'] as string) ||
              (req.headers['x-tenant-id'.toLowerCase()] as string) ||
              url.searchParams.get('tenantId') ||
              url.searchParams.get('tenant_id') ||
              ''

            const isPlatformRoute = url.pathname === '/api/tenants' || url.pathname === '/api/users' || url.pathname === '/api/subscriptionPlans'
            const isPingRoute = url.pathname === '/api/ping'

            // Enforce multi-tenant validation on request context
            if (!isPingRoute && reqTenantId !== 'tenant-admin-system') {
              if (!isPlatformRoute && !reqTenantId) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Explicit tenant context required.' }))
                return
              }
            }

            // ── GET /api/ping — connectivity probe ──
            if (url.pathname === '/api/ping' && (req.method === 'GET' || req.method === 'HEAD')) {
              res.statusCode = 200
              res.end(JSON.stringify({ ok: true, ts: Date.now() }))
              return
            }

            // ── POST /api/production-cleanup — Production Clean System disk purge ──
            if (url.pathname === '/api/production-cleanup' && req.method === 'POST') {
              const NOW_CLEAN = Date.now();
              const cleanDbState = {
                isProductionLocked: true,
                cleanedAt: NOW_CLEAN,
                products: [],
                variants: [],
                tenants: [],
                branches: [],
                users: [
                  { id: 'usr-superadmin', email: 'admin@dukapos.com', password_hash: 'admin123', is_super_admin: true, name: 'System Platform Owner', phone: '+255799999999', tenant_id: 'tenant-admin-system', created_at: NOW_CLEAN }
                ],
                userBranchRoles: [],
                tenantModules: [],
                tenantSettings: [],
                featureFlags: [],
                userSecurity: [],
                subscriptionPlans: [
                  { id: 'plan-trial', name: 'Free Trial', code: 'TRIAL', description: '14-day full platform access trial for new business evaluation.', price: 0, currency: 'TZS', billing_cycle: 'monthly', max_users: 2, max_branches: 1, max_products: 100, max_storage_mb: 100, is_trial: true, is_active: true, created_at: NOW_CLEAN, updated_at: NOW_CLEAN },
                  { id: 'plan-starter', name: 'Starter Plan', code: 'STARTER', description: 'For small single-shop businesses looking to start digitization.', price: 12000, currency: 'TZS', billing_cycle: 'monthly', max_users: 3, max_branches: 1, max_products: 1000, max_storage_mb: 500, is_trial: false, is_active: true, created_at: NOW_CLEAN, updated_at: NOW_CLEAN },
                  { id: 'plan-business', name: 'Business Plan', code: 'BUSINESS', description: 'Perfect for retail stores with multiple branches and staff teams.', price: 16000, currency: 'TZS', billing_cycle: 'monthly', max_users: 10, max_branches: 5, max_products: 50000, max_storage_mb: 2000, is_trial: false, is_active: true, created_at: NOW_CLEAN, updated_at: NOW_CLEAN },
                  { id: 'plan-enterprise', name: 'Enterprise Plan', code: 'ENTERPRISE', description: 'Custom setups, infinite scale, and offline micro-service sync.', price: 30000, currency: 'TZS', billing_cycle: 'monthly', max_users: 9999, max_branches: 9999, max_products: 999999, max_storage_mb: 50000, is_trial: false, is_active: true, created_at: NOW_CLEAN, updated_at: NOW_CLEAN }
                ],
                subscriptions: [],
                auditLogs: []
              };
              writeDb(cleanDbState);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Production Clean System applied to disk database cloud_db.json' }));
              return;
            }

            // ── Server-Side Inventory WAC & FIFO Valuation Endpoint ──
            if (url.pathname === '/api/inventory/valuation' || url.pathname === '/api/v1/inventory/valuation') {
              const tenantId = url.searchParams.get('tenantId') || url.searchParams.get('tenant_id') || reqTenantId;
              const method = (url.searchParams.get('method') || 'WAC').toUpperCase();

              const products = (db.products || []).filter((p: any) => {
                const pTenant = p.tenantId || p.tenant_id;
                const active = !p.deletedAt && !p.deleted_at && p.status !== 'Inactive';
                return pTenant === tenantId && active;
              });

              const variants = (db.variants || db.productVariants || []).filter((v: any) => {
                const vTenant = v.tenantId || v.tenant_id;
                const active = !v.deletedAt && !v.deleted_at && v.status !== 'Inactive';
                return vTenant === tenantId && active;
              });

              let totalValuation = 0;
              let simpleProductsValuation = 0;
              let variantProductsValuation = 0;
              let itemCount = 0;

              for (const p of products) {
                if (p.hasVariants) {
                  const prodVars = variants.filter((v: any) => v.productId === p.id || v.product_id === p.id);
                  for (const v of prodVars) {
                    const qty = Math.max(0, v.stock || 0);
                    let unitCost = v.buyingPrice ?? v.costPrice ?? p.buyingPrice ?? p.costPrice ?? p.price ?? 0;
                    if (unitCost <= 0 && p.sellingPrice > 0) {
                      unitCost = Math.round(p.sellingPrice * 0.70 * 100) / 100; // Baseline 70% cost margin backfill
                    }
                    const val = Math.round((qty * unitCost) * 100) / 100;
                    variantProductsValuation += val;
                    itemCount += qty;
                  }
                } else {
                  const qty = Math.max(0, p.stock || 0);
                  let unitCost = p.buyingPrice ?? p.costPrice ?? p.price ?? 0;
                  if (unitCost <= 0 && p.sellingPrice > 0) {
                    unitCost = Math.round(p.sellingPrice * 0.70 * 100) / 100; // Baseline 70% cost margin backfill
                  }
                  const val = Math.round((qty * unitCost) * 100) / 100;
                  simpleProductsValuation += val;
                  itemCount += qty;
                }
              }

              totalValuation = Math.round((simpleProductsValuation + variantProductsValuation) * 100) / 100;

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                tenantId,
                method,
                totalValuation,
                simpleProductsValuation: Math.round(simpleProductsValuation * 100) / 100,
                variantProductsValuation: Math.round(variantProductsValuation * 100) / 100,
                productCount: products.length,
                itemCount,
                calculatedAt: Date.now()
              }));
              return;
            }

            // Generic GET route mapping
            const entityMatch = url.pathname.match(/^\/api\/(?:v1\/)?([a-zA-Z_]+)$/)
            if (entityMatch && req.method === 'GET') {
              const entityName = entityMatch[1]
              let table = db[entityName]
              if (table) {
                // Apply soft-delete filtering by default for products, variants, and tenants
                if (entityName === 'products' || entityName === 'variants' || entityName === 'tenants') {
                  table = table.filter((r: any) => r.deletedAt === undefined || r.deletedAt === null || r.deleted_at === undefined || r.deleted_at === null)
                }

                const tenantFilter = url.searchParams.get('tenantId') || url.searchParams.get('tenant_id') || reqTenantId
                const isAuthResolutionEntity = [
                  'tenants', 'users', 'subscriptionPlans', 'userBranchRoles',
                  'branches', 'tenantModules', 'tenantSettings', 'featureFlags',
                  'userSecurity', 'businessProfiles', 'tenantUsers', 'tenantUserBranches'
                ].includes(entityName);

                // Filter records strictly by tenant ID
                if (reqTenantId !== 'tenant-admin-system' && !isAuthResolutionEntity && tenantFilter) {
                  table = table.filter((r: any) => {
                    const recordTenantId = r.tenantId || r.tenant_id || r.tenant
                    return recordTenantId === tenantFilter
                  })
                }

                // Support username/email queries for authentication checking
                const emailFilter = url.searchParams.get('email')
                if (emailFilter && entityName === 'users') {
                  table = table.filter((r: any) => r.email?.toLowerCase() === emailFilter.toLowerCase())
                }

                // Support optional pagination parameters (page & limit)
                const limitParam = url.searchParams.get('limit')
                const pageParam = url.searchParams.get('page')
                if (limitParam) {
                  const limit = parseInt(limitParam, 10) || 50
                  const page = parseInt(pageParam || '1', 10) || 1
                  const offset = (page - 1) * limit
                  table = table.slice(offset, offset + limit)
                }

                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(table))
                return
              }
            }

            // Read request body for posts/deletes
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                const parsedBody = body ? JSON.parse(body) : {}

                // ── Batch Inventory Sync & Upsert Reconciliation Endpoint ──
                if ((url.pathname === '/api/products/sync-batch' || url.pathname === '/api/v1/products/sync-batch') && req.method === 'POST') {
                  const tenantId = reqTenantId || parsedBody.tenantId || parsedBody.tenant_id;
                  const products = parsedBody.products;

                  if (!tenantId || !Array.isArray(products)) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: "Invalid payload or missing tenant context." }));
                    return;
                  }

                  if (!db.products) db.products = [];

                  const results: any[] = [];
                  const now = Date.now();

                  for (const item of products) {
                    const itemTenant = item.tenantId || item.tenant_id || tenantId;
                    if (reqTenantId !== 'tenant-admin-system' && itemTenant !== tenantId) {
                      continue; // Enforce tenant isolation
                    }

                    const index = db.products.findIndex((r: any) => r.id === item.id && (r.tenantId === tenantId || r.tenant_id === tenantId));
                    if (index > -1) {
                      db.products[index] = {
                        ...db.products[index],
                        ...item,
                        tenantId,
                        tenant_id: tenantId,
                        updatedAt: now,
                        updated_at: now,
                        version: (db.products[index].version || 1) + 1,
                      };
                      results.push(db.products[index]);
                    } else {
                      const newItem = {
                        ...item,
                        tenantId,
                        tenant_id: tenantId,
                        createdAt: item.createdAt || item.created_at || now,
                        updatedAt: now,
                        status: item.status || 'Active',
                        version: 1,
                      };
                      db.products.push(newItem);
                      results.push(newItem);
                    }
                  }

                  writeDb(db);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    message: "Inventory successfully reconciled.",
                    syncedCount: results.length,
                    products: results
                  }));
                  return;
                }

                // Generic POST route mapping (upsert)
                const postMatch = url.pathname.match(/^\/api\/([a-zA-Z_]+)$/)
                if (postMatch && req.method === 'POST') {
                  const entityName = postMatch[1]
                  const table = db[entityName]
                  if (table) {
                    const item = parsedBody

                    // Enforce tenant validation on write payloads
                    if (reqTenantId !== 'tenant-admin-system' && entityName !== 'tenants' && entityName !== 'users') {
                      const itemTenantId = item.tenantId || item.tenant_id || item.tenant
                      if (itemTenantId && itemTenantId !== reqTenantId) {
                        res.statusCode = 403
                        res.end(JSON.stringify({ error: 'Access Denied: Cannot write records belonging to another tenant.' }))
                        return
                      }
                    }

                    const idKey = entityName === 'userSecurity' ? 'user_id' : 'id'
                    const index = table.findIndex((r: any) => r[idKey] === item[idKey])

                    // Verify existing record is not overwritten across tenants
                    if (index > -1 && reqTenantId !== 'tenant-admin-system' && entityName !== 'tenants' && entityName !== 'users') {
                      const existingRecord = table[index]
                      const existingTenantId = existingRecord.tenantId || existingRecord.tenant_id || existingRecord.tenant
                      if (existingTenantId && existingTenantId !== reqTenantId) {
                        res.statusCode = 403
                        res.end(JSON.stringify({ error: 'Access Denied: Cross-tenant overwrite detected.' }))
                        return
                      }
                    }

                    if (index > -1) {
                      table[index] = { ...table[index], ...item }
                    } else {
                      // Auto-bind tenant ID on creation
                      if (reqTenantId !== 'tenant-admin-system' && entityName !== 'tenants' && entityName !== 'users') {
                        if (!item.tenant_id) item.tenant_id = reqTenantId
                        if (!item.tenantId) item.tenantId = reqTenantId
                      }
                      table.push(item)
                    }
                    writeDb(db)
                    res.end(JSON.stringify({ data: [item], error: null }))
                    return
                  }
                }

                // Generic DELETE route mapping
                const deleteMatch = url.pathname.match(/^\/api\/([a-zA-Z_]+)\/([a-zA-Z0-9\-_]+)$/)
                if (deleteMatch && req.method === 'DELETE') {
                  const entityName = deleteMatch[1]
                  const recordId = deleteMatch[2]
                  const table = db[entityName]
                  if (table) {
                    const idKey = entityName === 'userSecurity' ? 'user_id' : 'id'
                    const index = table.findIndex((r: any) => r[idKey] === recordId)
                    if (index > -1) {
                      const record = table[index]

                      // Enforce tenant validation on deletion
                      if (reqTenantId !== 'tenant-admin-system' && entityName !== 'tenants' && entityName !== 'users') {
                        const recordTenantId = record.tenantId || record.tenant_id || record.tenant
                        if (recordTenantId && recordTenantId !== reqTenantId) {
                          res.statusCode = 403
                          res.end(JSON.stringify({ error: 'Access Denied: Cross-tenant deletion unauthorized.' }))
                          return
                        }
                      }

                      if (entityName === 'products' || entityName === 'variants' || entityName === 'tenants') {
                        // Soft delete
                        record.deletedAt = Date.now()
                        record.deleted_at = Date.now()
                        record.status = entityName === 'tenants' ? 'ARCHIVED' : 'Inactive'
                        record.updatedAt = Date.now()
                        record.updated_at = Date.now()
                        table[index] = record
                      } else {
                        // Hard delete
                        table.splice(index, 1)
                      }
                      writeDb(db)
                      res.end(JSON.stringify({ data: [record], error: null }))
                    } else {
                      res.statusCode = 404
                      res.end(JSON.stringify({ error: `${entityName} record not found` }))
                    }
                    return
                  }
                }

                // If no API routes matched, return 404
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Not Found' }))
              } catch (err: any) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
          next()
        })
      }
    }
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[/\\](?:react|react-dom|scheduler)/,
              priority: 40,
            },
            {
              name: 'vendor-dexie',
              test: /node_modules[/\\](?:dexie|dexie-react-hooks)/,
              priority: 30,
            },
            {
              name: 'vendor-recharts',
              test: /node_modules[/\\]recharts/,
              priority: 20,
            },
            {
              name: 'vendor-icons',
              test: /node_modules[/\\]lucide-react/,
              priority: 10,
            }
          ]
        }
      }
    }
  }
})
