import { calculateGratingValue } from './grating.js';

let config = {
    L: 50,
    N: 250,
    gratingA: {
        idPrefix: 'gratingA',
        type: '平行线型',
        params: { '线距': 5.0, 'X偏移': 0, '倾角': 0 } // 添加倾角参数
    },
    gratingB: {
        idPrefix: 'gratingB',
        type: '辐射线型',
        params: { '辐射线条数': 12, '角度偏移': 0, '中心X': 0, '中心Y': 0 }
    }
};

const canvases = {
    A: null, B: null, Moire: null
};
const contexts = {
    A: null, B: null, Moire: null
};

const gratingParamDefinitions = {
    '平行线型': [
        { id: '线距', label: '线间距 (d1)', type: 'range', min: 0.1, max: 20, step: 0.1, default: 5.0 },
        { id: 'X偏移', label: 'X 轴偏移', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 },
        { id: '倾角', label: '倾角 (度)', type: 'range', min: -90, max: 90, step: 1, default: 0 } // 新增倾角控制
    ],
    '辐射线型': [
        { id: '辐射线条数', label: '辐射线条数', type: 'range', min: 2, max: 100, step: 1, default: 12 },
        { id: '角度偏移', label: '角度偏移 (度)', type: 'range', min: 0, max: 360, step: 1, default: 0 },
        { id: '中心X', label: '中心 X', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 },
        { id: '中心Y', label: '中心 Y', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 }
    ],
    '同心圆型': [ // 新增同心圆光栅
        { id: '环间距', label: '环间距', type: 'range', min: 0.1, max: 20, step: 0.1, default: 5.0 },
        { id: '中心X', label: '中心 X', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 },
        { id: '中心Y', label: '中心 Y', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 }
    ],
    '正弦波型': [ // 新增正弦波光栅
        { id: '波长', label: '波长', type: 'range', min: 0.5, max: 20, step: 0.1, default: 5.0 },
        { id: '振幅', label: '振幅', type: 'range', min: 0.1, max: 20, step: 0.1, default: 2.0 },
        { id: '相位', label: '相位 (度)', type: 'range', min: 0, max: 360, step: 1, default: 0 },
        { id: '方向', label: '方向 (度)', type: 'range', min: 0, max: 360, step: 1, default: 0 }
    ],
    '方格型': [ // 新增方格光栅
        { id: 'X线距', label: 'X 线间距', type: 'range', min: 0.1, max: 20, step: 0.1, default: 5.0 },
        { id: 'Y线距', label: 'Y 线间距', type: 'range', min: 0.1, max: 20, step: 0.1, default: 5.0 },
        { id: 'X偏移', label: 'X 轴偏移', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 },
        { id: 'Y偏移', label: 'Y 轴偏移', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 }
    ]
};

function updateParamRangeForL(gratingKey) {
    const L = config.L;
    const gratingConfig = config[gratingKey];
    const currentGratingType = gratingConfig.type;

    // Define which params are spatial and need L-based updates
    const spatialParamsMap = {
        '平行线型': ['X偏移'],
        '辐射线型': ['中心X', '中心Y'],
        '同心圆型': ['中心X', '中心Y'],
        '方格型': ['X偏移', 'Y偏移']
    };
    const paramsToUpdate = spatialParamsMap[currentGratingType] || [];

    paramsToUpdate.forEach(paramId => {
        const inputEl = document.getElementById(`${gratingKey}_${paramId}`);
        const valEl = document.getElementById(`${gratingKey}_${paramId}_val`);
        if (inputEl) {
            inputEl.min = -L;
            inputEl.max = L;
            inputEl.step = L / 100 > 0 ? L / 100 : 0.01;

            if (gratingConfig.params[paramId] > L || gratingConfig.params[paramId] < -L) {
                gratingConfig.params[paramId] = Math.max(-L, Math.min(L, gratingConfig.params[paramId]));
                inputEl.value = gratingConfig.params[paramId];
                valEl.value = gratingConfig.params[paramId];
            }
        }
    });
}

