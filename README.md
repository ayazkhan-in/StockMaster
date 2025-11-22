# StockMaster — Inventory Management System

StockMaster is a real-time, full-stack inventory and warehouse management system powered by Convex. It streamlines stock operations such as product management, receipts, deliveries, internal transfers, and stock adjustments while maintaining full transparency through a unified stock ledger.

## Core Features

### Product and SKU Management

* Create and manage products with SKU, category, and metadata.
* Real-time updates whenever stock changes.
* Search, filter, and sort products efficiently.

### Stock Receipts

* Add incoming stock through structured receipt forms.
* Automatic stock increment.
* Optional attachments or notes.

### Delivery and Dispatch

* Record outgoing stock movements.
* Automatic stock deduction.
* Track sender, receiver, and time of dispatch.

### Internal Transfers

* Move stock between warehouses or locations.
* Real-time syncing across all connected users.
* Prevent inconsistencies with Convex’s transactional backend.

### Stock Adjustments

* Add or subtract stock for corrections or damages.
* Maintain complete auditability.
* All adjustments logged in the stock ledger.

### Unified Stock Ledger

* Every movement—receipt, delivery, transfer, adjustment—is logged.
* Transparent, append-only ledger view.
* Essential for audits, accountability, and compliance.

### Multi-Warehouse Support

* Maintain separate inventory for each warehouse.
* View aggregated or warehouse-specific stock.

### Real-Time Sync

* All users see updates instantly.
* Suitable for warehouse teams working in parallel.

### Authentication

* Secure app-level authentication using Convex Auth.
* Supports anonymous or customized authentication strategies.

## Benefits of Using Convex

Convex serves as the backend database and server layer, removing the need for separate APIs, servers, or SQL setups.

### Real-Time Data Sync

Convex automatically pushes updates to all connected clients, which is essential for maintaining correctness in inventory systems.

### Zero Backend Infrastructure

There are no servers, REST APIs, or ORMs to manage. Backend functions reside in the `convex` directory and can be called directly from the frontend.

### Transactional Consistency

Convex ensures safe, atomic stock operations without issues such as double-counting or race conditions.

### Optimized for Complex Workflows

Workflows such as receipts, deliveries, and transfers become straightforward backend functions with strong type-safety.

### Easy Deployment

The backend can be deployed with a single command:

```
npx convex deploy
```

Convex handles scaling, storage, hosting, and performance.

### Type Safety

Automatic TypeScript generation helps avoid inconsistencies between frontend and backend.

### Built-In Authentication and Storage

Authentication and file storage work seamlessly without requiring additional services.

## Project Structure

```
/app        → Frontend (Vite)
/convex     → Backend (Convex functions, schema, routes)
```

`npm run dev` runs both the frontend and Convex development server.

## HTTP API

Custom HTTP routes are defined in:

```
convex/router.ts
```

This keeps HTTP logic organized and separate from authentication routes.
