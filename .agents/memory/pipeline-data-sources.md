---
name: Moon/Mars pipeline source quirks
description: Non-obvious facts about the NASA raw products the target pipeline reads
---
- atmos.nmsu.edu (MCS DDR) has a certificate chain that does not verify; the pipeline uses a scoped insecure agent for that host only (public read-only data).
- MCS only samples near 3 am and 3 pm local time, so "mean" = average of those two, not a full-day mean.
- MCS volume number = 2001 + (year-2006)*12 + (month-9); volumes around 2009-09..11 are missing.
- LOLA/Diviner south polar PDS maps: longitude sense +1, rotation 0 (confirmed against known LOLA heights); the other 7 orientations give wrong terrain.
- Diviner cylindrical label says UNIT NORMALIZED_RADIANCE but values are bolometric K; Diviner 32 ppd st_avg is a deviation map, not usable.
- Cylindrical maps are unusable at the poles; ring offsets at polar sites are taken in the map plane.
- NASA POWER climatology has TS, TS_MIN, TS_MAX (skin temperature); throttle requests (429 on bursts).
- Mars Climate Database v6.2 web queries with `ls=all` and `localtime=all` return a 25-by-25 ASCII grid, including duplicate 360° and 24-hour endpoints.
**Why:** each cost real debugging time. **How to apply:** before touching src/pipeline.
