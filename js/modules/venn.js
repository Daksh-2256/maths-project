// Simple 2-set Venn diagram with shading controls for P, Q, and P∧Q

function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
        if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(c));
    return el;
}

export function mountVenn(root) {
    const wrap = createEl('div', { class: 'panel' });
    wrap.appendChild(createEl('h3', { class: 'section-title', text: '2-Set Venn Diagram (P, Q)' }));
    wrap.appendChild(createEl('div', { class: 'section-title', text: 'Tip: click inside P, Q, or the overlap to toggle shading.' }));

    // Palette and Canvas (drag-and-drop like Expression Builder)
    const topGrid = createEl('div', { class: 'grid-2' });
    const sidebar = createEl('div');
    const rightCol = createEl('div');
    topGrid.appendChild(sidebar);
    topGrid.appendChild(rightCol);
    wrap.appendChild(topGrid);

    const state = { canvasTokens: [], listeners: new Set(), subscribe(fn){ this.listeners.add(fn); fn(); }, onChange(){ this.listeners.forEach(fn=>fn()); } };

    function paletteToken(text, classes) {
        const el = createEl('div', { class: `token ${classes}`, draggable: 'true' });
        el.textContent = text;
        el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', text); e.dataTransfer.effectAllowed = 'copy'; });
        return el;
    }
    function renderPalette() {
        sidebar.innerHTML = '';
        sidebar.appendChild(createEl('h3', { class: 'section-title', text: 'Palette' }));
        const pal = createEl('div', { class: 'panel palette' });
        ;['P','Q'].forEach(v => pal.appendChild(paletteToken(v, 'variable')));
        ;['¬','∧','∨','→','↔'].forEach(op => pal.appendChild(paletteToken(op, 'operator')));
        pal.appendChild(paletteToken('(', 'paren'));
        pal.appendChild(paletteToken(')', 'paren'));
        const clearBtn = createEl('button', { class: 'button danger', text: 'Clear' });
        clearBtn.addEventListener('click', () => { state.canvasTokens = []; state.onChange(); applyShade(); });
        const controls = createEl('div', { class: 'controls', style: 'margin-top:8px' });
        controls.appendChild(clearBtn);
        pal.appendChild(controls);
        sidebar.appendChild(pal);
    }

    const canvasWrap = createEl('div');
    rightCol.appendChild(canvasWrap);
    canvasWrap.appendChild(createEl('h3', { class: 'section-title', text: 'Canvas' }));
    const canvas = createEl('div', { class: 'panel canvas' });
    canvas.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    canvas.addEventListener('drop', (e) => { e.preventDefault(); const t = e.dataTransfer.getData('text/plain'); state.canvasTokens.push(t); state.onChange(); syncExprFromTokens(); applyFromTokens(); });
    canvasWrap.appendChild(canvas);

    function renderCanvas() {
        canvas.innerHTML = '';
        state.canvasTokens.forEach((tok, idx) => {
            const t = createEl('div', { class: 'token removable' });
            t.textContent = tok; t.title = 'Click to remove';
            t.addEventListener('click', () => { state.canvasTokens.splice(idx,1); state.onChange(); syncExprFromTokens(); applyFromTokens(); });
            canvas.appendChild(t);
        });
    }
    state.subscribe(renderCanvas);
    function syncExprFromTokens() { exprInput.value = state.canvasTokens.join(' '); }

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 480 300');
    svg.setAttribute('class', 'venn-svg');

    // Background
    const bg = document.createElementNS(svgNS, 'rect');
    bg.setAttribute('x', '0'); bg.setAttribute('y', '0'); bg.setAttribute('width', '480'); bg.setAttribute('height', '300');
    bg.setAttribute('fill', 'transparent');
    svg.appendChild(bg);

    const left = document.createElementNS(svgNS, 'circle');
    left.setAttribute('cx', '190'); left.setAttribute('cy', '150'); left.setAttribute('r', '90');
    left.setAttribute('fill', 'rgba(124,154,255,0.25)');
    left.setAttribute('stroke', 'rgba(124,154,255,0.9)'); left.setAttribute('stroke-width', '2');

    const right = document.createElementNS(svgNS, 'circle');
    right.setAttribute('cx', '290'); right.setAttribute('cy', '150'); right.setAttribute('r', '90');
    right.setAttribute('fill', 'rgba(49,196,141,0.25)');
    right.setAttribute('stroke', 'rgba(49,196,141,0.9)'); right.setAttribute('stroke-width', '2');

    svg.appendChild(left);
    svg.appendChild(right);

    // Labels
    const textP = document.createElementNS(svgNS, 'text');
    textP.setAttribute('x', '150'); textP.setAttribute('y', '145'); textP.setAttribute('fill', '#aab0d6'); textP.textContent = 'P';
    const textQ = document.createElementNS(svgNS, 'text');
    textQ.setAttribute('x', '325'); textQ.setAttribute('y', '145'); textQ.setAttribute('fill', '#aab0d6'); textQ.textContent = 'Q';
    svg.appendChild(textP); svg.appendChild(textQ);

    // Intersection overlay using clipPath
    const defs = document.createElementNS(svgNS, 'defs');
    const clipLeft = document.createElementNS(svgNS, 'clipPath'); clipLeft.id = 'clipLeft';
    const clipRight = document.createElementNS(svgNS, 'clipPath'); clipRight.id = 'clipRight';
    const leftClone = document.createElementNS(svgNS, 'circle'); leftClone.setAttribute('cx','190'); leftClone.setAttribute('cy','150'); leftClone.setAttribute('r','90');
    const rightClone = document.createElementNS(svgNS, 'circle'); rightClone.setAttribute('cx','290'); rightClone.setAttribute('cy','150'); rightClone.setAttribute('r','90');
    clipLeft.appendChild(leftClone); clipRight.appendChild(rightClone);

    // Masks for P-only (left-only) and Q-only (right-only)
    const maskLeftOnly = document.createElementNS(svgNS, 'mask'); maskLeftOnly.id = 'maskLeftOnly';
    const mLO_bg = document.createElementNS(svgNS, 'rect'); mLO_bg.setAttribute('x','0'); mLO_bg.setAttribute('y','0'); mLO_bg.setAttribute('width','480'); mLO_bg.setAttribute('height','300'); mLO_bg.setAttribute('fill','black');
    const mLO_left = document.createElementNS(svgNS, 'circle'); mLO_left.setAttribute('cx','190'); mLO_left.setAttribute('cy','150'); mLO_left.setAttribute('r','90'); mLO_left.setAttribute('fill','white');
    const mLO_right = document.createElementNS(svgNS, 'circle'); mLO_right.setAttribute('cx','290'); mLO_right.setAttribute('cy','150'); mLO_right.setAttribute('r','90'); mLO_right.setAttribute('fill','black');
    maskLeftOnly.appendChild(mLO_bg); maskLeftOnly.appendChild(mLO_left); maskLeftOnly.appendChild(mLO_right);

    const maskRightOnly = document.createElementNS(svgNS, 'mask'); maskRightOnly.id = 'maskRightOnly';
    const mRO_bg = document.createElementNS(svgNS, 'rect'); mRO_bg.setAttribute('x','0'); mRO_bg.setAttribute('y','0'); mRO_bg.setAttribute('width','480'); mRO_bg.setAttribute('height','300'); mRO_bg.setAttribute('fill','black');
    const mRO_left = document.createElementNS(svgNS, 'circle'); mRO_left.setAttribute('cx','190'); mRO_left.setAttribute('cy','150'); mRO_left.setAttribute('r','90'); mRO_left.setAttribute('fill','black');
    const mRO_right = document.createElementNS(svgNS, 'circle'); mRO_right.setAttribute('cx','290'); mRO_right.setAttribute('cy','150'); mRO_right.setAttribute('r','90'); mRO_right.setAttribute('fill','white');
    maskRightOnly.appendChild(mRO_bg); maskRightOnly.appendChild(mRO_left); maskRightOnly.appendChild(mRO_right);

    defs.appendChild(clipLeft); defs.appendChild(clipRight);
    defs.appendChild(maskLeftOnly); defs.appendChild(maskRightOnly);
    svg.appendChild(defs);

    // Region layers: left-only and right-only rectangles masked, plus intersection group
    const leftOnlyRect = document.createElementNS(svgNS, 'rect');
    leftOnlyRect.setAttribute('x','0'); leftOnlyRect.setAttribute('y','0'); leftOnlyRect.setAttribute('width','480'); leftOnlyRect.setAttribute('height','300');
    leftOnlyRect.setAttribute('fill','rgba(124,154,255,0.70)');
    leftOnlyRect.setAttribute('mask','url(#maskLeftOnly)');

    const rightOnlyRect = document.createElementNS(svgNS, 'rect');
    rightOnlyRect.setAttribute('x','0'); rightOnlyRect.setAttribute('y','0'); rightOnlyRect.setAttribute('width','480'); rightOnlyRect.setAttribute('height','300');
    rightOnlyRect.setAttribute('fill','rgba(49,196,141,0.70)');
    rightOnlyRect.setAttribute('mask','url(#maskRightOnly)');

    svg.appendChild(leftOnlyRect);
    svg.appendChild(rightOnlyRect);

    // Approach: show intersection by drawing a filled right circle clipped by left
    const intersectionGroup = document.createElementNS(svgNS, 'g');
    intersectionGroup.setAttribute('clip-path','url(#clipLeft)');
    const rightForIntersection = document.createElementNS(svgNS, 'circle');
    rightForIntersection.setAttribute('cx','290'); rightForIntersection.setAttribute('cy','150'); rightForIntersection.setAttribute('r','90');
    rightForIntersection.setAttribute('fill','rgba(255,255,255,0.35)');
    rightForIntersection.setAttribute('stroke','none');
    intersectionGroup.appendChild(rightForIntersection);
    svg.appendChild(intersectionGroup);

    // Expression input (P, Q)
    const exprRow = createEl('div', { class: 'controls', style: 'margin-top:8px;' });
    const exprInput = createEl('input', { type: 'text', placeholder: 'Expression with P, Q e.g., P ∧ Q or (P v Q)', style: 'flex:1;min-width:280px;background:var(--panel-2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px;' });
    const exprBtn = createEl('button', { class: 'button primary', text: 'Apply Expression' });
    const exprError = createEl('span', { class: 'section-title', text: '' });

    // Tiny tokenizer and shunting-yard for P,Q
    function tokenize(expr) {
        if (!expr) return [];
        let s = String(expr);
        // Normalize words and ascii operators
        s = s
            .replace(/<->|<=>/gi, '↔')
            .replace(/->/g, '→')
            .replace(/~/g, '¬')
            .replace(/\^/g, '∧')
            .replace(/\biff\b/gi, '↔')
            .replace(/\bimplies\b/gi, '→')
            .replace(/\bnot\b/gi, '¬')
            .replace(/\band\b/gi, '∧')
            .replace(/\bor\b/gi, '∨')
            .replace(/v/gi, '∨')
            .replace(/\bp\b/gi, 'P')
            .replace(/\bq\b/gi, 'Q');
        return s.match(/P|Q|¬|∧|∨|→|↔|\(|\)|\w+|\S/g) || [];
    }
    const PRECEDENCE = { NOT: 4, AND: 3, OR: 2, IMPLIES: 1, IFF: 1 };
    function compile(tokens) {
        const stack = []; const output = [];
        const opFromSym = (sym) => ({ '¬':'NOT', '∧':'AND', '∨':'OR', '→':'IMPLIES', '↔':'IFF' }[sym]);
        const isOperator = (t) => ['¬','∧','∨','→','↔'].includes(t);
        const precedenceOf = (t) => PRECEDENCE[opFromSym(t)];
        const rightAssoc = (t) => t === '¬';
        try {
            for (const token of tokens) {
                if (/^[PQ]$/.test(token)) output.push({ type: 'var', name: token });
                else if (isOperator(token)) {
                    while (stack.length) {
                        const top = stack[stack.length - 1];
                        if (!isOperator(top)) break;
                        const cond = rightAssoc(token)
                            ? precedenceOf(token) < precedenceOf(top)
                            : precedenceOf(token) <= precedenceOf(top);
                        if (cond) output.push({ type: 'op', sym: stack.pop() }); else break;
                    }
                    stack.push(token);
                } else if (token === '(') stack.push(token);
                else if (token === ')') {
                    while (stack.length && stack[stack.length - 1] !== '(') output.push({ type: 'op', sym: stack.pop() });
                    if (stack.pop() !== '(') throw new Error('Mismatched parentheses');
                } else {
                    throw new Error(`Unknown token: ${token}`);
                }
            }
            while (stack.length) {
                const s = stack.pop();
                if (s === '(' || s === ')') throw new Error('Mismatched parentheses');
                output.push({ type: 'op', sym: s });
            }
            return { rpn: output };
        } catch (e) { return { rpn: [], error: e.message }; }
    }
    function evaluateRPN(rpn, env) {
        const st = [];
        for (const it of rpn) {
            if (it.type === 'var') st.push(Boolean(env[it.name]));
            else {
                const s = it.sym; if (s === '¬') { const a = st.pop(); st.push(!a); continue; }
                const b = st.pop(); const a = st.pop();
                switch (s) {
                    case '∧': st.push(Boolean(a && b)); break;
                    case '∨': st.push(Boolean(a || b)); break;
                    case '→': st.push(Boolean(!a || b)); break;
                    case '↔': st.push(Boolean(a === b)); break;
                }
            }
        }
        return st.pop() ?? false;
    }

    function applyExpression(expr) {
        const tokens = tokenize(expr);
        const { rpn, error } = compile(tokens);
        if (error) { exprError.textContent = `Error: ${error}`; exprError.style.color = 'var(--danger)'; return; }
        exprError.textContent = '';
        // Evaluate for regions
        const valTT = (P, Q) => evaluateRPN(rpn, { P, Q });
        const onlyP = valTT(true,false);
        const onlyQ = valTT(false,true);
        const both = valTT(true,true);
        // Set precise regions: left-only, right-only, and intersection
        shadeState = { leftOnly: onlyP, rightOnly: onlyQ, pq: both };
        applyShade();
        // Status
        exprError.textContent = `Applied ✓  P-only:${onlyP ? 'T' : 'F'}  Q-only:${onlyQ ? 'T' : 'F'}  P∧Q:${both ? 'T' : 'F'}`;
        exprError.style.color = 'var(--muted)';
        try { console.log('Venn Apply:', { tokens, onlyP, onlyQ, both }); } catch {}
    }

    function applyFromTokens() { applyExpression(state.canvasTokens.join(' ')); }
    exprBtn.addEventListener('click', () => { state.canvasTokens = tokenize(exprInput.value); state.onChange(); applyFromTokens(); });
    exprInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); exprBtn.click(); } });
    exprRow.appendChild(exprInput);
    exprRow.appendChild(exprBtn);
    exprRow.appendChild(exprError);

    const controls = createEl('div', { class: 'controls', style: 'margin-top:8px;' });
    const btnP = createEl('button', { class: 'button', text: 'Shade P-only' });
    const btnQ = createEl('button', { class: 'button', text: 'Shade Q-only' });
    const btnPQ = createEl('button', { class: 'button primary', text: 'Shade P ∧ Q' });
    const btnClear = createEl('button', { class: 'button danger', text: 'Clear' });

    let shadeState = { leftOnly: false, rightOnly: false, pq: false };
    function applyShade() {
        // Keep base circles faint for context
        left.setAttribute('fill', 'rgba(124,154,255,0.15)');
        right.setAttribute('fill', 'rgba(49,196,141,0.15)');
        left.setAttribute('stroke-width', (shadeState.leftOnly || shadeState.pq) ? '3' : '2');
        right.setAttribute('stroke-width', (shadeState.rightOnly || shadeState.pq) ? '3' : '2');
        leftOnlyRect.setAttribute('visibility', shadeState.leftOnly ? 'visible' : 'hidden');
        rightOnlyRect.setAttribute('visibility', shadeState.rightOnly ? 'visible' : 'hidden');
        intersectionGroup.setAttribute('visibility', shadeState.pq ? 'visible' : 'hidden');
    }
    function clearShade() { shadeState = { leftOnly: false, rightOnly: false, pq: false }; applyShade(); }
    function shadeP() { shadeState = { leftOnly: true, rightOnly: false, pq: false }; applyShade(); }
    function shadeQ() { shadeState = { leftOnly: false, rightOnly: true, pq: false }; applyShade(); }
    function shadePQ() { shadeState = { leftOnly: false, rightOnly: false, pq: true }; applyShade(); }
    applyShade();

    btnP.addEventListener('click', shadeP);
    btnQ.addEventListener('click', shadeQ);
    btnPQ.addEventListener('click', shadePQ);
    btnClear.addEventListener('click', clearShade);

    controls.appendChild(btnP);
    controls.appendChild(btnQ);
    controls.appendChild(btnPQ);
    controls.appendChild(btnClear);

    // Click-to-toggle interaction on the SVG
    const hitP = document.createElementNS(svgNS, 'circle');
    hitP.setAttribute('cx','190'); hitP.setAttribute('cy','150'); hitP.setAttribute('r','90');
    hitP.setAttribute('fill','transparent'); hitP.setAttribute('pointer-events','all');
    const hitQ = document.createElementNS(svgNS, 'circle');
    hitQ.setAttribute('cx','290'); hitQ.setAttribute('cy','150'); hitQ.setAttribute('r','90');
    hitQ.setAttribute('fill','transparent'); hitQ.setAttribute('pointer-events','all');
    // Intersection hit: clone right but clip by left
    const hitGroup = document.createElementNS(svgNS, 'g');
    hitGroup.setAttribute('clip-path','url(#clipLeft)');
    const hitPQ = document.createElementNS(svgNS, 'circle');
    hitPQ.setAttribute('cx','290'); hitPQ.setAttribute('cy','150'); hitPQ.setAttribute('r','90');
    hitPQ.setAttribute('fill','transparent'); hitPQ.setAttribute('pointer-events','all');
    hitGroup.appendChild(hitPQ);
    // Add hit areas last so they sit on top
    svg.appendChild(hitGroup);
    svg.appendChild(hitP);
    svg.appendChild(hitQ);

    hitP.addEventListener('click', () => { shadeState.leftOnly = !shadeState.leftOnly; applyShade(); });
    hitQ.addEventListener('click', () => { shadeState.rightOnly = !shadeState.rightOnly; applyShade(); });
    hitPQ.addEventListener('click', () => { shadeState.pq = !shadeState.pq; applyShade(); });

    const legend = createEl('div', { class: 'legend' });
    legend.appendChild(createEl('span', { class: 'swatch', style: 'background:rgba(124,154,255,0.45)' }));
    legend.appendChild(createEl('span', { text: 'P' }));
    legend.appendChild(createEl('span', { class: 'swatch', style: 'background:rgba(49,196,141,0.45)' }));
    legend.appendChild(createEl('span', { text: 'Q' }));

    renderPalette();
    wrap.appendChild(svg);
    wrap.appendChild(exprRow);
    wrap.appendChild(controls);
    wrap.appendChild(legend);
    root.appendChild(wrap);

    // Auto-apply a default example for immediate feedback
    exprInput.value = 'P ∧ Q';
    state.canvasTokens = tokenize(exprInput.value);
    state.onChange();
    applyFromTokens();
}

