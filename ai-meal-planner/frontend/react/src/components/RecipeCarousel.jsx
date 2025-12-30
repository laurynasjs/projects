import { useState } from 'react';
import { ChevronUp, ChevronDown, Sparkles, Users, Clock } from 'lucide-react';

const sampleRecipes = [
    {
        id: 1,
        theme: "Mexican Fiesta",
        emoji: "🌮",
        description: "Authentic Mexican party menu with tacos, guacamole, and margaritas",
        dishes: ["Beef Tacos", "Guacamole", "Elote", "Churros"],
        guests: "6-8",
        prepTime: "2 hours",
        color: "from-orange-400 to-red-500"
    },
    {
        id: 2,
        theme: "Italian Night",
        emoji: "🍝",
        description: "Classic Italian cuisine with pasta, antipasti, and tiramisu",
        dishes: ["Bruschetta", "Carbonara", "Caprese Salad", "Tiramisu"],
        guests: "8-10",
        prepTime: "2.5 hours",
        color: "from-green-400 to-emerald-500"
    },
    {
        id: 3,
        theme: "Sushi Party",
        emoji: "🍣",
        description: "Fresh sushi rolls and Japanese appetizers",
        dishes: ["California Rolls", "Edamame", "Miso Soup", "Mochi"],
        guests: "4-6",
        prepTime: "1.5 hours",
        color: "from-pink-400 to-rose-500"
    },
    {
        id: 4,
        theme: "BBQ Feast",
        emoji: "🍖",
        description: "American BBQ with ribs, wings, and sides",
        dishes: ["BBQ Ribs", "Buffalo Wings", "Coleslaw", "Cornbread"],
        guests: "10-12",
        prepTime: "3 hours",
        color: "from-amber-400 to-orange-600"
    },
    {
        id: 5,
        theme: "Mediterranean",
        emoji: "🥙",
        description: "Healthy Mediterranean mezze and grilled dishes",
        dishes: ["Hummus", "Falafel", "Greek Salad", "Baklava"],
        guests: "6-8",
        prepTime: "2 hours",
        color: "from-cyan-400 to-blue-500"
    },
    {
        id: 6,
        theme: "Brunch Party",
        emoji: "🥐",
        description: "Elegant brunch spread with pastries and cocktails",
        dishes: ["Croissants", "Eggs Benedict", "Fruit Platter", "Mimosas"],
        guests: "8-10",
        prepTime: "1.5 hours",
        color: "from-yellow-400 to-amber-500"
    },
    {
        id: 7,
        theme: "Naujų Metų Proga",
        emoji: "🎉",
        description: "Iškilmingas Naujųjų Metų stalas su šampanu ir užkandžiais",
        dishes: ["Lašiša", "Sūrių lenta", "Salotos", "Tortas"],
        guests: "8-10",
        prepTime: "3 valandos",
        color: "from-purple-400 to-pink-500"
    },
    {
        id: 8,
        theme: "Kūčių Patiekalai",
        emoji: "🎄",
        description: "Tradiciniai Kūčių vakarienės patiekalai be mėsos",
        dishes: ["Silkė", "Grybų sriuba", "Žuvis", "Kisielius"],
        guests: "6-8",
        prepTime: "4 valandos",
        color: "from-green-400 to-teal-500"
    },
    {
        id: 9,
        theme: "Kalėdų Patiekalai",
        emoji: "🎅",
        description: "Šventiniai Kalėdų pietūs su tradiciniais patiekalais",
        dishes: ["Antiena", "Bulvės", "Kopūstai", "Pyragas"],
        guests: "8-12",
        prepTime: "4 valandos",
        color: "from-red-400 to-rose-500"
    },
    {
        id: 10,
        theme: "Užkandžiai Darželiui",
        emoji: "🥕",
        description: "Sveiki ir skanūs užkandžiai vaikams visai savaitei",
        dishes: ["Vaisiai", "Daržovės", "Jogurtas", "Sumuštiniai"],
        guests: "1 vaikas",
        prepTime: "30 minučių",
        color: "from-lime-400 to-green-500"
    }
];

export default function RecipeCarousel({ onSelectRecipe }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? sampleRecipes.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === sampleRecipes.length - 1 ? 0 : prev + 1));
    };

    const handleSelectRecipe = (recipe) => {
        const prompt = `Noriu suplanuoti ${recipe.theme} ${recipe.guests} svečiams. Įtraukti ${recipe.dishes.join(', ')}.`;
        onSelectRecipe(prompt);
    };

    const getVisibleRecipes = () => {
        const visible = [];
        for (let i = -1; i <= 1; i++) {
            const index = (currentIndex + i + sampleRecipes.length) % sampleRecipes.length;
            visible.push({ ...sampleRecipes[index], offset: i });
        }
        return visible;
    };

    return (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-violet-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">Meniu Idėjos</h3>
                </div>
                <span className="text-xs text-slate-400">{currentIndex + 1} / {sampleRecipes.length}</span>
            </div>

            {/* Vertical Carousel */}
            <div className="relative h-[420px] flex flex-col items-center justify-center mb-4 overflow-hidden">
                <button
                    onClick={handlePrevious}
                    className="absolute top-0 left-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md hover:bg-slate-50 flex items-center justify-center transition-all"
                    aria-label="Previous menu"
                >
                    <ChevronUp className="h-4 w-4" />
                </button>

                <div className="relative w-full h-full flex items-center justify-center">
                    {getVisibleRecipes().map((recipe) => {
                        const isCenter = recipe.offset === 0;
                        const scale = isCenter ? 1 : 0.85;
                        const opacity = isCenter ? 1 : 0.4;
                        const yOffset = recipe.offset * 140;
                        const zIndex = isCenter ? 10 : 5 - Math.abs(recipe.offset);

                        return (
                            <div
                                key={recipe.id}
                                className={`absolute transition-all duration-300 ease-out ${!isCenter && 'pointer-events-none'}`}
                                style={{
                                    transform: `translateY(${yOffset}px) scale(${scale})`,
                                    opacity,
                                    zIndex
                                }}
                            >
                                <div className={`w-72 rounded-2xl overflow-hidden shadow-lg border-2 ${isCenter ? 'border-white' : 'border-slate-100'}`}>
                                    <div className={`h-24 bg-gradient-to-br ${recipe.color} flex items-center justify-center`}>
                                        <span className="text-6xl">{recipe.emoji}</span>
                                    </div>
                                    <div className="bg-white p-4">
                                        <h4 className="font-bold text-slate-900 mb-2">{recipe.theme}</h4>
                                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                                            {recipe.description}
                                        </p>

                                        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                <span>{recipe.guests}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{recipe.prepTime}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {recipe.dishes.slice(0, 3).map((dish, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                                                >
                                                    {dish}
                                                </span>
                                            ))}
                                            {recipe.dishes.length > 3 && (
                                                <span className="text-xs text-slate-400 px-1">
                                                    +{recipe.dishes.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={handleNext}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md hover:bg-slate-50 flex items-center justify-center transition-all"
                    aria-label="Next menu"
                >
                    <ChevronDown className="h-4 w-4" />
                </button>
            </div>

            <button
                onClick={() => handleSelectRecipe(sampleRecipes[currentIndex])}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl transition-all font-medium"
            >
                Tinka, važiuojam!
            </button>
        </div>
    );
}
