import React, { useState } from 'react';
import GolfDetailsTimeblock from '~/components/ui/GolfDetailsTimeblock';
import type { UpdateCartDetails } from '~/definitions/database';
import { useCartDetailsSection } from '~/hooks/useCartDetailsSection';

/**
 * Cart Setup with Template + Grid Editor
 */
const CartSetup = () => {
  const {data: cartDetails, isLoading, updateCartDetails} = useCartDetailsSection()

  const [isEditingGrid, setIsEditingGrid] = useState(false);

  // Standard 12-hole shotgun template
  const STANDARD_TEMPLATE = [
    [7, 5, 9, 10, 3, 1],
    [7, 5, 9, 10, 3, 1],
    [7, 5, 9, 10, 3, 1],
    [7, 5, 9, 10, 3, 1],
    [8, 6, 12, 11, 4, 2],
    [8, 6, 12, 11, 4, 2],
    [8, 6, 12, 11, 4, 2],
    [8, 6, 12, 11, 4, 2],
    ["Lead", null, "Lead", null, "Lead", null] // Lead carts
  ];

  if (!isLoading && !cartDetails) return (<div className='w-full'>Oops... It looks like something went wrong!</div>)

  const getCurrentGrid = () => {
    if (cartDetails?.layout === "custom" && cartDetails.customGrid) {
      return cartDetails.customGrid;
    }
    
    // Always return full template
    return STANDARD_TEMPLATE;
  };
 
  const handleEdit = (updates: UpdateCartDetails) => {
    updateCartDetails({id: cartDetails!.id, updates});
  };

  const handleTimeChange = (time: string) => {
        updateCartDetails({id: cartDetails!.id, updates: {time}});

  }
 
 
  const handleCustomizeLayout = () => {
    // Switch to custom mode with current grid
    updateCartDetails({id: cartDetails!.id, updates: {
      layout: "custom",
      customGrid: getCurrentGrid()
    }});
    setIsEditingGrid(true);
  };
 
  const handleResetToTemplate = () => {
    updateCartDetails({id: cartDetails!.id, updates: {
      layout: "template-12-hole-shotgun",
      customGrid: null
    }});
    setIsEditingGrid(false);
  };
 
  const handleCellChange = (rowIndex: number, colIndex: number, value: number | string | null) => {
    const newGrid = cartDetails?.customGrid?.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell)
        : row
    );
    
    updateCartDetails({id: cartDetails!.id, updates: {
      customGrid: newGrid
    }});
  };
 
  const handleAddRow = () => {
    const newRow = [null, null, null, null, null, null];
    updateCartDetails({id: cartDetails!.id, updates: {
      customGrid: [...cartDetails!.customGrid!, newRow]
    }});
  };
 
  const handleRemoveRow = (rowIndex: number) => {
    updateCartDetails({id: cartDetails!.id, updates: {
      customGrid: cartDetails!.customGrid!.filter((_, idx) => idx !== rowIndex)
    }});
  };
 
  const currentGrid = getCurrentGrid();
  const cartsInGrid = currentGrid.reduce((sum, row) => 
    sum + row.filter(cell => cell !== null && cell !== "Lead").length, 0
  );
 
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-stone-900 mb-4">Cart Setup</h2>
      
      <GolfDetailsTimeblock
        time={cartDetails?.time ?? ""}
        onTimeChange={handleTimeChange}
        
      >
        <div className="space-y-4">
 
          {/* Assigned To */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Assigned To
            </label>
            <input
              type="text"
              value={cartDetails?.assignedTo ?? ""}
              onChange={(e) => handleEdit({ assignedTo: e.target.value })}
              placeholder="Who sets up carts..."
              className="w-full px-2 py-1 text-sm border border-stone-200 rounded bg-white"
            />
          </div>
 
          {/* Cart Layout Section */}
          <div className="border border-stone-200 rounded p-4 bg-stone-50">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-stone-700">
                Cart Staging Layout
              </label>
              <div className="flex gap-2">
                {cartDetails?.layout === "custom" ? (
                  <>
                    <button
                      onClick={handleResetToTemplate}
                      className="px-3 py-1 text-xs bg-white border border-stone-300 text-stone-700 rounded hover:bg-stone-100"
                    >
                      Reset to Template
                    </button>
                    <button
                      onClick={() => setIsEditingGrid(!isEditingGrid)}
                      className={`px-3 py-1 text-xs rounded ${
                        isEditingGrid
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {isEditingGrid ? "Done Editing" : "Edit Grid"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCustomizeLayout}
                    className="px-3 py-1 text-xs bg-white border border-stone-300 text-stone-700 rounded hover:bg-stone-100"
                  >
                    Customize Layout
                  </button>
                )}
              </div>
            </div>
 
            {/* Grid Display */}
            <CartGrid 
              grid={currentGrid}
              isEditing={isEditingGrid}
              onCellChange={handleCellChange}
              onAddRow={handleAddRow}
              onRemoveRow={handleRemoveRow}
            />
 
            {/* Grid Stats */}
            <div className="mt-3 pt-3 border-t border-stone-200 flex justify-between text-xs text-stone-600">
              <span>
                <span className="font-medium">Layout:</span>{" "}
                {cartDetails?.layout === "custom" ? "Custom" : "Standard 12-Hole Shotgun"}
              </span>
              <span>
                <span className="font-medium">Carts in grid:</span> {cartsInGrid}
              </span>
            </div>
          </div>
 
          {/* What Goes on Carts */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              What Goes on Each Cart
            </label>
            <textarea
              defaultValue={cartDetails?.whatGoesOnCarts ?? ""}
              onBlur={(e) => handleEdit({ whatGoesOnCarts: e.target.value })}
              placeholder="Coolers, scorecards, pencils, etc."
              rows={cartDetails?.whatGoesOnCarts?.split("\n").length ?? 2}
              className="w-full px-2 py-1 text-sm border border-stone-200 rounded bg-white resize-y"
            />
          </div>
 
          {/* Renting Carts */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rentingCarts"
              checked={cartDetails?.rentingCarts}
              onChange={(e) => handleEdit({ rentingCarts: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="rentingCarts" className="text-sm text-stone-700">
              Renting additional carts for this event
            </label>
          </div>
 
          {/* Permanent Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
            <p className="text-xs font-semibold text-yellow-800">
              ⚠️ DO NOT leave keys in carts or hand out keys before tournament start time
            </p>
          </div>
 
        </div>
      </GolfDetailsTimeblock>
    </div>
  );
};
 
/**
 * Cart Grid Component - Displays and allows editing of cart layout
 */
interface CartGridProps {
  grid: (number | string | null)[][];
  isEditing: boolean;
  onCellChange: (rowIndex: number, colIndex: number, value: number | string | null) => void;
  onAddRow: () => void;
  onRemoveRow: (rowIndex: number) => void;
}

const CartGrid: React.FC<CartGridProps> = ({ grid, isEditing, onCellChange, onAddRow, onRemoveRow }) => {
  return (
    <div className="space-y-2">
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-1">
          {/* Row cells */}
          <div className="flex gap-1 flex-1">
            {row.map((cell, colIndex) => (
              <CartCell
                key={colIndex}
                value={cell}
                isEditing={isEditing}
                onChange={(value) => onCellChange(rowIndex, colIndex, value)}
              />
            ))}
          </div>
          
          {/* Remove row button (only in edit mode) */}
          {isEditing && grid.length > 1 && (
            <button
              onClick={() => onRemoveRow(rowIndex)}
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      
      {/* Add row button */}
      {isEditing && (
        <button
          onClick={onAddRow}
          className="w-full px-3 py-2 text-xs border border-dashed border-stone-300 rounded text-stone-600 hover:border-stone-400 hover:text-stone-700"
        >
          + Add Row
        </button>
      )}
    </div>
  );
};
 
/**
 * Individual Cart Cell Component
 */
interface CartCellProps {
  value: number | string | null;
  isEditing: boolean;
  onChange: (value: number | string | null) => void;
}

const CartCell: React.FC<CartCellProps> = ({ value, isEditing, onChange }) => {
  const isLead = value === "Lead";
  const isEmpty = value === null;
  
  if (!isEditing) {
    // Display mode
    return (
      <div className={`
        flex-1 h-10 flex items-center justify-center text-sm font-medium rounded border
        ${isLead ? "bg-yellow-100 border-yellow-400 text-yellow-800" : ""}
        ${isEmpty ? "bg-stone-100 border-stone-200 text-stone-400" : ""}
        ${!isLead && !isEmpty ? "bg-blue-100 border-blue-300 text-blue-800" : ""}
      `}>
        {isLead ? "Lead" : (isEmpty ? "—" : value)}
      </div>
    );
  }
  
  // Edit mode
  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => {
        const newValue = e.target.value.trim();
        if (newValue === "") {
          onChange(null);
        } else if (newValue.toLowerCase() === "lead" || newValue.toLowerCase() === "l") {
          onChange("Lead");
        } else {
          const num = parseInt(newValue);
          if (!isNaN(num) && num >= 1 && num <= 12) {
            onChange(num);
          }
        }
      }}
      placeholder="—"
      className={`
        flex-1 h-10 w-10 text-center text-sm font-medium rounded border
        ${isLead ? "bg-yellow-100 border-yellow-400 text-yellow-800" : ""}
        ${isEmpty ? "bg-white border-stone-300 text-stone-600" : ""}
        ${!isLead && !isEmpty ? "bg-blue-100 border-blue-300 text-blue-800" : ""}
        focus:outline-none focus:ring-2 focus:ring-blue-500
      `}
    />
  );
};

export default CartSetup;