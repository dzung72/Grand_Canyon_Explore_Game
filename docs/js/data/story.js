// Mạch truyện chạy suốt lượt khoan, viết theo giọng nhật ký thực địa.
// Mọi câu đều bám vào dữ kiện có thật trong layers.js — không thêm thắt gì
// mà nhà địa chất sẽ phải cải chính.
export const LAYER_STORY = [
    [
        "The rim we stood on this morning was a sea floor.",
        "The water left. The shells stayed."
    ],
    [
        "A desert of dunes, and something walked across it.",
        "We have the footprints. We do not have the animal."
    ],
    [
        "A clear warm sea, crowded with life.",
        "Rainwater later ate caves through it from the inside."
    ],
    [
        "Mud, far from any shore.",
        "Trilobites crawled here and their tracks are still in it."
    ],
    [
        "Beach sand. The sea is moving in,",
        "over ground that was already impossibly old."
    ],
    [
        "Lava, flow stacked on flow, as a continent tried to tear open.",
        "No shells here. Nothing had shells yet."
    ],
    [
        "Rivers, floodplains, a delta.",
        "A whole landscape with weather and seasons, and no animal in any of it."
    ],
    [
        "The sun dried this mud one afternoon and cracked it.",
        "The pattern has not moved since."
    ],
    [
        "Stromatolites. Mats of bacteria, layer upon layer.",
        "For most of the earth's history, this was all life was."
    ],
    [
        "No beds left to read. This rock was buried deep enough to flow.",
        "These are the roots of mountains worn to nothing before bone existed."
    ]
];

// Chỉ hai mặt tiếp xúc này là bất chỉnh hợp thật và nổi tiếng của hẻm núi.
// Các khoảng trống còn lại trong game một phần do bỏ bớt hệ tầng, nên không
// dựng thành khoảnh khắc — nói quá sẽ thành dạy sai.
export const TIME_GAPS = {
    5: {
        title: "THE GREAT UNCONFORMITY",
        closing: "Mountains stood here and were worn flat before the sea came back.\nNothing from that time survived."
    },
    9: {
        title: "NONCONFORMITY",
        closing: "Below this line, the oldest rock in the canyon.\nSediment resting straight onto the root of a vanished mountain range."
    }
};

export function storyFor(index) {
    return LAYER_STORY[index] || [];
}

export function timeGapFor(index, layers) {
    const gap = TIME_GAPS[index];
    if (!gap || index <= 0 || !layers[index] || !layers[index - 1]) return null;
    return {
        ...gap,
        millionYears: layers[index].ma - layers[index - 1].ma,
        above: layers[index - 1],
        below: layers[index]
    };
}
