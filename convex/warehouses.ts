import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all warehouses
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.query("warehouses")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Create a new warehouse
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if code already exists
    const existingWarehouse = await ctx.db
      .query("warehouses")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existingWarehouse) {
      throw new Error("Warehouse with this code already exists");
    }

    return await ctx.db.insert("warehouses", {
      name: args.name,
      code: args.code,
      address: args.address,
      isActive: true,
    });
  },
});
