// src/components/CategoryFilter.tsx
import { Button } from '@/components/ui/button';

interface CategoryFilterProps {
    categories: readonly string[];
    selected: string;
    onChange: (category: string) => void;
}

export default function CategoryFilter({
                                           categories,
                                           selected,
                                           onChange,
                                       }: CategoryFilterProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
                <Button
                    key={category}
                    variant={selected === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange(category)}
                >
                    {category}
                </Button>
            ))}
        </div>
    );
}