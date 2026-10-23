# লেক্সিম.বাংলা — Namecheap-এ lexeme.bnwp.org হোস্ট করার গাইড

দুই ধরনের Namecheap হোস্টিংয়ের জন্যই ধাপ আছে: **শেয়ার্ড হোস্টিং (cPanel)** আর **VPS**।

## ০. আগে যাচাই: Node-এর সংস্করণ (সবচেয়ে জরুরি)

ডাটাবেজ চলে Node-এর ভেতরের SQLite-এ (`node:sqlite`), তাই **Node ২২.১৩ বা নতুন** লাগবে।
- **cPanel:** "Setup Node.js App" খুলে "Node.js version" তালিকায় ২২ বা ২৪ আছে কিনা দেখুন। না থাকলে Namecheap সাপোর্টকে জিজ্ঞেস করুন, অথবা VPS নিন। পুরোনো Node-এ সাইট চালু হবে না।
- **VPS:** যেকোনো সংস্করণ বসানো যায় (নিচে ধাপ B২)।

---

## A. শেয়ার্ড হোস্টিং (cPanel)

### A১. সাবডোমেইন
cPanel → **Domains** → `lexeme.bnwp.org` তৈরি করুন। bnwp.org-এর DNS Namecheap-এ থাকলে আর কিছু করতে হয় না।

### A২. কোড আপলোড
সহজ পথ: cPanel → **Git Version Control** → Create → Clone URL `https://github.com/aishikrehman/Lexeme` → Repository Path `lexeme` (হোম ফোল্ডারের ভেতরে, `public_html`-এর বাইরে)।
(অথবা ZIP বানিয়ে File Manager দিয়ে `~/lexeme`-এ আপলোড করে Extract।)

### A৩. Node অ্যাপ তৈরি
cPanel → **Setup Node.js App** → Create Application:
- Node.js version: **22 বা 24**
- Application mode: Production
- Application root: `lexeme`
- Application URL: `lexeme.bnwp.org`
- Application startup file: `server.js`

### A৪. গোপন তথ্য (Environment variables)
একই পাতায় "Environment variables"-এ যোগ করুন:

| নাম | মান |
|---|---|
| `PUBLIC_URL` | `https://lexeme.bnwp.org` |
| `OAUTH_CONSUMER_KEY` | এখনকার consumer token (ঠিকানা একই, তাই নতুন লাগবে না) |
| `OAUTH_CONSUMER_SECRET` | এখনকার secret |
| `STORE_DIR` | `/home/<cpanel-user>/lexeme-data` (কোডের ফোল্ডারের বাইরে, যাতে আপডেটে মুছে না যায়) |

`PORT` দেবেন না — cPanel (Passenger) নিজেই দেয়। কোনো প্যাকেজ নেই, তাই "Run NPM Install"-এর দরকার নেই।
তারপর **Start / Restart**।

### A৫. HTTPS
cPanel → **SSL/TLS Status** → `lexeme.bnwp.org` বেছে **Run AutoSSL**। সার্টিফিকেট আসার পর সাইট `https://`-এ খুলবে।

### A৬. আপডেট
GitHub-এ push করার পর: Git Version Control → Manage → **Update from Remote**, তারপর Setup Node.js App → **Restart**।

---

## B. VPS (Ubuntu)

### B১. DNS
Namecheap → Domain List → bnwp.org → Advanced DNS → **A Record**: Host `lexeme`, Value = VPS-এর IP।

### B২. Node বসানো
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
```
```bash
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
```

### B৩. কোড
```bash
sudo git clone https://github.com/aishikrehman/Lexeme /opt/lexeme
```

### B৪. সার্ভিস হিসেবে চালানো
`/etc/systemd/system/lexeme.service` ফাইলে:
```ini
[Unit]
Description=lexeme.bnwp.org
After=network.target

[Service]
WorkingDirectory=/opt/lexeme
ExecStart=/usr/bin/node server.js
Environment=PORT=3000
Environment=PUBLIC_URL=https://lexeme.bnwp.org
Environment=STORE_DIR=/var/lib/lexeme
EnvironmentFile=/etc/lexeme.env
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```
গোপন কী আলাদা ফাইলে, `/etc/lexeme.env` (শুধু root পড়তে পারবে):
```ini
OAUTH_CONSUMER_KEY=...
OAUTH_CONSUMER_SECRET=...
```
```bash
sudo mkdir -p /var/lib/lexeme && sudo chown www-data /var/lib/lexeme && sudo chmod 600 /etc/lexeme.env
```
```bash
sudo systemctl enable --now lexeme
```

### B৫. nginx আর HTTPS
`/etc/nginx/sites-available/lexeme`:
```nginx
server {
  server_name lexeme.bnwp.org;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/lexeme /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
```
```bash
sudo certbot --nginx -d lexeme.bnwp.org
```

### B৬. আপডেট
```bash
cd /opt/lexeme && sudo git pull && sudo systemctl restart lexeme
```

---

## C. যাচাই (দুই ধরনেই)

- `https://lexeme.bnwp.org/auth/me` — `"missing": []` থাকলে লগ ইন ঠিক আছে।
- লগ ইন করে স্টুডিওতে বক্তা যোগ করুন, অন্য ব্রাউজারে লগ ইন করে দেখুন এসেছে কিনা।
- ডাটাবেজ ফাইল: `STORE_DIR/lexeme.db` — মাঝে মাঝে এর কপি রাখুন (ব্যাকআপ)।
