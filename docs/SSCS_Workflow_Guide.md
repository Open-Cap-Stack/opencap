# Semantic Seed Venture Studio Workflow Guide
## For OpenCap Data Infrastructure Project

**Version**: 1.0  
**Date**: March 23, 2025  
**Status**: Active

## Overview

This document provides guidance on implementing the Semantic Seed Venture Studio Coding Standards (SSCS) for the OpenCap Data Infrastructure project. Following these standards ensures consistent tracking across the codebase, proper workflow in Shortcut, and alignment with the project's branching strategy.

## Backlog Management

### Story ID Format

All backlog items now have IDs following this pattern:
- **OCDI-XXX** - OpenCap Data Infrastructure items
- **OCAE-XXX** - OpenCap API Enhancement items

### Story Types

Stories are classified into three types:
- **[Feature]** - New functionality being added to the platform
- **[Bug]** - Issues that need to be fixed
- **[Chore]** - Maintenance tasks and technical debt

### Estimation Guidelines

We use the Fibonacci scale for estimating work:
- **0** points - Quick fixes (typos, minor UI tweaks)
- **1** point - Straightforward tasks where the solution is clear
- **2** points - Slightly more complex but well-defined tasks
- **3, 5, 8** points - Larger tasks (anything larger should be broken down)

## Development Workflow

### 1. Start Work on a Story

1. In Shortcut, move the top unstarted story to "In Progress"
2. Note the ID (e.g., OCDI-001) and type (Feature, Bug, Chore)

### 2. Create Branch

Create a branch following the naming convention:
```bash
git checkout -b feature/OCDI-001   # For features
git checkout -b bug/OCDI-002       # For bugs
git checkout -b chore/OCDI-003     # For chores
```

### 3. TDD Workflow

Follow Test-Driven Development principles:

1. **First commit** - Create failing tests:
```bash
git commit -m "WIP: OCDI-001: Red tests for Neo4j connector"
```

2. **Second commit** - Make tests pass:
```bash
git commit -m "WIP: OCDI-001: Green tests for Neo4j connector"
```

3. **Final commit** - Refactor and finalize:
```bash
git commit -m "OCDI-001: Implement Neo4j connector with tests"
```

### 4. Daily Commits Required

Even for incomplete work, commit daily with a "WIP:" prefix:
```bash
git commit -m "WIP: OCDI-001: Progress on Neo4j connection error handling"
```

### 5. Pull Request Process

When the story is complete:

1. Push your branch to GitHub:
```bash
git push origin feature/OCDI-001
```

2. Create a Pull Request with:
   - Title: "OCDI-001: Implement Neo4j connector"
   - Description: Include story details and acceptance criteria

3. Mark the story "Finished" in Shortcut

### 6. Review and Merge

1. Address any review comments
2. Upon approval, merge to main branch
3. Mark the story "Delivered" in Shortcut

## Example Workflow

Here's a full example of implementing story OCDI-001:

```bash
# Day 1
git checkout -b feature/OCDI-001
# Write failing tests
git commit -m "WIP: OCDI-001: Red tests for Neo4j connector"
git push origin feature/OCDI-001

# Day 2
# Make tests pass
git commit -m "WIP: OCDI-001: Green tests for Neo4j connector"
git push origin feature/OCDI-001

# Day 3
# Refactor and finalize
git commit -m "OCDI-001: Implement Neo4j connector with tests"
git push origin feature/OCDI-001

# Create PR and mark as Finished in Shortcut
```

## Commit Velocity

To maintain high velocity:
1. Commit at least once daily, even for work in progress
2. Keep PRs small and focused on a single story
3. Break down large stories into smaller ones
4. Use the TDD workflow to maintain steady progress

## Remember

- **Always** include the story ID in branch names and commit messages
- Use the **WIP:** prefix for work in progress
- **Never** push directly to main branch
- **Always** write tests before implementing features
- **Commit daily** to maintain visibility
