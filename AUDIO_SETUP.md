# Audio Setup Guide

The Quran Audio Player now supports audio playback using the **alQuran.cloud API**, which provides direct CORS-free audio URLs. This solution works on GitHub Pages without requiring a backend proxy!

## How It Works (GitHub Pages & Production)

The app uses the **alQuran.cloud API** to fetch audio URLs:
1. Fetches available audio recitations from `https://api.alquran.cloud/v1/edition?format=audio`
2. Requests a surah with audio edition: `https://api.alquran.cloud/v1/surah/{number}/{recitation}`
3. Extracts the audio URL from the first ayah (verse) of the surah
4. Plays the audio via the browser's HTML5 audio element

**Why this works on GitHub Pages:**
- The API endpoint returns audio URLs that point to `cdn.islamic.network`, which serves MP3 files with proper CORS headers
- No CORS restrictions apply to the audio file URLs themselves
- No backend proxy needed!

## Quick Start

### Option 1: GitHub Pages (Recommended)

Just visit: https://houdaifazaidi.github.io/QuranReciter/

Audio will play automatically using the alQuran.cloud API.

### Option 2: Local Development

Clone and run:

```bash
git clone https://github.com/houdaifazaidi/QuranReciter.git
cd QuranReciter
node server.js
```

Then open http://localhost:3000

**How local mode enhances experience:**
- Falls back to local proxy if alQuran.cloud API is unavailable
- Faster loading via local caching
- Can test with custom recitations

---

## Available Recitations (Audio Editions)

The app automatically loads available Arabic recitations from alQuran.cloud:

- **Abdul Basit AbdulSamad** (Murattal) - Most popular
- **Abdul Basit AbdulSamad** (Mujawwad)
- **Abdur-Rahman as-Sudais**
- **Abu Bakr al-Shatri**
- **Hani ar-Rifai**
- **Mahmoud Khalil Al-Husary**
- And many more...

The app selects the first available recitation by default.

---

## Technical Details

### Audio Extraction Logic

When you click to play a Surah:

1. **Fetch from API**: `GET https://api.alquran.cloud/v1/surah/{number}/{recitation}`
   ```json
   {
     "code": 200,
     "data": {
       "number": 1,
       "ayahs": [
         {
           "audio": "https://cdn.islamic.network/quran/audio/192/ar.abdulbasitmurattal/1.mp3",
           ...
         }
       ]
     }
   }
   ```

2. **Extract audio URL** from `data.ayahs[0].audio`
3. **Load and play** using HTML5 audio element

### Fallback Priority

If alQuran.cloud fails, the app tries (in order):
1. Local hardcoded audio paths (if audio files are in the repo)
2. Local proxy server `/audio/surah/:num` (if running `node server.js`)
3. Direct remote CDN mirrors

---

## Troubleshooting

**Q: Audio doesn't play on GitHub Pages**  
A: Check browser console (F12 → Console). The app logs which sources it's trying. If alQuran.cloud API is blocked, verify your browser/network allows access to `api.alquran.cloud`.

**Q: Audio plays but sounds distorted**  
A: This is likely a specific recitation issue. Try a different recitation by:
- Modifying `this.state.selectedRecitationEdition` in `script.js` to a different identifier
- Example: `'ar.abdurrahmaansudais'` instead of `'ar.abdulbasitmurattal'`

**Q: How do I add a custom recitation?**  
A: 
1. Get the recitation identifier from `https://api.alquran.cloud/v1/edition?language=ar&format=audio`
2. Update `fetchAudioEditions()` to select a different edition
3. Or hardcode: `this.state.selectedRecitationEdition = 'ar.your-recitation-id'`

**Q: Can I use a different audio source?**  
A: Yes! The fallback system tries multiple sources:
   - Update `loadRealAudio()` to add more candidate URLs
   - Or deploy a backend proxy using Vercel, Netlify, etc.

---

## For Developers

### Testing Audio Sources

```bash
# List all Arabic audio editions
curl "https://api.alquran.cloud/v1/edition?language=ar&format=audio" | jq '.data[] | .identifier' | head -10

# Get a specific surah with audio
curl "https://api.alquran.cloud/v1/surah/1/ar.abdulbasitmurattal" | jq '.data.ayahs[0].audio'

# Test if audio URL is accessible
curl -I "https://cdn.islamic.network/quran/audio/192/ar.abdulbasitmurattal/1.mp3"
```

### Adding More Recitations to UI

Currently, the app uses the first available recitation. To add a dropdown selector:

```javascript
// In setupEventListeners() or a new method:
const recitationSelect = document.getElementById('recitationSelect');
this.state.audioEditions.forEach(ed => {
  const option = document.createElement('option');
  option.value = ed.identifier;
  option.textContent = ed.englishName;
  recitationSelect.appendChild(option);
});

recitationSelect.addEventListener('change', (e) => {
  this.state.selectedRecitationEdition = e.target.value;
  // Update all sourate audioUrls...
});
```

---

## API Credits

- **Chapter metadata**: [Quran.com API](https://quran.com)
- **Audio files & recitations**: [alQuran.cloud API](https://alquran.cloud)
- **CDN hosting**: [islamic.network](https://islamic.network)

All audio is free and provided under the [Creative Commons license](https://alquran.cloud).

