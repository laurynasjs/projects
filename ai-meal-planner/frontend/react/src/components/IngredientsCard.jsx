import { ShoppingCart, Package } from 'lucide-react';

export default function IngredientsCard({ ingredients, onExportToExtension }) {
    if (!ingredients || ingredients.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Shopping List</h3>
                <span className="ml-auto text-xs text-slate-500">{ingredients.length} items</span>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {ingredients.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-sm text-slate-700">{item}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={onExportToExtension}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl transition-all font-medium"
            >
                <ShoppingCart className="h-4 w-4" />
                Send to Barbora Extension
            </button>
        </div>
    );
}
