# Job Aggregator & Matching Backend Service

A lightweight, high-performance Node.js + TypeScript Express web service ready for deployment on **Render**, featuring automated job fetching from multiple platform feeds (**WeWorkRemotely**, **RemoteOK**, **Arbeitnow**, **Remotive**, **Jobspresso**), keyword scoring, location matching (remote, on-site, hybrid), and a built-in test client.

---

## 🌐 Active Platform Handlers

| Platform | Type | Feed/API URL | Location Type |
|---|---|---|---|
| **WeWorkRemotely** | RSS / API | `https://weworkremotely.com/remote-jobs.rss` | Remote |
| **RemoteOK** | JSON API | `https://remoteok.com/api` | Remote |
| **Arbeitnow** | JSON API | `https://www.arbeitnow.com/api/job-board-api` | On-site, Hybrid & Remote |
| **Remotive** | JSON API | `https://remotive.com/api/remote-jobs` | Remote & Location-Restricted |
| **Jobspresso** | RSS / API | `https://jobspresso.co/feed/` | Remote |

---

## 🌐 Endpoints Reference

### 1. `POST /api/search-jobs`
Main aggregation, scoring, and matching endpoint.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "skills": ["embedded systems", "python", "arduino"],
  "experience": [
    { "title": "Embedded Systems Engineer", "years": 2 }
  ],
  "locations": ["Berlin", "Remote"],
  "workPreference": "any"
}
```

- **Success Response (200 OK)**:
```json
{
  "count": 12,
  "totalFetched": 480,
  "jobs": [
    {
      "title": "Embedded Software Developer",
      "company": "Tech Corp",
      "location": "Berlin, Germany",
      "remote": false,
      "url": "https://...",
      "description": "...",
      "source": "arbeitnow",
      "publishedAt": "2026-09-20T10:00:00Z",
      "score": 0.85,
      "matchReasons": [
        "Skills matched: python, embedded systems",
        "Location matched"
      ]
    }
  ]
}
```

---

### 2. `GET /api/health`
Health check route used by Render or monitoring tools.

- **Success Response (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2026-09-26T19:10:36.203Z",
  "handlers": ["weworkremotely", "remoteok", "arbeitnow", "remotive", "jobspresso"]
}
```

---

### 3. `GET /`
Serves the interactive Test Bench Web UI ([`public/index.html`](file:///d:/Personal_practice/sort/cap-able/public/index.html)).

---

## 🏃 Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Dev Mode (Hot Reloading)**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Build & Start Production**
   ```bash
   npm run build
   npm start
   ```

---

## ☁️ Render Deployment Guide

1. Push your repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**.
3. Set **Build Command**: `npm install && npm run build`
4. Set **Start Command**: `npm start`
5. Render automatically sets `PORT`, which the Express server binds to automatically.
