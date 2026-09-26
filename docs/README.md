# Grand Canyon Drill V4.1 — Field Quiz Expedition

A small educational Phaser game about exploring ten representative rock units exposed in Grand Canyon National Park.

## How to play

1. Hold the drill with a mouse or finger.
2. Pull upward to build launch power and sideways to aim.
3. Release the drill.
4. After impact, move freely in four directions with `WASD`, arrow keys, or the four sides of a touch screen.
5. Use the permanent field note on the right while collecting five glowing samples: age, rock, field feature, environment, and life/event.
6. Each sample gives 100 score and credits. Speed, Magnet, and Earnings upgrades improve the current run.
7. Hitting one of four sparse rocks pauses the drill and asks a three-choice question taken directly from the visible note.
8. A correct answer gives 50 score; a wrong answer removes 100 score and slows the drill for two seconds.
9. Collecting all five samples opens a one-purchase upgrade screen before the next layer.
10. Aim for the existing shaft on later launches to conserve energy, then complete the survey in all ten units.

The field note occupies a protected panel on the right, uses larger text, and shows all five facts immediately. The drill cannot enter that panel. Geological landmarks are labelled in the rock. Audio includes a large surface-impact boom, a resistance-sensitive drill motor, collectible ping, rock crack, quiz feedback, upgrade chime, and layer-transition cue. A completed or failed run saves the player's best score; replaying never erases unlocked field notes.

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
├── services/AudioManager.js # Original Web Audio retro-desert music loop and mute state
├── services/storage.js     # Local progress and leaderboard data
├── ui/components.js        # Reusable drill and pixel button components
├── ui/LayerNotebookOverlay.js # Unlockable observation/evidence notebook
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
- Colors are optimized for a pixel game and projector contrast; the bedding, cross-bedding, chert, lava-flow, ripple, stromatolite, and foliation motifs are based on published unit descriptions.
- The game selects ten notable units from the Layered Paleozoic Rocks, Grand Canyon Supergroup, and Vishnu Basement Rocks. It is not the complete Grand Canyon stratigraphic record.
- Units omitted between the ten selections create real gaps in the sequence; equal game-layer thicknesses do not represent their actual thicknesses or depths.
- The ten selected units are a representative educational sequence, not one literal borehole at a single point in the park.
- Notebook text labels visible evidence separately from geologic interpretation. Interpretations are evidence-based scientific explanations, not direct observations.
