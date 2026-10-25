# Push to GitHub

This project is **not** part of `rorush-automation`. VPS path suggestion: `/opt/goldpump-automation`.

```bash
cp deploy/github-push.env.example deploy/github-push.env
# add GITHUB_TOKEN (repo scope)
npm run push-github
```

Or reuse the same PAT as RoRush: copy `deploy/github-push.env` from your RoRush clone into this folder.

## VPS clone (first time)

```bash
git clone https://github.com/primary-yk/goldpump-automation.git /opt/goldpump-automation
cd /opt/goldpump-automation
cp .env.example .env
openssl rand -base64 32   # ENCRYPTION_KEY
npm install
npm run add-account
npm run dev
```
