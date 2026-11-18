import { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, RefreshCw, Search, Sun } from 'lucide-react';

const CITY_KEY = 'weatherCity';
const DEFAULT_CITY = 'New Delhi';
const REFRESH_MS = 10 * 60 * 1000;

// Open-Meteo weather codes -> label + icon (free, no API key)
function describe(code) {
    if (code === 0) return { label: 'Clear sky', Icon: Sun };
    if (code <= 2) return { label: 'Partly cloudy', Icon: CloudSun };
    if (code === 3) return { label: 'Overcast', Icon: Cloud };
    if (code <= 48) return { label: 'Fog', Icon: CloudFog };
    if (code <= 57) return { label: 'Drizzle', Icon: CloudDrizzle };
    if (code <= 67) return { label: 'Rain', Icon: CloudRain };
    if (code <= 77) return { label: 'Snow', Icon: CloudSnow };
    if (code <= 82) return { label: 'Rain showers', Icon: CloudRain };
    if (code <= 86) return { label: 'Snow showers', Icon: CloudSnow };
    return { label: 'Thunderstorm', Icon: CloudLightning };
}

const savedCity = () => {
    try { return localStorage.getItem(CITY_KEY) || DEFAULT_CITY; } catch { return DEFAULT_CITY; }
};

async function fetchWeather(city) {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`).then((r) => r.json());
    const place = geo.results?.[0];
    if (!place) throw new Error(`Could not find “${city}”`);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}`
        + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
        + '&daily=temperature_2m_max,temperature_2m_min&timezone=auto';
    const data = await fetch(url).then((r) => r.json());
    if (!data.current) throw new Error('Weather is unavailable right now');
    return { name: place.name, country: place.country_code, current: data.current, daily: data.daily };
}

// Live weather for the chosen city. Needs internet access; shows a message when offline.
export default function WeatherCard() {
    const [city, setCity] = useState(savedCity);
    const [input, setInput] = useState('');
    const [weather, setWeather] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (name) => {
        setLoading(true);
        setError('');
        try {
            setWeather(await fetchWeather(name));
        } catch (err) {
            setWeather(null);
            setError(err.message === 'Failed to fetch' ? 'Weather needs an internet connection' : err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(city);
        const timer = setInterval(() => load(city), REFRESH_MS);
        return () => clearInterval(timer);
    }, [city, load]);

    const changeCity = (event) => {
        event.preventDefault();
        const name = input.trim();
        if (!name) return;
        try { localStorage.setItem(CITY_KEY, name); } catch { /* storage unavailable */ }
        setCity(name);
        setInput('');
    };

    const { label, Icon } = weather ? describe(weather.current.weather_code) : { label: '', Icon: Cloud };

    return (
        <div className="card" style={{ height: '100%' }}>
            <div className="card-head">
                <h3><CloudSun aria-hidden="true" /> Weather</h3>
                <button type="button" className="icon-btn sm" onClick={() => load(city)} aria-label="Refresh weather" disabled={loading}>
                    <RefreshCw style={loading ? { animation: 'spin 0.9s linear infinite' } : undefined} />
                </button>
            </div>
            <div className="weather">
                {error && <div className="alert warning" role="status"><span>{error}</span></div>}
                {weather && (
                    <>
                        <div className="weather-main">
                            <Icon aria-hidden="true" />
                            <div>
                                <div className="weather-temp">{Math.round(weather.current.temperature_2m)}°C</div>
                                <div className="muted">{label} · {weather.name}</div>
                            </div>
                        </div>
                        <div className="weather-meta">
                            <div><strong>{weather.current.relative_humidity_2m}%</strong>Humidity</div>
                            <div><strong>{Math.round(weather.current.wind_speed_10m)} km/h</strong>Wind</div>
                            <div><strong>{Math.round(weather.daily.temperature_2m_max[0])}° / {Math.round(weather.daily.temperature_2m_min[0])}°</strong>High / low</div>
                        </div>
                    </>
                )}
                {!weather && !error && <div className="skeleton" style={{ height: 120 }} />}
                <form className="weather-city" onSubmit={changeCity}>
                    <div className="search-field" style={{ flex: 1 }}>
                        <Search aria-hidden="true" />
                        <input className="input" placeholder="Change city" value={input} onChange={(e) => setInput(e.target.value)} aria-label="City" />
                    </div>
                    <button type="submit" className="btn" disabled={!input.trim()}>Show</button>
                </form>
            </div>
        </div>
    );
}
