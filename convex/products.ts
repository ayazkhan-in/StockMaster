import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all products with stock information
export const list = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    warehouseId: v.optional(v.id("warehouses")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let products;
    
    if (args.categoryId) {
      products = await ctx.db.query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId as any))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    } else {
      products = await ctx.db.query("products")
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    }

    // Get stock information for each product
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        let stockQuery = ctx.db.query("stock").withIndex("by_product", (q) => 
          q.eq("productId", product._id)
        );

        if (args.warehouseId) {
          stockQuery = stockQuery.filter((q) => q.eq(q.field("warehouseId"), args.warehouseId));
        }

        const stockRecords = await stockQuery.collect();
        const totalStock = stockRecords.reduce((sum, stock) => sum + stock.quantity, 0);
        const totalReserved = stockRecords.reduce((sum, stock) => sum + stock.reservedQuantity, 0);
        const availableStock = totalStock - totalReserved;

        const category = await ctx.db.get(product.categoryId);

        return {
          ...product,
          category: category?.name || "Unknown",
          totalStock,
          availableStock,
          isLowStock: product.reorderLevel ? totalStock <= product.reorderLevel : false,
          stockByWarehouse: stockRecords,
        };
      })
    );

    return productsWithStock;
  },
});

// Create a new product
export const create = mutation({
  args: {
    name: v.string(),
    sku: v.string(),
    categoryId: v.id("categories"),
    unitOfMeasure: v.string(),
    reorderLevel: v.optional(v.number()),
    reorderQuantity: v.optional(v.number()),
    initialStock: v.optional(v.number()),
    warehouseId: v.optional(v.id("warehouses")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if SKU already exists
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();

    if (existingProduct) {
      throw new Error("Product with this SKU already exists");
    }

    const productId = await ctx.db.insert("products", {
      name: args.name,
      sku: args.sku,
      categoryId: args.categoryId,
      unitOfMeasure: args.unitOfMeasure,
      reorderLevel: args.reorderLevel,
      reorderQuantity: args.reorderQuantity,
      isActive: true,
    });

    // Create initial stock if provided
    if (args.initialStock && args.initialStock > 0 && args.warehouseId) {
      await ctx.db.insert("stock", {
        productId,
        warehouseId: args.warehouseId,
        quantity: args.initialStock,
        reservedQuantity: 0,
      });

      // Log the initial stock movement
      await ctx.db.insert("stockMovements", {
        productId,
        warehouseId: args.warehouseId,
        type: "in",
        quantity: args.initialStock,
        previousQuantity: 0,
        newQuantity: args.initialStock,
        reference: `INITIAL-${args.sku}`,
        notes: "Initial stock",
        userId,
      });
    }

    return productId;
  },
});

// Update a product
export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    categoryId: v.id("categories"),
    unitOfMeasure: v.string(),
    reorderLevel: v.optional(v.number()),
    reorderQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, {
      name: args.name,
      categoryId: args.categoryId,
      unitOfMeasure: args.unitOfMeasure,
      reorderLevel: args.reorderLevel,
      reorderQuantity: args.reorderQuantity,
    });

    return args.id;
  },
});

// Get low stock products
export const getLowStock = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const products = await ctx.db.query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const lowStockProducts = [];

    for (const product of products) {
      if (!product.reorderLevel) continue;

      const stockRecords = await ctx.db.query("stock")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect();

      const totalStock = stockRecords.reduce((sum, stock) => sum + stock.quantity, 0);

      if (totalStock <= product.reorderLevel) {
        const category = await ctx.db.get(product.categoryId);
        lowStockProducts.push({
          ...product,
          category: category?.name || "Unknown",
          currentStock: totalStock,
        });
      }
    }

    return lowStockProducts;
  },
});
