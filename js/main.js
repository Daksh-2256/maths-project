import { mountExpressionBuilder } from './modules/expressionBuilder.js';
import { mountVenn } from './modules/venn.js';
import { mountQuantifiers } from './modules/quantifiers.js';

function initTheme() {
    const toggleButton = document.getElementById('theme-toggle');
    const body = document.body;

    // Function to apply the theme
    const applyTheme = (theme) => {
        if (theme === 'light') {
            body.classList.add('light-mode');
        } else {
            body.classList.remove('light-mode');
        }
    };

    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark'; // default to dark
    applyTheme(savedTheme);

    // Event listener for the toggle button
    toggleButton.addEventListener('click', () => {
        const isLightMode = body.classList.contains('light-mode');
        const newTheme = isLightMode ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}


function initTabs() {
    const buttons = Array.from(document.querySelectorAll('.tab-button'));
    const sections = Array.from(document.querySelectorAll('.tab-section'));

    function activate(targetSelector) {
        buttons.forEach(b => b.classList.toggle('active', b.dataset.target === targetSelector));
        sections.forEach(s => s.classList.toggle('active', `#${s.id}` === targetSelector));
        // Update hash without jumping
        history.replaceState(null, '', targetSelector);
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            activate(btn.dataset.target);
        });
    });
}

function mountSections() {
    mountExpressionBuilder(document.getElementById('builder'));
    mountVenn(document.getElementById('venn'));
    mountQuantifiers(document.getElementById('quantifiers'));
}

// Initialize all features
initTheme();
initTabs();
mountSections();
