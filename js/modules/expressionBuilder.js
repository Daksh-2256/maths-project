// Expression Builder with drag-and-drop and truth table generation

const OPERATORS = [
    { sym: '¬', name: 'NOT', arity: 1, key: 'NOT' },
    { sym: '∧', name: 'AND', arity: 2, key: 'AND' },
    { sym: '∨', name: 'OR', arity: 2, key: 'OR' },
    { sym: '→', name: 'IMPLIES', arity: 2, key: 'IMPLIES' },
    { sym: '↔', name: 'IFF', arity: 2, key: 'IFF' },
];

const PRECEDENCE = { NOT: 4, AND: 3, OR: 2, IMPLIES: 1, IFF: 1 };

function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
        if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(c));
    return el;
}

function paletteToken(text, classes) {
    const el = createEl('div', { class: `token ${classes}`, draggable: 'true' });
    el.textContent = text;
    el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', text);
        e.dataTransfer.effectAllowed = 'copy';
    });
    return el;
}

function renderPalette(sidebar, variablesState) {
    sidebar.innerHTML = '';
    sidebar.appendChild(createEl('h3', { class: 'section-title', text: 'Palette' }));
    const pal = createEl('div', { class: 'panel palette' });
    // Variables A, B, C, D
    ['P','Q','R','S'].forEach(v => pal.appendChild(paletteToken(v, 'variable')));
    // Operators
    OPERATORS.forEach(op => pal.appendChild(paletteToken(op.sym, 'operator')));
    // Parentheses
    pal.appendChild(paletteToken('(', 'paren'));
    pal.appendChild(paletteToken(')', 'paren'));
    // Controls
    const controls = createEl('div', { class: 'controls', style: 'margin-top:8px' });
    const clearBtn = createEl('button', { class: 'button danger' , text: 'Clear' });
    clearBtn.addEventListener('click', () => { variablesState.canvasTokens = []; variablesState.onChange(); });
    controls.appendChild(clearBtn);
    pal.appendChild(controls);
    sidebar.appendChild(pal);
}

function mountCanvas(container, variablesState) {
    container.innerHTML = '';
    container.appendChild(createEl('h3', { class: 'section-title', text: 'Canvas' }));
    const area = createEl('div', { class: 'panel canvas', id: 'expr-canvas' });
    area.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        const t = e.dataTransfer.getData('text/plain');
        variablesState.canvasTokens.push(t);
        variablesState.onChange();
    });
    container.appendChild(area);

    const exprRow = createEl('div', { class: 'controls', style: 'margin-top:8px' });
    const exprInput = createEl('input', { type: 'text', placeholder: 'Type expression e.g., (P ∧ Q) → ¬R', style: 'flex:1;min-width:280px;background:var(--panel-2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px;' });
    const applyBtn = createEl('button', { class: 'button primary', text: 'Apply' });
    applyBtn.addEventListener('click', () => {
        variablesState.canvasTokens = tokenize(exprInput.value);
        variablesState.onChange();
    });
    exprRow.appendChild(exprInput);
    exprRow.appendChild(applyBtn);
    container.appendChild(exprRow);

    function rerender() {
        area.innerHTML = '';
        variablesState.canvasTokens.forEach((tok, idx) => {
            const t = createEl('div', { class: 'token removable' });
            t.textContent = tok;
            t.title = 'Click to remove';
            t.addEventListener('click', () => { variablesState.canvasTokens.splice(idx,1); variablesState.onChange(); });
            area.appendChild(t);
        });
        exprInput.value = variablesState.canvasTokens.join(' ');
    }
    variablesState.subscribe(rerender);
}

