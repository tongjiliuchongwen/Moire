export function calculateGratingValue(type, X, Y, params) {
    switch (type) {
        case 'parallelLines':
            return calculateParallelLines(X, Y, params);
        case 'radialLines':
            return calculateRadialLines(X, Y, params);
        default:
            return 0;
    }
}

function calculateParallelLines(X, Y, params) {
    const { d1, offsetX } = params;
    if (d1 === 0) return 0.5;
    const val = Math.cos(2 * Math.PI * (X + offsetX) / d1);
    return 0.5 * (1 + Math.sign(val));
}



function calculateRadialLines(X, Y, params) {
    const { num_spokes, angularOffset, cx_radial, cy_radial } = params;
    if (num_spokes === 0) return 0.5; // Avoid division by zero or meaningless pattern
    const angle = Math.atan2(Y - cy_radial, X - cx_radial);

    const val = Math.cos(num_spokes * (angle + (angularOffset * Math.PI / 180))); 
    return 0.5 * (1 + Math.sign(val));
}
