// ============================================
// CONFIGURATION — API Keys & Destination Data
// ============================================

const CONFIG = {
    // API key is loaded from secrets.js (gitignored)
    // If empty, the app will show an error
    GOOGLE_API_KEY: '',

    // Supported destinations with coordinates and metadata
    DESTINATIONS: {
        'goa': {
            name: 'Goa',
            lat: 15.2993,
            lng: 74.124,
            state: 'Goa',
            tagline: 'Beaches, nightlife, and Portuguese charm',
            tags: ['beach', 'nightlife', 'food', 'adventure', 'relaxation'],
            bestMonths: [11, 12, 1, 2, 3],
            avgDailyBudget: { budget: 2500, standard: 5000, premium: 10000 }
        },
        'kochi': {
            name: 'Kochi',
            lat: 9.9312,
            lng: 76.2673,
            state: 'Kerala',
            tagline: 'Backwaters, spices, and coastal culture',
            tags: ['culture', 'nature', 'food', 'history', 'relaxation'],
            bestMonths: [10, 11, 12, 1, 2],
            avgDailyBudget: { budget: 2000, standard: 4500, premium: 9000 }
        },
        'munnar': {
            name: 'Munnar',
            lat: 10.0889,
            lng: 77.0595,
            state: 'Kerala',
            tagline: 'Tea gardens, misty hills, and cool weather',
            tags: ['nature', 'relaxation', 'adventure', 'culture'],
            bestMonths: [9, 10, 11, 12, 1, 2, 3],
            avgDailyBudget: { budget: 1800, standard: 4000, premium: 8000 }
        },
        'alleppey': {
            name: 'Alleppey',
            lat: 9.4981,
            lng: 76.3388,
            state: 'Kerala',
            tagline: 'Houseboats, backwaters, and village life',
            tags: ['nature', 'relaxation', 'culture', 'food'],
            bestMonths: [9, 10, 11, 12, 1, 2, 3],
            avgDailyBudget: { budget: 2200, standard: 5000, premium: 12000 }
        },
        'bangalore': {
            name: 'Bangalore',
            lat: 12.9716,
            lng: 77.5946,
            state: 'Karnataka',
            tagline: 'Garden city with pubs, parks, and tech vibes',
            tags: ['food', 'nightlife', 'shopping', 'culture'],
            bestMonths: [10, 11, 12, 1, 2, 3],
            avgDailyBudget: { budget: 2000, standard: 4500, premium: 9000 }
        },
        'mysore': {
            name: 'Mysore',
            lat: 12.2958,
            lng: 76.6394,
            state: 'Karnataka',
            tagline: 'Royal palaces, silk, and sandalwood',
            tags: ['culture', 'history', 'food', 'shopping'],
            bestMonths: [10, 11, 12, 1, 2],
            avgDailyBudget: { budget: 1500, standard: 3500, premium: 7000 }
        },
        'hampi': {
            name: 'Hampi',
            lat: 15.335,
            lng: 76.46,
            state: 'Karnataka',
            tagline: 'Ancient ruins and boulder-strewn landscapes',
            tags: ['history', 'culture', 'adventure', 'budget'],
            bestMonths: [10, 11, 12, 1, 2],
            avgDailyBudget: { budget: 1200, standard: 2500, premium: 5000 }
        },
        'pondicherry': {
            name: 'Pondicherry',
            lat: 11.9416,
            lng: 79.8083,
            state: 'Puducherry',
            tagline: 'French Quarter, cafés, and serene beaches',
            tags: ['culture', 'food', 'beach', 'relaxation', 'history'],
            bestMonths: [10, 11, 12, 1, 2, 3],
            avgDailyBudget: { budget: 2000, standard: 4000, premium: 8000 }
        },
        'coorg': {
            name: 'Coorg',
            lat: 12.4244,
            lng: 75.7382,
            state: 'Karnataka',
            tagline: 'Coffee estates and misty Western Ghats',
            tags: ['nature', 'relaxation', 'adventure', 'food'],
            bestMonths: [10, 11, 12, 1, 2, 3],
            avgDailyBudget: { budget: 1800, standard: 4000, premium: 8000 }
        }
    },

    // Budget estimation ratios (% of total budget)
    // Intentionally totals ~88% to leave a healthy buffer
    BUDGET_SPLIT: {
        accommodation: 0.28,
        transport: 0.18,
        food: 0.22,
        activities: 0.12,
        misc: 0.08
    },

    // Default itinerary time slots
    DAY_TEMPLATE: [
        { time: '08:00', label: 'Morning', type: 'activity' },
        { time: '10:30', label: 'Mid-morning', type: 'activity' },
        { time: '13:00', label: 'Lunch', type: 'food' },
        { time: '15:00', label: 'Afternoon', type: 'activity' },
        { time: '17:30', label: 'Evening', type: 'activity' },
        { time: '20:00', label: 'Dinner', type: 'food' }
    ]
};
