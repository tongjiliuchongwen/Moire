export function calculateGratingValue(type, X, Y, params) {
    switch (type) {
        case '平行线型': // <-- Changed
            return calculateParallelLines(X, Y, params);
        case '辐射线型': // <-- Changed
            return calculateRadialLines(X, Y, params);
        default:
            return 0;
    }
}

function calculateParallelLines(X, Y, params) {
    // Using Chinese keys for destructuring
    const { '线距': d1, 'X偏移': offsetX } = params; // <-- Changed keys
    if (d1 === 0) return 0.5;
    const val = Math.cos(2 * Math.PI * (X + offsetX) / d1);
    return 0.5 * (1 + Math.sign(val));
}

function calculateRadialLines(X, Y, params) {
    // Using Chinese keys for destructuring
    const { '辐射线条数': num_spokes, '角度偏移': angularOffset, '中心X': cx_radial, '中心Y': cy_radial } = params; // <-- Changed keys
    if (num_spokes === 0) return 0.5; // Avoid division by zero or meaningless pattern
    const angle = Math.atan2(Y - cy_radial, X - cx_radial);

    const val = Math.cos(num_spokes * (angle + (angularOffset * Math.PI / 180)));
    return 0.5 * (1 + Math.sign(val));
}
