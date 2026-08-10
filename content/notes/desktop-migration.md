---
title: Move the Server to the Desktop
tags: [setup, hosting, server]
summary: Copy-paste runbook for migrating the owl-library host from the laptop to the always-on desktop over RustDesk.
created: '2026-08-09'
updated: '2026-08-09'
status: final
space: haman
---

Runbook for moving the live site (server + Cloudflare tunnel) from the laptop to the desktop. Every block is copy-paste ready. Rule of thumb: **only one machine hosts at a time**; the last step turns the laptop off.

## 1. Windows: install WSL

PowerShell **as administrator**:

```powershell
wsl --install -d Ubuntu
```

Reboot, open the "Ubuntu" app, create your Linux user. Everything below runs inside Ubuntu unless marked Windows.

## 2. Node, GitHub, clone, build

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm alias default 22
mkdir -p ~/bin && ln -sf "$(command -v node)" ~/bin/node
sudo apt update && sudo apt install -y gh
gh auth login
```

(`gh auth login`: pick GitHub.com → HTTPS → login with browser; the repo is private.)

```bash
git clone https://github.com/aalahmed98/owl-library.git ~/owl-library
cd ~/owl-library && npm install && npm run build
```

Sanity check (then **Ctrl+C** to stop it; no second terminal needed):

```bash
npm start
# open http://localhost:7333 on the desktop, confirm the login page, Ctrl+C
```

## 3. Cloudflared binary

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ~/bin/cloudflared && chmod +x ~/bin/cloudflared
```

## 4. Create the desktop's own tunnel

No file copying: mint a fresh tunnel on the desktop and repoint DNS at it. One browser login, three commands.

```bash
export PATH="$HOME/bin:$PATH"
cloudflared tunnel login
```

Open the printed `dash.cloudflare.com` URL in the desktop's browser, log in, pick `owl-library.com`. Then:

```bash
cloudflared tunnel create owl-library-desktop
cloudflared tunnel route dns --overwrite-dns owl-library-desktop archive.owl-library.com
ID=$(cloudflared tunnel list | awk '/owl-library-desktop/{print $1; exit}')
cat > ~/.cloudflared/config.yml <<EOF
tunnel: $ID
credentials-file: $HOME/.cloudflared/$ID.json
ingress:
  - hostname: archive.owl-library.com
    service: http://localhost:7333
  - service: http_status:404
EOF
```

**Timing note:** `route dns` repoints the public site to the desktop immediately; it's down until step 5's services are running, so do step 5 right after. Afterwards, the old laptop tunnel (`owl-library`, id b15b8656) can be deleted from Cloudflare.

## 5. Services that survive reboots

```bash
loginctl enable-linger $USER
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/owl-library.service <<'EOF'
[Unit]
Description=owl-library server
After=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/owl-library
ExecStart=%h/bin/node dist/server/main.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
EOF

cat > ~/.config/systemd/user/owl-library-tunnel.service <<'EOF'
[Unit]
Description=Cloudflare Tunnel for owl-library
After=network-online.target owl-library.service
Requires=owl-library.service

[Service]
Type=simple
ExecStart=%h/bin/cloudflared tunnel --config %h/.cloudflared/config.yml run
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now owl-library.service owl-library-tunnel.service
systemctl --user status owl-library.service owl-library-tunnel.service --no-pager | head -20
```

## 6. Windows: start WSL on boot

Windows side: Task Scheduler → Create Task…

- General: name `WSL owl-library`, check **Run whether user is logged on or not**
- Triggers: New → **At startup**
- Actions: New → Program: `wsl.exe` → Arguments: `-d Ubuntu --exec /bin/true`
- OK (enter your Windows password when asked)

## 7. Turn the laptop host off (LAST step)

Only after https://archive.owl-library.com works with the desktop running and the laptop's services stopped. On the **laptop**:

```bash
systemctl --user disable --now owl-library.service owl-library-tunnel.service
```

## Afterwards

- Personal passwords are per-machine (`.auth.json` never leaves the host); you and Ali set them fresh on first visit to the desktop-hosted site.
- Docs created on the laptop after its last `git push` won't be on the desktop; push from the laptop and `git pull` on the desktop before switching if in doubt.
- Code updates later: on the desktop, `cd ~/owl-library && git pull && npm install && npm run build && systemctl --user restart owl-library.service`.
- If the site is down: `systemctl --user status owl-library owl-library-tunnel` on the desktop is the first thing to check.
