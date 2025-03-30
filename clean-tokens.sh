#!/bin/bash
# OCDI-304: Critical security fix to remove API tokens from Git history
# Following Semantic Seed Venture Studio Coding Standards V2.0

echo "Creating backup before proceeding..."
mkdir -p ~/git-security-backups
cp -r /Users/tobymorning/opencap ~/git-security-backups/opencap-backup-$(date +%Y%m%d%H%M%S)
echo "Backup created at ~/git-security-backups/"

echo "Removing sensitive API tokens from Git history..."

# Prepare replacement patterns
cat > /tmp/replacements.txt << EOF
9fea6357-189e-4e20-b0ba-5080b29a2446=your_shortcut_api_token_here
3c76577aef7849407d969e029bf2eef0-f6202374-f8bec8f2=your_email_service_api_key_here
EOF

# Run git filter-repo to replace sensitive tokens in all files
git filter-repo --replace-text /tmp/replacements.txt --force

echo "Cleaning up..."
rm /tmp/replacements.txt

echo "Security fix complete. API tokens have been removed from Git history."
echo "You must now force push this cleaned repository using:"
echo "git push origin bug/OCDI-304-security-cleanup --force"
echo ""
echo "IMPORTANT: All team members must re-clone the repository after this change!"
