import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { Products } from "./components/Products";
import { Operations } from "./components/Operations";
import { Settings } from "./components/Settings";
import { useState } from "react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster />
      <Authenticated>
        <StockMasterApp />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md mx-auto p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-blue-600 mb-2">StockMaster</h1>
              <p className="text-gray-600">Inventory Management System</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}

function StockMasterApp() {
  const [currentView, setCurrentView] = useState("dashboard");
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">StockMaster</h1>
          <p className="text-sm text-gray-600">Inventory Management</p>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 space-y-2">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentView === "dashboard" 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              📊 Dashboard
            </button>
            
            <button
              onClick={() => setCurrentView("products")}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentView === "products" 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              📦 Products
            </button>
            
            <div className="pt-2">
              <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Operations</p>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setCurrentView("receipts")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    currentView === "receipts" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  📥 Receipts
                </button>
                
                <button
                  onClick={() => setCurrentView("deliveries")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    currentView === "deliveries" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  📤 Deliveries
                </button>
                
                <button
                  onClick={() => setCurrentView("transfers")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    currentView === "transfers" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  🔄 Transfers
                </button>
                
                <button
                  onClick={() => setCurrentView("adjustments")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    currentView === "adjustments" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  ⚖️ Adjustments
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setCurrentView("settings")}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentView === "settings" 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              ⚙️ Settings
            </button>
          </div>
        </nav>
        
        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{loggedInUser?.email}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {currentView === "dashboard" && <Dashboard />}
        {currentView === "products" && <Products />}
        {(currentView === "receipts" || currentView === "deliveries" || currentView === "transfers" || currentView === "adjustments") && (
          <Operations type={currentView as any} />
        )}
        {currentView === "settings" && <Settings />}
      </div>
    </div>
  );
}
