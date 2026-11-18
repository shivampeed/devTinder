# DevTinder setup guide

A step-by-step guide to running DevTinder on a Mac and putting it online for free. For what the project is and how it works, see the [main README](../README.md).

```
devTinder/
  backend/    Node + Express + MongoDB API (runs on port 7777)
  frontend/   React + Vite + Tailwind + daisyUI (runs on port 5173)
```

The frontend always calls the API at `/api`. On your Mac, Vite forwards `/api` to the backend. On Netlify, Netlify forwards `/api` to your hosted backend. Because the browser only ever talks to one address, the login cookie works the same way everywhere, including in Safari.

---

## Part 1: Run it on your MacBook

### 1. Install Node.js

You need Node.js 22 or newer. Download the LTS installer from https://nodejs.org, or if you use Homebrew run `brew install node`. Then check it in Terminal:

```bash
node -v    # should print v22.x or higher
```

### 2. Get a MongoDB database

The easiest choice is a free MongoDB Atlas cluster, because you can use the same database later when the app is online.

1. Sign up at https://www.mongodb.com/cloud/atlas and create a free cluster.
2. Under Security, add a **database user** with a username and password. Write the password down.
3. Under **Network Access**, add the IP address `0.0.0.0/0` (allow from anywhere). Your Mac and Render both need to reach the database, and Render's address changes.
4. Click **Connect > Drivers** and copy the connection string. It looks like this:
   `mongodb+srv://USERNAME:PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
5. Put your real password in it, and add the database name `devTinder` right before the `?`:
   `mongodb+srv://USERNAME:PASSWORD@cluster0.abcde.mongodb.net/devTinder?retryWrites=true&w=majority`

Use a database password with only letters and numbers. Symbols like `@`, `#` or `/` break the connection string.

Prefer MongoDB on your Mac instead? Run `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community` and use `mongodb://127.0.0.1:27017/devTinder` as the connection string.

### 3. Add your settings

Open Terminal in the `devTinder` folder (for example `cd ~/Downloads/devTinder`) and run:

```bash
cp backend/.env.example backend/.env
openssl rand -hex 32        # copy this output, it is your JWT_SECRET
open -e backend/.env        # opens the file in TextEdit
```

Fill in `DB_CONNECTION_SECRET` (your connection string from step 2) and `JWT_SECRET` (the random text from `openssl`). Save the file. The other lines can stay as they are.

### 4. Install and start

```bash
npm install     # installs everything for the root, backend and frontend
npm run dev     # starts the backend and the frontend together
```

Open **http://localhost:5173** in your browser. Press `Ctrl + C` in Terminal to stop both.

You can also run them in two separate Terminal tabs: `cd backend && npm run dev` and `cd frontend && npm run dev`.

### If something goes wrong

**"Missing environment variables"** means `backend/.env` is missing or a value is empty. Go back to step 3.

**"Database cannot be connected"** usually means a wrong password in the connection string, a password with special symbols, or that `0.0.0.0/0` is missing from Atlas Network Access.

**"Can't reach the server"** in the browser means the backend is not running. Look at the `[api]` lines in Terminal for the real error.

**"Port 7777 is already in use"**: the app is probably already running in another Terminal window. Stop it there with `Ctrl + C`. If you can't find it, `lsof -i :7777` shows what is using the port.

**npm says "5 high severity vulnerabilities" while installing the frontend**: these are inside Vite's build tools on your Mac, not in the app people use, and there is no fixed version yet. Do not run `npm audit fix --force`, because it downgrades Vite and breaks the build.

**Sign up fails with a password error**: the password needs at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol, for example `Hello@123`.

---

## Part 2: Put it online

Netlify only hosts static websites, so it can run the frontend but not the Express server. The plan is:

| Part | Where | Cost |
|---|---|---|
| Frontend | Netlify | Free |
| Backend | Render (web service) | Free |
| Database | MongoDB Atlas (the one you made in Part 1) | Free |

### Step A: Put the code on GitHub

Create an empty repository on GitHub (for example `devTinder`), then in the `devTinder` folder run:

```bash
git init
git add .
git commit -m "DevTinder"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/devTinder.git
git push -u origin main
```

Your `backend/.env` file is in `.gitignore`, so your passwords will not be uploaded. Keep it that way.

### Step B: Deploy the backend on Render

1. Sign up at https://render.com with your GitHub account.
2. Click **New > Web Service** and pick your `devTinder` repository.
3. Fill in:
   - **Root Directory:** `backend`
   - **Runtime / Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Under **Environment Variables**, add:
   - `DB_CONNECTION_SECRET` = your Atlas connection string
   - `JWT_SECRET` = a long random string (you can reuse the one from your `.env`)
   - `NODE_ENV` = `production`
