/* ==========================================================================
   WearWeather - App Logic & Recommendation Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let currentUnit = 'C'; // 'C' or 'F'
    let currentCity = 'New York';
    let apiKey = '';
    
    let userSchedule = {
        wakeTime: '07:00',
        leaveTime: '08:00',
        activity: 'moderate'
    };

    let weatherData = null; // Will store current weather response

    // --- DOM Elements ---
    const wakeTimeInput = document.getElementById('wake-time');
    const leaveTimeInput = document.getElementById('leave-time');
    const activityInput = document.getElementById('activity-level');
    const applyScheduleBtn = document.getElementById('apply-schedule-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    
    const citySearchInput = document.getElementById('city-search');
    const searchBtn = document.getElementById('search-btn');
    const geoBtn = document.getElementById('geo-btn');
    const presetPills = document.querySelectorAll('.quick-preset-pills .pill');
    const unitBtns = document.querySelectorAll('.unit-btn');

    // UI Target Elements
    const cityNameEl = document.getElementById('city-name');
    const currentDateEl = document.getElementById('current-date');
    const weatherBadgeEl = document.getElementById('weather-badge');
    const mainWeatherIcon = document.getElementById('main-weather-icon');
    const currentTempEl = document.getElementById('current-temp');
    const feelsLikeTempEl = document.getElementById('feels-like-temp');
    const tempHighEl = document.getElementById('temp-high');
    const tempLowEl = document.getElementById('temp-low');
    
    const humidityEl = document.getElementById('humidity-val');
    const windEl = document.getElementById('wind-val');
    const rainEl = document.getElementById('rain-val');
    const uvEl = document.getElementById('uv-val');

    const morningTimeDisplay = document.getElementById('morning-time-display');
    const morningTempDisplay = document.getElementById('morning-temp-display');
    const outfitHeadline = document.getElementById('outfit-headline');

    const layerHead = document.getElementById('layer-head');
    const layerTorso = document.getElementById('layer-torso');
    const layerLegs = document.getElementById('layer-legs');
    const layerFeet = document.getElementById('layer-feet');
    const essentialsList = document.getElementById('essentials-list');
    const hourlyContainer = document.getElementById('hourly-container');

    // --- Initial Setup ---
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    // Fetch initial weather
    fetchWeatherData(currentCity);

    // --- Event Listeners ---
    applyScheduleBtn.addEventListener('click', () => {
        userSchedule.wakeTime = wakeTimeInput.value;
        userSchedule.leaveTime = leaveTimeInput.value;
        userSchedule.activity = activityInput.value;
        apiKey = apiKeyInput.value.trim();

        if (weatherData) {
            updateUI(weatherData);
        }
    });

    searchBtn.addEventListener('click', () => {
        const query = citySearchInput.value.trim();
        if (query) {
            currentCity = query;
            fetchWeatherData(currentCity);
        }
    });

    citySearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    geoBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    fetchWeatherDataByCoords(lat, lon);
                },
                () => alert('Could not retrieve location. Using search query.')
            );
        }
    });

    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            presetPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCity = pill.dataset.city;
            citySearchInput.value = currentCity;
            fetchWeatherData(currentCity);
        });
    });

    unitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            unitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentUnit = btn.dataset.unit;
            if (weatherData) updateUI(weatherData);
        });
    });

    // --- Weather Data Fetcher ---
    async function fetchWeatherData(city) {
        if (apiKey) {
            try {
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`);
                if (!res.ok) throw new Error('City not found');
                const data = await res.json();
                weatherData = parseRealApiData(data);
                updateUI(weatherData);
                return;
            } catch (err) {
                console.warn('Real API failed or key invalid. Falling back to dynamic mock simulation.', err);
            }
        }

        // Fallback Dynamic Mock Generator
        weatherData = generateMockWeatherData(city);
        updateUI(weatherData);
    }

    async function fetchWeatherDataByCoords(lat, lon) {
        if (apiKey) {
            try {
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
                const data = await res.json();
                weatherData = parseRealApiData(data);
                updateUI(weatherData);
                return;
            } catch (err) {}
        }
        weatherData = generateMockWeatherData("Current Location");
        updateUI(weatherData);
    }

    function parseRealApiData(data) {
        return {
            city: data.name,
            temp: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            high: Math.round(data.main.temp_max),
            low: Math.round(data.main.temp_min),
            humidity: data.main.humidity,
            wind: Math.round(data.wind.speed * 3.6),
            condition: data.weather[0].main,
            description: data.weather[0].description,
            hourly: generateMockHourly(Math.round(data.main.temp), data.weather[0].main)
        };
    }

    // --- Dynamic Mock Generator (Realistic presets based on city names) ---
    function generateMockWeatherData(cityName) {
        let baseTemp = 20;
        let condition = 'Clear';

        const lower = cityName.toLowerCase();
        if (lower.includes('london') || lower.includes('rain')) {
            baseTemp = 14;
            condition = 'Rain';
        } else if (lower.includes('tokyo')) {
            baseTemp = 18;
            condition = 'Clouds';
        } else if (lower.includes('reykjavik') || lower.includes('ice') || lower.includes('snow')) {
            baseTemp = 2;
            condition = 'Snow';
        } else if (lower.includes('dubai') || lower.includes('hot')) {
            baseTemp = 36;
            condition = 'Clear';
        }

        return {
            city: cityName,
            temp: baseTemp,
            feelsLike: baseTemp + 1,
            high: baseTemp + 4,
            low: baseTemp - 5,
            humidity: condition === 'Rain' ? 85 : 50,
            wind: 12,
            condition: condition,
            description: condition === 'Clear' ? 'Sunny & Clear' : condition,
            hourly: generateMockHourly(baseTemp, condition)
        };
    }

    function generateMockHourly(baseTemp, baseCondition) {
        const hourly = [];
        for (let i = 0; i < 24; i++) {
            const timeStr = `${i < 10 ? '0' + i : i}:00`;
            // Temperature curve (colder in morning, warmer at 14:00)
            const tempVar = Math.sin((i - 8) / 12 * Math.PI) * 5;
            const hourTemp = Math.round(baseTemp + tempVar);
            
            hourly.push({
                time: timeStr,
                hour: i,
                temp: hourTemp,
                condition: (i > 18 || i < 6) ? 'Clear Night' : baseCondition
            });
        }
        return hourly;
    }

    // --- UI Update & Theme Dispatcher ---
    function updateUI(data) {
        cityNameEl.textContent = data.city;
        
        // Temperature Conversion helper
        const formatTemp = (c) => currentUnit === 'F' ? `${Math.round(c * 9/5 + 32)}°F` : `${c}°C`;

        currentTempEl.textContent = formatTemp(data.temp);
        feelsLikeTempEl.textContent = formatTemp(data.feelsLike);
        tempHighEl.textContent = formatTemp(data.high);
        tempLowEl.textContent = formatTemp(data.low);

        humidityEl.textContent = `${data.humidity}%`;
        windEl.textContent = `${data.wind} km/h`;
        rainEl.textContent = data.condition === 'Rain' ? '80%' : '10%';
        uvEl.textContent = data.temp > 25 ? '7 (High)' : '3 (Moderate)';

        weatherBadgeEl.textContent = data.description;

        // Apply Theme and Weather Icons
        applyTheme(data.condition, data.temp);

        // Find Morning/Commute Temp for Schedule Header
        const leaveHour = parseInt(userSchedule.leaveTime.split(':')[0], 10);
        const morningItem = data.hourly.find(h => h.hour === leaveHour) || data.hourly[8];
        
        morningTimeDisplay.textContent = userSchedule.leaveTime;
        morningTempDisplay.textContent = formatTemp(morningItem.temp);

        // Calculate Outfit Recommendations
        calculateOutfit(morningItem.temp, data.condition);

        // Render Hourly Slider
        renderHourlySlider(data.hourly);
    }

    function applyTheme(condition, temp) {
        document.body.className = ''; // Clear previous themes

        if (condition === 'Rain') {
            document.body.classList.add('theme-rainy');
            mainWeatherIcon.className = 'fa-solid fa-cloud-showers-heavy weather-icon';
        } else if (condition === 'Snow' || temp < 5) {
            document.body.classList.add('theme-snowy');
            mainWeatherIcon.className = 'fa-solid fa-snowflake weather-icon';
        } else if (temp < 16) {
            document.body.classList.add('theme-cold');
            mainWeatherIcon.className = 'fa-solid fa-cloud-sun weather-icon';
        } else {
            document.body.classList.add('theme-sunny');
            mainWeatherIcon.className = 'fa-solid fa-sun weather-icon';
        }
    }

    // --- Recommendation Logic Engine ---
    function calculateOutfit(tempC, condition) {
        let head = "Sunglasses / Baseball Cap";
        let torso = "Cotton T-Shirt";
        let legs = "Jeans / Chinos";
        let feet = "Sneakers";
        let essentials = ["Water Bottle", "Sunglasses"];
        let headline = "Mild & Comfortable Weather";

        // Temperature Layering Logic
        if (tempC < 5) {
            headline = "Freezing cold! Heavy insulated layers required.";
            head = "Warm Beanie / Wool Hat & Scarf";
            torso = "Thermal Underwear + Fleece + Heavy Winter Parka";
            legs = "Thermal Pants + Heavy Trousers";
            feet = "Insulated Winter Boots & Thick Socks";
            essentials.push("Lip Balm", "Hand Warmers");
        } else if (tempC >= 5 && tempC < 15) {
            headline = "Chilly conditions. Layering up is key!";
            head = "Light Beanie or Cap";
            torso = "Long-sleeve Shirt + Sweater / Denim or Leather Jacket";
            legs = "Heavy Denim Jeans / Chinos";
            feet = "Leather Shoes / Boots";
            essentials.push("Light Gloves");
        } else if (tempC >= 15 && tempC < 23) {
            headline = "Pleasant & mild. Light outerwear works best.";
            head = "Sunglasses / Cap";
            torso = "T-Shirt + Light Cardigan / Hoodie or Zip Jacket";
            legs = "Chinos / Regular Pants";
            feet = "Canvas Sneakers / Loafers";
        } else {
            headline = "Warm & sunny! Dress light and stay cool.";
            head = "Sun Hat / UV Sunglasses";
            torso = "Breathable Linen Shirt / Short-sleeve Tee";
            legs = "Shorts / Breathable Linen Pants";
            feet = "Breathable Mesh Sneakers / Sandals";
            essentials.push("Sunscreen SPF 50");
        }

        // Rain Adjustments
        if (condition === 'Rain') {
            torso += " + Waterproof Rain Coat";
            feet = "Waterproof Rain Boots / Treated Sneakers";
            essentials.push("Compact Umbrella ☔");
        }

        // Render to UI
        outfitHeadline.textContent = headline;
        layerHead.querySelector('.layer-text').textContent = head;
        layerTorso.querySelector('.layer-text').textContent = torso;
        layerLegs.querySelector('.layer-text').textContent = legs;
        layerFeet.querySelector('.layer-text').textContent = feet;

        // Essentials Pills
        essentialsList.innerHTML = essentials.map(item => `
            <span class="essential-pill"><i class="fa-solid fa-check"></i> ${item}</span>
        `).join('');
    }

    // --- Hourly Breakdown Component ---
    function renderHourlySlider(hourlyArr) {
        const wakeHour = parseInt(userSchedule.wakeTime.split(':')[0], 10);
        const leaveHour = parseInt(userSchedule.leaveTime.split(':')[0], 10);

        const formatTemp = (c) => currentUnit === 'F' ? `${Math.round(c * 9/5 + 32)}°` : `${c}°`;

        hourlyContainer.innerHTML = hourlyArr.map(item => {
            const isWake = item.hour === wakeHour;
            const isLeave = item.hour === leaveHour;

            let badgeHtml = '';
            let itemClass = 'hourly-item';

            if (isWake) {
                badgeHtml = '<span class="event-badge badge-wake">Wake Up</span>';
                itemClass += ' is-wake';
            } else if (isLeave) {
                badgeHtml = '<span class="event-badge badge-leave">Commute</span>';
                itemClass += ' is-leave';
            }

            const iconClass = item.condition === 'Rain' ? 'fa-cloud-showers-heavy' : (item.condition === 'Snow' ? 'fa-snowflake' : 'fa-sun');

            return `
                <div class="${itemClass}">
                    ${badgeHtml}
                    <span class="time-tag">${item.time}</span>
                    <i class="fa-solid ${iconClass} hourly-icon"></i>
                    <span class="hourly-temp">${formatTemp(item.temp)}</span>
                    <span class="hourly-outfit">${getQuickOutfitHint(item.temp)}</span>
                </div>
            `;
        }).join('');
    }

    function getQuickOutfitHint(temp) {
        if (temp < 5) return "Heavy Coat";
        if (temp < 15) return "Jacket";
        if (temp < 23) return "Light Hoodie";
        return "T-Shirt";
    }
});
