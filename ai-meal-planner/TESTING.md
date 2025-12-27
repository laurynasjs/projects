# Testing Guide - Barbora Only

This guide walks through testing the full workflow with Barbora.

## Prerequisites

- Python 3.10+
- Node.js 16+
- Chrome browser
- Gemini API key

## Setup

### 1. Install Dependencies

```bash
# From project root
make setup
```

This installs:
- Backend Python dependencies (ADK, FastAPI, Gemini)
- Extension npm dependencies
- Playwright browsers

### 2. Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env and add your Gemini API key
nano .env
```

Required in `.env`:
```bash
GEMINI_API_KEY=your_actual_key_here
```

### 3. Build Extension

```bash
make ext-build
```

### 4. Load Extension in Chrome

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select: `extension/dist/` folder
5. Note the extension ID

## Testing Steps

### Test 1: Backend Health Check

```bash
# Terminal 1: Start backend
make dev

# Terminal 2: Test health endpoint
curl http://localhost:8000/health
```

**Expected:**
```json
{
  "status": "healthy",
  "active_sessions": 0,
  "timestamp": "2025-12-26T19:00:00.000000"
}
```

### Test 2: Backend API Documentation

Open browser:
```
http://localhost:8000/docs
```

**Expected:** Swagger UI with endpoints:
- POST `/api/generate-plan`
- POST `/api/price-report`
- GET `/api/session/{session_id}`
- GET `/health`

### Test 3: Generate Meal Plan (API Only)

```bash
curl -X POST http://localhost:8000/api/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": "healthy meals for 2 people",
    "days": 3
  }'
```

**Expected:**
```json
{
  "session_id": "uuid-here",
  "meal_plan": {
    "meals": [...],
    "shopping_list": [...]
  },
  "message": "Meal plan generated..."
}
```

### Test 4: Frontend UI

Open browser:
```
http://localhost:8000
```

**Test:**
1. Enter preferences: "healthy low-budget meals"
2. Click "Generate Meal Plan"
3. Wait for meal plan to appear
4. Verify shopping list is shown

**Expected:**
- Meal plan with 3 meals in Lithuanian
- Shopping list with ingredients
- Session ID stored in browser

### Test 5: Extension - Manual Shopping List

1. Click extension icon in Chrome
2. Enter shopping list:
   ```
   Pienas
   Duona
   Kiaušiniai 2
   ```
3. Click "Process Shopping List"

**Expected:**
- New Barbora tab opens
- Extension searches for each item
- Items added to cart automatically
- Alert when complete

### Test 6: Full Workflow (Frontend → Extension)

**Step 1: Generate Plan**
1. Open `http://localhost:8000`
2. Enter: "vegetarian meals for 2 people, budget €30"
3. Click "Generate Meal Plan"
4. Wait for plan to load

**Step 2: Check Prices (Currently Manual)**
Since multi-store price checking needs more work, for now:
- Note the shopping list items
- Manually verify they exist on Barbora

**Step 3: Execute Shopping**
1. Click "Send to Barbora" button
2. Extension opens Barbora tab
3. Searches and adds items
4. Verify cart has items

**Expected Results:**
- ✅ Meal plan generated in Lithuanian
- ✅ Shopping list created
- ✅ Extension opens Barbora
- ✅ Items added to cart
- ✅ Alert shows success/failures

## Troubleshooting

### Backend Issues

**Error: "GEMINI_API_KEY not found"**
```bash
# Check .env file exists
cat .env

# Verify key is set
echo $GEMINI_API_KEY
```

**Error: "Module not found"**
```bash
# Reinstall dependencies
make clean
make dev-install
```

**Error: "Port 8000 already in use"**
```bash
# Kill existing process
lsof -ti:8000 | xargs kill -9

# Or change port in .env
PORT=8001
```

### Extension Issues

**Extension not loading**
```bash
# Rebuild extension
make ext-clean
make ext-build

# Reload in Chrome
chrome://extensions/ → Click reload button
```

**Content script not injecting**
- Check manifest.json has correct URLs
- Verify you're on Barbora.lt or localhost:8000
- Check console for errors (F12)

**Items not adding to cart**
- Barbora's HTML may have changed
- Check browser console (F12) for errors
- Look for `[CS]` and `[DOM]` log messages
- Selectors may need updating in `constants.ts`

### Common Errors

**"Session not found"**
- Session expired (only stored in memory)
- Restart backend and try again

**"No products found"**
- Item name might be too specific
- Try simpler search terms
- Check Barbora manually first

**"Shadow DOM not found"**
- Barbora changed their structure
- Need to update selectors in `barbora_store.ts`

## Debug Mode

### Backend Logs
```bash
# Watch backend logs
make dev

# Logs show:
# [INFO] Starting search for: pienas
# [DEBUG] Found element: #fti-search
# [ERROR] Failed to add to cart: ...
```

### Extension Logs

Open Chrome DevTools (F12):

**Background Script:**
```javascript
// Check background logs
chrome://extensions/ → Extension → "service worker"
```

**Content Script:**
```javascript
// On Barbora page, open console
// Look for:
[CS] [INFO] Executing search for: "pienas"
[DOM] [DEBUG] Found element: #fti-search
[Store:Barbora] [INFO] Best value found: €1.49
```

## Next Steps

Once Barbora testing works:

1. **Add Price Comparison**
   - Implement Rimi scraper
   - Implement Maxima scraper
   - Test multi-store price checking

2. **Add Database**
   - Store price history
   - Track user preferences
   - Save meal plans

3. **Improve UX**
   - Real-time progress updates
   - Better error messages
   - Price trend charts

## Test Checklist

- [ ] Backend starts without errors
- [ ] Health check returns 200
- [ ] API docs accessible
- [ ] Meal plan generation works
- [ ] Frontend loads correctly
- [ ] Extension loads in Chrome
- [ ] Manual shopping list works
- [ ] Full workflow completes
- [ ] Items appear in Barbora cart
- [ ] Error handling works
- [ ] Logs are readable

## Known Limitations

1. **Barbora Only** - Rimi/Maxima not implemented yet
2. **No Price Checking** - Extension doesn't report prices to backend yet
3. **In-Memory Sessions** - Lost on backend restart
4. **No Auth** - Anyone can use the API
5. **Shadow DOM Fragile** - Breaks if Barbora changes HTML

## Getting Help

If tests fail:

1. Check logs (backend + extension console)
2. Verify all dependencies installed
3. Ensure Gemini API key is valid
4. Try with simpler meal preferences
5. Test Barbora manually first

## Success Criteria

✅ **MVP Working When:**
- Backend generates meal plans
- Extension adds items to Barbora cart
- End-to-end workflow completes
- User can shop automatically

🚀 **Ready for Production When:**
- Multi-store comparison works
- Price history tracked
- Error recovery robust
- User accounts added
