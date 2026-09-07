---
name: Nested imported app
description: Workspace-specific guidance for running the imported KisanLink frontend.
---

The imported application is nested under `project/`, rather than at the workspace root. Run its package scripts from `project/` and keep the web workflow's command prefixed with `cd project`.

**Why:** The first package-install attempt targeted the workspace root and created unrelated package metadata instead of installing the app's locked dependencies.

**How to apply:** Before installing or configuring a workflow for this import, confirm the app directory and use the existing lockfile from that directory.