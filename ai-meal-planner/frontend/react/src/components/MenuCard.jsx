import { useState } from 'react';
import { ChefHat, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MenuCard({ menu }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!menu || menu.length === 0) return null;

    const currentMeal = menu[currentIndex];
    const hasMultiple = menu.length > 1;

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? menu.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === menu.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <ChefHat className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">Menu</h3>
                </div>
                {hasMultiple && (
                    <span className="text-xs text-slate-500">
                        {currentIndex + 1} / {menu.length}
                    </span>
                )}
            </div>

            {/* Carousel Content */}
            <div className="relative">
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 min-h-[200px]">
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-900 text-lg">{currentMeal.title}</h4>
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                            Day {currentIndex + 1}
                        </span>
                    </div>

                    {currentMeal.description && (
                        <p className="text-sm text-slate-600 mb-3">{currentMeal.description}</p>
                    )}

                    {currentMeal.ingredients && (
                        <div className="mt-3">
                            <p className="text-xs font-medium text-slate-700 mb-2">Ingredients:</p>
                            <ul className="text-xs text-slate-600 space-y-1">
                                {currentMeal.ingredients.map((ing, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                        <span className="text-amber-500">•</span>
                                        <span>{ing}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                {hasMultiple && (
                    <>
                        <button
                            onClick={goToPrevious}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 h-8 w-8 rounded-full bg-white border border-slate-200 shadow-md hover:bg-slate-50 flex items-center justify-center transition-all"
                            aria-label="Previous meal"
                        >
                            <ChevronLeft className="h-4 w-4 text-slate-600" />
                        </button>
                        <button
                            onClick={goToNext}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 h-8 w-8 rounded-full bg-white border border-slate-200 shadow-md hover:bg-slate-50 flex items-center justify-center transition-all"
                            aria-label="Next meal"
                        >
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                        </button>
                    </>
                )}
            </div>

            {/* Dots Indicator */}
            {hasMultiple && (
                <div className="flex items-center justify-center gap-1.5 mt-4">
                    {menu.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all ${idx === currentIndex
                                    ? 'w-6 bg-amber-500'
                                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                                }`}
                            aria-label={`Go to meal ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
