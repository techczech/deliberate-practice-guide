---
name: "Deliberate Practice Guide"
description: "Turns the principles of deliberate practice into a navigable guide with progress tracking and an AI coach."
categories: [content-distribution, web-app, built-by-ai, powered-by-ai]
updated: 2026-07-16
deployments:
  Appsite:
    "Deliberate Practice Guide": https://deliberatepractice.dominiklukes.net/
---
# Guide to Deliberate Practice

An interactive, AI-powered guide designed to help users understand and apply the principles of Deliberate Practice. This web application transforms static learning material into a dynamic experience with reading tools, progress tracking, and an AI coach.

## Features

- **Interactive Reader**: Markdown-based content rendering with custom styling.
- **Read Your Way**: Customizable reading experience (Dark mode, Focus mode, Ruler, Text-to-Speech, Font/Spacing/Width adjustments).
- **AI Coach**: Integrated Gemini-powered chat assistant to answer questions about the content using the `@google/genai` SDK.
- **Highlights & Notes**: Select text to highlight, add notes, and export them to Markdown.
- **AI Summarization**: Generate summaries of your specific highlights and notes.
- **Progress Tracking**: Automatically tracks read sections and bookmarks.
- **eBook Export**: Download the entire guide as an EPUB for offline reading.
- **Shareable Quotes**: Generate beautiful images of quotes with QR codes.

## Architecture

This application is built as a lightweight Single Page Application (SPA) using React and TypeScript, designed for high performance and easy deployment without complex build steps.

### Tech Stack

- **Framework**: React 19 (via CDN import maps)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (via CDN) + Tailwind Typography Plugin
- **AI**: Google Gemini API (`@google/genai`)
- **Icons**: Google Material Symbols
- **Fonts**: Inter (UI) & Merriweather (Reading content)

### Key Components

- **`App.tsx`**: Main controller handling global state (navigation, user settings, persistence). It manages the layout and coordinates between the sidebar, content area, and drawers.
- **`MarkdownRenderer.tsx`**: Advanced markdown parsing component that supports:
    - Custom text-to-speech integration.
    - Interactive highlighting logic.
    - Dynamic typography settings (Font size, Line height, Max width).
- **`Sidebar.tsx`**: Navigation, search functionality, and the "Read Your Way" accessibility controls.
- **`ChatDrawer.tsx`**: Chat interface connecting to the Gemini API for coaching.
- **`utils/epubGenerator.ts`**: Client-side generation of EPUB files using `jszip`.

### Data Flow

1.  **Content**: Static guide content is stored in `data.ts` as markdown strings.
2.  **State**: User preferences (theme, progress, highlights, font settings) are persisted in `localStorage`.
3.  **Routing**: Uses URL `searchParams` (`?section=id`) to manage navigation state, allowing deep linking without a dedicated router library.

## Deployment

The application is structured to run in a browser environment that supports ES modules.

### Prerequisites

- A valid Google Gemini API Key.
- A static file server or development environment that supports `process.env.API_KEY` injection.

### Setup

1.  Ensure `index.html`, `index.tsx`, and all component files are present.
2.  The application uses `importmap` in `index.html` to resolve dependencies like `react`, `react-dom`, and `@google/genai` from CDNs. No `npm install` step is strictly required for the runtime if served correctly by a tool that understands the file structure.
3.  **API Key**: The app expects `process.env.API_KEY` to be available globally to initialize the Gemini client.

## Project Structure

```
/
├── index.html              # Entry point, Import Maps, Tailwind config
├── index.tsx               # React Root
├── App.tsx                 # Main Application Logic & State
├── data.ts                 # Guide Content (Markdown)
├── types.ts                # TypeScript Interfaces
├── metadata.json           # Application metadata
├── services/
│   └── geminiService.ts    # AI API Logic (Coach & Summarizer)
├── components/             # UI Components
│   ├── MarkdownRenderer.tsx
│   ├── Sidebar.tsx
│   ├── ChatDrawer.tsx
│   ├── HighlightsDrawer.tsx
│   └── ...
└── utils/                  # Helper Utilities
    ├── epubGenerator.ts
    └── highlightExporter.ts
```
