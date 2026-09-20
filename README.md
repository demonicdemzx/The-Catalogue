# The Catalogue

A private catalogue for your personal library, packaged as an installable web app (PWA).
It has no server, no account and no tracking. Your books are stored in the browser on
the device you use and never leave it.

| File | What it is |
| --- | --- |
| `index.html` | The whole app: HTML, CSS and JavaScript in one file, with no dependencies |
| `sw.js` | Service worker: lets the app open and work with no connection |
| `manifest.webmanifest` | Install details: name, icons, colors |
| `icons/` | App icons |

## Try it on your computer

Run this inside the folder, then open <http://localhost:8000>:

```
python3 -m http.server 8000
```

## Put it on your phone

Phones need the app served over HTTPS. Any static host works. The host only serves
these files; it never sees your books.

- **Netlify:** drag this folder onto <https://app.netlify.com/drop>
- **Cloudflare Pages:** create a project with "Direct Upload" and upload the folder
- **GitHub Pages:** push the files to a repository and turn on Pages (free accounts
  need a public repo; the app code would be public, but your data is not in it)
- **Your own server:** copy the folder to anywhere that serves HTTPS

Then open the address on the phone and install it:

- **iPhone / iPad:** tap Share, then **Add to Home Screen** (or use the Install button in the app)
- **Android (Chrome):** menu, then **Install app** (or use the Install button in the app)
- **Desktop Chrome / Edge:** the install icon in the address bar

## Your data

- **It lives on the device.** Books are saved in the browser's IndexedDB. There is no
  sync between devices.
- **Back up.** Use **Back up to file** now and then. The line at the top of the app
  shows when you last did. Clearing browser data or uninstalling the app deletes the books.
- **Move a library between devices:** on the old device use **Back up to file**, on the
  new one use **Restore from backup**. Restoring only adds books and keeps newer edits;
  it never removes anything.
- **iPhone / iPad:** an app on the Home Screen keeps its own storage, separate from
  Safari, so install first and then add or restore your books. Safari can also clear
  storage for sites you haven't opened in about a week; apps on the Home Screen are not affected.
- **Import:** **Import from CSV** reads a Goodreads export (My Books, Import/Export,
  Export Library) or a CSV saved by **Export to CSV**. Books already in the catalog
  (same title and author) are not duplicated.

## Updating the app

Edit the files and upload them again. On each launch the app quietly fetches the
latest copy, and changes appear the next time it is opened. If you change the file
list or logic in `sw.js`, also raise `VERSION` at the top of that file.

## Fonts

Lora and Courier Prime load from Google Fonts the first time the app runs and are then
saved for offline use. If they can't load, the app falls back to Georgia and Courier New.
To self-host them instead: put the WOFF2 files in a `fonts/` folder, add `@font-face`
rules to `index.html`, remove the Google Fonts `<link>` tags, add the font files to the
`SHELL` list in `sw.js`, and delete the Google Fonts code in `sw.js` (`FONT_CSS`,
`FONT_HOSTS`, `precacheFonts` and `fontResponse`).
