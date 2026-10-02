import React from "react"

// Definimos as propriedades que o componente vai receber da SystemsPage
interface FilterContentProps {
    search: string;
    setSearch: (value: string) => void;
}

export function FilterContent({ search, setSearch }: FilterContentProps): React.JSX.Element {
    return (
        <div className="flex items-center p-2 rounded-lg bg-vtt-dark gap-3 border-b-2 border-vtt-dark-gray focus-within: transition-colors w-72 pb-2">
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar sistema..."
                className="w-full bg-transparent outline-none text-sm text-vtt-light placeholder:text-neutral-500"
            />
        </div>
    )
}