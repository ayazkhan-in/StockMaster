import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get dashboard KPIs
export const getDashboardKPIs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Total products in stock
    const products = await ctx.db.query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let totalProducts = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    for (const product of products) {
      const stockRecords = await ctx.db.query("stock")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect();

      const totalStock = stockRecords.reduce((sum, stock) => sum + stock.quantity, 0);
      
      if (totalStock > 0) {
        totalProducts++;
      } else {
        outOfStockItems++;
      }

      if (product.reorderLevel && totalStock > 0 && totalStock <= product.reorderLevel) {
        lowStockItems++;
      }
    }

    // Pending operations
    const pendingReceipts = await ctx.db.query("operations")
      .withIndex("by_type", (q) => q.eq("type", "receipt"))
      .filter((q) => q.neq(q.field("status"), "done") && q.neq(q.field("status"), "canceled"))
      .collect();

    const pendingDeliveries = await ctx.db.query("operations")
      .withIndex("by_type", (q) => q.eq("type", "delivery"))
      .filter((q) => q.neq(q.field("status"), "done") && q.neq(q.field("status"), "canceled"))
      .collect();

    const pendingTransfers = await ctx.db.query("operations")
      .withIndex("by_type", (q) => q.eq("type", "transfer"))
      .filter((q) => q.neq(q.field("status"), "done") && q.neq(q.field("status"), "canceled"))
      .collect();

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      pendingReceipts: pendingReceipts.length,
      pendingDeliveries: pendingDeliveries.length,
      pendingTransfers: pendingTransfers.length,
    };
  },
});

