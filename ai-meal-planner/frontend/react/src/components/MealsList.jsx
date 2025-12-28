import { useState } from 'react';
import { ChefHat } from 'lucide-react';

export default function MealsList({ meals, selectedMeals, onMealToggle }) {
  const [expandedMeal, setExpandedMeal] = useState(null);

  if (!meals || meals.length === 0) return null;

  const selectedCount = selectedMeals.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-medium text-slate-700">Your Meals</span>
        <span className="text-xs text-slate-500">
          {selectedCount} / {meals.length} selected
        </span>
      </div>
      
      {meals.map((meal, idx) => {
        const isExpanded = expandedMeal === idx;
        const isSelected = selectedMeals.includes(idx);

        return (
          <div
            key={idx}
            className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
              isSelected 
                ? 'bg-white border-slate-200' 
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onMealToggle(idx)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedMeal(isExpanded ? null : idx)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center">
                          <ChefHat className="h-3 w-3 text-amber-600" />
                        </div>
                        <h4 className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                          {meal.title}
                        </h4>
                      </div>
                      {meal.description && (
                        <p className="text-sm text-slate-500 ml-8">{meal.description}</p>
                      )}
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                      Meal {idx + 1}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
                {meal.ingredients && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-700 mb-2">Ingredients:</p>
                    <ul className="text-xs text-slate-600 space-y-1.5">
                      {meal.ingredients.map((ing, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {meal.recipe && meal.recipe.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-700 mb-2">Recipe:</p>
                    <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                      {meal.recipe.map((step, i) => (
                        <li key={i} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
