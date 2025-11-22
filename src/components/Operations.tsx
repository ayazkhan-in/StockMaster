import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface OperationsProps {
  type: "receipts" | "deliveries" | "transfers" | "adjustments";
}

export function Operations({ type }: OperationsProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  const operationType = type === "receipts" ? "receipt" : 
                       type === "deliveries" ? "delivery" :
                       type === "transfers" ? "transfer" : "adjustment";

  const operations = useQuery(api.operations.list, {
    type: operationType,
    status: selectedStatus as any || undefined,
    warehouseId: selectedWarehouse as any || undefined,
  });
  
  const warehouses = useQuery(api.warehouses.list);

  const getTitle = () => {
    switch (type) {
      case "receipts": return "Receipts";
      case "deliveries": return "Deliveries";
      case "transfers": return "Internal Transfers";
      case "adjustments": return "Stock Adjustments";
      default: return "Operations";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "receipts": return "Manage incoming stock from suppliers";
      case "deliveries": return "Manage outgoing stock to customers";
      case "transfers": return "Move stock between warehouses";
      case "adjustments": return "Adjust stock levels for discrepancies";
      default: return "Manage operations";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "receipts": return "📥";
      case "deliveries": return "📤";
      case "transfers": return "🔄";
      case "adjustments": return "⚖️";
      default: return "📋";
    }
  };

  if (operations === undefined || warehouses === undefined) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-gray-200 h-64 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>{getIcon()}</span>
            {getTitle()}
          </h1>
          <p className="text-gray-600">{getDescription()}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create {operationType.charAt(0).toUpperCase() + operationType.slice(1)}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="waiting">Waiting</option>
              <option value="ready">Ready</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse._id} value={warehouse._id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Operations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                {type === "transfers" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                )}
                {type === "receipts" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                )}
                {type === "deliveries" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No {type} found. Create your first {operationType} to get started.
                  </td>
                </tr>
              ) : (
                operations.map((operation) => (
                  <OperationRow key={operation._id} operation={operation} type={type} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Operation Modal */}
      {showCreateForm && (
        <CreateOperationModal
          type={operationType}
          warehouses={warehouses}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}

function OperationRow({ operation, type }: any) {
  const processOperation = useMutation(api.operations.process);

  const handleProcess = async () => {
    try {
      await processOperation({ operationId: operation._id });
      toast.success("Operation processed successfully");
    } catch (error) {
      toast.error("Failed to process operation");
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{operation.reference}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {operation.warehouse}
      </td>
      {type === "transfers" && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {operation.destinationWarehouse || "-"}
        </td>
      )}
      {type === "receipts" && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {operation.supplierName || "-"}
        </td>
      )}
      {type === "deliveries" && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {operation.customerName || "-"}
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {operation.totalItems}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          operation.status === 'done' ? 'bg-green-100 text-green-800' :
          operation.status === 'ready' ? 'bg-blue-100 text-blue-800' :
          operation.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
          operation.status === 'canceled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {operation.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {new Date(operation._creationTime).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {operation.status === 'ready' && (
          <button
            onClick={handleProcess}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Process
          </button>
        )}
      </td>
    </tr>
  );
}

function CreateOperationModal({ type, warehouses, onClose }: any) {
  const [formData, setFormData] = useState({
    warehouseId: "",
    destinationWarehouseId: "",
    supplierName: "",
    customerName: "",
    notes: "",
    scheduledDate: "",
  });

  const createOperation = useMutation(api.operations.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createOperation({
        type,
        warehouseId: formData.warehouseId as any,
        destinationWarehouseId: formData.destinationWarehouseId as any || undefined,
        supplierName: formData.supplierName || undefined,
        customerName: formData.customerName || undefined,
        notes: formData.notes || undefined,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).getTime() : undefined,
      });
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`);
      onClose();
    } catch (error) {
      toast.error(`Failed to create ${type}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create {type.charAt(0).toUpperCase() + type.slice(1)}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse *
            </label>
            <select
              required
              value={formData.warehouseId}
              onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((warehouse: any) => (
                <option key={warehouse._id} value={warehouse._id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          {type === "transfer" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination Warehouse *
              </label>
              <select
                required
                value={formData.destinationWarehouseId}
                onChange={(e) => setFormData({ ...formData, destinationWarehouseId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Destination</option>
                {warehouses.filter((w: any) => w._id !== formData.warehouseId).map((warehouse: any) => (
                  <option key={warehouse._id} value={warehouse._id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === "receipt" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {type === "delivery" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Date
            </label>
            <input
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
