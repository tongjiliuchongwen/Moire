import { calculateGratingValue } from './grating.js';

let config = {
    L: 50,
    N: 250,
    gratingA: {
        idPrefix: 'gratingA',
        type: 'parallelLines',
        params: { d1: 5.0, offsetX: 0 }
    },
    gratingB: {
        idPrefix: 'gratingB',
        type: 'radialLines',
        params: { num_spokes: 12, angularOffset: 0, cx_radial: 0, cy_radial: 0 }
    }
};

const canvases = {
    A: null, B: null, Moire: null
};
const contexts = {
    A: null, B: null, Moire: null
};

const gratingParamDefinitions = {
    parallelLines: [
        { id: 'd1', label: 'Line Spacing (d1)', type: 'range', min: 0.1, max: 20, step: 0.1, default: 5.0 },
        { id: 'offsetX', label: 'X Offset', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 }
    ],
    radialLines: [
        { id: 'num_spokes', label: 'Number of Spokes', type: 'range', min: 2, max: 100, step: 1, default: 12 },
        { id: 'angularOffset', label: 'Angular Offset (degrees)', type: 'range', min: 0, max: 360, step: 1, default: 0 },
        { id: 'cx_radial', label: 'Center X', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 },
        { id: 'cy_radial', label: 'Center Y', type: 'range', min: -config.L, max: config.L, step: 0.1, default: 0 }
    ]
};

function updateParamRangeForL(gratingKey) {
    const L = config.L;
    const gratingConfig = config[gratingKey];

    ['offsetX', 'cx_radial', 'cy_radial'].forEach(paramId => {
        const inputEl = document.getElementById(`${gratingKey}_${paramId}`);
        const valEl = document.getElementById(`${gratingKey}_${paramId}_val`);
        if (inputEl) {
            inputEl.min = -L;
            inputEl.max = L;
            inputEl.step = L / 100 > 0 ? L / 100 : 0.01; // Ensure step is positive

            if (gratingConfig.params[paramId] > L || gratingConfig.params[paramId] < -L) {
                gratingConfig.params[paramId] = 0; // Reset param in config
                inputEl.value = 0;
                if (valEl) valEl.value = 0;
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
    title.textContent = gratingKey === 'gratingA' ? 'Grating A Settings' : 'Grating B Settings';
    container.appendChild(title);
    
    const controlWrapper = document.createElement('div');
    controlWrapper.className = 'space-y-4';

    const typeSelectorDiv = document.createElement('div');
    const typeLabel = document.createElement('label');
    typeLabel.htmlFor = `${gratingKey}_type`;
    typeLabel.className = 'block text-sm font-medium text-slate-300 mb-1';
    typeLabel.textContent = 'Grating Type';
    typeSelectorDiv.appendChild(typeLabel);

    const typeSelector = document.createElement('select');
    typeSelector.id = `${gratingKey}_type`;
    typeSelector.className = 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500';

    Object.keys(gratingParamDefinitions).forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        if (type === gratingConfig.type) option.selected = true;
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

        const input = document.createElement('input'); // This is the slider
        input.type = param.type;
        input.id = `${gratingKey}_${param.id}`;
        input.min = param.min;
        input.max = param.max;
        input.step = param.step;
        input.value = gratingConfig.params[param.id] !== undefined ? gratingConfig.params[param.id] : param.default;
        input.className = 'w-full custom-slider';
        
        const valueDisplay = document.createElement('input'); // This is the number input
        valueDisplay.type = 'number';
        valueDisplay.id = `${gratingKey}_${param.id}_val`;
        valueDisplay.value = input.value;
        valueDisplay.className = 'w-20 bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-center focus:ring-sky-500 focus:border-sky-500';
        valueDisplay.step = param.step; // Set step for direct input field as well

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
                if (val < currentMin) val = currentMin;
                if (val > currentMax) val = currentMax;

                if (currentStep > 0) {
                    val = Math.round(val / currentStep) * currentStep;
                }

                let precision = 0;
                const stepStr = currentStep.toString();
                if (stepStr.includes('.')) precision = Math.max(precision, stepStr.split('.')[1].length);
                const minStr = currentMin.toString();
                if (minStr.includes('.')) precision = Math.max(precision, minStr.split('.')[1].length);
                
                val = parseFloat(val.toFixed(precision));
                
                if (val < currentMin) val = currentMin; // Re-clamp after rounding
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
    canvasCtx.clearRect(0, 0, N, N); // Clear canvas before drawing
    const imageData = canvasCtx.createImageData(N, N);
    const data = imageData.data;

    for (let i = 0; i < N; i++) { // y_pixel
        for (let j = 0; j < N; j++) { // x_pixel
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
    canvasCtx.clearRect(0, 0, N, N); // Clear canvas before drawing
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
    const N = config.N;
    canvases.A.width = N; canvases.A.height = N;
    canvases.B.width = N; canvases.B.height = N;
    canvases.Moire.width = N; canvases.Moire.height = N;
    
    const parentA = canvases.A.parentElement;
    if (parentA) { // Ensure parentElement is available
        const parentWidth = parentA.clientWidth;
        const canvasSize = Math.max(50, Math.min(N, parentWidth - 16)); // Ensure a minimum size, don't exceed N or parent width

        canvases.A.style.width = `${canvasSize}px`; canvases.A.style.height = `${canvasSize}px`;
        canvases.B.style.width = `${canvasSize}px`; canvases.B.style.height = `${canvasSize}px`;
        canvases.Moire.style.width = `${canvasSize}px`; canvases.Moire.style.height = `${canvasSize}px`;
    }


    requestAnimationFrame(() => {
        if (contexts.A && contexts.B && contexts.Moire) {
             drawGrating(contexts.A, config.gratingA, config.L, config.N);
             drawGrating(contexts.B, config.gratingB, config.L, config.N);
             drawMoirePattern(contexts.Moire, config.gratingA, config.gratingB, config.L, config.N);
        }
    });
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

    if (!canvases.A || !canvases.B || !canvases.Moire) {
        console.error("One or more canvas elements not found!");
        return;
    }

    contexts.A = canvases.A.getContext('2d');
    contexts.B = canvases.B.getContext('2d');
    contexts.Moire = canvases.Moire.getContext('2d');
    
    initGeneralControls();
    createGratingControls('gratingA', 'gratingAControlsContainer');
    createGratingControls('gratingB', 'gratingBControlsContainer');
    
    renderAll();

    if (canvases.A.parentElement) {
        new ResizeObserver(() => {

            renderAll();
        }).observe(canvases.A.parentElement);
    }
}

document.addEventListener('DOMContentLoaded', initialize);
