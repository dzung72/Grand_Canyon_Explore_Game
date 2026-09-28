# Grand Canyon Drill V4.6 — Progressive Field Expedition

A small educational Phaser game about exploring ten representative rock units exposed in Grand Canyon National Park.

## How to play

1. Hold the drill with a mouse or finger.
2. Pull upward to build launch power and sideways to aim.
3. Release the drill.
4. After impact, move freely in four directions with `WASD`, arrow keys, or the four sides of a touch screen.
5. Use the permanent field note on the right while collecting five glowing samples: age, rock, field feature, environment, and life/event.
6. Each sample gives 100 score and credits. A fuel can restores up to 25% energy. Layers 1–7 contain one can each; the final three layers contain two cans each. Base movement now consumes fuel at six times the original rate—2.5 times the previous V4.4.2 rate—to make route planning and fuel collection essential. Each Speed level adds a clearly visible 25% movement increase; Magnet and Earnings upgrades also improve the current run.
7. A 5.5-second briefing introduces each layer; it can be skipped after one second and the full note remains visible.
8. Hitting one of four sparse rocks pauses the drill and asks a three-choice question taken directly from the visible note.
9. A correct answer gives 50 score; a wrong answer removes 100 score and slows the drill for two seconds.
10. Collecting all five samples opens a one-purchase upgrade screen before the next layer. Every upgrade costs 200 credits, has no level cap, and can always be skipped.
11. Aim for the existing shaft on later launches to conserve energy, then complete the survey in all ten units.

Hold `Space` or the on-screen `BOOST` button while steering for 2.15× movement speed. Boost consumes an additional 8% of the full fuel tank per second. A Near Miss is awarded only after the drill enters a rock's narrow safety margin and exits it again without ever touching the rock. It triggers a 0.15-second slow-motion effect, awards `50 × combo` points, and chains up to `x4` within 2.5 seconds. Contact triggers the quiz immediately and cancels the pending Near Miss.

Every new expedition opens with a responsive How to Play panel covering launch, steering, samples, Rock Checks, fuel, Boost, and Near Miss. Press `Space` or select `START EXPEDITION` to continue. The drilling HUD shows both total Run Time and the current Layer Time; both clocks pause during formation briefings, Rock Checks, and upgrade decisions.

The field note occupies a protected panel on the right, uses larger text, and shows all five facts immediately. The drill cannot enter that panel. The note is hidden during each rock quiz so the question tests recall, then returns immediately after the answer. Geological landmarks are labelled in the rock. Audio unlocks on the first mouse, touch, or keyboard action and has separate Music and SFX controls. Drill movement is intentionally quiet, while a subtle underground ambience, impact boom, fuel, collectible, quiz, upgrade, and transition cues provide feedback. A completed or failed run saves the player's best score; replaying never erases unlocked field notes.

Difficulty grows one mechanic at a time: static quiz rocks, sand gusts, warned rock drops, shale slides, rolling cobbles, small hot-basalt risk pockets, branching Dox river currents and an eddy, reversing tidal pulses, three shifting stromatolite gates, and a final combined challenge. From Tapeats downward, moving rocks use the slower balance pass; Bright Angel and Bass receive an additional 50% speed reduction, including Bass's moving gates. Moving hazards no longer expose artificial travel tracks, while their large travel range still creates pressure. A 1.5-second entry grace period prevents unavoidable collisions after a briefing. Moving hazards, hot pockets, and currents are clearly presented as gameplay devices rather than literal present-day movement inside the formations.

The HUD records active exploration time to one tenth of a second. Briefings, quizzes, and upgrade decisions do not count toward the timer. Completed runs save the fastest local time and show it in the results report and local leaderboard.

## Educational model

Each notebook entry separates four kinds of information:

- **Rock:** the formation's main lithology.
- **Observation:** features a geologist can see, such as cross-bedding, fossils, ripples, or foliation.
- **Interpretation:** the ancient environment or event inferred from several observations.
- **Why it matters:** how the unit contributes to the larger Grand Canyon story.

Undiscovered entries remain locked. The evidence samples turn each layer into a small exploration arena; the field notebook holds the fuller explanation so learning does not interrupt the arcade loop.

## Project structure

```text
js/
├── main.js                 # Phaser startup and scene registration
├── core/status.js          # Visible errors and global error handling
├── data/layers.js          # Scientific layer data and game resistance
├── effects/ImpactEffects.js # Impact shockwave, debris, and dust
├── gameplay/EvidenceCourse.js # Five evidence samples and sparse rocks in each layer
├── gameplay/layerChallenges.js # Per-layer movement and environmental difficulty data
├── services/AudioManager.js # Original Web Audio retro-desert music loop and mute state
├── services/storage.js     # Local progress and leaderboard data
├── ui/components.js        # Reusable drill and pixel button components
├── ui/HowToPlayOverlay.js  # Responsive pre-game controls and rules panel
├── ui/LayerNotebookOverlay.js # Unlockable observation/evidence notebook
├── ui/LayerBriefingOverlay.js # Timed, skippable introduction to each layer
├── ui/QuizOverlay.js       # Note-based three-choice rock questions
├── ui/UpgradeOverlay.js    # One-purchase layer upgrade screen
├── world/ExpeditionWorld.js # Continuous sky, surface, and underground world
└── scenes/
    ├── ExpeditionScene.js  # Continuous launch, impact, and drilling gameplay
    └── ResultsScene.js     # Report, leaderboard, and replay controls
```

## Scientific source

Formation names, stratigraphic ages, groups, and approximate numeric ages come from the National Park Service:

- [Numeric Ages of Grand Canyon Rocks](https://www.nps.gov/articles/000/grcatime-numeric-ages.htm)
- [Layered Paleozoic Rocks](https://www.nps.gov/articles/000/grcatime-layered-paleozoic-rock.htm)
- [Grand Canyon Supergroup](https://www.nps.gov/articles/000/grcatime-grand-canyon-supergroup.htm)
- [Vishnu Basement Rocks](https://www.nps.gov/articles/000/grcatime-vishnu-basement-rocks.htm)
- [Fossils at Grand Canyon](https://www.nps.gov/grca/learn/nature/fossils.htm)
- [Precambrian Paleontology of Grand Canyon](https://irma.nps.gov/DataStore/DownloadFile/637946)
- [USGS Geologic Names Lexicon](https://ngmdb.usgs.gov/Geolex/search)

## Gameplay simplifications

- Layer thicknesses and colors are illustrative and not drawn to scale.
- The drill, launch physics, old-shaft bonus, and energy system are fictional gameplay mechanics.
- `Game resistance` is an arbitrary balance value. It is not Mohs hardness or a measured drilling property.
- Credits, quiz rocks, energy, the launch device, and upgrades are fictional learning-game systems.
- Cardenas Basalt records ancient lava flows that are now solid rock. The glowing hot pockets and their 15% fuel penalty are an arcade visualization, not present-day molten lava in Grand Canyon.
- Colors are optimized for a pixel game and projector contrast; the bedding, cross-bedding, chert, lava-flow, ripple, stromatolite, and foliation motifs are based on published unit descriptions.
- The game selects ten notable units from the Layered Paleozoic Rocks, Grand Canyon Supergroup, and Vishnu Basement Rocks. It is not the complete Grand Canyon stratigraphic record.
- Units omitted between the ten selections create real gaps in the sequence; equal game-layer thicknesses do not represent their actual thicknesses or depths.
- The ten selected units are a representative educational sequence, not one literal borehole at a single point in the park.
- Notebook text labels visible evidence separately from geologic interpretation. Interpretations are evidence-based scientific explanations, not direct observations.
