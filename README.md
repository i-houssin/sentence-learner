# Sentence Learner

**Hear it. Type it. Learn it.**

An independently branded, free English-learning application based on [Qwerty Learner](https://github.com/RealKai42/qwerty-learner). Instead of one word at a time, listen to and type **complete sentences**.

## What works

- Eight original courses, **80 chapters and 800 distinct sentences**, ranging from A1 to B2.
- Everyday English, Travel English, Social Conversations, Work & Business, Study & Campus, Technology & Ideas, Short Stories, and Grammar in Context.
- Three modes: Read + type, first-letter hints, and audio-only dictation.
- Full-sentence browser speech, English voice selection, 0.5–2× speed, one to five readings, replay, and opt-in automatic playback after the first explicit Play gesture.
- Optional capitalization and punctuation matching, correction feedback, mistake review, bookmarks, and skip-to-review.
- Local progress, resume, active-time statistics, typing accuracy, standard five-character WPM, daily goals, and local-date streaks.
- Personal course import from JSON or CSV, with validation and no silent overwriting.
- Validated progress backup export/restore, dark mode, keyboard shortcuts, and responsive native input.
- No application account, paid speech API, analytics, or backend required.

### Keyboard shortcuts

| Shortcut      | Action                                                         |
| ------------- | -------------------------------------------------------------- |
| Enter         | Check the current sentence, or continue after a correct answer |
| Shift + Enter | New line in the answer                                         |
| Alt + R       | Play/replay sentence audio                                     |
| Alt + H       | Reveal the sentence                                            |

Tab remains normal accessible keyboard navigation. Pasting into the practice answer is disabled so the exercise measures typing.

## Development

Use Node **22.19+** (Node 24 is also supported).

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser tests use bundled headless Chromium on Linux. On macOS/Windows install the standard Playwright browser first with `npx playwright install chromium`. Set PLAYWRIGHT_USE_SYSTEM_BROWSER=1 to opt out of the Linux bundled executable. Run the build before browser tests; their web server uses the production preview on port 4173.

## Deploy to Vercel

1. Import **this repository**, not the upstream project, into your own Vercel account.
2. Choose the branch you want to preview. The implementation initially lives in feat/sentence-practice.
3. Framework preset: **Vite**.
4. Install command: **npm ci**. Build command: **npm run build**. Output directory: **dist**.
5. Use Node **22.x** at a current patch level or **24.x**. No environment variables or API keys are needed.
6. Deploy a preview and check course, practice, and Settings routes. vercel.json includes SPA route rewrites and basic security headers.
7. Merge the reviewed branch when ready for the production deployment.

The original upstream project used a build directory. This app explicitly uses **dist**; do not copy the upstream output-directory setting.

## Bring your own courses

Import JSON with this shape:

```json
{
  "id": "my-course",
  "title": "My first course",
  "level": "A2",
  "chapters": [
    {
      "id": "one",
      "title": "A fresh start",
      "sentences": [
        { "id": "one", "text": "A little practice makes a real difference.", "hint": "Small efforts help you improve." }
      ]
    }
  ]
}
```

CSV requires a **text** header. Optional headers: **chapter**, **hint**. Standard quoted commas, escaped double quotes, CRLF, and multiline fields are supported. Download examples from the import dialog. Every import gets a fresh course ID; it cannot overwrite a built-in or existing custom course. Limits: 3 MB per import, 30 custom courses, 200 chapters and 10,000 sentences per course, 600 characters per sentence. Only import material you own or are licensed to use.

## Data, audio, and limitations

Learning data is stored under sentence-learner:v1 in browser localStorage. Export a backup from Settings before clearing site data or changing devices. There is **no cloud sync**; an unsubmitted typing draft is not restored. The most recent 5,000 answer records are retained; chapter completion and saved sentences are kept separately. Backups include custom courses. Restore replaces current local data only after an explicit confirmation. Unreadable local data is not silently overwritten.

Audio uses SpeechSynthesis, so voice availability and quality depend on the browser and installed English voices. Some voices require an internet connection and may send sentence text to the device's speech provider. Audio is not guaranteed to work offline. A visible Read + type fallback remains available. The app does not access the microphone.

Active time counts focused typing activity and pauses after 15 seconds of inactivity. WPM uses correct sentence characters divided by five over active minutes. Speech-only listening time is not included. A clean, unassisted dictation review clears a mistake; revealing text or using hints keeps it queued. CEFR levels are practical course labels, not certified proficiency assessments.

The UI has no payments, subscriptions, account system, or global leaderboard. Hosting remains subject to your Vercel account's plan and usage limits.

## License and origins

**GPL-3.0-only.** See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for upstream attribution, exact source revision, and modification details. Keep the notices and make corresponding source available as required when distributing this app. The application includes an About & open source page linking to source and license.

The starter sentences are original project content, not a copy of YouType's paid courses or recordings. This project is not affiliated with YouType or Qwerty Learner's maintainers.
