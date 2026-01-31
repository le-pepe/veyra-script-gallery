
export interface Script {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    category: Category;
    tags: string[];
    icon: string;
    fileUrl: string;
    match: string;
    grant?: string[];
    installs?: number;
    rating?: number;
    createdAt?: string;
}

export type Category =
    | 'Utilities'      // Utilidades generales
    | 'Farm Stamina'   // Scripts para farmear stamina
    | 'Farm Wave'      // Scripts para farmear oleadas/waves
    | 'Loot'          // Scripts relacionados con botín/recompensas
    | 'Extra'         // Funcionalidades extra/mejoras de UI
    | 'Others';       // Otros