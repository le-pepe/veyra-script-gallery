import type {Script} from '@/types/script';

export const scripts: Script[] = [
    {
        id: 'dungeon-loot-button',
        name: 'Dungeon Loot Button',
        description: 'Add a loot button to the fight monster button when the monster is dead and is possible to loot',
        author: 'LePepe',
        version: '1.3',
        category: 'Utilities',
        tags: ['loot', 'dungeon', 'veyra'],
        icon: '📜',
        fileUrl: '/scripts/dungeon-loot-button.user.js',
        match: 'https://demonicscans.org/guild_dungeon_location.php*',
        installs: 1234,
        rating: 4.5,
        createdAt: '2026-01-15'
    },
    {
        id: 'verya-auto-pvp',
        name: 'Verya Auto PvP',
        description: 'Auto PvP matchmaking system for Verya. Automatically finds and engages in PvP battles.',
        author: 'Qito',
        version: '3.3.1',
        category: 'Utilities',
        tags: ['pvp', 'auto', 'matchmaking', 'battle', 'veyra'],
        icon: '⚔️',
        fileUrl: '/scripts/veyra-auto-pvp.user.js',
        match: 'https://demonicscans.org/pvp.php',
        grant: ['GM.xmlHttpRequest'],
        installs: 8543,
        rating: 4.7,
        createdAt: '2026-01-28'
    },
    {
        id: 'demonic-scans-auto-navigator',
        name: 'Demonic Scans Auto Navigator Pro',
        description: 'Automates chapter navigation and reactions while reading manga. Tracks stamina and farm limits, skips already-reacted chapters, and includes a clean HUD with pause/stop controls.',
        author: 'LePepe',
        version: '1.8',
        category: 'Farm Stamina',
        tags: ['manga', 'reader', 'auto', 'navigation', 'reactions', 'stamina'],
        icon: '📖',
        fileUrl: '/scripts/demonic-scans-auto-navigator.user.js',
        match: 'https://demonicscans.org/title/*/chapter/*',
        grant: [],
        installs: 3245,
        rating: 4.7,
        createdAt: '2026-01-29'
    }
];

export const categories = [
    'All',
    'Utilities',
    'Farm Stamina',
    'Farm Wave',
    'Loot',
    'Extra',
    'Others'
] as const;