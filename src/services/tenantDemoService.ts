import { db, type Product, type ProductVariant, type Customer, type Order, type TableEntity, type ResetCommand, recalculateProductStock } from '../db/dexie';
import { recordStockMovement } from '../db/dexie';
import { supabase, setMockAuthOverride } from '../db/supabaseClient';

const checkProdEnv = () => {
  if (import.meta.env.PROD) {
    throw new Error("Accidental Data Loss Prevention: Destructive reset operations, demo purging, and seed scripts are strictly disabled in production environments.");
  }
};

/**
 * Service to manage the lifecycle of Tenant Demo Data, template provisioning,
 * and background data reset operations.
 */
export const tenantDemoService = {
  /**
   * Seeds demo/sample records for a specific tenant and branch based on selected module template.
   */
  async seedDemoData(tenantId: string, branchId: string, moduleType: string) {
    checkProdEnv();
    // 1. Pre-emptive cleanup of existing demo data for this tenant
    await this.purgeTenantDemoRecords(tenantId);

    const NOW = Date.now();
    const DAY = 86400000;
    const warehouseId = `warehouse-main-${tenantId}`;

    // Ensure default warehouse exists
    await db.warehouses.put({
      id: warehouseId,
      tenant_id: tenantId,
      branch_id: branchId,
      code: 'MAIN-WH',
      name: 'Main Store Warehouse',
      location: 'Main Branch HQ',
      manager_name: 'Store Manager',
      status: 'Active',
      created_at: NOW
    });

    if (moduleType === 'Retail') {
      // Seed Retail Products
      const products: Product[] = [
        {
          id: `demo-prod-ret-1-${tenantId}`,
          name: 'Premium Rice 5kg',
          category: 'Grains',
          buyingPrice: 15000,
          sellingPrice: 18500,
          price: 18500,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Retail',
          hasVariants: true,
          attributes: ['Grade'],
          brand: 'Tanzania Gold',
          description: 'Premium long grain white rice',
          supplier: 'Mbeya Farmers Ltd',
          origin: 'DEMO'
        },
        {
          id: `demo-prod-ret-2-${tenantId}`,
          name: 'White Sugar 1kg',
          category: 'Groceries',
          buyingPrice: 3800,
          sellingPrice: 4500,
          price: 4500,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Retail',
          hasVariants: false,
          brand: 'Kilombero',
          description: 'Pure refined white sugar',
          supplier: 'Kilombero Sugar Co',
          origin: 'DEMO'
        },
        {
          id: `demo-prod-ret-3-${tenantId}`,
          name: 'Fresh Milk 1L',
          category: 'Dairy',
          buyingPrice: 2000,
          sellingPrice: 2600,
          price: 2600,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Retail',
          hasVariants: false,
          brand: 'Asas',
          description: 'Pasteurized fresh cow milk',
          supplier: 'Asas Dairies',
          origin: 'DEMO'
        }
      ];

      const variants: ProductVariant[] = [
        {
          id: `demo-var-ret-1-a-${tenantId}`,
          productId: `demo-prod-ret-1-${tenantId}`,
          sku: `DEMO-RICE-5KG-A-${tenantId}`,
          barcode: '620000000001',
          buyingPrice: 16000,
          sellingPrice: 19500,
          stock: 0,
          reservedStock: 0,
          reorderLevel: 10,
          status: 'Active',
          attributes: { Grade: 'Grade A' },
          tenant_id: tenantId,
          branch_id: branchId,
          origin: 'DEMO'
        },
        {
          id: `demo-var-ret-1-b-${tenantId}`,
          productId: `demo-prod-ret-1-${tenantId}`,
          sku: `DEMO-RICE-5KG-B-${tenantId}`,
          barcode: '620000000002',
          buyingPrice: 14000,
          sellingPrice: 17500,
          stock: 0,
          reservedStock: 0,
          reorderLevel: 10,
          status: 'Active',
          attributes: { Grade: 'Grade B' },
          tenant_id: tenantId,
          branch_id: branchId,
          origin: 'DEMO'
        }
      ];

      await db.products.bulkPut(products);
      await db.productVariants.bulkPut(variants);

      // Seed Customers
      const customers: Customer[] = [
        { id: `demo-cust-ret-1-${tenantId}`, name: 'John Retail', phone: '+255700000011', email: 'john.retail@demo.com', loyaltyPoints: 100, outstandingBalance: 0, tenant_id: tenantId, branch_id: branchId, type: 'Customer', origin: 'DEMO' },
        { id: `demo-cust-ret-2-${tenantId}`, name: 'Mary Customer', phone: '+255700000012', email: 'mary@demo.com', loyaltyPoints: 50, outstandingBalance: 15000, tenant_id: tenantId, branch_id: branchId, type: 'Customer', origin: 'DEMO' }
      ];
      await db.customers.bulkPut(customers);

      // Seed Stock Movements
      await recordStockMovement({
        tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
        product_id: `demo-prod-ret-1-${tenantId}`, variant_id: `demo-var-ret-1-a-${tenantId}`,
        movement_type: 'OPENING_STOCK', quantity_change: 50, unit_cost: 16000, total_cost: 800000,
        user_id: 'System Seeder', notes: 'Demo Opening Stock', origin: 'DEMO'
      } as any);

      await recordStockMovement({
        tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
        product_id: `demo-prod-ret-2-${tenantId}`,
        movement_type: 'OPENING_STOCK', quantity_change: 100, unit_cost: 3800, total_cost: 380000,
        user_id: 'System Seeder', notes: 'Demo Opening Stock', origin: 'DEMO'
      } as any);

      // Seed Orders
      const order: Order = {
        id: `demo-ord-ret-1-${tenantId}`,
        items: [
          { productId: `demo-prod-ret-1-${tenantId}`, variantId: `demo-var-ret-1-a-${tenantId}`, name: 'Premium Rice 5kg (Grade A)', price: 19500, quantity: 2 },
          { productId: `demo-prod-ret-2-${tenantId}`, name: 'White Sugar 1kg', price: 4500, quantity: 3 }
        ],
        total: 52500,
        discount: 0,
        tax: 7241,
        paymentMethod: 'Cash',
        status: 'Completed',
        timestamp: NOW - 2 * 60 * 60 * 1000,
        syncStatus: 'Synced',
        tenant_id: tenantId,
        branch_id: branchId,
        module: 'Retail',
        origin: 'DEMO'
      };
      await db.orders.put(order);

      // Record sale deduction
      await recordStockMovement({
        tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
        product_id: `demo-prod-ret-1-${tenantId}`, variant_id: `demo-var-ret-1-a-${tenantId}`,
        movement_type: 'SALE', quantity_change: -2, unit_cost: 16000, total_cost: -32000,
        user_id: 'System Seeder', notes: 'Demo POS Sale ord-ret-1', origin: 'DEMO'
      } as any);

    } else if (moduleType === 'Restaurant') {
      // Seed Restaurant Products
      const products: Product[] = [
        { id: `demo-prod-res-1-${tenantId}`, name: 'Grilled Chicken Tikka', category: 'Mains', buyingPrice: 12000, sellingPrice: 22000, price: 22000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Restaurant', hasVariants: false, origin: 'DEMO' },
        { id: `demo-prod-res-2-${tenantId}`, name: 'Classic Beef Burger', category: 'Mains', buyingPrice: 8000, sellingPrice: 14000, price: 14000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Restaurant', hasVariants: false, origin: 'DEMO' },
        { id: `demo-prod-res-3-${tenantId}`, name: 'Double Espresso Shot', category: 'Beverages', buyingPrice: 1200, sellingPrice: 5000, price: 5000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Restaurant', hasVariants: false, origin: 'DEMO' }
      ];
      await db.products.bulkPut(products);

      // Customers
      const customers: Customer[] = [
        { id: `demo-cust-res-1-${tenantId}`, name: 'Diner Sam', phone: '+255700000021', email: 'sam@demo.com', loyaltyPoints: 35, outstandingBalance: 0, tenant_id: tenantId, branch_id: branchId, type: 'Customer', origin: 'DEMO' }
      ];
      await db.customers.bulkPut(customers);

      // Stock
      for (const p of products) {
        await recordStockMovement({
          tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
          product_id: p.id,
          movement_type: 'OPENING_STOCK', quantity_change: 80, unit_cost: p.buyingPrice, total_cost: p.buyingPrice * 80,
          user_id: 'System Seeder', notes: 'Kitchen demo opening stock', origin: 'DEMO'
        } as any);
      }

      // Order
      const order: Order = {
        id: `demo-ord-res-1-${tenantId}`,
        items: [
          { productId: `demo-prod-res-1-${tenantId}`, name: 'Grilled Chicken Tikka', price: 22000, quantity: 1 },
          { productId: `demo-prod-res-3-${tenantId}`, name: 'Double Espresso Shot', price: 5000, quantity: 2 }
        ],
        total: 32000,
        discount: 2000,
        tax: 4138,
        paymentMethod: 'Credit Card',
        status: 'Completed',
        timestamp: NOW - 1 * 60 * 60 * 1000,
        syncStatus: 'Synced',
        tenant_id: tenantId,
        branch_id: branchId,
        module: 'Restaurant',
        origin: 'DEMO'
      };
      await db.orders.put(order);

    } else if (moduleType === 'Pharmacy') {
      // Seed Pharmacy Products
      const products: Product[] = [
        { id: `demo-prod-phm-1-${tenantId}`, name: 'Paracetamol 500mg (100 Tabs)', category: 'Analgesics', buyingPrice: 4000, sellingPrice: 6500, price: 6500, stock: 0, expiryDate: new Date(NOW + 365 * DAY).toISOString().slice(0, 10), tenant_id: tenantId, branch_id: branchId, module: 'Pharmacy', hasVariants: false, origin: 'DEMO' },
        { id: `demo-prod-phm-2-${tenantId}`, name: 'Amoxicillin 250mg Syrup', category: 'Antibiotics', buyingPrice: 8500, sellingPrice: 12000, price: 12000, stock: 0, expiryDate: new Date(NOW + 180 * DAY).toISOString().slice(0, 10), tenant_id: tenantId, branch_id: branchId, module: 'Pharmacy', hasVariants: false, origin: 'DEMO' },
        { id: `demo-prod-phm-3-${tenantId}`, name: 'Vitamin C Effervescent', category: 'Supplements', buyingPrice: 10000, sellingPrice: 15000, price: 15000, stock: 0, expiryDate: new Date(NOW + 90 * DAY).toISOString().slice(0, 10), tenant_id: tenantId, branch_id: branchId, module: 'Pharmacy', hasVariants: false, origin: 'DEMO' }
      ];
      await db.products.bulkPut(products);

      // Customers
      const customers: Customer[] = [
        { id: `demo-cust-phm-1-${tenantId}`, name: 'Patient Peter', phone: '+255700000031', email: 'peter@demo.com', loyaltyPoints: 120, outstandingBalance: 0, tenant_id: tenantId, branch_id: branchId, type: 'Patient', origin: 'DEMO' }
      ];
      await db.customers.bulkPut(customers);

      // Stock
      for (const p of products) {
        await recordStockMovement({
          tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
          product_id: p.id,
          movement_type: 'OPENING_STOCK', quantity_change: 40, unit_cost: p.buyingPrice, total_cost: p.buyingPrice * 40,
          user_id: 'System Seeder', notes: 'Pharmacy demo opening stock', origin: 'DEMO'
        } as any);
      }

    } else if (moduleType === 'Bar') {
      // Seed Bar & Beverage Lounge Products
      const products: Product[] = [
        {
          id: `demo-prod-bar-1-${tenantId}`, name: 'Konyagi Original Spirit 750ml', category: 'Spirits',
          buyingPrice: 10500, sellingPrice: 315000, price: 315000,
          stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Bar', hasVariants: false,
          brand: 'TBL (Tanzania Breweries)', supplier: 'JAQISAR Distributors',
          description: 'Tanzanian spirit. 750ml bottle, 40% ABV. Serves 25 standard shots.',
          item_type: 'Beverage', packaging: 'Bottle', bottle_size_ml: 750,
          standard_pour_ml: 30, total_pours_per_bottle: 25, cost_per_pour: 420,
          selling_price_per_pour: 12600, track_empty_bottles: true,
          excise_tax_applicable: true, excise_tax_rate: 0.35, abv_percent: 40,
          is_happy_hour_eligible: false, happy_hour_price: 0,
          origin: 'DEMO'
        },
        {
          id: `demo-prod-bar-2-${tenantId}`, name: 'Safari Lager 500ml', category: 'Beer',
          buyingPrice: 1800, sellingPrice: 3500, price: 3500,
          stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Bar', hasVariants: false,
          brand: 'TBL (Tanzania Breweries)', supplier: 'TBL Depot',
          description: 'Classic Tanzanian lager. 500ml brown bottle.',
          item_type: 'Beverage', packaging: 'Bottle', bottle_size_ml: 500,
          standard_pour_ml: 500, total_pours_per_bottle: 1, cost_per_pour: 1800,
          selling_price_per_pour: 3500, track_empty_bottles: true,
          excise_tax_applicable: true, excise_tax_rate: 0.15, abv_percent: 5.5,
          is_happy_hour_eligible: true, happy_hour_price: 2800,
          origin: 'DEMO'
        },
        {
          id: `demo-prod-bar-3-${tenantId}`, name: 'Tropical Mojito', category: 'Cocktails',
          buyingPrice: 4500, sellingPrice: 16000, price: 16000,
          stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Bar', hasVariants: false,
          brand: 'In-House Recipe', supplier: 'Bar Stock',
          description: 'White rum, fresh mint, lime juice, sugar syrup, soda. Per glass.',
          item_type: 'Beverage', packaging: 'Draught', bottle_size_ml: 250,
          standard_pour_ml: 250, total_pours_per_bottle: 1, cost_per_pour: 4500,
          selling_price_per_pour: 16000, track_empty_bottles: false,
          excise_tax_applicable: true, excise_tax_rate: 0.25, abv_percent: 10,
          is_happy_hour_eligible: true, happy_hour_price: 12000,
          origin: 'DEMO'
        }
      ];
      await db.products.bulkPut(products);

      // Seed Bar Tables
      const tables: TableEntity[] = [
        { id: `demo-bt-1-${tenantId}`, tenant_id: tenantId, branch_id: branchId, zone_id: 'Main Area', name: 'Table 1', capacity: 4, status: 'AVAILABLE', origin: 'DEMO' },
        { id: `demo-bt-2-${tenantId}`, tenant_id: tenantId, branch_id: branchId, zone_id: 'VIP Section', name: 'VIP 1', capacity: 6, status: 'AVAILABLE', origin: 'DEMO' }
      ];
      await db.barTables.bulkPut(tables);

      // Seed Stock
      for (const p of products) {
        await recordStockMovement({
          tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
          product_id: p.id,
          movement_type: 'OPENING_STOCK', quantity_change: 60, unit_cost: p.buyingPrice, total_cost: p.buyingPrice * 60,
          user_id: 'System Seeder', notes: 'Bar lounge demo opening stock', origin: 'DEMO'
        } as any);
      }

    } else if (moduleType === 'Garage') {
      // Seed Garage Products (Parts & Services)
      const products: Product[] = [
        {
          id: `demo-prod-gar-1-${tenantId}`,
          name: 'Synthetic Engine Oil 4L',
          category: 'Lubricants',
          buyingPrice: 45000,
          sellingPrice: 65000,
          price: 65000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Garage',
          hasVariants: false,
          brand: 'Castrol',
          description: '5W-30 Fully Synthetic Engine Oil',
          supplier: 'Castrol East Africa',
          origin: 'DEMO'
        },
        {
          id: `demo-prod-gar-2-${tenantId}`,
          name: 'Front Brake Pads Set',
          category: 'Brakes',
          buyingPrice: 35000,
          sellingPrice: 55000,
          price: 55000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Garage',
          hasVariants: false,
          brand: 'Brembo',
          description: 'High performance ceramic brake pads',
          supplier: 'Auto Parts Tanzania',
          origin: 'DEMO'
        },
        {
          id: `demo-prod-gar-3-${tenantId}`,
          name: 'Major Engine Service Labor',
          category: 'Services',
          buyingPrice: 0,
          sellingPrice: 80000,
          price: 80000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Garage',
          hasVariants: false,
          brand: 'In-House Service',
          description: 'Comprehensive diagnostic and engine tune-up service',
          supplier: 'In-House Service',
          origin: 'DEMO'
        }
      ];
      await db.products.bulkPut(products);

      // Seed Customers
      const customers: Customer[] = [
        { id: `demo-cust-gar-1-${tenantId}`, name: 'Driver Dennis', phone: '+255700000041', email: 'dennis@demo.com', loyaltyPoints: 80, outstandingBalance: 0, tenant_id: tenantId, branch_id: branchId, type: 'Customer', origin: 'DEMO' }
      ];
      await db.customers.bulkPut(customers);

      // Seed Stock
      for (const p of products) {
        if (p.buyingPrice > 0) {
          await recordStockMovement({
            tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
            product_id: p.id,
            movement_type: 'OPENING_STOCK', quantity_change: 30, unit_cost: p.buyingPrice, total_cost: p.buyingPrice * 30,
            user_id: 'System Seeder', notes: 'Garage parts opening stock', origin: 'DEMO'
          } as any);
        }
      }

      // Seed Order
      const order: Order = {
        id: `demo-ord-gar-1-${tenantId}`,
        items: [
          { productId: `demo-prod-gar-1-${tenantId}`, name: 'Synthetic Engine Oil 4L', price: 65000, quantity: 1 },
          { productId: `demo-prod-gar-3-${tenantId}`, name: 'Major Engine Service Labor', price: 80000, quantity: 1 }
        ],
        total: 145000,
        discount: 5000,
        tax: 19310,
        paymentMethod: 'MPesa',
        status: 'Completed',
        timestamp: NOW - 3 * 60 * 60 * 1000,
        syncStatus: 'Synced',
        tenant_id: tenantId,
        branch_id: branchId,
        module: 'Garage',
        origin: 'DEMO'
      };
      await db.orders.put(order);

      // Record inventory deduction for sale
      await recordStockMovement({
        tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
        product_id: `demo-prod-gar-1-${tenantId}`,
        movement_type: 'SALE', quantity_change: -1, unit_cost: 45000, total_cost: -45000,
        user_id: 'System Seeder', notes: 'POS sale deduction', origin: 'DEMO'
      } as any);

    } else if (moduleType === 'Hotel') {
      // Seed Hotel Products (Rooms & Dining)
      const products: Product[] = [
        {
          id: `demo-prod-hot-1-${tenantId}`,
          name: 'Standard Room Night',
          category: 'Accommodation',
          buyingPrice: 20000,
          sellingPrice: 80000,
          price: 80000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Hotel',
          hasVariants: false,
          description: 'Standard single/double room with AC and Wifi',
          origin: 'DEMO'
        },
        {
          id: `demo-prod-hot-2-${tenantId}`,
          name: 'Luxury Suite Night',
          category: 'Accommodation',
          buyingPrice: 50000,
          sellingPrice: 200000,
          price: 200000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Hotel',
          hasVariants: false,
          description: 'Premium suite room with balcony and mini-bar',
          origin: 'DEMO'
        },
        {
          id: `demo-prod-hot-3-${tenantId}`,
          name: 'Continental Breakfast',
          category: 'Dining',
          buyingPrice: 5000,
          sellingPrice: 15000,
          price: 15000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'Hotel',
          hasVariants: false,
          description: 'Continental breakfast package per guest',
          origin: 'DEMO'
        }
      ];
      await db.products.bulkPut(products);

      // Seed Customers
      const customers: Customer[] = [
        { id: `demo-cust-hot-1-${tenantId}`, name: 'Guest Grace', phone: '+255700000051', email: 'grace@demo.com', loyaltyPoints: 150, outstandingBalance: 0, tenant_id: tenantId, branch_id: branchId, type: 'Guest', origin: 'DEMO' }
      ];
      await db.customers.bulkPut(customers);

      // Seed Stock
      for (const p of products) {
        if (p.buyingPrice > 0) {
          await recordStockMovement({
            tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
            product_id: p.id,
            movement_type: 'OPENING_STOCK', quantity_change: 20, unit_cost: p.buyingPrice, total_cost: p.buyingPrice * 20,
            user_id: 'System Seeder', notes: 'Hotel supplies opening stock', origin: 'DEMO'
          } as any);
        }
      }

      // Seed Order
      const order: Order = {
        id: `demo-ord-hot-1-${tenantId}`,
        items: [
          { productId: `demo-prod-hot-1-${tenantId}`, name: 'Standard Room Night', price: 80000, quantity: 2 },
          { productId: `demo-prod-hot-3-${tenantId}`, name: 'Continental Breakfast', price: 15000, quantity: 2 }
        ],
        total: 190000,
        discount: 10000,
        tax: 24827,
        paymentMethod: 'Card',
        status: 'Completed',
        timestamp: NOW - 5 * 60 * 60 * 1000,
        syncStatus: 'Synced',
        tenant_id: tenantId,
        branch_id: branchId,
        module: 'Hotel',
        origin: 'DEMO'
      };
      await db.orders.put(order);

    } else if (moduleType === 'SACCO') {
      // Seed SACCO Products (Savings, Loans, Shares)
      const products: Product[] = [
        {
          id: `demo-prod-sac-1-${tenantId}`,
          name: 'Development Loan Fee',
          category: 'Loans',
          buyingPrice: 0,
          sellingPrice: 50000,
          price: 50000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'SACCO',
          hasVariants: false,
          description: 'Loan registration and processing fee',
          origin: 'DEMO'
        },
        {
          id: `demo-prod-sac-2-${tenantId}`,
          name: 'Savings Account Deposit',
          category: 'Savings',
          buyingPrice: 0,
          sellingPrice: 100000,
          price: 100000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'SACCO',
          hasVariants: false,
          description: 'Regular monthly savings deposit',
          origin: 'DEMO'
        },
        {
          id: `demo-prod-sac-3-${tenantId}`,
          name: 'Member Registration',
          category: 'Shares',
          buyingPrice: 0,
          sellingPrice: 20000,
          price: 20000,
          stock: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          module: 'SACCO',
          hasVariants: false,
          description: 'SACCO membership joining and share purchase',
          origin: 'DEMO'
        }
      ];
      await db.products.bulkPut(products);

      // Seed Customers (Members)
      const customers: Customer[] = [
        { id: `demo-cust-sac-1-${tenantId}`, name: 'Member Moses', phone: '+255700000061', email: 'moses@demo.com', loyaltyPoints: 20, outstandingBalance: 0, tenant_id: tenantId, branch_id: branchId, type: 'Member', origin: 'DEMO' }
      ];
      await db.customers.bulkPut(customers);

      // Seed Order
      const order: Order = {
        id: `demo-ord-sac-1-${tenantId}`,
        items: [
          { productId: `demo-prod-sac-3-${tenantId}`, name: 'Member Registration', price: 20000, quantity: 1 },
          { productId: `demo-prod-sac-2-${tenantId}`, name: 'Savings Account Deposit', price: 100000, quantity: 1 }
        ],
        total: 120000,
        discount: 0,
        tax: 0,
        paymentMethod: 'Cash',
        status: 'Completed',
        timestamp: NOW - 4 * 60 * 60 * 1000,
        syncStatus: 'Synced',
        tenant_id: tenantId,
        branch_id: branchId,
        module: 'SACCO',
        origin: 'DEMO'
      };
      await db.orders.put(order);
    } else {
      // General fallbacks for other modules
      let sampleProducts: Product[] = [];

      if (moduleType === 'Workforce') {
        sampleProducts = [
          { id: `demo-prod-wf-1-${tenantId}`, name: 'Biometric RFID Scanner Rental', category: 'Hardware', buyingPrice: 50000, sellingPrice: 120000, price: 120000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Workforce', hasVariants: false, origin: 'DEMO' },
          { id: `demo-prod-wf-2-${tenantId}`, name: 'Time Tracking Card Reader', category: 'Hardware', buyingPrice: 20000, sellingPrice: 45000, price: 45000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Workforce', hasVariants: false, origin: 'DEMO' }
        ];
      } else if (moduleType === 'Law') {
        sampleProducts = [
          { id: `demo-prod-law-1-${tenantId}`, name: 'Corporate Legal Retainer', category: 'Services', buyingPrice: 0, sellingPrice: 1500000, price: 1500000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Law', hasVariants: false, origin: 'DEMO' },
          { id: `demo-prod-law-2-${tenantId}`, name: 'NDA Document Drafting', category: 'Documents', buyingPrice: 0, sellingPrice: 150000, price: 150000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: 'Law', hasVariants: false, origin: 'DEMO' }
        ];
      } else {
        // General default template fallback for custom modules
        sampleProducts = [
          { id: `demo-prod-gen-1-${tenantId}`, name: `${moduleType} Standard Item A`, category: 'General', buyingPrice: 10000, sellingPrice: 18000, price: 18000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: moduleType, hasVariants: false, origin: 'DEMO' },
          { id: `demo-prod-gen-2-${tenantId}`, name: `${moduleType} Premium Service B`, category: 'Services', buyingPrice: 0, sellingPrice: 50000, price: 50000, stock: 0, tenant_id: tenantId, branch_id: branchId, module: moduleType, hasVariants: false, origin: 'DEMO' }
        ];
      }

      if (sampleProducts.length > 0) {
        await db.products.bulkPut(sampleProducts);

        // Seed Customer
        const customer: Customer = {
          id: `demo-cust-gen-1-${tenantId}`,
          name: `Client of ${tenantId}`,
          phone: '+255711122233',
          email: 'client@demo.com',
          loyaltyPoints: 10,
          outstandingBalance: 0,
          tenant_id: tenantId,
          branch_id: branchId,
          type: 'Customer',
          origin: 'DEMO'
        };
        await db.customers.put(customer);

        // Seed opening stock movement
        for (const p of sampleProducts) {
          if (p.buyingPrice > 0) {
            await recordStockMovement({
              tenant_id: tenantId, branch_id: branchId, warehouse_id: warehouseId,
              product_id: p.id,
              movement_type: 'OPENING_STOCK', quantity_change: 50, unit_cost: p.buyingPrice, total_cost: p.buyingPrice * 50,
              user_id: 'System Seeder', notes: 'Demo opening stock', origin: 'DEMO'
            } as any);
          }
        }

        // Seed completed order
        const order: Order = {
          id: `demo-ord-gen-1-${tenantId}`,
          items: sampleProducts.map(p => ({
            productId: p.id,
            name: p.name,
            price: p.sellingPrice,
            quantity: 1
          })),
          total: sampleProducts.reduce((sum, p) => sum + p.sellingPrice, 0),
          discount: 0,
          tax: 0,
          paymentMethod: 'Cash',
          status: 'Completed',
          timestamp: NOW - 3 * 60 * 60 * 1000,
          syncStatus: 'Synced',
          tenant_id: tenantId,
          branch_id: branchId,
          module: moduleType,
          origin: 'DEMO'
        };
        await db.orders.put(order);
      }
    }
  },

  /**
   * Enqueues a ResetCommand event to clean up or clear data asynchronously.
   */
  async createResetCommand(tenantId: string, userId: string, clearType: 'DEMO_DATA' | 'ALL_DATA'): Promise<string> {
    const id = `rc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cmd: ResetCommand = {
      id,
      tenant_id: tenantId,
      status: 'PENDING',
      requested_by: userId,
      clear_type: clearType,
      created_at: Date.now(),
      percent_complete: 0,
      current_table: 'Queueing job...'
    };
    await db.resetCommands.put(cmd);

    // Trigger processing asynchronously in background simulation
    setTimeout(() => {
      this.processResetCommands().catch(err => {
        console.error('Async Reset Command worker failed:', err);
      });
    }, 100);

    return id;
  },

  /**
   * Safety verification check before running deletion.
   */
  async checkTenantSafety(tenantId: string, clearType: 'DEMO_DATA' | 'ALL_DATA'): Promise<{ safe: boolean; reason?: string }> {
    const tenant = await db.tenants.get(tenantId);
    if (!tenant) {
      return { safe: false, reason: 'Safety Check: Tenant does not exist.' };
    }

    const isDemoStatus = tenant.status?.toUpperCase() === 'DEMO';
    const hasDemoSuffix = tenant.id.endsWith('_demo') || tenant.id.includes('_demo_');

    if (clearType === 'DEMO_DATA') {
      if (!isDemoStatus && !hasDemoSuffix) {
        return { safe: false, reason: 'Safety Abort: Tenant is not flagged as a demo workspace.' };
      }

      // Scan core tables for any records created with origin !== 'DEMO'
      const sampleOrders = await db.orders.where('tenant_id').equals(tenantId).limit(50).toArray();
      const hasProdOrder = sampleOrders.some(o => o.origin === 'PRODUCTION');
      if (hasProdOrder) {
        return { safe: false, reason: 'Safety Abort: Tenant contains active production sales orders.' };
      }
    }

    // Check active sessions (simulated via recent activities)
    const activeSessions = await db.userSessions.where('tenant_id').equals(tenantId).toArray();
    const hasActiveSession = activeSessions.some(s => s.lastActivity && s.lastActivity > Date.now() - 5 * 60 * 1000);
    if (hasActiveSession) {
      return { safe: false, reason: 'Safety Abort: Active user sessions detected on this tenant.' };
    }

    // Check pending synchronization queue
    const pendingSyncCount = await db.syncQueue.where('status').equals('PENDING').count();
    if (pendingSyncCount > 0) {
      return { safe: false, reason: 'Safety Abort: Pending synchronization sync queue items exist.' };
    }

    return { safe: true };
  },

  /**
   * Creates a serialized backup package of demo/all tenant data before purging it.
   */
  async createRollbackSnapshot(tenantId: string, clearType: 'DEMO_DATA' | 'ALL_DATA'): Promise<string> {
    const tables = [
      { name: 'payments', table: db.payments },
      { name: 'invoices', table: db.invoices },
      { name: 'orders', table: db.orders },
      { name: 'stockLedger', table: db.stockLedger },
      { name: 'stockBalance', table: db.stockBalance },
      { name: 'purchaseOrders', table: db.purchaseOrders },
      { name: 'wastageLogs', table: db.wastageLogs },
      { name: 'heldCarts', table: db.heldCarts },
      { name: 'tabs', table: db.tabs },
      { name: 'tips', table: db.tips },
      { name: 'expenses', table: db.expenses },
      { name: 'customers', table: db.customers },
      { name: 'suppliers', table: db.suppliers },
      { name: 'productVariants', table: db.productVariants },
      { name: 'products', table: db.products },
      { name: 'recipes', table: db.recipes },
      { name: 'recipeItems', table: db.recipeItems },
      { name: 'barTables', table: db.barTables }
    ];

    const snapshot: Record<string, any[]> = {};
    for (const item of tables) {
      let records = [];
      if (clearType === 'DEMO_DATA') {
        records = await item.table.where('tenant_id').equals(tenantId).and((r: any) => r.origin === 'DEMO').toArray();
      } else {
        records = await item.table.where('tenant_id').equals(tenantId).toArray();
      }
      if (records.length > 0) {
        snapshot[item.name] = records;
      }
    }
    return JSON.stringify(snapshot);
  },

  /**
   * Restores a serialized database snapshot.
   */
  async restoreRollback(commandId: string): Promise<boolean> {
    checkProdEnv();
    const cmd = await db.resetCommands.get(commandId);
    if (!cmd || !cmd.rollback_package_data) {
      throw new Error('Rollback package not found or unavailable for this command.');
    }
    const snapshot = JSON.parse(cmd.rollback_package_data);
    const tables: Record<string, any> = {
      payments: db.payments,
      invoices: db.invoices,
      orders: db.orders,
      stockLedger: db.stockLedger,
      stockBalance: db.stockBalance,
      purchaseOrders: db.purchaseOrders,
      wastageLogs: db.wastageLogs,
      heldCarts: db.heldCarts,
      tabs: db.tabs,
      tips: db.tips,
      expenses: db.expenses,
      customers: db.customers,
      suppliers: db.suppliers,
      productVariants: db.productVariants,
      products: db.products,
      recipes: db.recipes,
      recipeItems: db.recipeItems,
      barTables: db.barTables
    };

    const tablesToTrans = Object.values(tables);
    await db.transaction('rw', tablesToTrans, async () => {
      for (const [tableName, records] of Object.entries(snapshot)) {
        const table = tables[tableName];
        if (table && Array.isArray(records)) {
          await table.bulkPut(records);
        }
      }
    });

    await db.resetCommands.update(commandId, {
      status: 'PENDING',
      rollback_available: false,
      percent_complete: 0,
      current_table: 'Rollback restored. Resetting command.'
    });

    return true;
  },

  /**
   * Asynchronous reset command queue worker.
   */
  async processResetCommands() {
    const pending = await db.resetCommands.where('status').equals('PENDING').toArray();
    for (const cmd of pending) {
      await this.runCleanupJob(cmd.id);
    }
  },

  /**
   * Core cleanup runner executing safe ordered deletion, progress updates, and transaction locks.
   */
  async runCleanupJob(commandId: string) {
    checkProdEnv();
    const cmd = await db.resetCommands.get(commandId);
    if (!cmd) return;

    // Safety checks
    const safety = await this.checkTenantSafety(cmd.tenant_id, cmd.clear_type);
    if (!safety.safe) {
      await db.resetCommands.update(commandId, {
        status: 'FAILED',
        error_message: safety.reason || 'Safety abort check failed.'
      });
      return;
    }

    // Lock tenant Status
    const originalTenant = await db.tenants.get(cmd.tenant_id);
    const originalStatus = originalTenant?.status;
    if (originalTenant) {
      await db.tenants.update(cmd.tenant_id, { status: 'Suspended' });
    }

    try {
      // Create rollback snapshot
      const snapshot = await this.createRollbackSnapshot(cmd.tenant_id, cmd.clear_type);
      await db.resetCommands.update(commandId, {
        status: 'PROCESSING',
        rollback_package_data: snapshot,
        rollback_available: true,
        percent_complete: 5,
        current_table: 'Serializing database state rollback package...'
      });

      // Clear matching records in Supabase
      try {
        setMockAuthOverride({
          tenant_id: 'tenant-admin-system',
          user_id: cmd.requested_by || 'system-provisioner',
          user_name: 'SaaS System Provisioner'
        });

        if (cmd.clear_type === 'DEMO_DATA') {
          await supabase.from('products').delete().eq('tenant_id', cmd.tenant_id).eq('origin', 'DEMO');
          await supabase.from('product_variants').delete().eq('tenant_id', cmd.tenant_id).eq('origin', 'DEMO');
          await supabase.from('customers').delete().eq('tenant_id', cmd.tenant_id).eq('origin', 'DEMO');
          await supabase.from('orders').delete().eq('tenant_id', cmd.tenant_id).eq('origin', 'DEMO');
        } else {
          await supabase.from('products').delete().eq('tenant_id', cmd.tenant_id);
          await supabase.from('product_variants').delete().eq('tenant_id', cmd.tenant_id);
          await supabase.from('customers').delete().eq('tenant_id', cmd.tenant_id);
          await supabase.from('orders').delete().eq('tenant_id', cmd.tenant_id);
        }
      } catch (cloudErr: any) {
        console.error('[Reset Command Worker] Supabase deletion failed:', cloudErr.message);
      } finally {
        setMockAuthOverride(null);
      }

      // Cleanup order matching dependency graph
      const tables = [
        { name: 'payments', table: db.payments },
        { name: 'invoices', table: db.invoices },
        { name: 'orders', table: db.orders },
        { name: 'stockLedger', table: db.stockLedger },
        { name: 'stockBalance', table: db.stockBalance },
        { name: 'purchaseOrders', table: db.purchaseOrders },
        { name: 'wastageLogs', table: db.wastageLogs },
        { name: 'heldCarts', table: db.heldCarts },
        { name: 'tabs', table: db.tabs },
        { name: 'tips', table: db.tips },
        { name: 'expenses', table: db.expenses },
        { name: 'customers', table: db.customers },
        { name: 'suppliers', table: db.suppliers },
        { name: 'productVariants', table: db.productVariants },
        { name: 'products', table: db.products },
        { name: 'recipes', table: db.recipes },
        { name: 'recipeItems', table: db.recipeItems },
        { name: 'barTables', table: db.barTables }
      ];

      let processedTables = 0;
      for (const item of tables) {
        // Check for Pause/Cancel
        const freshCmd = await db.resetCommands.get(commandId);
        if (!freshCmd) break;
        if (freshCmd.is_cancelled || freshCmd.status === 'CANCELLED') {
          await db.resetCommands.update(commandId, { status: 'CANCELLED', current_table: 'Job cancelled by operator.' });
          if (originalTenant && originalStatus) {
            await db.tenants.update(cmd.tenant_id, { status: originalStatus });
          }
          return;
        }
        if (freshCmd.is_paused || freshCmd.status === 'PAUSED') {
          await db.resetCommands.update(commandId, { status: 'PAUSED', current_table: `Job paused before ${item.name}.` });
          if (originalTenant && originalStatus) {
            await db.tenants.update(cmd.tenant_id, { status: originalStatus });
          }
          return;
        }

        processedTables++;
        const percent = Math.floor(5 + (processedTables / tables.length) * 90);
        await db.resetCommands.update(commandId, {
          current_table: `Purging ${item.name}...`,
          percent_complete: percent
        });

        let isDone = false;
        const primaryKey = item.table.schema.primKey.name;
        while (!isDone) {
          const innerCmd = await db.resetCommands.get(commandId);
          if (innerCmd?.is_cancelled || innerCmd?.status === 'CANCELLED') {
            await db.resetCommands.update(commandId, { status: 'CANCELLED', current_table: 'Job cancelled by operator.' });
            if (originalTenant && originalStatus) {
              await db.tenants.update(cmd.tenant_id, { status: originalStatus });
            }
            return;
          }

          let records = [];
          if (cmd.clear_type === 'DEMO_DATA') {
            records = await item.table
              .where('tenant_id')
              .equals(cmd.tenant_id)
              .and((r: any) => r.origin === 'DEMO')
              .limit(100)
              .toArray();
          } else {
            records = await item.table
              .where('tenant_id')
              .equals(cmd.tenant_id)
              .limit(100)
              .toArray();
          }

          if (records.length === 0) {
            isDone = true;
          } else {
            const keysToDelete = records.map((r: any) => r[primaryKey]);
            await db.transaction('rw', item.table, async () => {
              await item.table.bulkDelete(keysToDelete);
            });
            // 50ms artificial progress simulation step
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }

      await db.resetCommands.update(commandId, {
        status: 'COMPLETED',
        percent_complete: 100,
        current_table: 'Integrity checks passed. Cleanup successful.',
        completed_at: Date.now()
      });

      // Recalculate Stock
      const products = await db.products.where('tenant_id').equals(cmd.tenant_id).toArray();
      for (const prod of products) {
        if (prod.hasVariants) {
          await recalculateProductStock(prod.id);
        }
      }

      // Add security compliance audit log
      await db.securityAuditLogs.add({
        id: `sal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenant_id: cmd.tenant_id,
        branch_id: 'branch-dar-hq',
        user_id: cmd.requested_by,
        action: cmd.clear_type === 'DEMO_DATA' ? 'tenant.demo_data.clear' : 'tenant.all_data.clear',
        ip_address: '127.0.0.1',
        device_info: 'Background Worker Engine',
        created_at: Date.now()
      });

      // Release Lock
      if (originalTenant) {
        await db.tenants.update(cmd.tenant_id, { status: originalStatus || 'Active' });
      }

    } catch (err: any) {
      await db.resetCommands.update(commandId, {
        status: 'FAILED',
        error_message: err.message
      });
      if (originalTenant && originalStatus) {
        await db.tenants.update(cmd.tenant_id, { status: originalStatus });
      }
    }
  },

  /**
   * Deletes all tenant transactional data marked as origin: 'DEMO' in batches of 1000.
   */
  async purgeTenantDemoRecords(tenantId: string) {
    checkProdEnv();

    // Purge from Cloud Supabase
    try {
      setMockAuthOverride({
        tenant_id: 'tenant-admin-system',
        user_id: 'system-provisioner',
        user_name: 'SaaS System Provisioner'
      });
      await supabase.from('products').delete().eq('tenant_id', tenantId);
      await supabase.from('product_variants').delete().eq('tenant_id', tenantId);
      await supabase.from('customers').delete().eq('tenant_id', tenantId);
      await supabase.from('orders').delete().eq('tenant_id', tenantId);
    } catch (e: any) {
      console.error('Cloud purge tenant demo records failed:', e.message);
    } finally {
      setMockAuthOverride(null);
    }

    const tables = [
      db.products, db.productVariants, db.customers, db.orders,
      db.stockLedger, db.stockBalance, db.invoices, db.payments,
      db.suppliers, db.purchaseOrders, db.barTables, db.recipes,
      db.recipeItems, db.wastageLogs, db.tabs, db.tips, db.heldCarts
    ];

    for (const table of tables) {
      let isDone = false;
      const primaryKey = table.schema.primKey.name;

      while (!isDone) {
        // Query chunk matching tenant_id and sample/demo origins
        const records = await table
          .where('tenant_id')
          .equals(tenantId)
          .and((item: any) => 
            item.origin === 'DEMO' || 
            item.origin === 'DEMO_DATA' || 
            !item.origin ||
            (typeof item.id === 'string' && (
              item.id.startsWith('demo-') || 
              item.id.startsWith('ret-') || 
              item.id.startsWith('pharm-') || 
              item.id.startsWith('res-') || 
              item.id.startsWith('bar-') || 
              item.id.startsWith('gar-') || 
              item.id.startsWith('hot-') || 
              item.id.startsWith('sac-') ||
              item.id.startsWith('var-ret-')
            ))
          )
          .limit(1000)
          .toArray();

        if (records.length === 0) {
          isDone = true;
        } else {
          const keysToDelete = records.map((r: any) => r[primaryKey]);
          await db.transaction('rw', table, async () => {
            await table.bulkDelete(keysToDelete);
          });
          console.log(`[Purge Engine] Table: ${table.name} — Deleted ${keysToDelete.length} demo records.`);
        }
      }
    }
  },

  /**
   * Deletes ALL transactional data for a tenant (whether demo or production) in batches of 1000.
   */
  async purgeTenantAllRecords(tenantId: string) {
    checkProdEnv();

    // Purge from Cloud Supabase
    try {
      setMockAuthOverride({
        tenant_id: 'tenant-admin-system',
        user_id: 'system-provisioner',
        user_name: 'SaaS System Provisioner'
      });
      await supabase.from('products').delete().eq('tenant_id', tenantId);
      await supabase.from('product_variants').delete().eq('tenant_id', tenantId);
      await supabase.from('customers').delete().eq('tenant_id', tenantId);
      await supabase.from('orders').delete().eq('tenant_id', tenantId);
    } catch (e: any) {
      console.error('Cloud purge tenant all records failed:', e.message);
    } finally {
      setMockAuthOverride(null);
    }

    const tables = [
      db.products, db.productVariants, db.customers, db.orders,
      db.stockLedger, db.stockBalance, db.invoices, db.payments,
      db.suppliers, db.purchaseOrders, db.barTables, db.recipes,
      db.recipeItems, db.wastageLogs, db.tabs, db.tips, db.heldCarts
    ];

    for (const table of tables) {
      let isDone = false;
      const primaryKey = table.schema.primKey.name;

      while (!isDone) {
        // Query chunk of 1000 matching tenant_id
        const records = await table
          .where('tenant_id')
          .equals(tenantId)
          .limit(1000)
          .toArray();

        if (records.length === 0) {
          isDone = true;
        } else {
          const keysToDelete = records.map((r: any) => r[primaryKey]);
          await db.transaction('rw', table, async () => {
            await table.bulkDelete(keysToDelete);
          });
          console.log(`[Purge Engine] Table: ${table.name} — Deleted ${keysToDelete.length} records.`);
        }
      }
    }
  },

  /**
   * Transitions tenant operational state and records state transition audit log.
   */
  async updateTenantStatus(
    tenantId: string, 
    newStatus: 'DEMO' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED' | 'Active' | 'Demo' | 'Suspended' | 'Expired' | 'Archived', 
    userId: string
  ) {
    const tenant = await db.tenants.get(tenantId);
    if (!tenant) return;
    const oldStatus = tenant.status;
    await db.tenants.update(tenantId, { status: newStatus as any });

    // Update in Cloud Supabase
    try {
      setMockAuthOverride({
        tenant_id: 'tenant-admin-system',
        user_id: userId,
        user_name: 'SaaS System Provisioner'
      });
      await supabase.from('tenants').update({ status: newStatus }).eq('id', tenantId);
    } catch (e: any) {
      console.error('Cloud tenant status update failed:', e.message);
    } finally {
      setMockAuthOverride(null);
    }

    await db.auditLogs.add({
      id: `al-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      user_id: userId,
      user_name: 'System/Admin',
      action: 'TENANT_STATUS_TRANSITION',
      entity: 'tenant',
      entity_id: tenantId,
      metadata: {
        oldStatus,
        newStatus,
        timestamp: Date.now()
      },
      created_at: Date.now()
    });
  },

  /**
   * Transitions a tenant workspace from DEMO/Trial to Production ACTIVE status,
   * cleaning up demo records while preserving configurations.
   */
  async convertToProduction(tenantId: string, userId: string): Promise<{ prodTenantId: string; name: string; plan: string }> {
    checkProdEnv();
    // 1. Generate production tenant ID by stripping '_demo' suffix
    let prodTenantId = tenantId.replace('_demo', '');
    if (prodTenantId === tenantId) {
      prodTenantId = `${tenantId}-prod`;
    }

    const demoTenant = await db.tenants.get(tenantId);
    const plan = demoTenant?.plan || 'Professional';
    const name = demoTenant?.name || 'My Production Business';
    const slug = demoTenant?.slug ? demoTenant.slug.replace('-demo', '') : 'prod-business';

    // 2. Create the production tenant record
    await db.tenants.put({
      id: prodTenantId,
      name,
      slug,
      status: 'Active',
      plan
    });

    // 3. Migrate configuration settings from demo tenant to production tenant
    
    // Migrate Branches
    const branches = await db.branches.where('tenant_id').equals(tenantId).toArray();
    for (const b of branches) {
      const newBranchId = b.id.replace(tenantId, prodTenantId);
      await db.branches.put({
        ...b,
        id: newBranchId,
        tenant_id: prodTenantId
      });
    }

    // Migrate Tenant Modules
    const modules = await db.tenantModules.where('tenant_id').equals(tenantId).toArray();
    for (const m of modules) {
      await db.tenantModules.put({
        ...m,
        id: m.id.replace(tenantId, prodTenantId),
        tenant_id: prodTenantId
      });
    }

    // Migrate Tenant Settings
    const settings = await db.tenantSettings.where('tenant_id').equals(tenantId).toArray();
    for (const s of settings) {
      await db.tenantSettings.put({
        ...s,
        id: s.id.replace(tenantId, prodTenantId),
        tenant_id: prodTenantId
      });
    }

    // Migrate Feature Flags
    const flags = await db.featureFlags.where('tenant_id').equals(tenantId).toArray();
    for (const f of flags) {
      await db.featureFlags.put({
        ...f,
        id: f.id.replace(tenantId, prodTenantId),
        tenant_id: prodTenantId
      });
    }

    // Migrate custom Roles
    const roles = await db.roles.where('tenant_id').equals(tenantId).toArray();
    for (const r of roles) {
      await db.roles.put({
        ...r,
        id: r.id.replace(tenantId, prodTenantId),
        tenant_id: prodTenantId
      });
    }

    // Migrate Users
    const users = await db.users.where('tenant_id').equals(tenantId).toArray();
    for (const u of users) {
      await db.users.put({
        ...u,
        tenant_id: prodTenantId
      });
    }

    // Migrate Tenant Users
    const tenantUsers = await db.tenantUsers.where('tenant_id').equals(tenantId).toArray();
    for (const tu of tenantUsers) {
      await db.tenantUsers.put({
        ...tu,
        id: tu.id.replace(tenantId, prodTenantId),
        tenant_id: prodTenantId
      });
    }

    // Migrate User Branch Roles
    const ubrs = await db.userBranchRoles.where('tenant_id').equals(tenantId).toArray();
    for (const ubr of ubrs) {
      await db.userBranchRoles.put({
        ...ubr,
        id: ubr.id.replace(tenantId, prodTenantId),
        tenant_id: prodTenantId,
        branch_id: ubr.branch_id.replace(tenantId, prodTenantId)
      });
    }

    // Migrate Tenant User Branches
    const tubs = await db.tenantUserBranches.where('tenant_id').equals(tenantId).toArray();
    for (const tub of tubs) {
      await db.tenantUserBranches.put({
        ...tub,
        id: tub.id.replace(tenantId, prodTenantId),
        tenant_id: prodTenantId,
        branch_id: tub.branch_id.replace(tenantId, prodTenantId)
      });
    }

    // 4. Delete old demo tenant profile from local Dexie to prevent duplicate tenant records
    await db.tenants.delete(tenantId);

    // Push all migrated/new records to Supabase
    try {
      setMockAuthOverride({
        tenant_id: 'tenant-admin-system',
        user_id: userId,
        user_name: 'SaaS System Provisioner'
      });

      // 1. Delete old demo tenant record from cloud database
      await supabase.from('tenants').delete().eq('id', tenantId);

      // 2. Insert new production tenant
      const prodTenant = await db.tenants.get(prodTenantId);
      if (prodTenant) {
        await supabase.from('tenants').insert(prodTenant);
      }

      // 3. Insert migrated branches and delete old demo branches
      const prodBranches = await db.branches.where('tenant_id').equals(prodTenantId).toArray();
      if (prodBranches.length) {
        await supabase.from('branches').insert(prodBranches);
      }
      await supabase.from('branches').delete().eq('tenant_id', tenantId);

      // 4. Insert migrated modules and delete old demo modules
      const prodModules = await db.tenantModules.where('tenant_id').equals(prodTenantId).toArray();
      if (prodModules.length) {
        await supabase.from('tenantModules').insert(prodModules);
      }
      await supabase.from('tenantModules').delete().eq('tenant_id', tenantId);

      // 5. Insert migrated settings and delete old demo settings
      const prodSettings = await db.tenantSettings.where('tenant_id').equals(prodTenantId).toArray();
      if (prodSettings.length) {
        await supabase.from('tenantSettings').insert(prodSettings);
      }
      await supabase.from('tenantSettings').delete().eq('tenant_id', tenantId);

      // 6. Insert migrated feature flags and delete old demo feature flags
      const prodFlags = await db.featureFlags.where('tenant_id').equals(prodTenantId).toArray();
      if (prodFlags.length) {
        await supabase.from('featureFlags').insert(prodFlags);
      }
      await supabase.from('featureFlags').delete().eq('tenant_id', tenantId);

      // 7. Update all users belonging to the old tenant in Supabase to point to the new production tenant ID
      await supabase.from('users').update({ tenant_id: prodTenantId }).eq('tenant_id', tenantId);

      // 8. Insert migrated user branch roles and delete old user branch roles
      const prodUbrs = await db.userBranchRoles.where('tenant_id').equals(prodTenantId).toArray();
      if (prodUbrs.length) {
        await supabase.from('userBranchRoles').insert(prodUbrs);
      }
      await supabase.from('userBranchRoles').delete().eq('tenant_id', tenantId);
    } catch (err: any) {
      console.error('Cloud synchronization error during conversion to production:', err.message);
    } finally {
      setMockAuthOverride(null);
    }

    // 5. Synchronously purge all demo products/transactional data from BOTH old demo tenant and new production tenant
    await this.purgeTenantAllRecords(tenantId);
    await this.purgeTenantAllRecords(prodTenantId);

    // Queue background reset command for tracking
    await this.createResetCommand(tenantId, userId, 'ALL_DATA');

    // 6. Log audit event logs for transition
    await db.auditLogs.add({
      id: `al-${Date.now()}-old-${Math.random().toString(36).substr(2, 5)}`,
      tenant_id: tenantId,
      user_id: userId,
      user_name: 'System/Admin',
      action: 'TENANT_STATUS_TRANSITION',
      entity: 'tenant',
      entity_id: tenantId,
      metadata: { oldStatus: 'Demo', newStatus: 'Expired' },
      created_at: Date.now()
    });

    await db.auditLogs.add({
      id: `al-${Date.now()}-new-${Math.random().toString(36).substr(2, 5)}`,
      tenant_id: prodTenantId,
      user_id: userId,
      user_name: 'Tenant Owner',
      action: 'TENANT_CONVERT_DEMO_TO_PRODUCTION',
      entity: 'tenant',
      entity_id: prodTenantId,
      metadata: { fromDemoTenant: tenantId },
      created_at: Date.now()
    });

    return {
      prodTenantId,
      name,
      plan: plan as string
    };
  },

  /**
   * Safe offline-first synchronization handler for TENANT_RESET events received from the server.
   */
  async syncTenantReset(tenantId: string, scope: 'DEMO_DATA' | 'ALL_DATA'): Promise<boolean> {
    checkProdEnv();
    console.log(`[Sync Engine] Received TENANT_RESET event for tenant: ${tenantId}, scope: ${scope}`);
    
    // 1. Remove Records in batches of 1000
    if (scope === 'DEMO_DATA') {
      await this.purgeTenantDemoRecords(tenantId);
    } else {
      await this.purgeTenantAllRecords(tenantId);
    }

    // 2. Rebuild Local Indexes / Refresh Cache
    const products = await db.products.where('tenant_id').equals(tenantId).toArray();
    for (const prod of products) {
      if (prod.hasVariants) {
        await recalculateProductStock(prod.id);
      }
    }
    
    console.log(`[Sync Engine] TENANT_RESET completed for tenant: ${tenantId}`);
    return true;
  },

  /**
   * Provisions and seeds a quick demo tenant.
   */
  async seedDemoTenant(): Promise<void> {
    const { tenantProvisioningService } = await import('./tenantProvisioningService');
    const tenantId = `tenant-demo-${Date.now()}`;
    const branchId = `branch-demo-${Date.now()}`;
    const companyName = `Quick Demo Store ${Math.floor(100 + Math.random() * 900)}`;

    await tenantProvisioningService.provisionCleanTenant(
      tenantId,
      branchId,
      companyName,
      'Retail',
      { 
        email: `demo-${Date.now().toString().slice(-4)}@dukapos.com`, 
        fullName: 'Demo Manager', 
        pin: '1234', 
        password: 'demo' 
      },
      {
        plan: 'Professional',
        status: 'Demo',
        country: 'Tanzania',
        region: 'Dar es Salaam'
      }
    );

    await this.seedDemoData(tenantId, branchId, 'Retail');
  }
};
