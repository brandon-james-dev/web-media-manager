# Web Media Manager – Project Overview

Web Media Manager is a browser‑based tool for importing, analyzing, and managing local audio files. It uses modern web technologies — React, Vite, Dexie (IndexedDB), and Web Workers — to deliver a fast, offline‑capable experience entirely in the browser.

## Live Demo

The application is deployed on GitHub Pages:

https://brandon-james-dev.github.io/web-media-manager/

Open it directly in your browser — no installation required.

## Features

  * Import audio files directly from your device
  * Extract and display metadata (title, artist, album, genre, bitrate, duration, etc.)
  * Generate and store album‑art thumbnails
  * Queue and track pending write/import jobs
  * Fully offline‑capable using IndexedDB (Dexie)
  * Web Worker–powered background processing

Fast, modern UI built with React + Tailwind

## Tech Stack

  * React 18
  * Vite
  * TypeScript
  * Dexie.js
  * Web Workers
  * Tailwind CSS
  * GitHub Pages for hosting

## Project Structure

```
web-media-manager/
  ├── public/
  ├── src/
  │   ├── components/
  │   ├── workers/
  │   ├── db/
  │   ├── models/
  │   ├── hooks/
  │   ├── utils/
  │   └── main.tsx
  ├── index.html
  ├── vite.config.ts
  ├── package.json
  └── README.md
```

## Development

Install dependencies:


```
npm install
```

Start the dev server:

```
npm run dev
```

The app will be available at:

http://localhost:5173

## Production Build

Generate a production build:

```
npm run build
```

Preview the production build locally:

```
npm run preview
```

## Deployment (GitHub Pages)

This project uses a conditional Vite base path so it works both locally and in production:

```
base: mode === "production" ? "/web-media-manager/" : "/"
```

React Router also uses a conditional basename:

```
basename={import.meta.env.MODE === "production" ? "/web-media-manager" : "/"}
```

To deploy manually:

```
Run npm run build
```

Copy the contents of dist/ into the gh-pages branch

Push the branch

GitHub Pages will serve the site automatically.

## Browser Support

  * Chrome (recommended)
  * Edge
  * Firefox
  * Safari (limited IndexedDB performance)