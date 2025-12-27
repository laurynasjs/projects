import { useState } from 'react';
import { Sparkles, PartyPopper } from 'lucide-react';
import ChatInput from './components/ChatInput';
import QuickPrompts from './components/QuickPrompts';
import MenuCard from './components/MenuCard';
import IngredientsCard from './components/IngredientsCard';
import RecipeCarousel from './components/RecipeCarousel';
import { generateMealPlan, sendToExtension } from './api/client';

export default function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [mealPlan, setMealPlan] = useState(null);
    const [error, setError] = useState(null);
    const [userMessage, setUserMessage] = useState('');

    const handleSendMessage = async (content) => {
        setIsLoading(true);
        setError(null);
        setUserMessage(content);

        try {
            const result = await generateMealPlan(content);
            setMealPlan(result.meal_plan);
        } catch (err) {
            setError(err.message);
            console.error('Error generating meal plan:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportToExtension = () => {
        if (!mealPlan?.shopping_list) {
            alert('No shopping list to export');
            return;
        }

        const items = mealPlan.shopping_list.map(item => ({
            name: item,
            quantity: 1
        }));

        sendToExtension(items);
        alert(`✅ Sent ${items.length} items to Barbora extension!`);
    };

    const hasContent = mealPlan || userMessage;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-fuchsia-50/30">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <header className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-4">
                        <PartyPopper className="h-4 w-4 text-violet-500" />
                        <span className="text-sm font-medium text-slate-600">AI Meal Planner</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                        Plan Your Perfect Meals
                    </h1>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Tell me what you'd like to eat and I'll create a meal plan with shopping list
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
                                            Ready to plan your meals?
                                        </h2>
                                        <p className="text-sm text-slate-500 mb-6 max-w-sm">
                                            Describe what you'd like to eat, dietary preferences, and number of people. I'll handle the rest!
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
                                                        <span className="text-sm text-slate-600">Generating your meal plan...</span>
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
                                                        ✨ I've created a meal plan for you! Check out the menu and shopping list on the right.
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
                                    placeholder="Describe your meal preferences... (e.g., 3 healthy dinners for 2 people)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-4">
                        {/* Recipe Carousel - Always visible */}
                        <RecipeCarousel onSelectRecipe={handleSendMessage} />

                        {/* Results Cards */}
                        {mealPlan?.meals && (
                            <MenuCard menu={mealPlan.meals} />
                        )}

                        {mealPlan?.shopping_list && (
                            <IngredientsCard
                                ingredients={mealPlan.shopping_list}
                                onExportToExtension={handleExportToExtension}
                            />
                        )}
                    </div>
                </div>

                {/* Extension Info */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400">
                        💡 Install our Chrome extension to automatically add products to your Barbora.lt cart
                    </p>
                </div>
            </div>
        </div>
    );
}
