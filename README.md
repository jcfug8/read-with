# Kids Stories - Interactive Reading App

An interactive story reading application for kids that uses voice recognition to help them read along. The app highlights words as they're spoken and provides visual and audio feedback.

## How It Works

### Overview
- **Home Page**: Displays a grid of available stories with cover images
- **Story Pages**: Each story is broken into pages with images and sentences
- **Voice Recognition**: Uses browser-based Web Speech API (SpeechRecognition) to recognize spoken words
- **Word Matching**: As words are spoken, they're matched against the current word in the story
- **Progress Tracking**: Words are highlighted in green when completed, current word is highlighted in blue
- **Visual Feedback**: Firework animations appear when words and pages are completed
- **Audio Feedback**: Different sounds play for word completion, sentence completion, and page completion

### Technical Stack
- **Frontend**: Vue 3 (CDN, no build step), vanilla JavaScript ES modules
- **Speech Recognition**: Browser Web Speech API (SpeechRecognition/webkitSpeechRecognition)
- **No Backend Required**: Everything runs client-side in the browser

### Key Features
- Browser-based voice recognition (no server needed)
- Dynamic phrase updates to improve recognition accuracy
- Homophone matching (e.g., "for" matches "four" and "4")
- Prefix matching (handles cases where extra words are spoken)
- Page-by-page navigation
- Visual and audio feedback for engagement

## Adding a New Story

### Step 1: Create Story Directory
Create a new directory in `stories/` with a snake_case name:
```
stories/your_story_name/
```

### Step 2: Create Metadata File
Create `metadata.json` in your story directory:
```json
{
    "title": "Your Story Title",
    "cover_image": "cover.png"
}
```

**Fields:**
- `title`: The display name of your story (will be converted from directory name if not provided)
- `cover_image`: Filename of the cover image (typically `cover.png`)

### Step 3: Create Story Content File
Create `story.json` in your story directory:
```json
{
    "pages": [
        {
            "sentences": [
                "First sentence of page one.",
                "Second sentence of page one."
            ],
            "images": [
                "page_1.png"
            ]
        },
        {
            "sentences": [
                "First sentence of page two.",
                "Second sentence of page two."
            ],
            "images": [
                "page_2.png"
            ]
        }
    ]
}
```

**Structure:**
- `pages`: Array of page objects
- Each page has:
  - `sentences`: Array of strings (one sentence per string)
  - `images`: Array of image filenames (relative to the story directory)

### Step 4: Add Images
Place your images in the story directory:
- `cover.png` - Cover image (shown on home page and cover pages)
- `page_1.png`, `page_2.png`, etc. - Page images (any image format works: .png, .jpg, etc.)

### Step 5: Register the Story
Add your story directory name to `stories/index.json`:
```json
{
  "stories": [
    "existing_story_1",
    "existing_story_2",
    "your_story_name"
  ]
}
```

### Example: Complete Story Structure
```
stories/
  the_cat_and_the_ball/
    ├── metadata.json
    ├── story.json
    ├── cover.png
    ├── page_1.png
    ├── page_2.png
    └── page_3.png
```

## File Structure

```
kids/
├── index.html              # Home page
├── story.html              # Story reader page
├── style.css               # Global styles
├── scripts/
│   ├── home.js             # Home page Vue component
│   ├── story.js            # Story page Vue component
│   ├── story-page.js       # Individual page component
│   ├── sentence.js         # Sentence component
│   ├── word.js             # Word component (handles matching)
│   ├── recognize.js        # Voice recognition component
│   └── homophone.js        # Homophone matching logic
└── stories/
    ├── index.json          # List of available stories
    └── [story_name]/
        ├── metadata.json   # Story metadata
        ├── story.json      # Story content
        ├── cover.png       # Cover image
        └── page_*.png      # Page images
```

## Running the Application

### Setup (No Build Required)
1. Start a local HTTP server (required for ES modules):
   ```bash
   python3 -m http.server 8000
   ```
2. Open `http://localhost:8000` in your browser

**Note**: The app uses browser-based speech recognition, so no backend server is required. Just serve the files via HTTP and use a browser that supports the Web Speech API (Chrome, Edge, Safari).

## Tips for Creating Stories

1. **Sentence Length**: Keep sentences short and simple for young readers
2. **Image Naming**: Use consistent naming (e.g., `page_1.png`, `page_2.png`)
3. **Image Formats**: PNG, JPG, and other web formats are supported
4. **Punctuation**: The app automatically handles punctuation when matching words
5. **Quotes**: Escape quotes in dialogue: `"Hello," said Bear.` becomes `"\"Hello,\" said Bear."`

## Troubleshooting

- **Stories not showing**: Make sure the directory name is added to `stories/index.json`
- **Images not loading**: Check that image filenames in `story.json` match actual files
- **Voice recognition not working**: 
  - Make sure you're using a browser that supports Web Speech API (Chrome, Edge, Safari)
  - Grant microphone permissions when prompted
  - Check that you're accessing via HTTP (not file://) - required for ES modules
- **CORS errors**: Make sure you're accessing via HTTP (not file://)
- **Speech recognition button disabled**: Your browser may not support the Web Speech API

