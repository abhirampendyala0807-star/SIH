// ============================================
// API LAYER — Google Maps + Open-Meteo Weather
// ============================================
// This module wraps all external API calls.
// The rest of the app NEVER calls APIs directly.
// To swap mock data for real APIs, only change this file.

const TravelAPI = (() => {
    let map = null;
    let placesService = null;
    let directionsService = null;
    let geocoder = null;
    let isReady = false;
    let readyCallbacks = [];

    // Called by Google Maps script callback
    function init() {
        const mapDiv = document.getElementById('map-hidden');
        map = new google.maps.Map(mapDiv, {
            center: { lat: 15.2993, lng: 74.124 },
            zoom: 10
        });
        placesService = new google.maps.places.PlacesService(map);
        directionsService = new google.maps.DirectionsService();
        geocoder = new google.maps.Geocoder();
        isReady = true;
        readyCallbacks.forEach(cb => cb());
        readyCallbacks = [];
    }

    function onReady(cb) {
        if (isReady) cb();
        else readyCallbacks.push(cb);
    }

    // ---- PLACES ----

    function searchPlaces(query, location, type) {
        return new Promise((resolve, reject) => {
            onReady(() => {
                const request = {
                    query: query,
                    location: new google.maps.LatLng(location.lat, location.lng),
                    radius: 15000
                };
                if (type) request.type = type;

                placesService.textSearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        const processed = results.map(p => ({
                            id: p.place_id,
                            name: p.name,
                            address: p.formatted_address,
                            rating: p.rating || null,
                            totalRatings: p.user_ratings_total || 0,
                            priceLevel: p.price_level || null,
                            lat: p.geometry.location.lat(),
                            lng: p.geometry.location.lng(),
                            photo: p.photos && p.photos.length > 0
                                ? p.photos[0].getUrl({ maxWidth: 400 })
                                : null,
                            types: p.types || [],
                            isOpen: p.opening_hours ? p.opening_hours.isOpen() : null,
                            source: 'Google Places',
                            fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        }));
                        resolve(processed);
                    } else {
                        console.warn('Places search failed:', status);
                        resolve([]);
                    }
                });
            });
        });
    }

    function getPlaceDetails(placeId) {
        return new Promise((resolve, reject) => {
            onReady(() => {
                placesService.getDetails({
                    placeId: placeId,
                    fields: ['name', 'formatted_address', 'rating', 'user_ratings_total',
                        'price_level', 'photos', 'reviews', 'opening_hours',
                        'formatted_phone_number', 'website', 'geometry', 'types']
                }, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve({
                            id: place.place_id,
                            name: place.name,
                            address: place.formatted_address,
                            rating: place.rating,
                            totalRatings: place.user_ratings_total,
                            priceLevel: place.price_level,
                            phone: place.formatted_phone_number,
                            website: place.website,
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                            photos: place.photos ? place.photos.map(p => p.getUrl({ maxWidth: 600 })) : [],
                            reviews: place.reviews ? place.reviews.slice(0, 3).map(r => ({
                                author: r.author_name,
                                rating: r.rating,
                                text: r.text,
                                time: r.relative_time_description
                            })) : [],
                            hours: place.opening_hours ? place.opening_hours.weekday_text : null,
                            isOpen: place.opening_hours ? place.opening_hours.isOpen() : null,
                            types: place.types,
                            source: 'Google Places',
                            fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        });
                    } else {
                        reject(new Error('Place details failed: ' + status));
                    }
                });
            });
        });
    }

    // ---- DIRECTIONS ----

    function getDirections(originLatLng, destLatLng, mode = 'DRIVING') {
        return new Promise((resolve, reject) => {
            onReady(() => {
                directionsService.route({
                    origin: new google.maps.LatLng(originLatLng.lat, originLatLng.lng),
                    destination: new google.maps.LatLng(destLatLng.lat, destLatLng.lng),
                    travelMode: google.maps.TravelMode[mode]
                }, (result, status) => {
                    if (status === 'OK') {
                        const leg = result.routes[0].legs[0];
                        resolve({
                            distance: leg.distance.text,
                            distanceValue: leg.distance.value,
                            duration: leg.duration.text,
                            durationValue: leg.duration.value,
                            source: 'Google Directions',
                            fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        });
                    } else {
                        console.warn('Directions failed:', status);
                        resolve({ distance: 'N/A', duration: 'N/A', source: 'unavailable' });
                    }
                });
            });
        });
    }

    // ---- GEOCODING ----

    function geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            onReady(() => {
                geocoder.geocode({ address: address }, (results, status) => {
                    if (status === 'OK' && results.length > 0) {
                        resolve({
                            lat: results[0].geometry.location.lat(),
                            lng: results[0].geometry.location.lng(),
                            formattedAddress: results[0].formatted_address
                        });
                    } else {
                        reject(new Error('Geocoding failed: ' + status));
                    }
                });
            });
        });
    }

    // ---- WEATHER (Open-Meteo — free, no key needed) ----

    async function getWeather(lat, lng) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&current_weather=true&timezone=Asia/Kolkata&forecast_days=7`;
            const response = await fetch(url);
            const data = await response.json();

            const weatherCodes = {
                0: { desc: 'Clear sky', icon: '☀️' },
                1: { desc: 'Mainly clear', icon: '🌤️' },
                2: { desc: 'Partly cloudy', icon: '⛅' },
                3: { desc: 'Overcast', icon: '☁️' },
                45: { desc: 'Foggy', icon: '🌫️' },
                48: { desc: 'Fog', icon: '🌫️' },
                51: { desc: 'Light drizzle', icon: '🌦️' },
                53: { desc: 'Drizzle', icon: '🌦️' },
                55: { desc: 'Heavy drizzle', icon: '🌧️' },
                61: { desc: 'Light rain', icon: '🌦️' },
                63: { desc: 'Rain', icon: '🌧️' },
                65: { desc: 'Heavy rain', icon: '🌧️' },
                71: { desc: 'Snow', icon: '❄️' },
                80: { desc: 'Rain showers', icon: '🌧️' },
                95: { desc: 'Thunderstorm', icon: '⛈️' }
            };

            const current = data.current_weather;
            const code = weatherCodes[current.weathercode] || { desc: 'Unknown', icon: '🌡️' };

            return {
                current: {
                    temp: Math.round(current.temperature),
                    desc: code.desc,
                    icon: code.icon,
                    windSpeed: current.windspeed
                },
                forecast: data.daily.time.map((date, i) => ({
                    date: date,
                    dayName: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
                    high: Math.round(data.daily.temperature_2m_max[i]),
                    low: Math.round(data.daily.temperature_2m_min[i]),
                    rainChance: data.daily.precipitation_probability_max[i],
                    code: data.daily.weathercode ? data.daily.weathercode[i] : 0,
                    icon: (weatherCodes[data.daily.weathercode ? data.daily.weathercode[i] : 0] || { icon: '🌡️' }).icon
                })),
                source: 'Open-Meteo',
                fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            };
        } catch (err) {
            console.error('Weather fetch failed:', err);
            return null;
        }
    }

    // ---- DISTANCE CALCULATOR (Haversine — offline fallback) ----

    function haversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ---- PUBLIC API ----

    return {
        init,
        onReady,
        searchPlaces,
        getPlaceDetails,
        getDirections,
        geocodeAddress,
        getWeather,
        haversineDistance,
        getMap: () => map
    };
})();

// Global callback for Google Maps script
function initMap() {
    TravelAPI.init();
}
