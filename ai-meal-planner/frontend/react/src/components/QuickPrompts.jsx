const prompts = [
    "3 healthy dinners for 2 people",
    "Quick lunch ideas for this week",
    "Vegetarian meals for 4 days",
    "Budget-friendly family dinners"
];

export default function QuickPrompts({ onSelect }) {
    return (
        <div className="flex flex-wrap gap-2 justify-center">
            {prompts.map((prompt, idx) => (
                <button
                    key={idx}
                    onClick={() => onSelect(prompt)}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 rounded-full transition-colors"
                >
                    {prompt}
                </button>
            ))}
        </div>
    );
}
