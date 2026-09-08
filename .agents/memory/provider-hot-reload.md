---
name: Provider hot reload
description: Vite Fast Refresh behavior after changing the shared React context
---

When the shared AppContext changes its provider shape or exports, the preview can briefly invalidate the provider and report that `useApp` is outside its provider during Fast Refresh. A cold workflow restart restores the correct tree.

**Why:** Fast Refresh preserves module state while the context module is being invalidated, which can leave a transient mixed module graph even though a production build is valid.

**How to apply:** After a batch that changes AppContext exports or provider values, restart the managed application workflow once, then verify the preview from a fresh load.