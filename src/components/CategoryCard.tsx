import React, { memo, useCallback } from "react";

export interface Category {
    id: string;
    name: string;
    description?: string;
    emoji?: string;
}

export interface CategoryCardProps {
    category: Category;
    onClick: (id: string) => void;
}

export const CategoryCard = memo(function CategoryCard({ category, onClick }: CategoryCardProps) {

    const handleClick = useCallback(() => {
        onClick(category.id);
    }, [category.id, onClick]);

    return (
        <button
            className="w-full text-left p-3 rounded-md border hover:bg-muted"
            onClick={handleClick}
        >
            <div className="flex items-center gap-2">
                <span className="text-xl">{category.emoji ?? "📁"}</span>
                <div className="min-w-0">
                    <p className="font-medium truncate">{category.name}</p>
                    {category.description && (
                        <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                    )}
                </div>
            </div>
        </button>
    );
});
