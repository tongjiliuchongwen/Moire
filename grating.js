export function calculateGratingValue(type, X, Y, params) {
    switch (type) {
        case '平行线型':
            return calculateParallelLines(X, Y, params);
        case '辐射线型':
            return calculateRadialLines(X, Y, params);
        case '同心圆型':
            return calculateConcentricCircles(X, Y, params);
        case '正弦波型':
            return calculateSineWave(X, Y, params);
        case '方格型':
            return calculateGrid(X, Y, params);
        default:
            return 0;
    }
}

function calculateParallelLines(X, Y, params) {
    const { '线距': d1, 'X偏移': offsetX, '倾角': tiltAngle = 0 } = params;
    if (d1 === 0) return 0.5;
    
    // 将倾角转换为弧度
    const tiltRad = tiltAngle * Math.PI / 180;
    
    // 旋转坐标系
    const rotatedX = X * Math.cos(tiltRad) + Y * Math.sin(tiltRad);
    
    const val = Math.cos(2 * Math.PI * (rotatedX + offsetX) / d1);
    return 0.5 * (1 + Math.sign(val));
}

function calculateRadialLines(X, Y, params) {
    const { '辐射线条数': num_spokes, '角度偏移': angularOffset, '中心X': cx_radial, '中心Y': cy_radial } = params;
    if (num_spokes === 0) return 0.5;
    const angle = Math.atan2(Y - cy_radial, X - cx_radial);

    const val = Math.cos(num_spokes * (angle + (angularOffset * Math.PI / 180)));
    return 0.5 * (1 + Math.sign(val));
}

function calculateConcentricCircles(X, Y, params) {
    const { '环间距': ringSpacing, '中心X': cx, '中心Y': cy } = params;
    if (ringSpacing === 0) return 0.5;
    
    const distance = Math.sqrt((X - cx) ** 2 + (Y - cy) ** 2);
    const val = Math.cos(2 * Math.PI * distance / ringSpacing);
    return 0.5 * (1 + Math.sign(val));
}

function calculateSineWave(X, Y, params) {
    const { '波长': wavelength, '振幅': amplitude, '相位': phase, '方向': direction } = params;
    if (wavelength === 0) return 0.5;
    
    // 将方向角转换为弧度
    const directionRad = direction * Math.PI / 180;
    const phaseRad = phase * Math.PI / 180;
    
    // 在指定方向上的投影坐标
    const projectedCoord = X * Math.cos(directionRad) + Y * Math.sin(directionRad);
    
    // 使用正弦波函数而不是方波
    const val = Math.sin(2 * Math.PI * projectedCoord / wavelength + phaseRad);
    
    // 将正弦波转换为0-1范围，并创建条纹效果
    const threshold = amplitude / 10; // 可调节的阈值
    return val > threshold ? 1 : 0;
}

function calculateGrid(X, Y, params) {
    const { 'X线距': xSpacing, 'Y线距': ySpacing, 'X偏移': xOffset, 'Y偏移': yOffset } = params;
    if (xSpacing === 0 || ySpacing === 0) return 0.5;
    
    const xVal = Math.cos(2 * Math.PI * (X + xOffset) / xSpacing);
    const yVal = Math.cos(2 * Math.PI * (Y + yOffset) / ySpacing);
    
    const xPattern = 0.5 * (1 + Math.sign(xVal));
    const yPattern = 0.5 * (1 + Math.sign(yVal));
    
    // 通过逻辑AND操作创建方格效果
    return xPattern * yPattern;
}