5. Optional: under Advanced, set **Health Check Path** to `/health`.
6. Click **Deploy**. When it finishes, copy your backend address, for example `https://devtinder-api.onrender.com`. Open that address with `/health` at the end; you should see `{"status":"ok"}`.

### Step C: Deploy the frontend on Netlify

1. Sign up at https://www.netlify.com with your GitHub account.
2. Add a new site/project and choose **Import an existing project** from GitHub. Pick your `devTinder` repository.
3. Set **Base directory** to `frontend`. Netlify then reads `frontend/netlify.toml`, which already sets the build command (`npm run build:netlify`) and the publish folder (`dist`).
4. Add an environment variable:
   - `BACKEND_URL` = your Render address from Step B, for example `https://devtinder-api.onrender.com`
5. Click **Deploy**. Open your `.netlify.app` address and sign up.

If the Netlify build stops with "BACKEND_URL is not set", add the variable from step 4 and click **Retry deploy**.

### Good to know

**The first visit can be slow.** Render's free server goes to sleep after 15 minutes with no visitors, and takes about a minute to wake up. The app shows "Waking up the server..." and keeps trying on its own, so just wait. A paid Render plan removes the sleep.

**Updating the site** is just `git add . && git commit -m "my change" && git push`. Render and Netlify both rebuild on their own.

**Emails are optional.** Email sending is switched off until you add your AWS keys (see "Turning on emails" below). The app runs fine without it.

**Chat and online status work online with no extra settings.** Netlify's `/api` forwarding can't carry live chat connections, so the chat page connects straight to your Render address. It gets that address from the same `BACKEND_URL` variable when Netlify builds the site. If you change `BACKEND_URL` later, click **Trigger deploy** in Netlify so the chat picks up the new address.

### Optional: your own domain name (like devtinder.in)

1. Buy a domain from any seller (GoDaddy, Namecheap, Hostinger and so on).
2. In Netlify, open your site, go to **Domain management**, and click **Add a domain**. Type your domain and follow the steps.
3. Netlify shows you exactly which DNS records to add. You can either switch your domain's nameservers to Netlify (simplest), or add the records at your domain seller or at Cloudflare. If you use Cloudflare, set the records to **DNS only** (grey cloud), so Netlify can create the HTTPS certificate.
4. Wait for DNS to update (from a few minutes to a few hours). Netlify then turns on HTTPS by itself.

Nothing in the code or on Render needs to change, because the site keeps calling `/api` on whatever domain it's opened from.

### Optional: turning on emails (Amazon SES)

With email on, people get an email when someone clicks **Interested** on them, and a reminder at 8 AM (India time) if they got requests the day before.

1. In AWS, open **Amazon SES** in the **Mumbai (ap-south-1)** region and verify the email address (or domain) you'll send from.
2. New SES accounts start in "sandbox" mode, where you can only send to addresses you've verified too. To email anyone, request **production access** in SES.
3. In **IAM**, create a user with the `AmazonSESFullAccess` permission, then create an **access key** for it under Security credentials.
4. Add these to `backend/.env` on your Mac, and to Render's environment variables when you deploy:
   - `AWS_ACCESS_KEY` and `AWS_SECRET_KEY` = the access key from step 3
   - `SES_FROM_EMAIL` = the address you verified in step 1

The server prints "Email is set up" when it starts if it found them. On Render's free plan the server sleeps when nobody is using it, so the 8 AM reminder only runs if the server happens to be awake then.

---

## Using the app

**Sign up / Login.** The password needs 8+ characters with an uppercase letter, a lowercase letter, a number and a symbol.

**Profile** (click your photo at the top right > Profile). Edit your name, photo link, age, gender, about and skills. The card on the right shows how others see you.

**Feed** (click the DevTinder logo). One developer at a time. **Interested** sends them a request, **Ignore** skips them. Each person only shows up once.

**Requests.** People who were Interested in you. **Accept** makes you connections.

**Connections.** Everyone you've matched with. A **green dot** and "Online" mean they have DevTinder open right now; otherwise it says "Last seen 2 hours ago". Only your connections can see this about you.

**Chat** (the button on each connection). Real-time messages. The newest 30 load first; scroll up and click **Load earlier messages** for older ones. People who aren't your connections can't open your chat.

To try it alone, sign up a second account in a private window (**Cmd + Shift + N**), so both accounts stay logged in at the same time.
