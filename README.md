# The Catalogue

A private catalogue for your personal library, packaged as an installable web app (PWA).
It has no server, no account and no tracking. Your books are stored in the browser on
the device you use and never leave it.

| File | What it is |
| --- | --- |
| `index.html` | The whole app: HTML, CSS and JavaScript in one file, with no dependencies |
| `sw.js` | Service worker: lets the app open and work with no connection |
| `manifest.webmanifest` | Install details: name, icons, colours |
| `icons/` | App icons |

## Try it on your computer

Run this inside the folder, then open <http://localhost:8000>:

```sh
python3 -m http.server 8000
```

In Chrome or Edge, click the install icon in the address bar to add it as an app.
(Opening `index.html` by double-click works as a plain page, but a PWA can only be
installed from `localhost` or an `https://` address.)

## Put it on your phone

Phones need the app served over HTTPS. Any static host works. The host only serves
these files; it never sees your books.

- **Netlify:** drag this folder onto <https://app.netlify.com/drop>
- **Cloudflare Pages:** create a project with "Direct Upload" and upload the folder
- **GitHub Pages:** push the files to a repository and turn on Pages (free accounts
  need a public repo; the app code would be public, but your data is not in it)
- **Your own server:** copy the folder to anywhere that serves HTTPS

Upload the files that are *inside* this folder, so that `index.html` ends up at the top
level of the site. Then open the address on the phone and install it:

- **iPhone / iPad:** tap Share, then **Add to Home Screen** (or use the Install button in the app)
- **Android (Chrome):** menu, then **Install app** (or use the Install button in the app)
- **Desktop Chrome / Edge:** the install icon in the address bar

## Your data

- **It lives on the device.** Books are saved in the browser's IndexedDB. There is no
  sync between devices.
- **Back up.** Use **Back up to file** now and then. The line at the top of the app
  shows when you last did. Clearing browser data or uninstalling the app deletes the books.
- **Move a library between devices:** on the old device use **Back up to file**, on the
  new one use **Restore from backup**. If a book is in both, the more recently edited
  version wins. Restoring never removes anything.
- **iPhone / iPad:** an app on the Home Screen keeps its own storage, separate from
  Safari (this is Apple's design), so install first and then add or restore your books.
  Safari may also delete a website's saved data after about a week of Safari use without
  visiting that site. An app on the Home Screen counts its own days of use, which reset
  whenever you open it, so regular use keeps it safe. Back up anyway.
- **Import:** **Import from CSV** reads a Goodreads export (My Books, Import/Export,
  Export Library) or a CSV saved by **Export to CSV**. Books already in the catalogue
  (same title and author) are not duplicated.
- **Spreadsheets:** in an exported CSV, a text cell that would start with `=`, `+`, `-`
  or `@` gets a leading apostrophe, so a spreadsheet can't run it as a formula. Importing
  the file removes that apostrophe again.

## Privacy

Everything you enter stays in the browser on your device. The app's
Content-Security-Policy (a tag at the top of `index.html`) makes the browser refuse any
connection except to the address the app was loaded from, plus Google Fonts for the two
typefaces. So the app cannot send your books anywhere else.

When the fonts download, Google can see your IP address and that fonts were requested. It
does not see your books. To avoid even that, self-host the fonts (see below). The site
you upload to can see that the page was loaded, as with any website.

## Updating the app

Edit the files and upload them again. The first time the app opens after an update it
downloads the new files in the background; the next time it opens, you see them. If you
change the `CORE` or `EXTRAS` lists or the logic in `sw.js`, also raise `VERSION` at the
top of that file.

## Fonts

Lora and Courier Prime load from Google Fonts the first time the app runs and are then
saved for offline use. If they can't load, the app falls back to Georgia and Courier New.
To self-host them instead: put the WOFF2 files in a `fonts/` folder, add `@font-face`
rules to `index.html`, remove the Google Fonts `<link>` and `<noscript>` tags, remove
`https://fonts.googleapis.com` and `https://fonts.gstatic.com` from the
Content-Security-Policy tag, add the font files to the `EXTRAS` list in `sw.js`, and
delete the Google Fonts code in `sw.js` (`FONT_CSS`, `FONT_HOSTS`, `precacheFonts` and
`fontResponse`).
