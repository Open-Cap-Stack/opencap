# Daily Report Setup Guide

This guide walks through setting up automated daily progress reports for the OpenCap Stack project on macOS.

---

## Overview

The daily report system automatically generates a markdown report at 11:59 PM each day, summarizing:
- Git commits
- Issues closed
- PRs merged
- Developer velocity metrics
- Files modified

**Output Location:** `docs/reports/daily/DAILY_REPORT_YYYY-MM-DD_username.md`

---

## Prerequisites

- macOS (tested on macOS 14+)
- Git installed and configured
- GitHub CLI (`gh`) installed and authenticated
- Terminal access

### Install GitHub CLI (if not installed)

```bash
brew install gh
gh auth login
```

---

## Setup Steps

### Step 1: Configure User Identity

Edit `.claude/user-identities.json` with your GitHub information:

```json
{
  "git_emails": [
    "your-github-noreply-email@users.noreply.github.com"
  ],
  "github_usernames": [
    "your-github-username"
  ],
  "primary_name": "your-github-username",
  "primary_email": "your-github-noreply-email@users.noreply.github.com",
  "description": "GitHub identity for your-github-username"
}
```

**To find your GitHub noreply email:**
```bash
git config user.email
# Or check: https://github.com/settings/emails
```

---

### Step 2: Update the Script Configuration

Edit `scripts/generate-daily-report.sh` and update these variables (lines 12-14):

```bash
# Configuration
PROJECT_DIR="/path/to/your/opencapstack"    # Update this path
GITHUB_USER="your-github-username"           # Your GitHub username
GIT_EMAIL="your-email@users.noreply.github.com"  # Your git email
```

---

### Step 3: Make Script Executable

```bash
chmod +x scripts/generate-daily-report.sh
```

---

### Step 4: Create Required Directories

```bash
mkdir -p docs/reports/daily
mkdir -p logs
```

---

### Step 5: Test the Script

```bash
./scripts/generate-daily-report.sh
```

**Expected output:**
```
Daily report generated: docs/reports/daily/DAILY_REPORT_YYYY-MM-DD_username.md
```

---

### Step 6: Grant macOS Permissions (CRITICAL)

macOS blocks cron jobs by default for security. You must grant Full Disk Access to cron.

1. Open **System Settings** (Apple menu → System Settings)
2. Click **Privacy & Security** in the sidebar
3. Scroll down and click **Full Disk Access**
4. Click the **+** button at the bottom
5. Press **Cmd + Shift + G** to open "Go to folder"
6. Type: `/usr/sbin/cron` and press **Enter**
7. Select `cron` and click **Open**
8. Ensure the toggle next to `cron` is **ON**

**Path to add:** `/usr/sbin/cron`

