import { useState, useEffect } from 'react';
import { ShoppingCart, Package, Trash2, Plus, Edit2, Check, X } from 'lucide-react';

export default function IngredientsCard({ ingredients, onExportToExtension }) {
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        setItems(ingredients.map((item, idx) => ({
            id: idx, // Add stable ID
            name: item,
            selected: true,
            quantity: 1
        })));
    }, [ingredients]);

    if (!ingredients) return null; // Allow empty ingredients list for adding new ones

    const selectedCount = items.filter(item => item.selected).length;

    const toggleItem = (id) => {
        setItems(items.map((item) =>
            item.id === id ? { ...item, selected: !item.selected } : item
        ));
    };

    const updateQuantity = (id, quantity) => {
        const newQty = Math.max(1, parseInt(quantity) || 1);
        setItems(items.map((item) =>
            item.id === id ? { ...item, quantity: newQty } : item
        ));
    };

    const removeItem = (id) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const startEditing = (item) => {
        setEditingId(item.id);
        setEditName(item.name);
    };

    const saveEdit = () => {
        if (editName.trim()) {
            setItems(items.map(item =>
                item.id === editingId ? { ...item, name: editName.trim() } : item
            ));
        }
        setEditingId(null);
        setEditName('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const addNewItem = () => {
        if (newItemName.trim()) {
            const newItem = {
                id: Date.now(), // Generate unique ID
                name: newItemName.trim(),
                selected: true,
                quantity: 1
            };
            setItems([...items, newItem]);
            setNewItemName('');
            setIsAdding(false);
        }
    };

    const handleExport = () => {
        const selectedItems = items
            .filter(item => item.selected)
            .map(item => ({
                name: item.name,
                quantity: item.quantity
            }));

        if (selectedItems.length === 0) {
            alert('Please select at least one item');
            return;
        }

        onExportToExtension(selectedItems);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Shopping List</h3>
                <span className="ml-auto text-xs text-slate-500">
                    {selectedCount} / {items.length} selected
                </span>
            </div>

            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${item.selected
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                            }`}
                    >
                        <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItem(item.id)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />

                        {editingId === item.id ? (
                            <div className="flex-1 flex items-center gap-1">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                    }}
                                />
                                <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded">
                                    <Check className="h-4 w-4" />
                                </button>
                                <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center gap-2 group">
                                <span
                                    className={`text-sm ${item.selected ? 'text-slate-900' : 'text-slate-500 line-through'}`}
                                    onDoubleClick={() => startEditing(item)}
                                >
                                    {item.name}
                                </span>
                                <button
                                    onClick={() => startEditing(item)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-600 transition-opacity"
                                >
                                    <Edit2 className="h-3 w-3" />
                                </button>
                            </div>
                        )}

                        <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            className="w-12 px-2 py-1 text-xs text-center border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                            title="Remove item"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
                        </button>
                    </div>
                ))}

                {/* Add New Item Input */}
                {isAdding ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                        <div className="h-4 w-4" /> {/* Spacer for alignment */}
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Type ingredient name..."
                            className="flex-1 px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') addNewItem();
                                if (e.key === 'Escape') setIsAdding(false);
                            }}
                        />
                        <button
                            onClick={addNewItem}
                            className="p-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                        >
                            <Check className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setIsAdding(false)}
                            className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full py-2 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-600 hover:bg-slate-50 rounded-lg border border-dashed border-slate-200 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Ingredient
                    </button>
                )}
            </div>

            <button
                onClick={handleExport}
                disabled={selectedCount === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ShoppingCart className="h-4 w-4" />
                Send {selectedCount > 0 ? `${selectedCount} items` : ''} to Barbora
            </button>
        </div>
    );
}
