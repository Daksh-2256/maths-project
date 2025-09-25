// Quantifier playground with colored shapes and forall/exists evaluation

function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
        if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(c));
    return el;
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const SHAPES = ['circle', 'square', 'triangle'];

function randomInt(n) { return Math.floor(Math.random() * n); }

function generateWorld(count = 24) {
    const items = [];
    for (let i = 0; i < count; i++) {
        const color = COLORS[randomInt(COLORS.length)];
        const shape = SHAPES[randomInt(SHAPES.length)];
        items.push({ id: i, color, shape });
    }
    return items;
}

function drawShapeCell(item) {
    const cell = createEl('div', { class: `shape ${item.shape}` });
    const inner = createEl('div');
    inner.style.width = '18px'; inner.style.height = '18px';
    inner.style.background = item.color;
    if (item.shape === 'circle') {
        inner.style.borderRadius = '50%';
    } else if (item.shape === 'triangle') {
        inner.style.width = '0'; inner.style.height = '0';
        inner.style.borderLeft = '10px solid transparent';
        inner.style.borderRight = '10px solid transparent';
        inner.style.borderBottom = `18px solid ${item.color}`;
        inner.style.background = 'transparent';
    }
    cell.appendChild(inner);
    return cell;
}

function evaluateForAll(items, predicate) {
    return items.every(predicate);
}
function evaluateExists(items, predicate) {
    return items.some(predicate);
}

export function mountQuantifiers(root) {
    const wrap = createEl('div', { class: 'panel' });
    wrap.appendChild(createEl('h3', { class: 'section-title', text: 'Quantifiers Playground' }));

    let world = generateWorld();

    const board = createEl('div', { class: 'shapes-board' });
    function renderBoard() {
        board.innerHTML = '';
        world.forEach(item => board.appendChild(drawShapeCell(item)));
    }
    renderBoard();

    const controls = createEl('div', { class: 'controls', style: 'margin-top:8px;' });
    const regenerate = createEl('button', { class: 'button', text: 'Regenerate World' });
    regenerate.addEventListener('click', () => { world = generateWorld(); renderBoard(); runEval(); });
    controls.appendChild(regenerate);

    const queryRow = createEl('div', { class: 'query-row' });
    const quantifier = createEl('select');
    ;['∀ (for all)','∃ (exists)'].forEach((t,i)=>{
        const opt = createEl('option', { value: i === 0 ? 'forall' : 'exists', text: t });
        quantifier.appendChild(opt);
    });
    const subject = createEl('select');
    ;['shape is circle','shape is square','shape is triangle'].forEach((t,i)=>{
        const v = ['circle','square','triangle'][i];
        const opt = createEl('option', { value: v, text: t });
        subject.appendChild(opt);
    });
    const connector = createEl('span', { text: '→ has color' });
    const colorSel = createEl('select');
    COLORS.forEach(c => colorSel.appendChild(createEl('option', { value: c, text: c })));
    const runBtn = createEl('button', { class: 'button primary', text: 'Evaluate' });
    const result = createEl('span', { class: 'section-title', text: '' });
    function runEval() {
        const pred = (item) => item.shape === subject.value ? item.color === colorSel.value : true;
        const existsPred = (item) => item.shape === subject.value && item.color === colorSel.value;
        const ok = quantifier.value === 'forall'
            ? evaluateForAll(world, pred)
            : evaluateExists(world, existsPred);
        result.textContent = ok ? 'True' : 'False';
        result.style.color = ok ? 'var(--accent-2)' : 'var(--danger)';
    }
    runBtn.addEventListener('click', runEval);

    queryRow.appendChild(quantifier);
    queryRow.appendChild(subject);
    queryRow.appendChild(connector);
    queryRow.appendChild(colorSel);
    queryRow.appendChild(runBtn);
    queryRow.appendChild(result);

    wrap.appendChild(board);
    wrap.appendChild(controls);
    wrap.appendChild(queryRow);
    root.appendChild(wrap);
}