![Full Disk Access Location](https://support.apple.com/library/content/dam/edam/applecare/images/en_US/macos/Monterey/macos-monterey-system-preferences-security-privacy-full-disk-access.png)

---

### Step 7: Set Up Cron Job

```bash
# Open crontab editor
crontab -e

# Add this line (runs at 11:59 PM daily):
59 23 * * * /path/to/opencapstack/scripts/generate-daily-report.sh >> /path/to/opencapstack/logs/daily-report.log 2>&1
```

**Or use this one-liner:**
```bash
echo "59 23 * * * /Users/$(whoami)/Desktop/opencapstack/scripts/generate-daily-report.sh >> /Users/$(whoami)/Desktop/opencapstack/logs/daily-report.log 2>&1" | crontab -
```

**Verify cron job:**
```bash
crontab -l
```

---

### Step 8: Test Cron Execution

Set a test cron for 2 minutes from now:

```bash
# Get current time
date '+%H:%M'

# Set test cron (replace MM with current minutes + 2, HH with current hour)
echo "MM HH * * * /path/to/scripts/generate-daily-report.sh >> /path/to/logs/daily-report.log 2>&1" | crontab -

# Wait and check log
cat logs/daily-report.log
```

---

## Troubleshooting

### Issue: "Operation not permitted" in logs

**Cause:** macOS security blocking cron execution.

**Solution:** Grant Full Disk Access to `/usr/sbin/cron` (see Step 6).

---

### Issue: Empty or missing metrics

**Cause:** GitHub CLI not authenticated or wrong username.

**Solution:**
```bash
# Re-authenticate GitHub CLI
gh auth login

# Verify authentication
gh auth status

# Test API access
gh issue list --assignee "your-username" --limit 5
```

---

### Issue: "command not found: bc"

**Cause:** `bc` calculator not installed.

**Solution:**
```bash
brew install bc
```

---

### Issue: Report shows 0 commits

**Cause:** Git email mismatch.

**Solution:**
```bash
# Check your git email
git config user.email

# Verify commits exist with that email
git log --author="your-email" --oneline -5

# Update script if email is different
```

---

### Issue: Cron not running at all

**Cause:** Cron daemon not running or syntax error.

**Solution:**
```bash
# Check cron syntax
crontab -l

# Check if cron is running
ps aux | grep cron

# Check system logs
log show --predicate 'process == "cron"' --last 1h
```

---

## File Locations

| File | Purpose |
|------|---------|
| `.claude/user-identities.json` | User configuration |
| `scripts/generate-daily-report.sh` | Report generator script |
| `docs/reports/daily/` | Generated reports |
| `logs/daily-report.log` | Execution logs |

---

## Cron Schedule Reference

| Schedule | Cron Expression |
|----------|-----------------|
| 11:59 PM daily | `59 23 * * *` |
| 6:00 PM daily | `0 18 * * *` |
| Every Monday 9 AM | `0 9 * * 1` |
| Every hour | `0 * * * *` |

**Format:** `minute hour day month weekday`

---

## Report Contents

Each daily report includes:

| Section | Description |
|---------|-------------|
| Developer Velocity | Commits, issues, PRs, velocity score |
| Commits Today | List of all commits with hashes |
| Files Modified | Key files changed |
| Issues Activity | Issues closed today |
| PRs Activity | PRs merged today |
| Next Steps | Tomorrow's priorities |

---

## Velocity Score Calculation

```
Velocity Score = (Commits × 1) + (Issues Closed × 3) + (PRs Merged × 5)
```

| Rating | Score |
|--------|-------|
| Exceptional | 50+ |
| Strong | 30-49 |
| Good | 15-29 |
| Light | <15 |

---

## Alternative: Using launchd (macOS Native)

If cron continues to have issues, use launchd instead:

1. Create plist file:
```bash
cat > ~/Library/LaunchAgents/com.opencapstack.dailyreport.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.opencapstack.dailyreport</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/path/to/opencapstack/scripts/generate-daily-report.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>23</integer>
        <key>Minute</key>
        <integer>59</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/path/to/opencapstack/logs/daily-report.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/opencapstack/logs/daily-report-error.log</string>
</dict>
</plist>
EOF
```

2. Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.opencapstack.dailyreport.plist
```

3. Verify:
```bash
launchctl list | grep opencapstack
```

---

## Quick Setup Checklist

- [ ] Update `.claude/user-identities.json` with your GitHub info
- [ ] Update `scripts/generate-daily-report.sh` with your paths
- [ ] Run `chmod +x scripts/generate-daily-report.sh`
- [ ] Create directories: `mkdir -p docs/reports/daily logs`
- [ ] Test script: `./scripts/generate-daily-report.sh`
- [ ] Grant Full Disk Access to `/usr/sbin/cron`
- [ ] Set up cron job: `crontab -e`
- [ ] Verify cron: `crontab -l`
- [ ] Test cron execution with a near-future time

---

## Support

If you encounter issues not covered here:

1. Check the logs: `cat logs/daily-report.log`
2. Run script manually with debug: `bash -x scripts/generate-daily-report.sh`
3. Verify GitHub CLI: `gh auth status`
4. Check macOS permissions in System Settings

---

*Last Updated: 2026-02-02*
