export const ROCK_LAYERS = [
    {
        name: "Kaibab Formation", group: "Layered Paleozoic Rocks", age: "Early Middle Permian", ma: 270,
        position: "Canyon rim — youngest selected unit",
        rockType: "Cherty limestone and dolostone", formed: "Shallow marine shelf",
        feature: "Blocky carbonate beds with dark chert nodules",
        observation: "Marine carbonate beds contain resistant, dark silica-rich chert nodules.",
        interpretation: "Warm, shallow seawater supported abundant marine life while carbonate mud accumulated.",
        fossil: "Brachiopods, crinoids, horn corals, and other marine invertebrates.",
        significance: "The rock forming much of the rim records a sea where the high plateau now stands.",
        source: "NPS: Layered Paleozoic Rocks; NPS: Fossils",
        clues: [
            { type: "ROCK", text: "Dark chert nodules occur inside marine carbonate rock." },
            { type: "ENV", text: "Carbonate mud formed on a warm, shallow marine shelf." },
            { type: "LIFE", text: "Brachiopods, crinoids, and corals record an ancient sea." }
        ],
        texture: "chertyLimestone", resistance: 22, color: 0xc5b08a, accent: 0x5a5049
    },
    {
        name: "Coconino Sandstone", group: "Layered Paleozoic Rocks", age: "Early Permian", ma: 280,
        position: "Upper canyon — cliff-forming sandstone",
        rockType: "Fine quartz sandstone", formed: "Windblown desert dunes",
        feature: "Steep cross-beds made by migrating dunes",
        observation: "Large inclined layers cut across one another; the grains are well-sorted quartz sand.",
        interpretation: "Wind moved sand up dune faces before avalanches deposited inclined layers on the lee side.",
        fossil: "Chelichnus trackways and other footprints; body fossils are uncommon in dry dune sand.",
        significance: "Cross-bedding and tracks preserve both an ancient desert and the animals that crossed it.",
        source: "NPS: Geologic Formations; NPS: Fossils",
        clues: [
            { type: "ROCK", text: "Steep cross-beds are preserved in fine quartz sandstone." },
            { type: "ENV", text: "Wind moved this sand across a field of desert dunes." },
            { type: "LIFE", text: "Chelichnus trackways occur, but body fossils are uncommon." }
        ],
        texture: "crossBedding", resistance: 26, color: 0xd9c49c, accent: 0x9b795a
    },
    {
        name: "Redwall Limestone", group: "Layered Paleozoic Rocks", age: "Late Early–Middle Mississippian", ma: 340,
        position: "Middle canyon — massive cliff former",
        rockType: "Massive limestone with chert", formed: "Warm tropical sea",
        feature: "Gray limestone, red-stained cliffs, fractures, and caves",
        observation: "The limestone is naturally gray, thick-bedded, fossiliferous, and locally dissolved into caverns.",
        interpretation: "Carbonate accumulated in a warm sea; later groundwater enlarged fractures into karst passages.",
        fossil: "Crinoids, brachiopods, corals, and bryozoans such as delicate lacy forms.",
        significance: "Its famous red color is mostly iron-rich stain washed down from younger red beds above.",
        source: "NPS: Paleozoic Rocks; USGS: Redwall–Muav aquifer",
        clues: [
            { type: "ROCK", text: "The massive limestone is gray, though its cliffs look red-stained." },
            { type: "ENV", text: "It formed in a warm sea; later groundwater opened karst caves." },
            { type: "LIFE", text: "Crinoids, corals, brachiopods, and bryozoans are common fossils." }
        ],
        texture: "massiveLimestone", resistance: 30, color: 0x81777a, accent: 0x4f494e, secondary: 0x9c4f43
    },
    {
        name: "Bright Angel Formation", group: "Tonto Group", age: "Middle Cambrian", ma: 506,
        position: "Tonto Platform — generally slope forming",
        rockType: "Micaceous shale, siltstone, and sandstone", formed: "Muddy shallow seafloor",
        feature: "Thin green-gray beds with burrows and trilobites",
        observation: "Fine, fissile beds split into sheets and contain tracks, burrows, and marine fossils.",
        interpretation: "Mud settled in quieter water as Cambrian seas spread across the continent.",
        fossil: "Trilobites, brachiopods, and diverse trace fossils made on or within the seafloor.",
        significance: "Its weaker shale erodes into the broad Tonto Platform instead of a vertical cliff.",
        source: "NPS: Layered Paleozoic Rocks; NPS: Fossils",
        clues: [
            { type: "ROCK", text: "Thin green-gray shale and siltstone split into sheets." },
            { type: "ENV", text: "Mud settled on a quieter seafloor as Cambrian seas advanced." },
            { type: "LIFE", text: "Trilobites, burrows, and tracks preserve seafloor life." }
        ],
        texture: "thinShale", resistance: 18, color: 0x727860, accent: 0x434b40
    },
    {
        name: "Tapeats Sandstone", group: "Tonto Group", age: "Middle Cambrian", ma: 508,
        position: "Base of the Paleozoic sequence in many exposures",
        rockType: "Coarse pebbly sandstone", formed: "Beaches, tidal zones, and river channels",
        feature: "Coarse grains, rounded pebbles, and planar cross-beds",
        observation: "The unit commonly starts with coarse sand and pebbles resting on a much older eroded surface.",
        interpretation: "Energetic shorelines reworked sediment as the Cambrian sea advanced across the region.",
        fossil: "Trilobite trails and other invertebrate trace fossils occur within the Tonto Group.",
        significance: "It helps record a major marine transgression and one expression of the Great Unconformity.",
        source: "NPS: Layered Paleozoic Rocks; NPS: Fossils",
        clues: [
            { type: "ROCK", text: "Coarse sandstone contains rounded pebbles and cross-beds." },
            { type: "ENV", text: "Energetic shorelines formed as a Cambrian sea moved inland." },
            { type: "EVENT", text: "It rests on an eroded surface called the Great Unconformity." }
        ],
        texture: "pebblySandstone", resistance: 27, color: 0x9a714e, accent: 0x57443b
    },
    {
        name: "Cardenas Basalt", group: "Unkar Group", age: "Mesoproterozoic", ma: 1082,
        position: "Grand Canyon Supergroup — tilted ancient rocks",
        rockType: "Basalt and basaltic andesite", formed: "Stacked lava flows during failed continental rifting",
        feature: "Dark flow bands, cooling joints, dikes, and thin sediment intervals",
        observation: "Multiple fine-grained volcanic flows are associated with dikes and sills of similar age.",
        interpretation: "Magma rose through crust being stretched during an episode of rifting that did not split the continent.",
        fossil: "Fossils are not expected in erupted lava; nearby sedimentary layers carry environmental evidence.",
        significance: "Its approximately 1,082 Ma age is constrained by radiometric dating of related igneous rocks.",
        source: "NPS: Grand Canyon Supergroup",
        clues: [
            { type: "ROCK", text: "Dark basalt and basaltic-andesite occur as stacked lava flows." },
            { type: "ENV", text: "Magma rose while the continent stretched during failed rifting." },
            { type: "LIFE", text: "Fossils are not expected inside rock that erupted as lava." }
        ],
        boundary: "REPRESENTATIVE TIME GAP: Tapeats lies across the Great Unconformity on much older rocks, but this game is not one literal borehole.",
        texture: "basaltFlows", resistance: 30, color: 0x3b3942, accent: 0x1e2027, secondary: 0x75483f
    },
    {
        name: "Dox Formation", group: "Unkar Group", age: "Mesoproterozoic", ma: 1120,
        position: "Upper Unkar Group",
        rockType: "Sandstone, siltstone, and shale", formed: "Rivers, floodplains, and deltaic settings",
        feature: "Alternating red and maroon beds of several grain sizes",
        observation: "Only about half the formation is sandstone; finer siltstone and shale are also abundant.",
        interpretation: "Changing water energy shifted sediment between channels, floodplains, and delta-like environments.",
        fossil: "Body fossils are uncommon; bedding and sedimentary structures are the main environmental clues.",
        significance: "Its varied lithology is why the older name ‘Dox Sandstone’ was changed to Dox Formation.",
        source: "NPS: Grand Canyon Supergroup; USGS Geolex: Dox",
        clues: [
            { type: "ROCK", text: "Sandstone, siltstone, and shale alternate through the unit." },
            { type: "ENV", text: "Rivers, floodplains, and delta-like settings shifted over time." },
            { type: "EVENT", text: "Mixed rock types are why it is called a Formation, not Sandstone." }
        ],
        texture: "mixedBeds", resistance: 23, color: 0x875047, accent: 0x542f34
    },
    {
        name: "Hakatai Shale", group: "Unkar Group", age: "Mesoproterozoic", ma: 1230,
        position: "Lower Unkar Group",
        rockType: "Mudstone, siltstone, and sandstone", formed: "Shallow basin and tidal-flat settings",
        feature: "Red-orange thin beds with ripples and mudcracks",
        observation: "Fine red beds preserve ripple marks and polygonal cracks produced when wet mud dried.",
        interpretation: "Water repeatedly covered and exposed a low-energy muddy surface.",
        fossil: "Body fossils are uncommon; ripple marks and mudcracks are valuable physical trace evidence.",
        significance: "These structures let geologists reconstruct changing water depth without relying on body fossils.",
        source: "NPS: Grand Canyon Supergroup; USGS stratigraphic descriptions",
        clues: [
            { type: "ROCK", text: "Fine red-orange beds preserve ripples and polygonal mudcracks." },
            { type: "ENV", text: "Water repeatedly covered and exposed a muddy surface." },
            { type: "LIFE", text: "Body fossils are uncommon, so sediment structures are key clues." }
        ],
        texture: "rippleMud", resistance: 18, color: 0xa94f3c, accent: 0x68302f
    },
    {
        name: "Bass Formation", group: "Unkar Group", age: "Mesoproterozoic", ma: 1255,
        position: "Base of the Unkar Group",
        rockType: "Dolomite-rich carbonate, sandstone, mudstone, and conglomerate", formed: "Shallow and sometimes restricted sea",
        feature: "Mixed beds with domed and columnar stromatolites",
        observation: "Carbonate beds preserve layered mounds built by microbial mats; clastic beds record sediment input.",
        interpretation: "Microbial communities trapped sediment in very shallow water more than a billion years ago.",
        fossil: "Stromatolites—the oldest abundant and easily visible evidence of life preserved in the park.",
        significance: "An ash bed provides a radiometric age of about 1,255 million years for the formation.",
        source: "NPS: Precambrian Paleontology; NPS: Grand Canyon Supergroup",
        clues: [
            { type: "ROCK", text: "Carbonate and clastic beds occur together in the formation." },
            { type: "ENV", text: "The sediment accumulated in a shallow, sometimes restricted sea." },
            { type: "LIFE", text: "Stromatolites are abundant visible evidence of ancient microbial life." }
        ],
        texture: "stromatoliteBeds", resistance: 26, color: 0x756b68, accent: 0x453b40, secondary: 0xa45d4f
    },
    {
        name: "Vishnu Schist", group: "Granite Gorge Metamorphic Suite", age: "Paleoproterozoic", ma: 1750,
        position: "Inner Gorge — ancient crystalline basement",
        rockType: "Metamorphic schist", formed: "Deep-crust heat, pressure, deformation, and mountain building",
        feature: "Steep foliation and folds cut by pale granite and pegmatite veins",
        observation: "Dark, strongly foliated rock is deformed and cross-cut by younger light-colored igneous veins.",
        interpretation: "Older rocks were buried, metamorphosed, folded, and later intruded by magma deep in the crust.",
        fossil: "Fossils are not expected: the protolith is extremely old and metamorphism recrystallized the rock.",
        significance: "Cross-cutting veins show relative time: the schist existed before the younger magma entered it.",
        source: "NPS: Vishnu Basement Rocks",
        clues: [
            { type: "ROCK", text: "Strong foliation and folds show intense heat and deformation." },
            { type: "EVENT", text: "Pale granite and pegmatite veins cut across the older schist." },
            { type: "LIFE", text: "Fossils are absent because metamorphism recrystallized the rock." }
        ],
        texture: "foldedFoliation", resistance: 30, color: 0x292b35, accent: 0xc8b8a6
    }
];

