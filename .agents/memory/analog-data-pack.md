---
name: Terrestrial analog data pack rules
description: Interpretation rules from the team's Terrestrial_Analog_Data pack that the UI text must keep following
---
The pack (uploaded as a zip, not kept in git) ships its own scientific limits; the app copies them into UI text.

- Fit scores are "fit index under current priorities", never probabilities. Grid leads are "preliminary candidates"; never call a place "undiscovered".
- GLiM rock type and USGS Moon map units are context/filters only — never scored dimensions.
- PRP polar data is a thermal model (2 cm annual mean, modelled ice-stability depth), not ice detection; code -1 is undocumented and is not interpreted.
- LROC depths written ">N" are lower bounds; pit size does not prove lava-tube extent. LROC longitudes are 0–360 E.
- The pack's 21 Earth sites duplicate the app's catalogue, so new places come from the Moon side (pit atlas), not Earth.
- Scientific review requires separating coarse relief from slope/driveability and landing risk; a score below a user-selected threshold does not prove that a mission needs multiple sites.

**Why:** the user rejects any fake or overstated data, and the pack's validation report lists these as documented limits.
**How to apply:** when touching pit atlas, polar context, rock-type filter or discovery wording, keep these qualifiers. State nominal sampling spacing separately from actual footprint and map-projection limitations; do not describe editorial tag overlap as a direct geological-map match.
