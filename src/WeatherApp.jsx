import React, { useEffect, useState } from "react";
import "./WeatherApp.css"; // make sure this file exists (below)
const OPEN_WEATHER_API_KEY = "f4ff124ba7f04dca0cad80661a0d9ac1"; // ← replace with your API key

export default function WeatherApp() {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState(null);
  useEffect(() => {
  // Automatically get user's location on app load
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Fetch current weather using lat/lon
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPEN_WEATHER_API_KEY}`;
          const res = await fetch(url);
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || "Failed to fetch");
          setCurrent(data);
          setCity(data.name);

          // Optional: also load 3-day forecast
          try {
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPEN_WEATHER_API_KEY}`;
            const fRes = await fetch(forecastUrl);
            const fData = await fRes.json();
            if (fRes.ok) {
              const byDay = {};
              (fData.list || []).forEach((entry) => {
                const day = new Date(entry.dt * 1000).toISOString().slice(0, 10);
                byDay[day] ||= { temps: [], cond: {} };
                byDay[day].temps.push(entry.main.temp);
                const c = entry.weather?.[0]?.main || "";
                byDay[day].cond[c] = (byDay[day].cond[c] || 0) + 1;
              });

              const days = Object.keys(byDay).sort();
              const today = new Date().toISOString().slice(0, 10);
              const nextDays = days.filter((d) => d > today).slice(0, 3);

              const fc = nextDays.map((d) => {
                const temps = byDay[d].temps;
                const min = Math.round(Math.min(...temps));
                const max = Math.round(Math.max(...temps));
                const dominant =
                  Object.entries(byDay[d].cond).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
                return { date: d, min, max, main: dominant };
              });

              setForecast(fc);
            }
          } catch {
            console.warn("Forecast fetch failed");
          }
        } catch (err) {
          setError(err.message || "Unable to fetch weather data");
        }
      },
      (error) => {
        console.warn("User denied location:", error);
        setError("Location permission denied. Please allow location access.");
      }
    );
  } else {
    setError("Geolocation not supported by this browser.");
  }
}, []);


  async function fetchCurrentWeather(q) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      q
    )}&units=metric&appid=${OPEN_WEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch");
    return data;
  }

  async function fetch3DayForecast(q) {
    // uses 5-day/3-hour endpoint and condenses to next 3 days
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
      q
    )}&units=metric&appid=${OPEN_WEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch forecast");

    const byDay = {};
    (data.list || []).forEach((entry) => {
      const day = new Date(entry.dt * 1000).toISOString().slice(0, 10);
      byDay[day] ||= { temps: [], cond: {} };
      byDay[day].temps.push(entry.main.temp);
      const c = entry.weather?.[0]?.main || "";
      byDay[day].cond[c] = (byDay[day].cond[c] || 0) + 1;
    });

    const days = Object.keys(byDay).sort();
    const today = new Date().toISOString().slice(0, 10);
    const nextDays = days.filter((d) => d > today).slice(0, 3);

    return nextDays.map((d) => {
      const temps = byDay[d].temps;
      const min = Math.round(Math.min(...temps));
      const max = Math.round(Math.max(...temps));
      const dominant = Object.entries(byDay[d].cond).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      return { date: d, min, max, main: dominant };
    });
  }

  function themeFromMain(main) {
    const m = (main || "").toLowerCase();
    if (m.includes("rain") || m.includes("drizzle") || m.includes("thunder"))
      return "rainy";
    if (m.includes("cloud") || m.includes("mist") || m.includes("fog"))
      return "cloudy";
    if (m.includes("snow")) return "snow";
    return "sunny";
  }

  async function handleSearch(e) {
    e?.preventDefault();
    if (!city) return;
    setError(null);
    setLoading(true);
    setCurrent(null);
    setForecast(null);
    try {
      const cw = await fetchCurrentWeather(city);
      setCurrent(cw);
      // forecast is optional — if it fails, we still show current
      try {
        const fc = await fetch3DayForecast(city);
        setForecast(fc);
      } catch {
        setForecast(null);
      }
    } catch (err) {
      setError(err.message || "Error fetching weather");
    } finally {
      setLoading(false);
    }
  }

  const mainCond = current?.weather?.[0]?.main || "";
  const theme = themeFromMain(mainCond);

  return (
    <div className={`wa-root ${theme}`}>
      <div className="wa-card">
        <h1 className="wa-title">Weather Forecast</h1>

        <form className="wa-form" onSubmit={handleSearch}>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="wa-input"
            placeholder="Enter city (e.g., Delhi)"
            required
          />
          <button className="wa-btn" type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <div className="wa-error">{error}</div>}

        {!current && !loading && !error && (
          <div className="wa-empty">Type a city and press Search</div>
        )}

        {current && (
          <div className="wa-current">
            <div className="wa-current-left">
              <div className="wa-place">
                {current.name}{current.sys?.country ? `, ${current.sys.country}` : ""}
              </div>
              <div className="wa-desc">{current.weather?.[0]?.description}</div>
            </div>
            <div className="wa-temp">{Math.round(current.main?.temp)}°C</div>
            <div className="wa-stats">
              <div>Humidity: {current.main?.humidity}%</div>
              <div>Feels: {Math.round(current.main?.feels_like)}°C</div>
            </div>
          </div>
        )}

        {forecast && forecast.length > 0 && (
          <div className="wa-forecast">
            <h3>Next 3 Days</h3>
            <div className="wa-forecast-grid">
              {forecast.map((d) => (
                <div className="wa-forecast-card" key={d.date}>
                  <div className="wa-forecast-date">
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="wa-forecast-main">{d.main}</div>
                  <div className="wa-forecast-temp">{d.min}° / {d.max}°</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="wa-foot">Data from OpenWeatherMap</div>
      </div>
    </div>
  );
}