function mountTruth(container, variablesState) {
    container.innerHTML = '';
    container.appendChild(createEl('h3', { class: 'section-title', text: 'Truth Table' }));
    const panel = createEl('div', { class: 'panel' });
    const tbl = createEl('table', { class: 'truth' });
    panel.appendChild(tbl);
    container.appendChild(panel);

    function rerender() {
        const tokens = variablesState.canvasTokens;
        const { variables, rpn, error } = compile(tokens);
        tbl.innerHTML = '';
        if (error) {
            const warn = createEl('div', { class: 'section-title', text: `Error: ${error}` });
            panel.prepend(warn);
            return;
        }
        const thead = createEl('thead');
        const headRow = createEl('tr');
        variables.forEach(v => headRow.appendChild(createEl('th', { text: v })));
        headRow.appendChild(createEl('th', { text: tokens.length ? tokens.join(' ') : 'Expression' }));
        thead.appendChild(headRow);
        const tbody = createEl('tbody');
        const rows = 1 << variables.length;
        for (let mask = 0; mask < rows; mask++) {
            const assignment = {};
            variables.forEach((v, i) => { assignment[v] = Boolean((mask >> (variables.length - 1 - i)) & 1); });
            const result = evaluateRPN(rpn, assignment);
            const tr = createEl('tr');
            variables.forEach(v => tr.appendChild(createEl('td', { text: assignment[v] ? 'T' : 'F' })));
            tr.appendChild(createEl('td', { text: result ? 'T' : 'F' }));
            tbody.appendChild(tr);
        }
        tbl.appendChild(thead);
        tbl.appendChild(tbody);
    }
    variablesState.subscribe(rerender);
}

function tokenize(expr) {
    if (!expr) return [];
    return expr
        .replace(/<->|<=>/g, '↔')
        .replace(/->/g, '→')
        .replace(/~/g, '¬')
        .replace(/\^/g, '∧')
        .replace(/v/g, '∨')
        .match(/P|Q|R|S|¬|∧|∨|→|↔|\(|\)|\w+|\S/g) || [];
}

function compile(tokens) {
    const variables = Array.from(new Set(tokens.filter(t => /^[PQRS]$/.test(t))));
    // Shunting-yard to RPN
    const stack = [];
    const output = [];
    const opFromSym = (sym) => ({ '¬':'NOT', '∧':'AND', '∨':'OR', '→':'IMPLIES', '↔':'IFF' }[sym]);
    const isOperator = (t) => ['¬','∧','∨','→','↔'].includes(t);
    const precedenceOf = (t) => PRECEDENCE[opFromSym(t)];
    const rightAssoc = (t) => t === '¬';
    try {
        for (const token of tokens) {
            if (/^[PQRS]$/.test(token)) {
                output.push({ type: 'var', name: token });
            } else if (isOperator(token)) {
                while (stack.length) {
                    const top = stack[stack.length - 1];
                    if (!isOperator(top)) break;
                    const cond = rightAssoc(token)
                        ? precedenceOf(token) < precedenceOf(top)
                        : precedenceOf(token) <= precedenceOf(top);
                    if (cond) output.push({ type: 'op', sym: stack.pop() }); else break;
                }
                stack.push(token);
            } else if (token === '(') {
                stack.push(token);
            } else if (token === ')') {
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
        return { variables, rpn: output };
    } catch (e) {
        return { variables, rpn: [], error: e.message };
    }
}

function evaluateRPN(rpn, env) {
    const stack = [];
    for (const item of rpn) {
        if (item.type === 'var') stack.push(Boolean(env[item.name]));
        else {
            const sym = item.sym;
            if (sym === '¬') { const a = stack.pop(); stack.push(!a); continue; }
            const b = stack.pop();
            const a = stack.pop();
            switch (sym) {
                case '∧': stack.push(Boolean(a && b)); break;
                case '∨': stack.push(Boolean(a || b)); break;
                case '→': stack.push(Boolean(!a || b)); break;
                case '↔': stack.push(Boolean(a === b)); break;
                default: throw new Error('Unknown op');
            }
        }
    }
    return stack.pop() ?? false;
}

function createState() {
    const listeners = new Set();
    const state = {
        canvasTokens: [],
        subscribe(fn) { listeners.add(fn); fn(); },
        onChange() { listeners.forEach(fn => fn()); }
    };
    return state;
}

export function mountExpressionBuilder(root) {
    const grid = createEl('div', { class: 'grid-2' });
    const sidebar = createEl('div');
    const main = createEl('div');
    grid.appendChild(sidebar);
    grid.appendChild(main);
    root.appendChild(grid);

    const state = createState();
    state.subscribe(() => {});
    state.onChange();

    renderPalette(sidebar, state);
    const canvasWrap = createEl('div');
    const truthWrap = createEl('div', { style: 'margin-top:12px;' });
    main.appendChild(canvasWrap);
    main.appendChild(truthWrap);
    mountCanvas(canvasWrap, state);
    mountTruth(truthWrap, state);
}

