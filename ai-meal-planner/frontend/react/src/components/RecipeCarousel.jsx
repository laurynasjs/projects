import { Sparkles } from 'lucide-react';

const recipes = [
    { name: "Italian Night", prompt: "Italian pasta dishes for 4 people" },
    { name: "Healthy Week", prompt: "5 healthy balanced meals" },
    { name: "Quick & Easy", prompt: "Fast 30-minute dinners" },
    { name: "Comfort Food", prompt: "Cozy comfort food recipes" }
];

export default function RecipeCarousel({ onSelectRecipe }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <h3 className="font-semibold text-slate-900">Quick Ideas</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {recipes.map((recipe, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectRecipe(recipe.prompt)}
                        className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border border-violet-100 transition-all text-left"
                    >
                        <p className="text-sm font-medium text-slate-900">{recipe.name}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
