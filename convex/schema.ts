import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Warehouses and locations
  warehouses: defineTable({
    name: v.string(),
    code: v.string(),
    address: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_code", ["code"]),

  // Product categories
  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  }),

  // Products
  products: defineTable({
    name: v.string(),
    sku: v.string(),
    categoryId: v.id("categories"),
    unitOfMeasure: v.string(),
    reorderLevel: v.optional(v.number()),
    reorderQuantity: v.optional(v.number()),
    isActive: v.boolean(),
  }).index("by_sku", ["sku"])
    .index("by_category", ["categoryId"]),

  // Stock levels per product per warehouse
  stock: defineTable({
    productId: v.id("products"),
    warehouseId: v.id("warehouses"),
    quantity: v.number(),
    reservedQuantity: v.number(), // For pending deliveries
  }).index("by_product", ["productId"])
    .index("by_warehouse", ["warehouseId"])
    .index("by_product_warehouse", ["productId", "warehouseId"]),

  // Operations (receipts, deliveries, transfers, adjustments)
  operations: defineTable({
    type: v.union(v.literal("receipt"), v.literal("delivery"), v.literal("transfer"), v.literal("adjustment")),
    reference: v.string(), // Operation reference number
    status: v.union(v.literal("draft"), v.literal("waiting"), v.literal("ready"), v.literal("done"), v.literal("canceled")),
    warehouseId: v.id("warehouses"),
    destinationWarehouseId: v.optional(v.id("warehouses")), // For transfers
    supplierName: v.optional(v.string()), // For receipts
    customerName: v.optional(v.string()), // For deliveries
    notes: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
    completedDate: v.optional(v.number()),
    userId: v.id("users"),
  }).index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_warehouse", ["warehouseId"])
    .index("by_user", ["userId"]),

  // Operation lines (products in each operation)
  operationLines: defineTable({
    operationId: v.id("operations"),
    productId: v.id("products"),
    plannedQuantity: v.number(),
    actualQuantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
  }).index("by_operation", ["operationId"])
    .index("by_product", ["productId"]),

  // Stock movements (ledger of all stock changes)
  stockMovements: defineTable({
    productId: v.id("products"),
    warehouseId: v.id("warehouses"),
    operationId: v.optional(v.id("operations")),
    type: v.union(v.literal("in"), v.literal("out"), v.literal("adjustment")),
    quantity: v.number(), // Positive for in, negative for out
    previousQuantity: v.number(),
    newQuantity: v.number(),
    reference: v.string(),
    notes: v.optional(v.string()),
    userId: v.id("users"),
  }).index("by_product", ["productId"])
    .index("by_warehouse", ["warehouseId"])
    .index("by_operation", ["operationId"])
    .index("by_type", ["type"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
