const prompts = [
    "3 sveikos vakarienės 2 žmonėms",
    "Greiti pietų receptai šiai savaitei",
    "Vegetariški patiekalai 4 dienoms",
    "Ekonomiškos šeimos vakarienės",
    "Naujų metų proga",
    "Kūčių patiekalai",
    "Kalėdų patiekalai",
    "Sveiki užkandžiai į darželį savaitei"
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
