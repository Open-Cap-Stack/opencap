# OpenCap Credential Handling Guide

**Date:** March 29, 2025  
**ID:** OCDI-304  
**Type:** [Bug]  
**Status:** In Progress

## Security Incident Summary

A security vulnerability was identified where real API credentials were committed to the Git repository in the `.env.example` file. This includes:

- Shortcut API token
- Mailgun API key

## Immediate Actions Taken

1. Replaced sensitive tokens with placeholders in the current main branch
2. Added `.gitattributes` to treat `.env*` files as binary
3. Documented proper credential handling procedures

## Critical Action Required

**IMPORTANT:** The following API credentials must be invalidated immediately:

- Shortcut API token: `9fea6357-189e-4e20-b0ba-5080b29a2446`
- Mailgun API key: `3c76577aef7849407d969e029bf2eef0-f6202374-f8bec8f2`

Contact the respective service administrators to revoke these tokens and issue new ones.

## Proper Credential Handling Procedure

Following the Semantic Seed Venture Studio Coding Standards, all team members must:

1. **Never commit real credentials to the repository**
   - Always use placeholder values in example files
   - Use descriptive names like `your_api_key_here`

2. **Use environment variables for all sensitive information**
   - Store real credentials only in `.env` files (never in `.env.example`)
   - Ensure `.env` files are in `.gitignore`

3. **Rotate credentials after accidental exposure**
   - Immediately invalidate any exposed credentials
   - Document the incident in this security directory

4. **Sanitize Git history when needed**
   - Use BFG Repo-Cleaner or git-filter-repo to remove sensitive data
   - Notify all team members to re-clone after history rewriting

## Git History Security Enhancement (Pending)

The exposed credentials remain in the Git history and must be properly removed. This requires:

1. Creating a fresh clone of the repository
2. Using BFG Repo-Cleaner to purge sensitive data
3. Force-pushing the cleaned repository
4. All team members re-cloning the repository

This will be completed once disk space issues are resolved and requires coordination with all team members.

---

*This document follows Semantic Seed Venture Studio Coding Standards V2.0*
