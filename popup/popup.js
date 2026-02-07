
// Popup Script

document.addEventListener('DOMContentLoaded', () => {
    loadWords();
    document.getElementById('clearBtn').addEventListener('click', clearAllWords);
});

async function loadWords() {
    const data = await chrome.storage.local.get(null);
    const wordList = document.getElementById('wordList');
    wordList.innerHTML = '';

    const words = Object.keys(data)
        .filter(key => key.startsWith('vocab_'))
        .map(key => data[key])
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

    if (words.length === 0) {
        wordList.innerHTML = '<div class="empty-state">No words saved yet. Click English words on any page!</div>';
        return;
    }

    words.forEach(word => {
        const card = document.createElement('div');
        card.className = 'word-card';

        // Play audio on word click
        const playAudio = () => {
            if (word.audioUrl) {
                new Audio(word.audioUrl).play();
            } else {
                // fallback TTS
                chrome.tts.speak(word.word);
            }
        };

        card.innerHTML = `
      <div class="card-header">
        <div>
           <span class="word-text">${word.word}</span>
           <span class="phonetic">[${word.phonetic || ''}]</span>
        </div>
        <button class="delete-btn" title="Delete">×</button>
      </div>
      <div class="definition">
        <strong>CN:</strong> ${word.cnDef}
      </div>
       <div class="definition">
        <strong>EN:</strong> ${word.enDef}
      </div>
      ${word.context ? `<div class="context">"${word.context}"</div>` : ''}
    `;

        // Event Listeners
        card.querySelector('.word-text').addEventListener('click', playAudio);

        card.querySelector('.delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            await chrome.storage.local.remove(`vocab_${word.word}`);
            card.remove();
            if (wordList.children.length === 0) {
                wordList.innerHTML = '<div class="empty-state">No words saved yet. Click English words on any page!</div>';
            }
        });

        wordList.appendChild(card);
    });
}

async function clearAllWords() {
    if (confirm('Are you sure you want to delete all saved words?')) {
        await chrome.storage.local.clear();
        loadWords();
    }
}
