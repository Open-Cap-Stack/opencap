# GitHub Support Request: Repository Data Purge

**Date:** March 29, 2025  
**Issue ID:** OCDI-304  
**Priority:** Critical Security Issue

## Request Details

We need to fully purge sensitive API tokens that were accidentally committed to our Git repository history. While we have implemented local history rewriting using `git filter-repo` and have force-pushed a cleaned branch, the tokens remain accessible via direct links to specific historical commits.

## Repository Information

- **Organization:** Open-Cap-Stack
- **Repository:** opencap
- **Specific Commit Hash:** abe1160a8a27f15c15932fa822fd3666e97ddcde
- **Affected Files:** `.env.example`

## Information to Remove

The following sensitive information needs to be completely purged:
- Shortcut API token: `9fea6357-189e-4e20-b0ba-5080b29a2446`
- Mailgun API key: `3c76577aef7849407d969e029bf2eef0-f6202374-f8bec8f2`

## Actions Taken So Far

1. Created a cleaned branch (`bug/OCDI-304-security-cleanup`) with sensitive data removed
2. Added `.gitattributes` to prevent sensitive files from being displayed in diffs
3. Created comprehensive security documentation
4. Force-pushed the cleaned branch to GitHub

## Request for Support

Despite our efforts, the sensitive data remains accessible via direct URL to specific historical commits. We request GitHub Support to:

1. Immediately purge all cached versions of the affected commit(s)
2. Remove the sensitive information from GitHub's caches and databases
3. Confirm when the purge is complete

## Security Actions Completed

- We have already revoked the exposed API tokens
- We have implemented proper security protocols to prevent future exposure
- We have documented the incident following Semantic Seed Venture Studio Coding Standards

Thank you for your assistance with this critical security matter.

---

*This request follows the Semantic Seed Venture Studio Coding Standards V2.0 for security incident handling.*
