# HackSwipe - Tinder for Hackathon Projects

A Tinder-style app for peeking hackathon projects from Devpost. Swipe through 220+ hackathon projects, watch demo videos, and save the ones that inspire you.

<img src="https://github.com/snehitvaddi/hackswipe/blob/main/HackSwipe%20UI.png" height="600" />

## Features

- **Embedded YouTube Videos** - Watch project demos directly in the app
- **Shorts-Style Swiping** - Swipe up to like, down to skip (or use buttons)
- **220+ Winning Projects** - Curated collection of Devpost hackathon winners
- **Mobile-First Design** - Optimized for phone screens with safe area support
- **Keyboard Support** - Arrow keys for desktop users
- **Liked Projects Gallery** - Save and revisit projects you loved
- **Rich Project Info** - Prizes, tech stack, team members, and links
  
## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Framer Motion** - Smooth swipe animations
- **Lucide React** - Beautiful icons

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app will be available at `http://localhost:5173`

## Controls

| Action | Mobile | Desktop |
|--------|--------|---------|
| Like | Swipe Up / Tap Green Button | Arrow Up / Arrow Right |
| Skip | Swipe Down / Tap Red Button | Arrow Down / Arrow Left |

## Data Source

Project data is scraped from [Devpost](https://devpost.com) hackathon winners using a custom Node.js scraper with:
- Puppeteer for web scraping
- OpenAI GPT-4o-mini for AI summaries

## Project Structure

```
hackathon-tinder/
├── src/
│   ├── App.jsx          # Main app component
│   ├── App.css          # Styles
│   └── data/
│       └── projects.json # 220 hackathon projects
├── convert-data.cjs     # Data transformation script
└── package.json
```

## License

MIT

---

Built with Claude Code
