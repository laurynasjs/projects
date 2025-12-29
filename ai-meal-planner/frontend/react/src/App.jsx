import { useState } from 'react';
import { Sparkles, PartyPopper } from 'lucide-react';
import ChatInput from './components/ChatInput';
import QuickPrompts from './components/QuickPrompts';
import MealsList from './components/MealsList';
import IngredientsCard from './components/IngredientsCard';
import RecipeCarousel from './components/RecipeCarousel';
import TabNavigation from './components/TabNavigation';
import { generateMealPlan, sendToExtension } from './api/client';
import { deduplicateIngredients } from './utils/ingredientUtils';

export default function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [mealPlan, setMealPlan] = useState(null);
    const [error, setError] = useState(null);
    const [userMessage, setUserMessage] = useState('');
    const [activeTab, setActiveTab] = useState('ideas');
    const [selectedMeals, setSelectedMeals] = useState([]);

    const handleSendMessage = async (content) => {
        setIsLoading(true);
        setError(null);
        setUserMessage(content);

        try {
            const result = await generateMealPlan(content);
            setMealPlan(result.meal_plan);
            // Initialize all meals as selected
            setSelectedMeals(result.meal_plan.meals.map((_, idx) => idx));
            // Auto-switch to menu tab when meal plan is generated
            setActiveTab('menu');
        } catch (err) {
            setError(err.message);
            console.error('Error generating meal plan:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate shopping list based on selected meals
    const getFilteredShoppingList = () => {
        if (!mealPlan?.meals) return [];

        const selectedMealObjects = mealPlan.meals.filter((_, idx) =>
            selectedMeals.includes(idx)
        );

        // Collect all ingredients from selected meals (with duplicates)
        const allIngredients = [];
        selectedMealObjects.forEach(meal => {
            if (meal.ingredients) {
                allIngredients.push(...meal.ingredients);
            }
        });

        // Deduplicate and sum quantities
        return deduplicateIngredients(allIngredients);
    };

    const handleExportToExtension = (selectedItems) => {
        sendToExtension(selectedItems);
        alert(`✅ Sent ${selectedItems.length} items to Barbora extension!`);
    };

    const hasContent = mealPlan || userMessage;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-fuchsia-50/30">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <header className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-4">
                        <PartyPopper className="h-4 w-4 text-violet-500" />
                        <span className="text-sm font-medium text-slate-600">AI Patiekalų Planuotojas</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                        Suplanuokite Savo Tobulus Patiekalus
                    </h1>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Pasakykite, ką norėtumėte valgyti, ir aš sukursiu patiekalų planą su pirkinių sąrašu
                    </p>
                </header>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Panel */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Content Area */}
                            <div className="min-h-[500px] p-6">
                                {!hasContent ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4">
                                            <Sparkles className="h-8 w-8 text-white" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-slate-900 mb-2">
                                            Pasiruošę planuoti savo patiekalus?
                                        </h2>
                                        <p className="text-sm text-slate-500 mb-6 max-w-sm">
                                            Apibūdinkite, ką norėtumėte valgyti, mitybos pageidavimus ir žmonių skaičių. Aš pasirūpinsiu viskuo!
                                        </p>
                                        <QuickPrompts onSelect={handleSendMessage} />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* User Message */}
                                        {userMessage && (
                                            <div className="flex justify-end">
                                                <div className="max-w-[80%] bg-slate-900 text-white rounded-2xl px-4 py-3">
                                                    <p className="text-sm leading-relaxed">{userMessage}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Loading State */}
                                        {isLoading && (
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                                                    <span className="text-white text-xs font-medium">AI</span>
                                                </div>
                                                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="animate-spin h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full"></div>
                                                        <span className="text-sm text-slate-600">Kuriamas jūsų patiekalų planas...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Error State */}
                                        {error && (
                                            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                                                <p className="text-sm text-red-600">❌ {error}</p>
                                            </div>
                                        )}

                                        {/* Success State */}
                                        {mealPlan && !isLoading && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white text-xs font-medium">AI</span>
                                                </div>
                                                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex-1">
                                                    <p className="text-sm text-slate-700">
                                                        ✨ Sukūriau jums patiekalų planą! Peržiūrėkite meniu ir pirkinių sąrašą dešinėje.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-slate-100 bg-white/80">
                                <ChatInput
                                    onSend={handleSendMessage}
                                    isLoading={isLoading}
                                    placeholder="Apibūdinkite savo pageidavimus... (pvz., 3 sveikos vakarienės 2 žmonėms)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar with Tabs */}
                    <div className="space-y-4">
                        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

                        {/* Tab Content */}
                        {activeTab === 'ideas' && (
                            <RecipeCarousel onSelectRecipe={handleSendMessage} />
                        )}

                        {activeTab === 'menu' && (
                            mealPlan?.meals ? (
                                <MealsList
                                    meals={mealPlan.meals}
                                    selectedMeals={selectedMeals}
                                    onMealToggle={(idx) => {
                                        setSelectedMeals(prev =>
                                            prev.includes(idx)
                                                ? prev.filter(i => i !== idx)
                                                : [...prev, idx]
                                        );
                                    }}
                                />
                            ) : (
                                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200 p-8 text-center">
                                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                        <Sparkles className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Sukurkite patiekalų planą, kad čia matytumėte savo meniu
                                    </p>
                                </div>
                            )
                        )}

                        {activeTab === 'shop' && (
                            getFilteredShoppingList().length > 0 ? (
                                <IngredientsCard
                                    ingredients={getFilteredShoppingList()}
                                    onExportToExtension={handleExportToExtension}
                                />
                            ) : (
                                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200 p-8 text-center">
                                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                        <Sparkles className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Jūsų pirkinių sąrašas pasirodys čia sukūrus patiekalų planą
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Extension Info */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400">
                        💡 Įdiekite mūsų Chrome plėtinį, kad automatiškai pridėtumėte produktus į Barbora.lt krepšelį
                    </p>
                </div>
            </div>
        </div>
    );
}
