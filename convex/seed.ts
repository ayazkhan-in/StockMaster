import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Create default categories
    const electronicsCategory = await ctx.db.insert("categories", {
      name: "Electronics",
      description: "Electronic devices and components",
      isActive: true,
    });

    const furnitureCategory = await ctx.db.insert("categories", {
      name: "Furniture",
      description: "Office and home furniture",
      isActive: true,
    });

    const suppliesCategory = await ctx.db.insert("categories", {
      name: "Office Supplies",
      description: "General office supplies and stationery",
      isActive: true,
    });

    // Create default warehouses
    const mainWarehouse = await ctx.db.insert("warehouses", {
      name: "Main Warehouse",
      code: "MAIN",
      address: "123 Industrial Ave, Business District",
      isActive: true,
    });

    const retailWarehouse = await ctx.db.insert("warehouses", {
      name: "Retail Store",
      code: "RETAIL",
      address: "456 Shopping Center, Downtown",
      isActive: true,
    });

    // Create sample products
    const laptop = await ctx.db.insert("products", {
      name: "Business Laptop",
      sku: "LAP-001",
      categoryId: electronicsCategory,
      unitOfMeasure: "pieces",
      reorderLevel: 5,
      reorderQuantity: 20,
      isActive: true,
    });

    const chair = await ctx.db.insert("products", {
      name: "Office Chair",
      sku: "CHR-001",
      categoryId: furnitureCategory,
      unitOfMeasure: "pieces",
      reorderLevel: 3,
      reorderQuantity: 10,
      isActive: true,
    });

    const pens = await ctx.db.insert("products", {
      name: "Blue Pens (Pack of 10)",
      sku: "PEN-001",
      categoryId: suppliesCategory,
      unitOfMeasure: "packs",
      reorderLevel: 20,
      reorderQuantity: 50,
      isActive: true,
    });

    // Create initial stock
    await ctx.db.insert("stock", {
      productId: laptop,
      warehouseId: mainWarehouse,
      quantity: 15,
      reservedQuantity: 0,
    });

    await ctx.db.insert("stock", {
      productId: chair,
      warehouseId: mainWarehouse,
      quantity: 8,
      reservedQuantity: 0,
    });

    await ctx.db.insert("stock", {
      productId: pens,
      warehouseId: mainWarehouse,
      quantity: 45,
      reservedQuantity: 0,
    });

    await ctx.db.insert("stock", {
      productId: chair,
      warehouseId: retailWarehouse,
      quantity: 2, // Low stock to trigger alert
      reservedQuantity: 0,
    });

    // Log initial stock movements
    await ctx.db.insert("stockMovements", {
      productId: laptop,
      warehouseId: mainWarehouse,
      type: "in",
      quantity: 15,
      previousQuantity: 0,
      newQuantity: 15,
      reference: "INITIAL-STOCK",
      notes: "Initial inventory setup",
      userId,
    });

    await ctx.db.insert("stockMovements", {
      productId: chair,
      warehouseId: mainWarehouse,
      type: "in",
      quantity: 8,
      previousQuantity: 0,
      newQuantity: 8,
      reference: "INITIAL-STOCK",
      notes: "Initial inventory setup",
      userId,
    });

    await ctx.db.insert("stockMovements", {
      productId: pens,
      warehouseId: mainWarehouse,
      type: "in",
      quantity: 45,
      previousQuantity: 0,
      newQuantity: 45,
      reference: "INITIAL-STOCK",
      notes: "Initial inventory setup",
      userId,
    });

    await ctx.db.insert("stockMovements", {
      productId: chair,
      warehouseId: retailWarehouse,
      type: "in",
      quantity: 2,
      previousQuantity: 0,
      newQuantity: 2,
      reference: "INITIAL-STOCK",
      notes: "Initial inventory setup",
      userId,
    });

    return "Sample data created successfully!";
  },
});
