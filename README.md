# Social Post Tracker

A Chrome extension that adds a location tracking button to Threads and Facebook posts. Click the map pin icon next to any post's share button to submit a location-based report to a Google Form.

## Features

- Adds a report button (map pin icon) next to the share button on every post
- Popup with an interactive NLSC map for selecting a location
- Auto-fills the post URL and post time
- Supports coordinate input via map click or manual paste
- Submits reports directly to a configurable Google Form
- Works on:
  - threads.net / threads.com
  - facebook.com (feed, search results, individual posts, video/reel posts)

## Installation

1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select this directory

## Configuration

1. Right-click the extension icon and select "Options" (or go to the extension's options page)
2. Enter your Google Form URL
3. Map each form field to its entry ID (e.g., `entry.123456789`)
   - Post URL
   - Post Time
   - Latitude
   - Longitude
   - Notes

To find entry IDs, open your Google Form's pre-filled link and look for `entry.XXXXXXXXX` parameters in the URL.

## Usage

1. Browse Threads or Facebook
2. Click the map pin icon next to any post's share button
3. Click on the map to set the location (or paste coordinates)
4. Add optional notes
5. Click "Submit Report"

## Facebook-specific Notes

- Post timestamps use CSS obfuscation; the extension decodes them automatically
- On search result pages, the extension triggers a hover event on the timestamp link to resolve the actual post URL
- Supports various post types: regular posts, photo posts, video posts, reels, and shared posts

## License

MIT License - see [LICENSE](LICENSE)
