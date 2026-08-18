// ============================================
// MAIN APP — Routing, Trip Building, Rendering
// ============================================

const app = (() => {
    // --- State ---
    let currentView = 'landing-view';
    let selectedBudget = 40000;
    let selectedPrefs = [];
    let currentTrip = null;
    let hotels = [];
    let attractions = [];
    let restaurants = [];

    // --- View Routing ---

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active');
            currentView = viewId;
            window.scrollTo(0, 0);
        }
        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.view === viewId);
        });
    }

    function navTo(btn) {
        const viewId = btn.dataset.view;
        if (viewId) showView(viewId);
    }

    // --- Form Helpers ---

    function selectBudget(btn) {
        document.querySelectorAll('#budget-options .chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.value;
        const customInput = document.getElementById('input-budget-custom');
        if (val === 'custom') {
            customInput.classList.remove('hidden');
            customInput.focus();
            selectedBudget = parseInt(customInput.value) || 25000;
            customInput.oninput = () => { selectedBudget = parseInt(customInput.value) || 0; };
        } else {
            customInput.classList.add('hidden');
            selectedBudget = parseInt(val);
        }
    }

    function togglePref(btn) {
        btn.classList.toggle('active');
        const pref = btn.dataset.pref;
        if (selectedPrefs.includes(pref)) {
            selectedPrefs = selectedPrefs.filter(p => p !== pref);
        } else {
            selectedPrefs.push(pref);
        }
    }

    // --- Quick Prompt ---

    function usePrompt(el) {
        const dest = el.dataset.dest;
        const days = parseInt(el.dataset.days);
        const budget = parseInt(el.dataset.budget);

        document.getElementById('input-destination').value = CONFIG.DESTINATIONS[dest]?.name || dest;
        selectedBudget = budget;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);

        document.getElementById('input-start-date').value = formatDateInput(startDate);
        document.getElementById('input-end-date').value = formatDateInput(endDate);

        document.querySelectorAll('#budget-options .chip').forEach(c => {
            c.classList.toggle('active', c.dataset.value === String(budget));
        });

        showView('planning-view');
    }

    function formatDateInput(d) {
        return d.toISOString().split('T')[0];
    }

    // --- Build Trip ---

    async function buildTrip() {
        const destInput = document.getElementById('input-destination').value.trim().toLowerCase();
        const startDate = document.getElementById('input-start-date').value;
        const endDate = document.getElementById('input-end-date').value;
        const adults = parseInt(document.getElementById('input-adults').value) || 2;
        const children = parseInt(document.getElementById('input-children').value) || 0;
        const elderly = parseInt(document.getElementById('input-elderly').value) || 0;

        if (!destInput) {
            alert('Please enter a destination');
            return;
        }

        let destKey = Object.keys(CONFIG.DESTINATIONS).find(k =>
            k.includes(destInput) || CONFIG.DESTINATIONS[k].name.toLowerCase().includes(destInput)
        );

        let destData;
        if (destKey) {
            destData = CONFIG.DESTINATIONS[destKey];
        } else {
            try {
                const geo = await TravelAPI.geocodeAddress(destInput + ', India');
                destData = {
                    name: destInput.charAt(0).toUpperCase() + destInput.slice(1),
                    lat: geo.lat,
                    lng: geo.lng,
                    state: '',
                    tagline: '',
                    tags: [],
                    avgDailyBudget: { budget: 2000, standard: 4000, premium: 8000 }
                };
            } catch (e) {
                alert('Could not find that destination. Try: Goa, Kochi, Munnar, Mysore, Hampi, Pondicherry, Coorg, Alleppey, Bangalore');
                return;
            }
        }

        let numDays = 3;
        if (startDate && endDate) {
            const diff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
            numDays = Math.max(1, Math.round(diff) + 1);
        }

        const tripStart = startDate ? new Date(startDate) : new Date(Date.now() + 7 * 86400000);
        const tripEnd = endDate ? new Date(endDate) : new Date(tripStart.getTime() + (numDays - 1) * 86400000);

        currentTrip = {
            destination: destData,
            startDate: tripStart,
            endDate: tripEnd,
            numDays: numDays,
            adults: adults,
            children: children,
            elderly: elderly,
            totalPax: adults + children + elderly,
            budget: selectedBudget,
            preferences: selectedPrefs,
            itinerary: [],
            budgetBreakdown: {}
        };

        showView('loading-view');
        await runLoadingSequence();
    }

    // --- Loading Animation + Data Fetching ---

    async function runLoadingSequence() {
        const steps = document.querySelectorAll('#loading-steps li');
        const dest = currentTrip.destination;
        const loc = { lat: dest.lat, lng: dest.lng };

        await animateStep(steps[0], 600);

        currentTrip.budgetBreakdown = calculateBudget(currentTrip.budget, currentTrip.numDays);
        await animateStep(steps[1], 500);

        try {
            attractions = await TravelAPI.searchPlaces(
                'top attractions and things to do in ' + dest.name, loc
            );
        } catch (e) { attractions = []; }
        await animateStep(steps[2], 400);

        try {
            hotels = await TravelAPI.searchPlaces(
                'hotels in ' + dest.name, loc, 'lodging'
            );
        } catch (e) { hotels = []; }
        await animateStep(steps[3], 400);

        let weather = null;
        try {
            weather = await TravelAPI.getWeather(dest.lat, dest.lng);
        } catch (e) { }
        currentTrip.weather = weather;
        await animateStep(steps[4], 300);

        try {
            restaurants = await TravelAPI.searchPlaces(
                'best restaurants in ' + dest.name, loc, 'restaurant'
            );
        } catch (e) { restaurants = []; }

        currentTrip.itinerary = buildItinerary(currentTrip, attractions, restaurants);
        await animateStep(steps[5], 500);

        await delay(400);
        renderDashboard();
        showView('dashboard-view');

        steps.forEach(s => { s.classList.remove('done', 'active'); });
    }

    function animateStep(stepEl, delayMs) {
        return new Promise(resolve => {
            stepEl.classList.add('active');
            setTimeout(() => {
                stepEl.classList.remove('active');
                stepEl.classList.add('done');
                resolve();
            }, delayMs);
        });
    }

    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    // --- Budget Calculation ---

    function calculateBudget(total, days) {
        const split = CONFIG.BUDGET_SPLIT;
        return {
            accommodation: Math.round(total * split.accommodation),
            transport: Math.round(total * split.transport),
            food: Math.round(total * split.food),
            activities: Math.round(total * split.activities),
            misc: Math.round(total * split.misc)
        };
    }

    // --- Itinerary Builder ---

    function buildItinerary(trip, attractions, restaurants) {
        const days = [];
        let attractionIdx = 0;
        let restaurantIdx = 0;

        for (let d = 0; d < trip.numDays; d++) {
            const dayDate = new Date(trip.startDate);
            dayDate.setDate(dayDate.getDate() + d);
            const items = [];

            if (d === 0) {
                items.push({
                    time: '08:00',
                    title: 'Arrival in ' + trip.destination.name,
                    type: 'transport',
                    location: trip.destination.name + ' Airport / Station',
                    cost: 0,
                    duration: '1 hr',
                    source: 'Trip plan',
                    photo: null
                });
                items.push({
                    time: '09:30',
                    title: 'Hotel check-in',
                    type: 'accommodation',
                    location: hotels.length > 0 ? hotels[0].name : 'Your hotel',
                    cost: Math.round(trip.budgetBreakdown.accommodation / trip.numDays),
                    duration: '30 min',
                    source: hotels.length > 0 ? 'Google Places' : 'Estimated',
                    photo: hotels.length > 0 ? hotels[0].photo : null
                });
            }

            // Morning activity
            if (attractionIdx < attractions.length) {
                const a = attractions[attractionIdx++];
                items.push({
                    time: d === 0 ? '11:00' : '09:00',
                    title: a.name,
                    type: 'activity',
                    location: a.address,
                    cost: estimateActivityCost(a),
                    duration: '2 hrs',
                    rating: a.rating,
                    source: a.source + ' — ' + a.fetchedAt,
                    photo: a.photo
                });
            }

            // Lunch
            if (restaurantIdx < restaurants.length) {
                const r = restaurants[restaurantIdx++];
                items.push({
                    time: '13:00',
                    title: r.name,
                    type: 'food',
                    location: r.address,
                    cost: estimateMealCost(r, trip.totalPax),
                    duration: '1 hr',
                    rating: r.rating,
                    source: r.source + ' — ' + r.fetchedAt,
                    photo: r.photo
                });
            }

            // Afternoon activity
            if (attractionIdx < attractions.length) {
                const a = attractions[attractionIdx++];
                items.push({
                    time: '15:00',
                    title: a.name,
                    type: 'activity',
                    location: a.address,
                    cost: estimateActivityCost(a),
                    duration: '2 hrs',
                    rating: a.rating,
                    source: a.source + ' — ' + a.fetchedAt,
                    photo: a.photo
                });
            }

            // Evening activity
            if (attractionIdx < attractions.length) {
                const a = attractions[attractionIdx++];
                items.push({
                    time: '17:30',
                    title: a.name,
                    type: 'activity',
                    location: a.address,
                    cost: estimateActivityCost(a),
                    duration: '1.5 hrs',
                    rating: a.rating,
                    source: a.source + ' — ' + a.fetchedAt,
                    photo: a.photo
                });
            }

            // Dinner
            if (restaurantIdx < restaurants.length) {
                const r = restaurants[restaurantIdx++];
                items.push({
                    time: '20:00',
                    title: r.name,
                    type: 'food',
                    location: r.address,
                    cost: estimateMealCost(r, trip.totalPax),
                    duration: '1.5 hrs',
                    rating: r.rating,
                    source: r.source + ' — ' + r.fetchedAt,
                    photo: r.photo
                });
            }

            days.push({ date: dayDate, dayLabel: 'Day ' + (d + 1), items: items });
        }

        return days;
    }

    function estimateActivityCost(place) {
        if (place.priceLevel === 0) return 0;
        if (place.priceLevel === 1) return 200;
        if (place.priceLevel === 2) return 500;
        if (place.priceLevel === 3) return 1000;
        if (place.priceLevel === 4) return 2000;
        return 300;
    }

    function estimateMealCost(restaurant, pax) {
        const perPerson = restaurant.priceLevel === 1 ? 250 :
            restaurant.priceLevel === 2 ? 500 :
            restaurant.priceLevel === 3 ? 800 :
            restaurant.priceLevel === 4 ? 1500 : 400;
        return perPerson * pax;
    }

    // --- Dashboard Rendering ---

    function renderDashboard() {
        if (!currentTrip) return;
        const trip = currentTrip;

        document.getElementById('trip-title').textContent =
            trip.destination.name + ' — ' + trip.numDays + ' Day' + (trip.numDays > 1 ? 's' : '');

        const dateOpts = { day: 'numeric', month: 'short' };
        document.getElementById('trip-dates').textContent =
            trip.startDate.toLocaleDateString('en-IN', dateOpts) + ' – ' + trip.endDate.toLocaleDateString('en-IN', dateOpts);

        let paxText = trip.adults + ' Adult' + (trip.adults > 1 ? 's' : '');
        if (trip.children > 0) paxText += ', ' + trip.children + ' Child' + (trip.children > 1 ? 'ren' : '');
        if (trip.elderly > 0) paxText += ', ' + trip.elderly + ' Elderly';
        document.getElementById('trip-pax').textContent = paxText;

        renderWeather(trip.weather);
        renderBudget(trip.budget, trip.budgetBreakdown);
        renderItineraryTabs(trip.itinerary);
        if (trip.itinerary.length > 0) renderItineraryDay(0);
        renderHotels(hotels);
    }

    // --- Weather ---

    function renderWeather(weather) {
        const widget = document.getElementById('weather-widget');
        if (!weather) { widget.classList.add('hidden'); return; }
        widget.classList.remove('hidden');
        document.getElementById('weather-icon').textContent = weather.current.icon;
        document.getElementById('weather-temp').textContent = weather.current.temp + ' C';
        document.getElementById('weather-desc').textContent = weather.current.desc;

        const forecastContainer = document.getElementById('weather-forecast');
        forecastContainer.innerHTML = weather.forecast.slice(0, 4).map(d =>
            '<div class="weather-day">' +
                '<div>' + d.dayName + '</div>' +
                '<div>' + d.icon + '</div>' +
                '<div class="temp">' + d.high + '</div>' +
            '</div>'
        ).join('');
    }

    // --- Budget ---

    function renderBudget(total, breakdown) {
        document.getElementById('budget-total').textContent = formatCurrency(total);
        const spent = Object.values(breakdown).reduce((s, v) => s + v, 0);
        document.getElementById('budget-spent').textContent = formatCurrency(spent);

        const remaining = total - spent;
        const statusEl = document.getElementById('budget-status');
        if (remaining > total * 0.1) {
            statusEl.innerHTML = 'Budget status: <span class="status-healthy">Healthy — ' + formatCurrency(remaining) + ' buffer</span>';
        } else if (remaining >= 0) {
            statusEl.innerHTML = 'Budget status: <span class="status-tight">Tight — ' + formatCurrency(remaining) + ' remaining</span>';
        } else {
            statusEl.innerHTML = 'Budget status: <span class="status-over">Over budget by ' + formatCurrency(Math.abs(remaining)) + '</span>';
        }

        const barContainer = document.getElementById('budget-bar-container');
        barContainer.innerHTML = Object.entries(breakdown).map(function(entry) {
            var key = entry[0], val = entry[1];
            var pct = (val / total * 100).toFixed(1);
            return '<div class="budget-fill ' + key + '" style="width: ' + pct + '%"></div>';
        }).join('');

        const legendNames = {
            accommodation: 'Stay', transport: 'Transport',
            food: 'Food', activities: 'Activities', misc: 'Misc'
        };
        const legendEl = document.getElementById('budget-legend');
        legendEl.innerHTML = Object.entries(breakdown).map(function(entry) {
            var key = entry[0], val = entry[1];
            return '<span><div class="dot ' + key + '"></div>' + legendNames[key] + ' (' + formatCurrency(val) + ')</span>';
        }).join('');
    }

    // --- Itinerary ---

    function renderItineraryTabs(itinerary) {
        const tabsEl = document.getElementById('itinerary-tabs');
        tabsEl.innerHTML = itinerary.map(function(day, i) {
            return '<button class="tab ' + (i === 0 ? 'active' : '') + '" onclick="app.switchDay(' + i + ')">' + day.dayLabel + '</button>';
        }).join('');
    }

    function switchDay(dayIndex) {
        document.querySelectorAll('.itinerary-tabs .tab').forEach(function(t, i) {
            t.classList.toggle('active', i === dayIndex);
        });
        renderItineraryDay(dayIndex);
    }

    function renderItineraryDay(dayIndex) {
        const day = currentTrip.itinerary[dayIndex];
        if (!day) return;

        const container = document.getElementById('itinerary-container');
        container.innerHTML = day.items.map(function(item, idx) {
            var photoHtml = item.photo
                ? '<img src="' + item.photo + '" class="timeline-photo" alt="' + item.title + '" onerror="this.style.display=\'none\'">'
                : '';
            var ratingTag = item.rating ? '<span class="timeline-tag">Rating: ' + item.rating + '</span>' : '';
            var costText = item.cost > 0 ? formatCurrency(item.cost) : 'Free';

            return '<div class="timeline-item" style="animation-delay: ' + (idx * 0.05) + 's">' +
                '<div class="timeline-time">' + item.time + '</div>' +
                photoHtml +
                '<div class="timeline-content">' +
                    '<div class="timeline-title">' + item.title + '</div>' +
                    '<div class="timeline-location">' + truncate(item.location, 55) + '</div>' +
                    '<div class="timeline-details">' +
                        '<span class="timeline-tag cost">' + costText + '</span>' +
                        '<span class="timeline-tag">' + item.duration + '</span>' +
                        ratingTag +
                    '</div>' +
                    '<div class="timeline-source"><span class="source-tag">' + item.source + '</span></div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    // --- Hotels ---

    function renderHotels(hotelData) {
        const container = document.getElementById('hotel-list-container');
        if (!hotelData || hotelData.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="es-icon">H</div><h3>No hotels found</h3><p class="mt-2">Try a different destination.</p></div>';
            return;
        }

        container.innerHTML = hotelData.map(function(hotel) {
            var priceEstimate = estimateHotelPrice(hotel);
            var photoHtml = hotel.photo
                ? '<img src="' + hotel.photo + '" class="hotel-photo" alt="' + hotel.name + '" onerror="this.classList.add(\'skeleton\',\'skeleton-photo\')">'
                : '<div class="hotel-photo skeleton skeleton-photo"></div>';
            var ratingHtml = hotel.rating
                ? '<div class="hotel-rating"><span class="star">★</span> ' + hotel.rating + '</div>' +
                  '<span class="hotel-reviews">(' + hotel.totalRatings + ' reviews)</span>'
                : '';

            return '<div class="hotel-card">' +
                photoHtml +
                '<div class="hotel-info">' +
                    '<div class="hotel-name">' + hotel.name + '</div>' +
                    '<div class="hotel-address">' + truncate(hotel.address, 65) + '</div>' +
                    '<div class="hotel-meta">' +
                        ratingHtml +
                        '<div class="hotel-price">' +
                            '<div class="amount">' + formatCurrency(priceEstimate) + '</div>' +
                            '<div class="per-night">per night (est.)</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="hotel-footer">' +
                        '<span class="source-tag">' + hotel.source + ' — ' + hotel.fetchedAt + '</span>' +
                        '<button class="btn btn-sm btn-primary" onclick="app.bookHotel(\'' + hotel.id + '\')">View</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function estimateHotelPrice(hotel) {
        if (hotel.priceLevel === 0) return 800;
        if (hotel.priceLevel === 1) return 1500;
        if (hotel.priceLevel === 2) return 3000;
        if (hotel.priceLevel === 3) return 5500;
        if (hotel.priceLevel === 4) return 10000;
        if (hotel.rating >= 4.5) return 4500;
        if (hotel.rating >= 4.0) return 3000;
        if (hotel.rating >= 3.5) return 2000;
        return 1500;
    }

    function filterHotels(filter, btn) {
        document.querySelectorAll('#hotel-filters .chip').forEach(function(c) { c.classList.remove('active'); });
        btn.classList.add('active');

        var filtered = hotels.slice();
        if (filter === 'budget') {
            filtered = hotels.filter(function(h) { return estimateHotelPrice(h) <= 2000; });
        } else if (filter === 'mid') {
            filtered = hotels.filter(function(h) { var p = estimateHotelPrice(h); return p > 2000 && p <= 5000; });
        } else if (filter === 'premium') {
            filtered = hotels.filter(function(h) { return estimateHotelPrice(h) > 5000; });
        }

        if (filtered.length === 0 && filter !== 'all') {
            document.getElementById('hotel-list-container').innerHTML =
                '<div class="empty-state"><div class="es-icon">H</div><h3>No ' + filter + ' hotels found</h3><p class="mt-2">Try a different filter.</p></div>';
        } else {
            renderHotels(filtered.length > 0 ? filtered : hotels);
        }
    }

    function bookHotel(placeId) {
        alert('Hotel booking flow coming in the next version. This will show room types, pricing, and a mock checkout process.');
    }

    // --- Explore Page ---

    function renderExplore() {
        const grid = document.getElementById('explore-grid');
        grid.innerHTML = Object.entries(CONFIG.DESTINATIONS).map(function(entry) {
            var key = entry[0], dest = entry[1];
            return '<div class="card" style="cursor: pointer;" onclick="app.exploreDest(\'' + key + '\')">' +
                '<h3>' + dest.name + '</h3>' +
                '<p style="font-size: 0.85rem; color: var(--clr-text-secondary); margin: 4px 0;">' + dest.tagline + '</p>' +
                '<div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">' +
                    dest.tags.slice(0, 3).map(function(t) { return '<span class="timeline-tag">' + t + '</span>'; }).join('') +
                '</div>' +
                '<div style="font-size: 0.75rem; color: var(--clr-text-tertiary); margin-top: 8px;">' +
                    dest.state + ' — From ' + formatCurrency(dest.avgDailyBudget.budget) + '/day' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function exploreDest(key) {
        var dest = CONFIG.DESTINATIONS[key];
        if (!dest) return;
        document.getElementById('input-destination').value = dest.name;
        selectedBudget = dest.avgDailyBudget.standard * 3;
        document.querySelectorAll('#budget-options .chip').forEach(function(c) { c.classList.remove('active'); });
        showView('planning-view');
    }

    // --- Utilities ---

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    function formatCurrency(amount) {
        return '\u20B9' + amount.toLocaleString('en-IN');
    }

    // --- Init ---

    function init() {
        var start = new Date();
        start.setDate(start.getDate() + 7);
        var end = new Date(start);
        end.setDate(end.getDate() + 2);
        document.getElementById('input-start-date').value = formatDateInput(start);
        document.getElementById('input-end-date').value = formatDateInput(end);
        renderExplore();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        showView: showView,
        navTo: navTo,
        selectBudget: selectBudget,
        togglePref: togglePref,
        usePrompt: usePrompt,
        buildTrip: buildTrip,
        switchDay: switchDay,
        filterHotels: filterHotels,
        bookHotel: bookHotel,
        exploreDest: exploreDest
    };
})();
