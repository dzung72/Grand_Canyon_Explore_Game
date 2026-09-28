export const LAYER_CHALLENGES = [
    {
        name: "FIELD TRAINING",
        tip: "Move freely. Collect 5 samples.",
        briefing: "Static quiz rocks. Learn four-direction steering and collect all five evidence samples.",
        obstacleMotion: "static"
    },
    {
        name: "DUNE CROSSING",
        tip: "Sand pushes sideways. Use the gaps.",
        briefing: "Wind-driven sand gusts push sideways while two rocks patrol long routes. Use sheltered gaps.",
        obstacleMotion: "horizontal",
        movingCount: 2,
        amplitude: 115,
        speed: 0.00135,
        environment: "sandGust"
    },
    {
        name: "CAVERN FALL",
        tip: "The cave pulls down. Watch falling rocks.",
        briefing: "A karst opening pulls the drill into a fast cave drop while loose blocks fall after warning.",
        obstacleMotion: "drop",
        movingCount: 2,
        amplitude: 165,
        speed: 0.00023,
        environment: "caveDrop"
    },
    {
        name: "SHALE SLIDE",
        tip: "Shale slides down. Leave marked plates.",
        briefing: "Fragile shale suddenly slips downward. Escape the marked plates with short controlled movements.",
        obstacleMotion: "vertical",
        movingCount: 3,
        amplitude: 125,
        speed: 0.00061625,
        environment: "shaleSlide"
    },
    {
        name: "PEBBLE RUN",
        tip: "Cobbles cross the route. Read the gap.",
        briefing: "Rounded cobbles roll across the route in alternating directions. Read the open lane.",
        obstacleMotion: "rolling",
        movingCount: 4,
        amplitude: 165,
        speed: 0.000875
    },
    {
        name: "BASALT RESISTANCE",
        tip: "Hot zones slow you and cost 15% fuel.",
        briefing: "Three small hot-basalt gameplay pockets hide evidence. Entering one slows the drill and removes 15% fuel once.",
        obstacleMotion: "horizontal",
        movingCount: 3,
        amplitude: 130,
        speed: 0.000725,
        environment: "resistance"
    },
    {
        name: "BRAIDED RIVER LAB",
        tip: "Currents push. Eddies spin.",
        briefing: "Enter branching river channels, ride diagonal currents, and escape circular eddies to reach samples.",
        obstacleMotion: "static",
        movingCount: 0,
        amplitude: 0,
        speed: 0,
        environment: "riverDelta"
    },
    {
        name: "TIDAL PULSE",
        tip: "Flow reverses. Watch the arrow.",
        briefing: "The illustrated tidal flow reverses direction on a steady rhythm. Watch the flow warning below.",
        obstacleMotion: "horizontal",
        movingCount: 4,
        amplitude: 145,
        speed: 0.00085,
        environment: "pulse"
    },
    {
        name: "STROMATOLITE MAZE",
        tip: "Gates slide. Time the open gap.",
        briefing: "Three slower stromatolite gates shift sideways. Read their rhythm; every gate always leaves a passable gap.",
        obstacleMotion: "vertical",
        movingCount: 3,
        amplitude: 115,
        speed: 0.000329375,
        environment: "maze"
    },
    {
        name: "BASEMENT GAUNTLET",
        tip: "Hard zones and moving rocks combine.",
        briefing: "Moving blocks, hard-rock zones, and lateral pressure combine in the final survey.",
        obstacleMotion: "mixed",
        movingCount: 4,
        amplitude: 160,
        speed: 0.00095,
        environment: "gauntlet"
    }
];

export function getLayerChallenge(index) {
    return LAYER_CHALLENGES[index] || LAYER_CHALLENGES[0];
}
