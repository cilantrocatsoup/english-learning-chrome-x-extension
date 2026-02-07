
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    renderWords();

    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderWords(e.target.value);
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        renderWords();
        loadStats();
    });

    document.getElementById('clearAllBtn').addEventListener('click', async () => {
        if (confirm("Delete EVERYTHING? This cannot be undone.")) {
            await chrome.storage.local.clear();
            renderWords();
            loadStats();
        }
    });
});

async function loadStats() {
    const data = await chrome.storage.local.get(null);
    const count = Object.keys(data).filter(k => k.startsWith('vocab_')).length;
    document.getElementById('totalWords').textContent = count;
}

async function renderWords(filter = "") {
    const grid = document.getElementById('wordGrid');
    grid.innerHTML = '';

    const data = await chrome.storage.local.get(null);
    const words = Object.keys(data)
        .filter(key => key.startsWith('vocab_'))
        .map(key => data[key])
        .sort((a, b) => b.timestamp - a.timestamp);

    const filtered = words.filter(w => w.word.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; margin-top: 50px;">No words found.</div>';
        return;
    }

    filtered.forEach(word => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <span class="word">${word.word}</span>
                    <span class="phonetic">[${word.phonetic || '?'}]</span>
                </div>
                <span class="delete-icon">🗑️</span>
            </div>
            <div class="def-cn">${word.cnDef || 'No definition'}</div>
            <div class="def-en">${word.enDef || ''}</div>
            ${word.context ? `
                <div class="context-box ${word.sourceUrl ? 'clickable' : ''}" 
                     title="${word.sourceUrl ? 'Open source: ' + word.sourceUrl : ''}"
                     data-url="${word.sourceUrl || ''}">
                    "${word.context}"
                    ${word.sourceUrl ? '<span style="float:right; font-size:12px; opacity:0.6; margin-left:5px;">🔗</span>' : ''}
                </div>` : ''}
            <div class="timestamp">${new Date(word.timestamp).toLocaleDateString()}</div>
        `;

        // Click to pronunciation
        card.querySelector('.word').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "PLAY_AUDIO", url: word.audioUrl, word: word.word });
        });

        // Click context to open URL
        const contextBox = card.querySelector('.context-box');
        if (contextBox && word.sourceUrl) {
            contextBox.addEventListener('click', () => {
                window.open(word.sourceUrl, '_blank');
            });
        }

        // Delete
        card.querySelector('.delete-icon').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${word.word}"?`)) {
                await chrome.storage.local.remove(`vocab_${word.word}`);
                card.remove();
                loadStats();
            }
        });

        grid.appendChild(card);
    });
}
