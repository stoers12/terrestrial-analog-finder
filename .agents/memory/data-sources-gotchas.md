---
name: Data honesty rule
description: What the app may label as measured vs reference vs editorial
---
Earth values come from the API (NASA POWER + DEM); Moon/Mars values are curated reference data; geology tags and isolation are editorial. Each must be labelled as such in the UI.

**Why:** hand-typed values presented as measured were the original flaw, and the challenge judges data honesty.
**How to apply:** any new number shown in the UI needs a source label. Fail loudly on upstream errors; never fall back to invented values. Any definition shown in the UI (e.g. "coldest-month night") must match the calculation exactly.