export function getLayerEvidence(layer) {
    const lifeOrEvent = layer.clues.find((clue) => ["LIFE", "EVENT"].includes(clue.type));
    const environment = layer.clues.find((clue) => clue.type === "ENV");
    const rock = layer.clues.find((clue) => clue.type === "ROCK");
    const concise = (text, limit = 68) => text.length > limit
        ? `${text.slice(0, limit - 1).trim()}…`
        : text;
    return [
        {
            type: "AGE",
            text: `${layer.age}, approximately ${layer.ma.toLocaleString()} million years old.`,
            note: `${layer.age} • ~${layer.ma.toLocaleString()} Ma`
        },
        { type: "ROCK", text: rock?.text || `Main rock: ${layer.rockType}.`, note: layer.rockType },
        { type: "FIELD", text: `Field clue: ${layer.feature}.`, note: layer.feature },
        {
            type: "ENV",
            text: environment?.text || `This unit records ${layer.formed.toLowerCase()}.`,
            note: layer.formed
        },
        {
            type: lifeOrEvent?.type || "LIFE",
            text: lifeOrEvent?.text || layer.fossil,
            note: concise(lifeOrEvent?.text || layer.fossil)
        }
    ].filter(Boolean);
}

export function getLayerQuiz(layer, questionIndex = 0) {
    const layerIndex = Math.max(0, ROCK_LAYERS.indexOf(layer));
    const lifeNote = (item) => {
        const evidence = getLayerEvidence(item);
        return evidence.find((clue) => ["LIFE", "EVENT"].includes(clue.type))?.note
            || "Fossils are uncommon in this unit.";
    };
    const categories = [
        {
            question: `What is the approximate age of ${layer.name}?`,
            value: (item) => `About ${item.ma.toLocaleString()} Ma`
        },
        {
            question: `What is the main rock type in ${layer.name}?`,
            value: (item) => item.rockType
        },
        {
            question: `In which environment did ${layer.name} form?`,
            value: (item) => item.formed
        },
        {
            question: `Which field clue belongs to ${layer.name}?`,
            value: (item) => item.feature
        },
        {
            question: `Which life or geologic clue fits ${layer.name}?`,
            value: lifeNote
        }
    ];
    const category = categories[questionIndex % categories.length];
    const correct = category.value(layer);
    const distractors = [];
    for (let offset = 1; offset < ROCK_LAYERS.length && distractors.length < 2; offset += 1) {
        const candidate = category.value(ROCK_LAYERS[(layerIndex + offset * 3) % ROCK_LAYERS.length]);
        if (candidate !== correct && !distractors.includes(candidate)) distractors.push(candidate);
    }
    const correctIndex = (layerIndex + questionIndex) % 3;
    const choices = [...distractors];
    choices.splice(correctIndex, 0, correct);
    return {
        question: category.question,
        answers: choices.slice(0, 3).map((text, index) => ({
            text,
            correct: index === correctIndex
        }))
    };
}