// Get operations with filters
export const list = query({
  args: {
    type: v.optional(v.union(v.literal("receipt"), v.literal("delivery"), v.literal("transfer"), v.literal("adjustment"))),
    status: v.optional(v.union(v.literal("draft"), v.literal("waiting"), v.literal("ready"), v.literal("done"), v.literal("canceled"))),
    warehouseId: v.optional(v.id("warehouses")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let operations;

    if (args.type) {
      operations = await ctx.db.query("operations")
        .withIndex("by_type", (q) => q.eq("type", args.type as any))
        .collect();
    } else {
      operations = await ctx.db.query("operations").collect();
    }



    // Apply additional filters
    if (args.status) {
      operations = operations.filter(op => op.status === args.status);
    }

    if (args.warehouseId) {
      operations = operations.filter(op => op.warehouseId === args.warehouseId);
    }

    // Get warehouse names and operation lines
    const operationsWithDetails = await Promise.all(
      operations.map(async (operation) => {
        const warehouse = await ctx.db.get(operation.warehouseId);
        const destinationWarehouse = operation.destinationWarehouseId 
          ? await ctx.db.get(operation.destinationWarehouseId)
          : null;

        const lines = await ctx.db.query("operationLines")
          .withIndex("by_operation", (q) => q.eq("operationId", operation._id))
          .collect();

        const linesWithProducts = await Promise.all(
          lines.map(async (line) => {
            const product = await ctx.db.get(line.productId);
            return {
              ...line,
              product,
            };
          })
        );

        return {
          ...operation,
          warehouse: warehouse?.name || "Unknown",
          destinationWarehouse: destinationWarehouse?.name,
          lines: linesWithProducts,
          totalItems: lines.reduce((sum, line) => sum + line.plannedQuantity, 0),
        };
      })
    );

    return operationsWithDetails.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Create a new operation
export const create = mutation({
  args: {
    type: v.union(v.literal("receipt"), v.literal("delivery"), v.literal("transfer"), v.literal("adjustment")),
    warehouseId: v.id("warehouses"),
    destinationWarehouseId: v.optional(v.id("warehouses")),
    supplierName: v.optional(v.string()),
    customerName: v.optional(v.string()),
    notes: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate reference number
    const timestamp = Date.now();
    const typePrefix = args.type.toUpperCase().substring(0, 3);
    const reference = `${typePrefix}-${timestamp}`;

    return await ctx.db.insert("operations", {
      type: args.type,
      reference,
      status: "draft",
      warehouseId: args.warehouseId,
      destinationWarehouseId: args.destinationWarehouseId,
      supplierName: args.supplierName,
      customerName: args.customerName,
      notes: args.notes,
      scheduledDate: args.scheduledDate,
      userId,
    });
  },
});

// Add product line to operation
export const addLine = mutation({
  args: {
    operationId: v.id("operations"),
    productId: v.id("products"),
    plannedQuantity: v.number(),
    unitPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("operationLines", {
      operationId: args.operationId,
      productId: args.productId,
      plannedQuantity: args.plannedQuantity,
      unitPrice: args.unitPrice,
    });
  },
});

// Process operation (validate and update stock)
export const process = mutation({
  args: {
    operationId: v.id("operations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const operation = await ctx.db.get(args.operationId);
    if (!operation) throw new Error("Operation not found");

    if (operation.status === "done") {
      throw new Error("Operation already processed");
    }

    const lines = await ctx.db.query("operationLines")
      .withIndex("by_operation", (q) => q.eq("operationId", args.operationId))
      .collect();

    // Process each line
    for (const line of lines) {
      const quantity = line.actualQuantity || line.plannedQuantity;
      
      if (operation.type === "receipt") {
        // Increase stock
        await updateStock(ctx, line.productId, operation.warehouseId, quantity);
        await logMovement(ctx, line.productId, operation.warehouseId, "in", quantity, operation.reference, userId, args.operationId);
      } else if (operation.type === "delivery") {
        // Decrease stock
        await updateStock(ctx, line.productId, operation.warehouseId, -quantity);
        await logMovement(ctx, line.productId, operation.warehouseId, "out", quantity, operation.reference, userId, args.operationId);
      } else if (operation.type === "transfer" && operation.destinationWarehouseId) {
        // Move stock between warehouses
        await updateStock(ctx, line.productId, operation.warehouseId, -quantity);
        await updateStock(ctx, line.productId, operation.destinationWarehouseId, quantity);
        await logMovement(ctx, line.productId, operation.warehouseId, "out", quantity, operation.reference, userId, args.operationId);
        await logMovement(ctx, line.productId, operation.destinationWarehouseId, "in", quantity, operation.reference, userId, args.operationId);
      }
    }

    // Update operation status
    await ctx.db.patch(args.operationId, {
      status: "done",
      completedDate: Date.now(),
    });

    return args.operationId;
  },
});

// Helper function to update stock
async function updateStock(ctx: any, productId: any, warehouseId: any, quantityChange: number) {
  const existingStock = await ctx.db.query("stock")
    .withIndex("by_product_warehouse", (q: any) => q.eq("productId", productId).eq("warehouseId", warehouseId))
    .first();

  if (existingStock) {
    const newQuantity = Math.max(0, existingStock.quantity + quantityChange);
    await ctx.db.patch(existingStock._id, {
      quantity: newQuantity,
    });
  } else if (quantityChange > 0) {
    await ctx.db.insert("stock", {
      productId,
      warehouseId,
      quantity: quantityChange,
      reservedQuantity: 0,
    });
  }
}

// Helper function to log stock movement
async function logMovement(ctx: any, productId: any, warehouseId: any, type: "in" | "out" | "adjustment", quantity: number, reference: string, userId: any, operationId?: any) {
  const stock = await ctx.db.query("stock")
    .withIndex("by_product_warehouse", (q: any) => q.eq("productId", productId).eq("warehouseId", warehouseId))
    .first();

  const currentQuantity = stock?.quantity || 0;
  const previousQuantity = type === "in" ? currentQuantity - quantity : currentQuantity + quantity;

  await ctx.db.insert("stockMovements", {
    productId,
    warehouseId,
    operationId,
    type,
    quantity: type === "out" ? -quantity : quantity,
    previousQuantity,
    newQuantity: currentQuantity,
    reference,
    userId,
  });
}
