import { useState, useEffect } from 'react';
import { ShoppingCart, Package, Trash2, Plus, Edit2, Check, X, Search, AlertCircle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { checkPrices } from '../api/client';

export default function IngredientsCard({ ingredients, onExportToExtension }) {
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [selectedStores, setSelectedStores] = useState(['barbora', 'iki']);

    // Price check state
    const [isCheckingPrices, setIsCheckingPrices] = useState(false);
    const [priceData, setPriceData] = useState(null);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [selectedProductIndices, setSelectedProductIndices] = useState({}); // Track selected product index per ingredient per store
    const [selectedProducts, setSelectedProducts] = useState({}); // Cache actual selected product data: { "itemId-storeName": productData }

    useEffect(() => {
        setItems(ingredients.map((item, idx) => ({
            id: idx, // Add stable ID
            name: item,
            selected: true,
            quantity: 1
        })));
    }, [ingredients]);

    useEffect(() => {
        const handlePriceResults = (event) => {
            console.log("Received price results:", event.detail);
            setIsCheckingPrices(false);

            // Detect if multi-store format (results is object with store names as keys)
            const isMultiStore = event.detail.results && typeof event.detail.results === 'object' && !Array.isArray(event.detail.results);

            setPriceData({
                results: event.detail.results,
                multiStore: isMultiStore
            });
            setShowPriceModal(true);

            // Initialize selectedProducts cache with first product of each ingredient/store
            const initialSelections = {};
            if (event.detail?.results) {
                if (isMultiStore) {
                    Object.entries(event.detail.results).forEach(([storeName, results]) => {
                        results.forEach(result => {
                            if (result.products && result.products.length > 0) {
                                const itemId = items.find(item => item.name === result.originalName)?.id;
                                if (itemId !== undefined) {
                                    const carouselKey = `${itemId}-${storeName}`;
                                    initialSelections[carouselKey] = result.products[0];
                                }
                            }
                        });
                    });
                }
            }
            setSelectedProducts(initialSelections);
        };

        window.addEventListener('priceCheckResultsToWebApp', handlePriceResults);
        return () => window.removeEventListener('priceCheckResultsToWebApp', handlePriceResults);
    }, [items]);

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

    const getSelectedItems = () => {
        return items
            .filter(item => item.selected)
            .map(item => ({
                name: item.name,
                quantity: item.quantity
            }));
    };

    const handleCheckPrices = () => {
        const selectedItems = getSelectedItems();
        if (selectedItems.length === 0) {
            alert('Please select at least one item');
            return;
        }

        if (selectedStores.length === 0) {
            alert('Please select at least one store');
            return;
        }

        setIsCheckingPrices(true);
        setPriceData(null);
        checkPrices(selectedItems, selectedStores);
    };

    const handleExport = () => {
        const selectedItems = items
            .filter(item => item.selected)
            .map(item => {
                // Get the cached selected product for this item and target store
                const targetStore = selectedStores[0] || 'barbora';
                const carouselKey = `${item.id}-${targetStore}`;
                const cachedProduct = selectedProducts[carouselKey];

                return {
                    name: item.name,
                    quantity: item.quantity,
                    cachedProduct: cachedProduct // Include the exact product user selected from carousel
                };
            });

        if (selectedItems.length === 0) {
            alert('Please select at least one item');
            return;
        }

        const targetStore = selectedStores[0] || 'barbora';
        onExportToExtension(selectedItems, targetStore);
        setShowPriceModal(false);
    };

    // Calculate totals from price data
    const calculateTotals = () => {
        if (!priceData) return null;

        if (priceData.multiStore) {
            // Multi-store format: { barbora: [...], iki: [...] }
            const storeTotals = {};
            Object.entries(priceData.results).forEach(([storeName, results]) => {
                let total = 0;
                let found = 0;
                let missing = 0;

                results.forEach(result => {
                    if (result.products && result.products.length > 0) {
                        const product = result.products[0];
                        const item = items.find(i => i.name === result.originalName);
                        const quantity = item ? item.quantity : 1;
                        if (product.available) {
                            total += product.price * quantity;
                            found++;
                        } else {
                            missing++;
                        }
                    } else {
                        missing++;
                    }
                });

                storeTotals[storeName] = { total, found, missing };
            });
            return storeTotals;
        } else {
            // Single store format
            let total = 0;
            let found = 0;
            let missing = 0;

            const results = Array.isArray(priceData.results) ? priceData.results : priceData;
            results.forEach(result => {
                if (result.products && result.products.length > 0) {
                    const product = result.products[0];
                    const item = items.find(i => i.name === result.originalName);
                    const quantity = item ? item.quantity : 1;
                    if (product.available) {
                        total += product.price * quantity;
                        found++;
                    } else {
                        missing++;
                    }
                } else {
                    missing++;
                }
            });

            return { single: { total, found, missing } };
        }
    };

    const totals = calculateTotals();

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative max-w-4xl mx-auto">
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
                                <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-200 rounded">
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

            <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600 mb-2">Compare Prices At:</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'barbora', label: '🛒 Barbora' },
                        { id: 'iki', label: '🏪 IKI' },
                        { id: 'rimi', label: '🏬 Rimi' },
                        { id: 'maxima', label: '🏢 Maxima' }
                    ].map(store => (
                        <label key={store.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedStores.includes(store.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedStores([...selectedStores, store.id]);
                                    } else {
                                        setSelectedStores(selectedStores.filter(s => s !== store.id));
                                    }
                                }}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-slate-700">{store.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleCheckPrices}
                    disabled={selectedCount === 0 || isCheckingPrices}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCheckingPrices ? (
                        <div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full" />
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                    {isCheckingPrices ? 'Checking...' : 'Check Prices'}
                </button>

                <button
                    onClick={handleExport}
                    disabled={selectedCount === 0 || isCheckingPrices}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ShoppingCart className="h-4 w-4" />
                    Send to Cart
                </button>
            </div>

            {/* Price Check Results Modal */}
            {showPriceModal && priceData && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 rounded-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-slate-900">Price Estimate</h3>
                        <button
                            onClick={() => setShowPriceModal(false)}
                            className="p-1 hover:bg-slate-100 rounded-full"
                        >
                            <X className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                        {priceData.multiStore && totals ? (
                            /* Multi-store comparison view */
                            <div className="space-y-4">
                                {/* Store comparison header */}
                                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Object.keys(totals).length}, 1fr)` }}>
                                    {Object.entries(totals).map(([storeName, storeTotal]) => (
                                        <div key={storeName} className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                                            <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">
                                                {storeName === 'barbora' && '🛒 Barbora'}
                                                {storeName === 'iki' && '🏪 IKI'}
                                                {storeName === 'rimi' && '🏬 Rimi'}
                                                {storeName === 'maxima' && '🏢 Maxima'}
                                            </p>
                                            <p className="text-2xl font-bold text-emerald-700 mb-1">€{storeTotal.total.toFixed(2)}</p>
                                            <p className="text-xs text-slate-600">{storeTotal.found} / {selectedCount} items</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Item comparison */}
                                <div className="space-y-3">
                                    {items.filter(item => item.selected).map((item) => {
                                        const storeResults = {};
                                        Object.entries(priceData.results).forEach(([storeName, results]) => {
                                            const result = results.find(r => r.originalName === item.name);
                                            storeResults[storeName] = result;
                                        });

                                        return (
                                            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3">
                                                <div className="flex justify-between items-start mb-3">
                                                    <p className="font-medium text-sm text-slate-900">{item.name}</p>
                                                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">x{item.quantity}</span>
                                                </div>
                                                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Object.keys(totals).length}, 1fr)` }}>
                                                    {Object.entries(storeResults).map(([storeName, result]) => {
                                                        const products = result?.products || [];
                                                        const hasProducts = products.length > 0;
                                                        const carouselKey = `${item.id}-${storeName}`;
                                                        const currentIndex = selectedProductIndices[carouselKey] || 0;
                                                        const currentProduct = products[currentIndex];

                                                        const handlePrevProduct = () => {
                                                            const newIndex = currentIndex > 0 ? currentIndex - 1 : products.length - 1;
                                                            setSelectedProductIndices(prev => ({
                                                                ...prev,
                                                                [carouselKey]: newIndex
                                                            }));
                                                            // Cache the selected product
                                                            setSelectedProducts(prev => ({
                                                                ...prev,
                                                                [carouselKey]: products[newIndex]
                                                            }));
                                                        };

                                                        const handleNextProduct = () => {
                                                            const newIndex = currentIndex < products.length - 1 ? currentIndex + 1 : 0;
                                                            setSelectedProductIndices(prev => ({
                                                                ...prev,
                                                                [carouselKey]: newIndex
                                                            }));
                                                            // Cache the selected product
                                                            setSelectedProducts(prev => ({
                                                                ...prev,
                                                                [carouselKey]: products[newIndex]
                                                            }));
                                                        };

                                                        return (
                                                            <div key={storeName} className={`p-1.5 rounded-lg border ${hasProducts ? 'border-slate-200 bg-slate-50' : 'border-red-100 bg-red-50'}`}>
                                                                {hasProducts ? (
                                                                    <div className="relative">
                                                                        {/* Product carousel */}
                                                                        <div className="p-1.5 rounded-lg bg-white border border-emerald-200">
                                                                            <div className="flex gap-1.5">
                                                                                {currentProduct.imageUrl ? (
                                                                                    <img
                                                                                        src={currentProduct.imageUrl}
                                                                                        alt={currentProduct.name}
                                                                                        className="w-12 h-12 object-contain rounded bg-white flex-shrink-0"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                                                        <Package className="h-5 w-5 text-slate-400" />
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                                                    {(currentProduct.matchScore || currentProduct.hasDiscount) && (
                                                                                        <div className="flex items-center gap-1 flex-wrap">
                                                                                            {currentProduct.matchScore && (
                                                                                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                                                                                                    {currentProduct.matchScore.toFixed(0)}% match
                                                                                                </span>
                                                                                            )}
                                                                                            {currentProduct.hasDiscount && (
                                                                                                <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">
                                                                                                    🏷️ DISCOUNT
                                                                                                </span>
                                                                                            )}
                                                                                            {currentProduct.matchReason && (
                                                                                                <span className="text-[9px] text-slate-400" title={currentProduct.matchReason}>
                                                                                                    {currentProduct.matchReason}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                    <p className="text-[10px] text-slate-600 line-clamp-2 leading-tight" title={currentProduct.name}>{currentProduct.name}</p>
                                                                                    <div className="flex items-baseline gap-0.5">
                                                                                        <span className="font-bold text-emerald-600 text-xs">€{currentProduct.price.toFixed(2)}</span>
                                                                                        <span className="text-[8px] text-slate-400">€{currentProduct.unitPrice}/{currentProduct.unit}</span>
                                                                                    </div>
                                                                                    {!currentProduct.available && (
                                                                                        <p className="text-[10px] text-red-500 font-medium">Out of stock</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Carousel controls */}
                                                                        {products.length > 1 && (
                                                                            <div className="flex items-center justify-between mt-1">
                                                                                <button
                                                                                    onClick={handlePrevProduct}
                                                                                    className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                                                                                    title="Previous product"
                                                                                >
                                                                                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                                                                                </button>
                                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                                    {currentIndex + 1} of {products.length}
                                                                                </span>
                                                                                <button
                                                                                    onClick={handleNextProduct}
                                                                                    className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                                                                                    title="Next product"
                                                                                >
                                                                                    <ChevronRight className="h-4 w-4 text-slate-600" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center h-32 text-red-600">
                                                                        <AlertCircle className="h-6 w-6 mb-1" />
                                                                        <p className="text-xs">Not found</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            /* Single store view */
                            <div className="space-y-3">
                                {/* Summary */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                        <p className="text-xs text-emerald-600 font-medium mb-1">Estimated Total</p>
                                        <p className="text-xl font-bold text-emerald-700">€{totals?.single?.total.toFixed(2) || '0.00'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium mb-1">Found Items</p>
                                        <p className="text-xl font-bold text-slate-700">
                                            {totals?.single?.found || 0} <span className="text-sm font-normal text-slate-400">/ {selectedCount}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* List */}
                                {(Array.isArray(priceData.results) ? priceData.results : priceData).map((item, idx) => {
                                    const foundProduct = item.products && item.products.length > 0 ? item.products[0] : null;
                                    const originalItem = items.find(i => i.name === item.originalName);
                                    const qty = originalItem ? originalItem.quantity : 1;

                                    return (
                                        <div key={idx} className={`p-3 rounded-xl border ${foundProduct ? 'border-slate-200 bg-white' : 'border-red-100 bg-red-50'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-medium text-sm text-slate-900">{item.originalName}</p>
                                                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">x{qty}</span>
                                            </div>

                                            {foundProduct ? (
                                                <div className="flex gap-3">
                                                    {foundProduct.imageUrl ? (
                                                        <img src={foundProduct.imageUrl} alt={foundProduct.name} className="h-12 w-12 object-contain rounded bg-white border border-slate-100" />
                                                    ) : (
                                                        <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center">
                                                            <Package className="h-5 w-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-slate-600 truncate mb-1" title={foundProduct.name}>{foundProduct.name}</p>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="font-bold text-emerald-600">€{foundProduct.price.toFixed(2)}</span>
                                                            <span className="text-[10px] text-slate-400">€{foundProduct.unitPrice}/{foundProduct.unit}</span>
                                                        </div>
                                                        {!foundProduct.available && (
                                                            <p className="text-[10px] text-red-500 font-medium mt-1">Out of stock</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-600 text-xs">
                                                    <AlertCircle className="h-3 w-3" />
                                                    <span>Not found or unavailable</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={handleExport}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-md transition-all font-medium"
                            >
                                <ShoppingCart className="h-4 w-4" />
                                Add Available Items to Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
