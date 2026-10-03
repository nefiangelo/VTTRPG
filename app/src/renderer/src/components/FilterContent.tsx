import React from "react"

interface FilterContentProps {
    search: string;
    setSearch: (value: string) => void;
}

export function FilterContent({ search, setSearch }: FilterContentProps): React.JSX.Element {
    return (
        <div className="flex items-center gap-3">

            {/* Barra de Busca - Agora nivelada com o botão (py-2.5, rounded-xl e border completa) */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-vtt-dark border border-vtt-dark-gray focus-within:border-vtt-red transition-colors w-72">
                <svg className="w-5 h-5 text-neutral-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Campos Genéricos (Filtros Futuros) */}
            <select className="px-4 py-2.5 rounded-xl bg-vtt-dark border border-vtt-dark-gray text-sm text-neutral-400 outline-none focus:border-vtt-red hover:border-neutral-500 transition-colors cursor-pointer">
                <option value="">Qualquer Gênero</option>
                <option value="fantasy">Fantasy</option>
                <option value="scifi">Sci-Fi</option>
                <option value="horror">Horror</option>
                <option value="western">Western</option>
            </select>

            <select className="px-4 py-2.5 rounded-xl bg-vtt-dark border border-vtt-dark-gray text-sm text-neutral-400 outline-none focus:border-vtt-red hover:border-neutral-500 transition-colors cursor-pointer">
                <option value="">Ordenar por</option>
                <option value="az">A-Z</option>
                <option value="za">Z-A</option>
                <option value="recent">Mais Recentes</option>
            </select>

        </div>
    )
}