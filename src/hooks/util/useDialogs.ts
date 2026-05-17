import { useState } from "react";

export function useDialogs<T>() {

    const [createDialogIsOpen, setCreateDialogIsOpen] = useState(false);
    const [editSheetIsOpen, setEditSheetIsOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<T | null>(null);

    const openEditSheet = (item: T) => {
        setSelectedItem(item);
        setEditSheetIsOpen(true);
    };
    const closeEditSheet = () => {
        setEditSheetIsOpen(false);
        setTimeout(() => {
            setSelectedItem(null);
        }, 300); // Delay to allow the sheet to close before resetting the selected audience
    };

    const openCreateDialog = () => setCreateDialogIsOpen(true);
    const closeCreateDialog = () => setCreateDialogIsOpen(false);

    return {
        dialogOpenState: [createDialogIsOpen, setCreateDialogIsOpen] as const,
        sheetOpenState: [editSheetIsOpen, setEditSheetIsOpen] as const,
        selectedItem,
        openEditSheet,
        closeEditSheet,
        openCreateDialog,
        closeCreateDialog
    }
    
}