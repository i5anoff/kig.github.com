var cityNames = [];

var cities = {};
var currentCityIndex = 0;
var zeroCity = {
	cloudCover: 0, windDirection: 0, windStrength: 8, rainAmount: 0, sunrise: Date.now()/1000-12000, sunset: Date.now()/1000+43200-12000,
	temperature: 10, weatherData: {weather: []}
};

var rainTable = {
	200: 0.2,
	201: 0.5,
	202: 1.0,
	230: 0.1,
	231: 0.2,
	232: 0.3,

	300: 0.1,
	301: 0.2,
	302: 0.3,
	310: 0.1,
	311: 0.2,
	312: 0.3,
	313: 0.5,
	314: 0.7,
	321: 0.2,

	500: 0.2,
	501: 0.4,
	502: 0.6,
	503: 0.8,
	504: 1.0,
	520: 0.2,
	521: 0.5,
	522: 1.0,
	531: 0.4
};

var parseRainAmount = function(weatherData) {
	var rainAmount = 0;
	for (var i = 0; i < weatherData.weather.length; i++) {
		var w = weatherData.weather[i];
		var r = rainTable[w.id];
		if (r) {
			rainAmount = Math.max(r, rainAmount);
		}
	}
	return rainAmount;
};

var updateWeather = function(cityName, weatherData) {
	var c = cities[cityName];
	if (!c) {
		c = cities[cityName] = {};
	}
	weatherData = weatherData || {};
	c.weatherData = weatherData;
	c.cloudCover = weatherData.clouds ? (weatherData.clouds.all || 0) / 100 : 0;
	c.windDirection = (weatherData.wind && weatherData.wind.deg) || 0;
	c.windStrength = (weatherData.wind && weatherData.wind.speed) || 0.1;
	c.rainAmount = parseRainAmount(weatherData);
	c.temperature = (weatherData.main && weatherData.main.temp) || 0;
	c.sunrise = (weatherData.sys && weatherData.sys.sunrise) || (86400 * 1/4);
	c.sunset = (weatherData.sys && weatherData.sys.sunset) || (86400 * 3/4);
};

var fetchWeather = function(cityName, callback, onerror) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'http://api.openweathermap.org/data/2.5/weather?q='+encodeURIComponent(cityName)+'&units=metric', true);
	xhr.onload = function(ev) {
		var weatherData = JSON.parse(ev.target.responseText);
		if (callback) {
			callback(cityName, weatherData);
		}
	};
	xhr.onerror = onerror;
	xhr.send(null);
};

var fetchCities = function() {
	var loadCount = cityNames.length;
	for (var i = 0; i < cityNames.length; i++) {
		fetchWeather(cityNames[i], function(cityName, weatherData) {
			updateWeather(cityName, weatherData);
			loadCount--;
			if (cityNames[currentCityIndex] === cityName) {
				if (!document.body.classList.contains('loaded')) {
					document.body.classList.add('loaded');
					setTimeout(function() {
						weatherUpdateTriggered = true;
					}, 800);
				} else {
					weatherUpdateTriggered = true;
				}
			}
			if (loadCount === 0) {
				document.body.classList.add('loaded');
			}
		}, function() {
			loadCount--;
			if (loadCount === 0) {
				document.body.classList.add('loaded');
			}
		});
	}
};

setInterval(fetchCities, 15*60*1000);

var getCityNames = function() {
	return document.getElementById('city-names').value
			.split('\n')
			.map(function(c) { return c.replace(/^\s+|\s+$/g, ''); })
			.filter(function(c) { return c !== ''; });	
};

var updateCityNames = function() {
	cityNames = getCityNames() || ['London'];
	if (window.localStorage) {
		localStorage.setItem('cityNames', JSON.stringify(cityNames));
	}
	fetchCities();
};

var initializeCityNames = function() {
	try {
		cityNames = JSON.parse(localStorage.getItem('cityNames'));
		if (cityNames.length === 0) {
			cityNames = getCityNames();
			localStorage.setItem('cityNames', JSON.stringify(cityNames));
		}
		document.getElementById('city-names').value = cityNames.join("\n");
	} catch(e) {
		cityNames = getCityNames();
	}
	fetchCities();
};

initializeCityNames();
document.getElementById('city-names').onchange = updateCityNames;
