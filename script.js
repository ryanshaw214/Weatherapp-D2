/* ==========================================================================
   WearWeather - App Logic, Alarm, Pet Safety & Precision Ag Radar Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let currentUnit = 'C';
    let currentCity = 'New York';
    let apiKey = '';
    let currentCoords = { lat: 40.7128, lon: -74.0060 }; // Default NY
    
    let userSchedule = {
        wakeTime: '07:00',
        leaveTime: '08:00',
        activity: 'moderate',
        alarmEnabled: true,
        carReminderEnabled: true,
        carTempThreshold: 5 // in °C
    };

    let weatherData = null;
    let alarmTriggered = false;
    let mapInstance = null;
    let radarLayer = null;

    // Audio Synthesizer
    let audioCtx = null;
    let alarmInterval = null;

    // --- Dynamic Background Canvas Variables ---
    const bgSun = document.getElementById('bg-sun-element');
    const canvas = document.getElementById('weather-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrameId = null;
    let activeWeatherMode = 'sunny'; // 'sunny', 'rainy', 'snowy', 'cloudy'

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- DOM Elements ---
    const modeBtns = document.querySelectorAll('.mode-btn');
    const modeViews = document.querySelectorAll('.mode-view');

    const wakeTimeInput = document.getElementById('wake-time');
    const leaveTimeInput = document.getElementById('leave-time');
    const toggleAlarmBtn = document.getElementById('toggle-alarm-btn');
    const alarmStatusText = document.getElementById('alarm-status-text');
    
    const carStartToggle = document.getElementById('car-start-toggle');
    const carTempThresholdInput = document.getElementById('car-temp-threshold');
    const thresholdUnitLabel = document.getElementById('threshold-unit-label');
    const carSettingsDetail = document.getElementById('car-settings-detail');
    const carStartBanner = document.getElementById('car-start-banner');
    const carBannerText = document.getElementById('car-banner-text');

    const activityInput = document.getElementById('activity-level');
    const applyScheduleBtn = document.getElementById('apply-schedule-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const cropSelect = document.getElementById('crop-select');
    
    const citySearchInput = document.getElementById('city-search');
    const searchBtn = document.getElementById('search-btn');
    const geoBtn = document.getElementById('geo-btn');
    const presetPills = document.querySelectorAll('.quick-preset-pills .pill');
    const unitBtns = document.querySelectorAll('.unit-btn');

    // UI Elements
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

    // Pet Safety DOM Elements
    const petHeadline = document.getElementById('pet-headline');
    const pawStatusBadge = document.getElementById('paw-status-badge');
    const asphaltTempVal = document.getElementById('asphalt-temp-val');
    const petRiskVal = document.getElementById('pet-risk-val');
    const petAdviceText = document.getElementById('pet-advice-text');
    const petGearList = document.getElementById('pet-gear-list');

    // Modal Elements
    const alarmModal = document.getElementById('alarm-modal');
    const alarmTimeDisplay = document.getElementById('alarm-time-display');
    const alarmWeatherHint = document.getElementById('alarm-weather-hint');
    const carStartModalAlert = document.getElementById('car-start-modal-alert');
    const dismissAlarmBtn = document.getElementById('dismiss-alarm-btn');

    // Initial Date Display
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });

    // Initialize Map, Weather & Alarm Checker
    initAgRadarMap();
    fetchWeatherData(currentCity);
    setInterval(checkAlarmClock, 1000);

    // --- Sidebar Mode Navigation Switcher ---
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetMode = btn.dataset.mode;

            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            modeViews.forEach(view => {
                if (view.id === `view-${targetMode}`) {
                    view.classList.remove('hidden');
                    view.classList.add('active');
                } else {
                    view.classList.add('hidden');
                    view.classList.remove('active');
                }
            });

            if (targetMode === 'farmer' && mapInstance) {
                setTimeout(() => {
                    mapInstance.invalidateSize();
                    mapInstance.setView([currentCoords.lat, currentCoords.lon], 8);
                }, 100);
            }
        });
    });

    // --- Event Listeners ---
    toggleAlarmBtn.addEventListener('click', () => {
        userSchedule.alarmEnabled = !userSchedule.alarmEnabled;
        updateAlarmStatusUI();
    });

    carStartToggle.addEventListener('change', (e) => {
        userSchedule.carReminderEnabled = e.target.checked;
        carSettingsDetail.style.opacity = e.target.checked ? '1' : '0.4';
        if (weatherData) updateUI(weatherData);
    });

    carTempThresholdInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        userSchedule.carTempThreshold = currentUnit === 'F' ? Math.round((val - 32) * 5/9) : val;
        if (weatherData) updateUI(weatherData);
    });

    applyScheduleBtn.addEventListener('click', () => {
        userSchedule.wakeTime = wakeTimeInput.value;
        userSchedule.leaveTime = leaveTimeInput.value;
        userSchedule.activity = activityInput.value;
        apiKey = apiKeyInput.value.trim();

        alarmTriggered = false;
        updateAlarmStatusUI();
        if (weatherData) updateUI(weatherData);
    });

    if (cropSelect) {
        cropSelect.addEventListener('change', () => {
            if (weatherData) updateUI(weatherData);
        });
    }

    searchBtn.addEventListener('click', () => {
        const query = citySearchInput.value.trim();
        if (query) { currentCity = query; fetchWeatherData(currentCity); }
    });

    citySearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    geoBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeatherDataByCoords(pos.coords.latitude, pos.coords.longitude),
                () => alert('Could not retrieve location.')
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

            if (currentUnit === 'F') {
                thresholdUnitLabel.textContent = '°F';
                carTempThresholdInput.value = Math.round(userSchedule.carTempThreshold * 9/5 + 32);
            } else {
                thresholdUnitLabel.textContent = '°C';
                carTempThresholdInput.value = userSchedule.carTempThreshold;
            }

            if (weatherData) updateUI(weatherData);
        });
    });

    dismissAlarmBtn.addEventListener('click', stopAlarm);

    // --- Map Radar Setup ---
    function initAgRadarMap() {
        if (mapInstance) return;
        mapInstance = L.map('ag-radar-map').setView([currentCoords.lat, currentCoords.lon], 7);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstance);

        radarLayer = L.tileLayer('https://tilecache.rainviewer.com/v2/radar/nowcast_30/256/{z}/{x}/{y}/2/1_1.png', {
            opacity: 0.6,
            attribution: '&copy; RainViewer'
        }).addTo(mapInstance);
    }

    function updateRadarMap(lat, lon) {
        if (mapInstance) {
            mapInstance.setView([lat, lon], 8);
        }
    }

    // --- Weather Fetchers ---
    async function fetchWeatherData(city) {
        if (apiKey) {
            try {
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`);
                if (!res.ok) throw new Error('City not found');
                const data = await res.json();
                currentCoords = { lat: data.coord.lat, lon: data.coord.lon };
                weatherData = parseRealApiData(data);
                updateUI(weatherData);
                return;
            } catch (err) {}
        }
        weatherData = generateMockWeatherData(city);
        updateUI(weatherData);
    }

    async function fetchWeatherDataByCoords(lat, lon) {
        currentCoords = { lat, lon };
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

    function generateMockWeatherData(cityName) {
        let baseTemp = 18;
        let condition = 'Clear';
        const lower = cityName.toLowerCase();

        if (lower.includes('london') || lower.includes('rain')) { baseTemp = 11; condition = 'Rain'; currentCoords = { lat: 51.5074, lon: -0.1278 }; }
        else if (lower.includes('tokyo')) { baseTemp = 16; condition = 'Clouds'; currentCoords = { lat: 35.6762, lon: 139.6503 }; }
        else if (lower.includes('reykjavik') || lower.includes('ice') || lower.includes('snow')) { baseTemp = -2; condition = 'Snow'; currentCoords = { lat: 64.1466, lon: -21.9426 }; }
        else if (lower.includes('dubai') || lower.includes('hot')) { baseTemp = 34; condition = 'Clear'; currentCoords = { lat: 25.2048, lon: 55.2708 }; }
        else { currentCoords = { lat: 40.7128, lon: -74.0060 }; }

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
            const tempVar = Math.sin((i - 8) / 12 * Math.PI) * 6;
            const hourTemp = Math.round(baseTemp + tempVar);
            hourly.push({
                time: timeStr, hour: i, temp: hourTemp, condition: (i > 18 || i < 6) ? 'Clear Night' : baseCondition
            });
        }
        return hourly;
    }

    // --- UI & Background FX Dispatcher ---
    function updateUI(data) {
        cityNameEl.textContent = data.city;
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

        applyThemeAndFx(data.condition, data.temp);

        const wakeHour = parseInt(userSchedule.wakeTime.split(':')[0], 10);
        const leaveHour = parseInt(userSchedule.leaveTime.split(':')[0], 10);
        const morningItem = data.hourly.find(h => h.hour === leaveHour) || data.hourly[8];
        const wakeItem = data.hourly.find(h => h.hour === wakeHour) || data.hourly[7];

        morningTimeDisplay.textContent = userSchedule.leaveTime;
        morningTempDisplay.textContent = formatTemp(morningItem.temp);

        calculateOutfit(morningItem.temp, data.condition);
        calculatePetSafety(data.temp, data.condition);
        calculateAgMetrics(data);
        checkColdCarStartBanner(wakeItem.temp, morningItem.temp);
        renderHourlySlider(data.hourly);
        updateRadarMap(currentCoords.lat, currentCoords.lon);
    }

    function applyThemeAndFx(condition, temp) {
        document.body.className = '';

        if (condition === 'Rain') {
            document.body.classList.add('theme-rainy');
            mainWeatherIcon.className = 'fa-solid fa-cloud-showers-heavy weather-icon';
            setWeatherFxMode('rainy');
        } else if (condition === 'Snow' || temp < 5) {
            document.body.classList.add('theme-snowy');
            mainWeatherIcon.className = 'fa-solid fa-snowflake weather-icon';
            setWeatherFxMode('snowy');
        } else if (condition === 'Clouds') {
            document.body.classList.add('theme-cold');
            mainWeatherIcon.className = 'fa-solid fa-cloud-sun weather-icon';
            setWeatherFxMode('cloudy');
        } else {
            document.body.classList.add('theme-sunny');
            mainWeatherIcon.className = 'fa-solid fa-sun weather-icon';
            setWeatherFxMode('sunny');
        }
    }

    // --- Dynamic Weather Animation Loop ---
    function setWeatherFxMode(mode) {
        activeWeatherMode = mode;
        particles = [];
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        if (mode === 'sunny') {
            bgSun.classList.add('visible');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else if (mode === 'rainy') {
            bgSun.classList.remove('visible');
            createRainParticles();
            animateWeatherCanvas();
        } else if (mode === 'snowy') {
            bgSun.classList.remove('visible');
            createSnowParticles();
            animateWeatherCanvas();
        } else {
            bgSun.classList.remove('visible');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function createRainParticles() {
        const count = Math.floor(window.innerWidth / 8);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: Math.random() * 20 + 10,
                speed: Math.random() * 10 + 12,
                opacity: Math.random() * 0.4 + 0.3
            });
        }
    }

    function createSnowParticles() {
        const count = Math.floor(window.innerWidth / 12);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 3 + 1,
                speed: Math.random() * 1.5 + 0.5,
                drift: Math.random() * 0.8 - 0.4,
                opacity: Math.random() * 0.6 + 0.4
            });
        }
    }

    function animateWeatherCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (activeWeatherMode === 'rainy') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';

            particles.forEach(p => {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - 2, p.y + p.length);
                ctx.stroke();

                p.y += p.speed;
                p.x -= 0.5;

                if (p.y > canvas.height) {
                    p.y = -p.length;
                    p.x = Math.random() * canvas.width;
                }
            });
        } else if (activeWeatherMode === 'snowy') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();

                p.y += p.speed;
                p.x += p.drift;

                if (p.y > canvas.height) {
                    p.y = -5;
                    p.x = Math.random() * canvas.width;
                }
            });
        }

        animationFrameId = requestAnimationFrame(animateWeatherCanvas);
    }

    // --- Pet Safety Calculation Module ---
    function calculatePetSafety(airTempC, condition) {
        const isSunny = condition === 'Clear';
        const estimatedAsphaltC = isSunny ? airTempC + Math.round(airTempC * 0.75 + 5) : airTempC + 4;
        
        const formatTemp = (c) => currentUnit === 'F' ? `${Math.round(c * 9/5 + 32)}°F` : `${c}°C`;
        asphaltTempVal.textContent = formatTemp(estimatedAsphaltC);

        let statusClass = "safe";
        let badgeText = "Safe Paws 🐾";
        let headline = "Great conditions for dog walking!";
        let advice = "Pavement temperatures are mild. Safe to walk standard distance on sidewalks.";
        let risk = "Low";
        let gear = ["Fresh Water", "Leash"];

        if (estimatedAsphaltC >= 50 || airTempC >= 30) {
            statusClass = "danger";
            badgeText = "Extreme Paw Danger 🔥";
            headline = "Hot pavement! High paw burn & heat stroke risk.";
            advice = "Asphalt is hot enough to burn dog paw pads! Do the 7-second test with the back of your hand. Walk exclusively on grass or shaded dirt trails.";
            risk = "CRITICAL";
            gear.push("Dog Boots 🐾", "Paw Protection Wax", "Hydration Bowl");
        } else if (estimatedAsphaltC >= 40 || airTempC >= 25) {
            statusClass = "warning";
            badgeText = "Caution Warm Paws ⚠️";
            headline = "Elevated pavement heat.";
            advice = "Pavement is getting hot. Limit sidewalk walks; prioritize early morning or evening walks.";
            risk = "Moderate";
            gear.push("Cooling Collar", "Portable Water");
        } else if (airTempC <= 0) {
            statusClass = "warning";
            badgeText = "Freezing Paws ❄️";
            headline = "Cold ground & ice risk.";
            advice = "Freezing temperatures and road salt can damage paws. Keep walks short and clean paws after.";
            risk = "Cold Stress";
            gear.push("Insulated Pet Jacket 🐕", "Paw Salve / Boots");
        }

        pawStatusBadge.className = `pet-status-badge ${statusClass}`;
        pawStatusBadge.textContent = badgeText;
        petHeadline.textContent = headline;
        petRiskVal.textContent = risk;
        petAdviceText.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${advice}`;

        petGearList.innerHTML = gear.map(item => `
            <span class="essential-pill"><i class="fa-solid fa-paw"></i> ${item}</span>
        `).join('');
    }

    // --- Precision Farmer & Agronomic Calculation Engine ---
    function calculateAgMetrics(data) {
        const tempC = data.temp;
        const highC = data.high;
        const lowC = data.low;
        const humidity = data.humidity;
        const windKmh = data.wind;
        const condition = data.condition;

        const formatTemp = (c) => currentUnit === 'F' ? `${Math.round(c * 9/5 + 32)}°F` : `${c}°C`;

        // 1. Growing Degree Days (GDD)
        const selectedOption = cropSelect ? cropSelect.options[cropSelect.selectedIndex] : null;
        const baseTemp = selectedOption ? parseFloat(selectedOption.dataset.base) : 10;
        
        const effectiveMax = Math.min(highC, 30);
        const effectiveMin = Math.max(lowC, baseTemp);
        const avgTemp = (effectiveMax + effectiveMin) / 2;
        const dailyGDD = Math.max(0, (avgTemp - baseTemp)).toFixed(1);

        document.getElementById('ag-gdd-val').textContent = `+${dailyGDD} GDD`;
        document.getElementById('ag-gdd-detail').textContent = dailyGDD > 8 
            ? "Strong vegetative growth day" 
            : (dailyGDD > 0 ? "Slow heat accumulation" : "Dormant / Below base temp");

        // 2. Delta-T & Spray Drift Window
        const deltaT = ((100 - humidity) / 5).toFixed(1);
        const sprayStatusEl = document.getElementById('ag-spray-status');
        const sprayDetailEl = document.getElementById('ag-spray-detail');

        if (condition === 'Rain') {
            sprayStatusEl.textContent = `Hold Spray (Rain)`;
            sprayStatusEl.className = "ag-value red-text";
            sprayDetailEl.textContent = "Wash-off risk — Do not apply chemicals";
        } else if (windKmh > 18) {
            sprayStatusEl.textContent = `High Drift (${windKmh} km/h)`;
            sprayStatusEl.className = "ag-value red-text";
            sprayDetailEl.textContent = "Wind exceeds safe spraying threshold";
        } else if (deltaT > 10) {
            sprayStatusEl.textContent = `Evap Risk (ΔT: ${deltaT}°C)`;
            sprayStatusEl.className = "ag-value orange-text";
            sprayDetailEl.textContent = "Droplets will evaporate before leaf contact";
        } else if (deltaT < 2 || windKmh < 3) {
            sprayStatusEl.textContent = `Inversion Risk (ΔT: ${deltaT}°C)`;
            sprayStatusEl.className = "ag-value orange-text";
            sprayDetailEl.textContent = "Dead calm / high humidity traps fine mist";
        } else {
            sprayStatusEl.textContent = `Optimal (ΔT: ${deltaT}°C)`;
            sprayStatusEl.className = "ag-value green-text";
            sprayDetailEl.textContent = `Ideal wind (${windKmh} km/h) & droplet survival`;
        }

        // 3. Soil Temperature (10cm depth) & Frost Risk
        const soilTempC = Math.round((tempC * 0.75) + (lowC * 0.25));
        const soilValEl = document.getElementById('ag-soil-val');
        const germDetailEl = document.getElementById('ag-germination-detail');

        if (lowC <= 1) {
            soilValEl.textContent = `${formatTemp(soilTempC)} • FROST ALERT`;
            soilValEl.className = "ag-value red-text";
            germDetailEl.textContent = "Sub-freezing overnight lows! Protect tender crops";
        } else if (soilTempC < 10) {
            soilValEl.textContent = `${formatTemp(soilTempC)} • Cool Soil`;
            soilValEl.className = "ag-value orange-text";
            germDetailEl.textContent = "Suitable for wheat/peas; too cold for corn/beans";
        } else {
            soilValEl.textContent = `${formatTemp(soilTempC)} • No Frost`;
            soilValEl.className = "ag-value green-text";
            germDetailEl.textContent = "Prime germination temp for row crops";
        }

        // 4. Livestock Temperature-Humidity Index (THI)
        const tempF = (tempC * 1.8) + 32;
        const thi = Math.round(tempF - ((0.55 - 0.0055 * humidity) * (tempF - 26)));
        const livestockEl = document.getElementById('ag-livestock-val');
        const livestockDetailEl = document.getElementById('ag-livestock-detail');

        if (thi >= 79) {
            livestockEl.textContent = `Danger (THI: ${thi})`;
            livestockEl.className = "ag-value red-text";
            livestockDetailEl.textContent = "Severe heat stress! Run barn misters & fans";
        } else if (thi >= 72) {
            livestockEl.textContent = `Alert (THI: ${thi})`;
            livestockEl.className = "ag-value orange-text";
            livestockDetailEl.textContent = "Mild dairy/cattle stress — Ensure shade & water";
        } else if (tempC <= -5) {
            livestockEl.textContent = `Cold Stress (${formatTemp(tempC)})`;
            livestockEl.className = "ag-value orange-text";
            livestockDetailEl.textContent = "Increase feed rations & check trough heaters";
        } else {
            livestockEl.textContent = `Normal (THI: ${thi})`;
            livestockEl.className = "ag-value green-text";
            livestockDetailEl.textContent = "Comfortable thermal zone for livestock";
        }

        // 5. Field Trafficability & Evapotranspiration (ET0)
        const trafficText = document.getElementById('ag-trafficability-text');
        const etText = document.getElementById('ag-et-text');

        if (condition === 'Rain' || humidity > 85) {
            trafficText.textContent = "Saturated / Muddy — Avoid heavy tractors to prevent soil compaction.";
        } else {
            trafficText.textContent = "Firm topsoil — Good traction for tillage, planting, or harvest.";
        }

        const estET = Math.max(0.5, ((tempC * 0.22) + (windKmh * 0.08) - (humidity * 0.03))).toFixed(1);
        etText.textContent = `${estET} mm/day moisture loss — ${estET > 4.5 ? "High irrigation demand" : "Normal moisture retention"}.`;
    }

    // --- Car Banner & Recommendation Logic ---
    function checkColdCarStartBanner(wakeTemp, commuteTemp) {
        const minMorningTemp = Math.min(wakeTemp, commuteTemp);
        const shouldRemind = userSchedule.carReminderEnabled && (minMorningTemp <= userSchedule.carTempThreshold);

        if (shouldRemind) {
            carStartBanner.classList.remove('hidden');
            const formattedMin = currentUnit === 'F' ? `${Math.round(minMorningTemp * 9/5 + 32)}°F` : `${minMorningTemp}°C`;
            carBannerText.textContent = `Morning temperature drops to ${formattedMin}. Remember to start your car early so it warms up before your commute!`;
        } else {
            carStartBanner.classList.add('hidden');
        }
    }

    function calculateOutfit(tempC, condition) {
        let head = "Sunglasses / Baseball Cap";
        let torso = "Cotton T-Shirt";
        let legs = "Jeans / Chinos";
        let feet = "Sneakers";
        let essentials = ["Water Bottle", "Sunglasses"];
        let headline = "Mild & Pleasant Weather";

        if (tempC < 5) {
            headline = "Freezing cold! Heavy insulated layers required.";
            head = "Warm Beanie / Wool Hat & Scarf";
            torso = "Thermal Layer + Fleece + Winter Parka";
            legs = "Thermal Pants + Heavy Trousers";
            feet = "Insulated Winter Boots";
            essentials.push("Lip Balm", "Hand Warmers");
        } else if (tempC >= 5 && tempC < 15) {
            headline = "Chilly conditions. Layer up comfortably!";
            head = "Light Beanie or Cap";
            torso = "Long-sleeve Tee + Sweater or Denim Jacket";
            legs = "Heavy Denim Jeans / Chinos";
            feet = "Leather Shoes / Boots";
            essentials.push("Light Gloves");
        } else if (tempC >= 15 && tempC < 23) {
            headline = "Pleasant & mild. Light outerwear works great.";
            head = "Sunglasses / Cap";
            torso = "T-Shirt + Light Cardigan or Zip Hoodie";
            legs = "Chinos / Regular Pants";
            feet = "Canvas Sneakers";
        } else {
            headline = "Warm & sunny! Keep light and stay cool.";
            head = "Sun Hat / UV Sunglasses";
            torso = "Breathable Linen Shirt / Short-sleeve Tee";
            legs = "Shorts / Breathable Linen Pants";
            feet = "Mesh Sneakers / Sandals";
            essentials.push("Sunscreen SPF 50");
        }

        if (condition === 'Rain') {
            torso += " + Waterproof Rain Coat";
            feet = "Waterproof Rain Boots";
            essentials.push("Compact Umbrella ☔");
        }

        outfitHeadline.textContent = headline;
        layerHead.querySelector('.layer-text').textContent = head;
        layerTorso.querySelector('.layer-text').textContent = torso;
        layerLegs.querySelector('.layer-text').textContent = legs;
        layerFeet.querySelector('.layer-text').textContent = feet;

        essentialsList.innerHTML = essentials.map(item => `
            <span class="essential-pill"><i class="fa-solid fa-check"></i> ${item}</span>
        `).join('');
    }

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
        if (temp < 23) return "Hoodie";
        return "T-Shirt";
    }

    function updateAlarmStatusUI() {
        if (userSchedule.alarmEnabled) {
            toggleAlarmBtn.classList.add('active');
            alarmStatusText.className = 'status-active';
            alarmStatusText.innerHTML = `<i class="fa-solid fa-circle-check"></i> Alarm active for ${userSchedule.wakeTime}`;
        } else {
            toggleAlarmBtn.classList.remove('active');
            alarmStatusText.className = 'status-disabled';
            alarmStatusText.innerHTML = `<i class="fa-solid fa-bell-slash"></i> Alarm disabled`;
        }
    }

    function checkAlarmClock() {
        if (!userSchedule.alarmEnabled || alarmTriggered) return;

        const now = new Date();
        const currentHHMM = `${now.getHours() < 10 ? '0' + now.getHours() : now.getHours()}:${now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()}`;

        if (currentHHMM === userSchedule.wakeTime && now.getSeconds() < 2) {
            triggerAlarm();
        }
    }

    function triggerAlarm() {
        alarmTriggered = true;

        const formatTemp = (c) => currentUnit === 'F' ? `${Math.round(c * 9/5 + 32)}°F` : `${c}°C`;
        const wakeHour = parseInt(userSchedule.wakeTime.split(':')[0], 10);
        const wakeItem = weatherData ? (weatherData.hourly.find(h => h.hour === wakeHour) || weatherData) : { temp: 15 };

        alarmTimeDisplay.textContent = userSchedule.wakeTime;
        alarmWeatherHint.textContent = `Morning Temp: ${formatTemp(wakeItem.temp)} — ${getQuickOutfitHint(wakeItem.temp)} suggested!`;

        if (userSchedule.carReminderEnabled && wakeItem.temp <= userSchedule.carTempThreshold) {
            carStartModalAlert.classList.remove('hidden');
        } else {
            carStartModalAlert.classList.add('hidden');
        }

        alarmModal.classList.remove('hidden');
        playChimeSound();
    }

    function playChimeSound() {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            alarmInterval = setInterval(() => {
                if (!audioCtx) return;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
            }, 800);
        } catch (e) {}
    }

    function stopAlarm() {
        if (alarmInterval) clearInterval(alarmInterval);
        if (audioCtx) { audioCtx.close(); audioCtx = null; }
        alarmModal.classList.add('hidden');
    }
});
