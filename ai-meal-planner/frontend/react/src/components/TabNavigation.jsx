import { Lightbulb, ChefHat, ShoppingCart } from 'lucide-react';

export default function TabNavigation({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'ideas', label: 'Ideas', icon: Lightbulb },
        { id: 'menu', label: 'Menu', icon: ChefHat },
        { id: 'shop', label: 'Shop', icon: ShoppingCart }
    ];

    return (
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all ${isActive
                                ? 'bg-white text-slate-900 shadow-sm font-medium'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-violet-600' : ''}`} />
                        <span className="text-sm">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
