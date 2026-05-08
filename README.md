# ⚡ EDC LV 2026 — Group Planner

Real-time group festival planner. Everyone adds their picks and sees the full group schedule instantly — conflicts flagged automatically.

---

## Stack

- **Frontend**: Vanilla HTML / CSS / JS — no build step
- **Realtime DB**: Firebase Firestore (free Spark tier is plenty for a friend group)
- **Hosting**: GitHub Pages

---

## Setup (5 minutes)

### 1. Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `edc-planner-2026`) → Continue
3. Disable Google Analytics if you want → **Create project**

### 2. Add a Web App

1. In your project, click the **`</>`** (Web) icon
2. Register the app with any nickname (e.g. `edc-planner`)
3. Copy the `firebaseConfig` object that appears — you'll need it in the next step

### 3. Set up Firestore

1. In the Firebase console left sidebar → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (allows read/write for 30 days — enough for EDC weekend)
3. Pick any region → **Enable**

### 4. Paste your config into `app.js`

Open `app.js` and replace the `FIREBASE_CONFIG` block at the top:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "edc-planner-2026.firebaseapp.com",
  projectId:         "edc-planner-2026",
  storageBucket:     "edc-planner-2026.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

### 5. Deploy to GitHub Pages

```bash
# 1. Create a new GitHub repo (public)
# 2. Push these files to it
git init
git add .
git commit -m "EDC 2026 group planner"
git remote add origin https://github.com/YOUR_USERNAME/edc-planner.git
git push -u origin main

# 3. Enable GitHub Pages:
#    Repo → Settings → Pages → Source: main branch / root → Save
#    Your site will be live at: https://YOUR_USERNAME.github.io/edc-planner
```

### 6. Share the link with your group

Everyone opens the same URL, enters their name, and adds picks. Updates appear live for everyone — no refresh needed.

---

## How It Works

**🎪 Sign Up tab**
- Enter your name once (remembered across sessions)
- Add each artist pick: Artist · Stage · Night · Start Time · End Time (optional)
- Up to 10 picks per person
- Your picks show instantly for everyone — others' picks appear live too
- You can delete your own picks (✕ button)

**👥 Group Plan tab**
- All picks sorted by night → start time
- Entries by multiple people for the same artist are merged into one row
- Conflicts flagged in red: if the same person has two overlapping sets on the same night

---

## Files

```
edc-planner/
├── index.html   — app shell + markup
├── style.css    — electric sky rave aesthetic
├── app.js       — Firebase logic, rendering, conflict detection
└── README.md    — this file
```

---

## Firestore Security (optional hardening)

After EDC, lock down the database by updating your Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /picks/{doc} {
      allow read: if true;
      allow write: if true; // tighten this if you want auth
    }
  }
}
```

For a friend group the test mode rules are fine for the weekend.