function createGratingControls(gratingKey, containerId) {
    const gratingConfig = config[gratingKey];
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const title = document.createElement('h2');
    title.className = 'text-2xl font-semibold mb-6 text-sky-400 border-b border-slate-700 pb-3';
    title.textContent = gratingKey === 'gratingA' ? '光栅 A 设置' : '光栅 B 设置';
    container.appendChild(title);

    const controlWrapper = document.createElement('div');
    controlWrapper.className = 'space-y-4';

    const typeSelectorDiv = document.createElement('div');
    const typeLabel = document.createElement('label');
    typeLabel.htmlFor = `${gratingKey}_type`;
    typeLabel.className = 'block text-sm font-medium text-slate-300 mb-1';
    typeLabel.textContent = '光栅类型';
    typeSelectorDiv.appendChild(typeLabel);

    const typeSelector = document.createElement('select');
    typeSelector.id = `${gratingKey}_type`;
    typeSelector.className = 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500';

    Object.keys(gratingParamDefinitions).forEach(typeKey => {
        const option = document.createElement('option');
        option.value = typeKey;

        // 显示文本映射
        const displayNames = {
            '平行线型': '平行线',
            '辐射线型': '辐射线', 
            '同心圆型': '同心圆',
            '正弦波型': '正弦波',
            '方格型': '方格'
        };
        option.textContent = displayNames[typeKey] || typeKey;

        if (typeKey === gratingConfig.type) option.selected = true;
        typeSelector.appendChild(option);
    });
    
    typeSelector.addEventListener('change', (e) => {
        gratingConfig.type = e.target.value;
        const newParams = {};
        gratingParamDefinitions[gratingConfig.type].forEach(p => newParams[p.id] = p.default);
        gratingConfig.params = newParams;
        createGratingControls(gratingKey, containerId);
        renderAll();
    });
    typeSelectorDiv.appendChild(typeSelector);
    controlWrapper.appendChild(typeSelectorDiv);

    const params = gratingParamDefinitions[gratingConfig.type];
    params.forEach(param => {
        const paramDiv = document.createElement('div');
        const label = document.createElement('label');
        label.htmlFor = `${gratingKey}_${param.id}`;
        label.className = 'block text-sm font-medium text-slate-300 mb-1';
        label.textContent = param.label;
        paramDiv.appendChild(label);

        const inputContainer = document.createElement('div');
        inputContainer.className = 'flex items-center space-x-2';

        const input = document.createElement('input');
        input.type = param.type;
        input.id = `${gratingKey}_${param.id}`;
        input.min = param.min;
        input.max = param.max;
        input.step = param.step;
        input.value = gratingConfig.params[param.id] !== undefined ? gratingConfig.params[param.id] : param.default;
        input.className = 'w-full custom-slider';

        const valueDisplay = document.createElement('input');
        valueDisplay.type = 'number';
        valueDisplay.id = `${gratingKey}_${param.id}_val`;
        valueDisplay.value = input.value;
        valueDisplay.className = 'w-20 bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-center focus:ring-sky-500 focus:border-sky-500';
        valueDisplay.step = param.step;

        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            gratingConfig.params[param.id] = val;
            valueDisplay.value = val;
            renderAll();
        });

        valueDisplay.addEventListener('change', (e) => {
            let valStr = e.target.value;
            const sliderInput = document.getElementById(`${gratingKey}_${param.id}`);
            const currentMin = parseFloat(sliderInput.min);
            const currentMax = parseFloat(sliderInput.max);
            const currentStep = parseFloat(sliderInput.step);

            let val = parseFloat(valStr);

            if (isNaN(val)) {
                val = gratingConfig.params[param.id];
            } else {
                if (currentStep > 0) {
                    val = Math.round(val / currentStep) * currentStep;
                }

                let precision = 0;
                const stepStr = currentStep.toString();
                if (stepStr.includes('.')) precision = Math.max(precision, stepStr.split('.')[1].length);
                const minStr = currentMin.toString();
                if (minStr.includes('.')) precision = Math.max(precision, minStr.split('.')[1].length);

                val = parseFloat(val.toFixed(precision));

                if (val < currentMin) val = currentMin;
                if (val > currentMax) val = currentMax;
            }

            gratingConfig.params[param.id] = val;
            sliderInput.value = val;
            valueDisplay.value = val;
            renderAll();
        });

        inputContainer.appendChild(input);
        inputContainer.appendChild(valueDisplay);
        paramDiv.appendChild(inputContainer);
        controlWrapper.appendChild(paramDiv);
    });
    container.appendChild(controlWrapper);
    updateParamRangeForL(gratingKey);
}

