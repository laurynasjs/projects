# AI Meal Planner & Shopping Automation

An AI-powered meal planning system that generates personalized meal plans and automatically adds ingredients to your Barbora.lt shopping cart.

## Features

- 🤖 **AI Meal Planning**: Generate 3-day meal plans using Google Gemini AI
- 🛒 **Automated Shopping**: Browser extension automatically searches and adds items to Barbora.lt cart
- 💰 **Best Value Selection**: Automatically selects products with the lowest unit price
- 🇱🇹 **Lithuanian Language**: Full support for Lithuanian recipes and ingredients
- ✅ **Interactive Shopping Lists**: Edit, check/uncheck, and customize your shopping list
- 🔄 **Retry Logic**: Automatic retry on failures with detailed error reporting

## Project Structure

```
ai_planner/
├── extension/              # Chrome/Browser Extension
│   ├── src/
│   │   ├── background.ts          # Service worker for job management
│   │   ├── content_script.ts      # Page automation logic
│   │   ├── popup.ts               # Extension popup UI
│   │   ├── shared/                # Shared utilities
│   │   │   ├── types.ts           # TypeScript type definitions
│   │   │   ├── constants.ts       # Configuration constants
│   │   │   └── logger.ts          # Logging utility
│   │   ├── content/               # Content script modules
│   │   │   └── dom-helpers.ts     # DOM manipulation helpers
│   │   └── public/
│   │       ├── manifest.json      # Extension manifest
│   │       └── popup.html         # Popup UI
│   ├── dist/                      # Build output
│   └── package.json
│
└── webapp/                 # Flask Web Application
    ├── app.py                     # Main Flask application
    ├── scraper.py                 # Playwright price scraper (optional)
    ├── requirements.txt
    ├── .env                       # Environment variables
    └── templates/
        └── index.html             # Web UI (use index_v2.html for enhanced version)
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- Google Gemini API key
- Chrome/Chromium browser

### Backend Setup (Flask)

1. Navigate to the webapp directory:
```bash
cd webapp
```

2. Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
pip install google-generativeai python-dotenv
```

4. Create a `.env` file:
```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

5. Run the Flask app:
```bash
python app.py
```

The app will be available at `http://localhost:5000`

### Extension Setup

1. Navigate to the extension directory:
```bash
cd extension
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

## Usage

### Generate a Meal Plan

1. Open the web app at `http://localhost:5000`
2. Enter your meal preferences (e.g., "healthy low-budget meals for 2 people")
3. Click "Generate Plan"
4. Review the generated meal plan and shopping list
5. Edit the shopping list as needed (check/uncheck items, edit names, delete items)
6. Click "Send to Barbora" to start automated shopping

### Manual Shopping List

1. Click the extension icon in Chrome
2. Enter items manually (one per line)
   - Format: `Item name` or `Item name, quantity`
   - Example: `Pienas` or `Miltai 2`
3. Click "Process Shopping List"

### How It Works

1. **Meal Generation**: Gemini AI generates Lithuanian recipes based on your preferences
2. **Shopping List**: Ingredients are aggregated into a shopping list
3. **Extension Activation**: List is sent to the browser extension
4. **Automated Shopping**: Extension opens Barbora.lt and:
   - Searches for each item
   - Finds the best value product (lowest unit price)
   - Adds it to cart with correct quantity
   - Retries on failures (up to 2 times)
5. **Completion**: Shows summary with any failed items

## Configuration

### Extension Constants (`extension/src/shared/constants.ts`)

```typescript
TIMEOUTS: {
    ELEMENT_WAIT: 7000,        // Wait time for DOM elements
    SEARCH_DELAY_MIN: 250,     // Min delay before search
    SEARCH_DELAY_MAX: 750,     // Max delay before search
    ITEM_DELAY: 2000,          // Delay between items
}
MAX_RETRIES: 2                 // Retry attempts per item
```

### Backend Configuration

Edit `webapp/app.py` to change:
- Gemini model: `gemini-1.5-flash-latest`
- Temperature: `0.7`
- Number of days in meal plan

## Troubleshooting

### Extension Issues

**Problem**: Items not being added to cart
- Check browser console for errors (F12)
- Verify Barbora.lt hasn't changed their HTML structure
- Check extension logs (look for `[CS]`, `[BG]` prefixes)

**Problem**: Extension not loading
- Rebuild: `npm run build`
- Check for TypeScript errors
- Reload extension in Chrome

### Backend Issues

**Problem**: "API key not found"
- Verify `.env` file exists in `webapp/` directory
- Check `GEMINI_API_KEY` is set correctly

**Problem**: JSON parsing errors
- Check Gemini API response in logs
- The app includes a JSON parser that handles markdown code blocks

## Development

### Watch Mode (Extension)

```bash
cd extension
npm run watch
```

This rebuilds automatically on file changes.

### Debug Logging

All modules use structured logging:
- `[BG]` - Background script
- `[CS]` - Content script
- `[POPUP]` - Popup script
- `[DOM]` - DOM helpers

Enable verbose logging in Chrome DevTools console.

## Known Limitations

- Only works with Barbora.lt (Lithuanian grocery store)
- Requires manual intervention if Barbora's UI changes significantly
- Shadow DOM elements may cause issues if structure changes
- No persistent storage (job state lost on browser restart)

## Future Improvements

- [ ] Add user accounts and saved meal plans
- [ ] Support for multiple grocery stores
- [ ] Price comparison across stores
- [ ] Persistent job storage
- [ ] Mobile app
- [ ] Meal plan history and favorites
- [ ] Dietary restrictions and allergies support

## License

MIT

## Contributing

Pull requests welcome! Please ensure:
- TypeScript code passes linting
- Python code follows PEP 8
- Add tests for new features
- Update documentation
