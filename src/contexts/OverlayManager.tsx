import { useState, createContext, useContext, type ReactNode } from "react";

// Define the type for the dialog keys (string keys for each overlay)
type DialogKeys = string;

// The context value type
interface DialogManagerContextType {
  openDialogs: Record<DialogKeys, boolean>;
  openDialog: (key: DialogKeys) => void;
  closeDialog: (key: DialogKeys) => void;
  setDialogOpen: (key: DialogKeys, open: boolean) => void;
};

// Create the context
const DialogManagerContext = createContext<DialogManagerContextType | undefined>(undefined);

// Hook to use the context
export const useDialogManager = () => {
  const ctx = useContext(DialogManagerContext);
  if (!ctx) throw new Error("useDialogManager must be used within a DialogManager");
  return ctx;
}

// The DialogManager component
type DialogManagerProps = {
  children: ReactNode;
};

export function DialogManager({ children }: DialogManagerProps) {
  // Track open state for each dialog by key
  const [openDialogs, setOpenDialogs] = useState<Record<DialogKeys, boolean>>({});

  // Open a dialog by key
  const openDialog = (key: DialogKeys) =>
    setOpenDialogs((prev) => ({ ...prev, [key]: true }));

  // Close a dialog by key
  const closeDialog = (key: DialogKeys) =>
    setOpenDialogs((prev) => ({ ...prev, [key]: false }));

  // Set open state for a dialog by key
  const setDialogOpen = (key: DialogKeys, open: boolean) =>
    setOpenDialogs((prev) => ({ ...prev, [key]: open }));

  // Provide the context value
  const contextValue: DialogManagerContextType = {
    openDialogs,
    openDialog,
    closeDialog,
    setDialogOpen,
  };

  return (
    <DialogManagerContext.Provider value={contextValue}>
      {children}
    </DialogManagerContext.Provider>
  );
}