function drawGrating(canvasCtx, gratingCfg, L, N) {
    canvasCtx.clearRect(0, 0, N, N);
    const imageData = canvasCtx.createImageData(N, N);
    const data = imageData.data;

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const X = -L + (j + 0.5) * (2 * L / N);
            const Y = L - (i + 0.5) * (2 * L / N);

            const val = calculateGratingValue(gratingCfg.type, X, Y, gratingCfg.params);
            const color = val * 255;
            const pixelIndex = (i * N + j) * 4;
            data[pixelIndex] = color;
            data[pixelIndex + 1] = color;
            data[pixelIndex + 2] = color;
            data[pixelIndex + 3] = 255;
        }
    }
    canvasCtx.putImageData(imageData, 0, 0);
}

function drawMoirePattern(canvasCtx, gratingACfg, gratingBCfg, L, N) {
    canvasCtx.clearRect(0, 0, N, N);
    const imageData = canvasCtx.createImageData(N, N);
    const data = imageData.data;

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const X = -L + (j + 0.5) * (2 * L / N);
            const Y = L - (i + 0.5) * (2 * L / N);

            const valA = calculateGratingValue(gratingACfg.type, X, Y, gratingACfg.params);
            const valB = calculateGratingValue(gratingBCfg.type, X, Y, gratingBCfg.params);
            
            const moireVal = valA * valB;
            const color = moireVal * 255;
            const pixelIndex = (i * N + j) * 4;
            data[pixelIndex] = color;
            data[pixelIndex + 1] = color;
            data[pixelIndex + 2] = color;
            data[pixelIndex + 3] = 255;
        }
    }
    canvasCtx.putImageData(imageData, 0, 0);
}

function renderAll() {
    const L = config.L;
    const N = config.N;
    
    drawGrating(contexts.A, config.gratingA, L, N);
    drawGrating(contexts.B, config.gratingB, L, N);
    drawMoirePattern(contexts.Moire, config.gratingA, config.gratingB, L, N);
}

function initGeneralControls() {
    const lSlider = document.getElementById('paramL');
    const lVal = document.getElementById('paramL_val');
    const nSlider = document.getElementById('paramN');
    const nVal = document.getElementById('paramN_val');

    lSlider.addEventListener('input', (e) => {
        config.L = parseFloat(e.target.value);
        lVal.value = config.L;
        updateParamRangeForL('gratingA');
        updateParamRangeForL('gratingB');
        renderAll();
    });
    lVal.addEventListener('change', (e) => {
        let val = parseFloat(e.target.value);
        const minL = parseFloat(lSlider.min);
        const maxL = parseFloat(lSlider.max);
        const stepL = parseFloat(lSlider.step);

        if (isNaN(val)) { val = config.L; }
        else {
            if (val < minL) val = minL;
            if (val > maxL) val = maxL;
            if (stepL > 0) val = Math.round(val / stepL) * stepL;

            let precisionL = 0;
            const stepLStr = stepL.toString();
            if (stepLStr.includes('.')) precisionL = stepLStr.split('.')[1].length;
            val = parseFloat(val.toFixed(precisionL));
        }

        config.L = val;
        lSlider.value = val;
        lVal.value = val;
        updateParamRangeForL('gratingA');
        updateParamRangeForL('gratingB');
        renderAll();
    });

    nSlider.addEventListener('input', (e) => {
        config.N = parseInt(e.target.value, 10);
        nVal.value = config.N;
        renderAll();
    });
    nVal.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        const minN = parseInt(nSlider.min, 10);
        const maxN = parseInt(nSlider.max, 10);
        const stepN = parseInt(nSlider.step, 10);

        if (isNaN(val)) { val = config.N; }
        else {
            if (val < minN) val = minN;
            if (val > maxN) val = maxN;
            if (stepN > 0) val = Math.round(val / stepN) * stepN;
        }
        config.N = val;
        nSlider.value = val;
        nVal.value = val;
        renderAll();
    });
}

function initialize() {
    canvases.A = document.getElementById('canvasA');
    canvases.B = document.getElementById('canvasB');
    canvases.Moire = document.getElementById('canvasMoire');
    
    contexts.A = canvases.A.getContext('2d');
    contexts.B = canvases.B.getContext('2d');
    contexts.Moire = canvases.Moire.getContext('2d');

    Object.values(canvases).forEach(canvas => {
        canvas.width = config.N;
        canvas.height = config.N;
    });

    createGratingControls('gratingA', 'gratingAControls');
    createGratingControls('gratingB', 'gratingBControls');
    
    initGeneralControls();
    renderAll();
}

document.addEventListener('DOMContentLoaded', initialize);
