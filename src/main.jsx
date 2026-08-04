import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, ExternalLink, Filter, Newspaper, RefreshCw } from "lucide-react";
import newsData from "../data/news.json";
import "./styles.css";

const categoryLabels = {
  ai: "Artificial Intelligence",
  biotech: "Biotechnology",
  robotics: "Robotics",
  frontier: "Frontier Tech",
};

const categoryOrder = ["all", "ai", "biotech", "robotics", "frontier"];

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function App() {
  const days = useMemo(() => [...newsData.days].sort((a, b) => b.date.localeCompare(a.date)), []);
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? "");
  const [category, setCategory] = useState("all");
  const selectedDay = days.find((day) => day.date === selectedDate) ?? days[0];
  const stories = category === "all"
    ? selectedDay?.stories ?? []
    : selectedDay?.stories.filter((story) => story.category === category) ?? [];

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Daily at 6:00 AM AST</p>
          <h1>Daily Frontier Brief</h1>
        </div>
        <div className="status">
          <RefreshCw size={16} aria-hidden="true" />
          <span>Last update: {newsData.lastUpdated}</span>
        </div>
      </header>

      <section className="controls" aria-label="Brief controls">
        <label className="datePicker">
          <CalendarDays size={18} aria-hidden="true" />
          <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
            {days.map((day) => (
              <option key={day.date} value={day.date}>
                {formatDate(day.date)}
              </option>
            ))}
          </select>
        </label>

        <div className="segments" aria-label="Category filter">
          <Filter size={18} aria-hidden="true" />
          {categoryOrder.map((key) => (
            <button
              key={key}
              type="button"
              className={category === key ? "active" : ""}
              onClick={() => setCategory(key)}
            >
              {key === "all" ? "All" : categoryLabels[key]}
            </button>
          ))}
        </div>
      </section>

      <section className="dayIntro">
        <div>
          <p className="eyebrow">Selected Brief</p>
          <h2>{selectedDay ? formatDate(selectedDay.date) : "No brief yet"}</h2>
        </div>
        <p>
          Five fresh signals from artificial intelligence, biotechnology, robotics, and adjacent
          frontier technology.
        </p>
      </section>

      <section className="storyGrid" aria-label="Daily stories">
        {stories.map((story, index) => (
          <article className="storyCard" key={`${story.url}-${index}`}>
            <a className="imageLink" href={story.url} target="_blank" rel="noreferrer">
              <img src={story.image} alt="" loading={index > 1 ? "lazy" : "eager"} />
              <span className={`badge ${story.category}`}>{categoryLabels[story.category]}</span>
            </a>
            <div className="storyBody">
              <div className="meta">
                <span>{story.source}</span>
                <span>{story.publishedAt}</span>
              </div>
              <h3>{story.title}</h3>
              <p>{story.summary}</p>
              <a className="readLink" href={story.url} target="_blank" rel="noreferrer">
                <Newspaper size={17} aria-hidden="true" />
                Read source
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </section>

      {stories.length === 0 && (
        <section className="emptyState">
          <h2>No stories in this filter</h2>
          <p>Switch categories or pick another day.</p>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
