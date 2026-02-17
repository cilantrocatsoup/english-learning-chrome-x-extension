
// Content Script - v3 (Robust Selection & Overlay & Floating Toggle)
console.log("English Learning Assistant: v3 Loaded");

// --- State Management ---
let isExtensionActive = true; // Default to true
let buttonTopPosition = "60%"; // Default position

// Initialize state from storage
chrome.storage.local.get(['extensionActive', 'buttonTopPosition'], (result) => {
    if (result.extensionActive !== undefined) {
        isExtensionActive = result.extensionActive;
    }
    if (result.buttonTopPosition !== undefined) {
        buttonTopPosition = result.buttonTopPosition;
        toggleBtn.style.top = buttonTopPosition;
    }
    updateToggleButtonState();
});

// --- UI Elements ---

// 1. Visual Overlay Container
const overlayContainer = document.createElement('div');
overlayContainer.id = 'english-assistant-overlay';
overlayContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
`;
document.body.appendChild(overlayContainer);

// 2. Floating Toggle Button
const toggleBtn = document.createElement('div');
toggleBtn.id = 'english-assistant-toggle';
// Use the extension icon
const iconUrl = chrome.runtime.getURL('icons/icon128.png');

toggleBtn.style.cssText = `
    position: fixed;
    top: ${buttonTopPosition};
    right: 0;
    width: 32px;
    height: 32px;
    background-image: url('${iconUrl}');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    cursor: pointer; /* fallback */
    cursor: ns-resize; /* suggest vertical movement */
    z-index: 2147483647;
    transition: transform 0.3s ease, opacity 0.3s ease, filter 0.3s ease; /* No transition on top during drag */
    filter: drop-shadow(-1px 1px 3px rgba(0,0,0,0.2));
`;
// Initial state styling is handled by updateToggleButtonState
document.body.appendChild(toggleBtn);

// --- Drag & Click Logic ---
let isDragging = false;
let startY;
let startTop;
let hasMoved = false;

toggleBtn.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasMoved = false;
    startY = e.clientY;
    startTop = toggleBtn.getBoundingClientRect().top;

    // Disable transition during drag for responsiveness
    toggleBtn.style.transition = 'none';

    // Prevent default selection
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaY = e.clientY - startY;

    // Threshold to consider it a move behavior rather than a click
    if (Math.abs(deltaY) > 2) {
        hasMoved = true;
    }

    let newTop = startTop + deltaY;

    // Constrain to viewport height
    const maxTop = window.innerHeight - 32;
    if (newTop < 0) newTop = 0;
    if (newTop > maxTop) newTop = maxTop;

    toggleBtn.style.top = `${newTop}px`;
});

document.addEventListener('mouseup', () => {
    if (!isDragging) return;

    isDragging = false;
    // Re-enable transition
    toggleBtn.style.transition = 'transform 0.3s ease, opacity 0.3s ease, filter 0.3s ease';

    if (hasMoved) {
        // Save new position
        const percentTop = (parseInt(toggleBtn.style.top) / window.innerHeight) * 100 + "%";
        chrome.storage.local.set({ buttonTopPosition: percentTop });
    } else {
        // Treat as click if didn't move
        toggleClickAction();
    }
});


function toggleClickAction() {
    isExtensionActive = !isExtensionActive;
    chrome.storage.local.set({ extensionActive: isExtensionActive });
    updateToggleButtonState();
}

function updateToggleButtonState() {
    if (isExtensionActive) {
        toggleBtn.style.filter = 'drop-shadow(-1px 1px 3px rgba(0,0,0,0.3))'; // Normal color
        toggleBtn.style.opacity = '1';
        toggleBtn.style.transform = 'translateX(0)';
    } else {
        toggleBtn.style.filter = 'grayscale(100%) drop-shadow(0 0 0 rgba(0,0,0,0))'; // Colorless/Grayscale
        toggleBtn.style.opacity = '0.5'; // Dimmed
        toggleBtn.style.transform = 'translateX(10px)'; // Partially hide
    }
}


// --- Interaction Logic ---

document.addEventListener('click', async (event) => {
    // 0. Check if active
    if (!isExtensionActive) return;

    // Ignore clicks on our own UI
    if (event.target === toggleBtn || toggleBtn.contains(event.target)) return;
    if (tooltipEl && (event.target === tooltipEl || tooltipEl.contains(event.target))) return;

    // Clean up previous overlays
    overlayContainer.innerHTML = '';

    // 1. Get Range
    let range;
    if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(event.clientX, event.clientY);
    }

    if (!range) return;

    // 2. Manual Word Expansion (Robust)
    const wordRange = expandToWord(range);
    if (!wordRange) return;

    // --- GEOMETRIC CHECK (Fix for selection bug) ---
    // Ensure the click actually happened ON the word range
    const rects = wordRange.getClientRects();
    let isClickOnWord = false;
    for (const rect of rects) {
        if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        ) {
            isClickOnWord = true;
            break;
        }
    }

    // Allow a small margin of error (e.g. 5px) in case of slight potential drift, 
    // but strictly speaking 'inside' is best for "click on word".
    // If strict check fails, we stop.
    if (!isClickOnWord) {
        // console.log("Click detected near word, but not ON word. Ignoring.");
        return;
    }
    // ------------------------------------------------

    const word = wordRange.toString().trim();
    if (!word || !/^[a-zA-Z]+$/.test(word) || word.length < 2) return;

    // STOP PROPAGATION: Prevent the click from triggering links (like on X.com)
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    console.log("Captured:", word);

    // 3. Visual Feedback (Overlay Box)
    showOverlayHighlight(wordRange);

    // 4. TTS Immediate
    chrome.runtime.sendMessage({ action: "SPEAK", word: word });

    // 5. Tooltip Feedback
    showTooltip(event.pageX, event.pageY, `Searching: ${word}...`);

    // 6. API Lookup
    const context = extractContext(wordRange);
    try {
        const response = await chrome.runtime.sendMessage({
            action: "LOOKUP_WORD",
            word: word,
            context: context,
            sourceUrl: window.location.href
        });

        if (response && response.success) {
            updateTooltip(response.data.cnDef); // Only show Chinese definition as per request logic implied
            if (response.data.audioUrl) {
                new Audio(response.data.audioUrl).play().catch(() => { });
            }
        } else {
            updateTooltip(`❌ Not found`);
        }
    } catch (e) {
        console.error(e);
        updateTooltip(`⚠️ Error`);
    }

}, true); // Capture phase

// --- Helper Functions ---

function expandToWord(range) {
    // Clone to avoid checking actual selection
    const startRange = range.cloneRange();
    // Check if we are on a text node
    if (startRange.startContainer.nodeType !== Node.TEXT_NODE) return null;

    const text = startRange.startContainer.nodeValue;
    let start = startRange.startOffset;
    let end = startRange.endOffset;

    // Move start back
    while (start > 0 && isWordChar(text.charAt(start - 1))) {
        start--;
    }
    // Move end forward
    while (end < text.length && isWordChar(text.charAt(end))) {
        end++;
    }

    if (start === end) return null;

    const newRange = document.createRange();
    newRange.setStart(startRange.startContainer, start);
    newRange.setEnd(startRange.startContainer, end);
    return newRange;
}

function isWordChar(char) {
    return /^[a-zA-Z]$/.test(char);
}

function showOverlayHighlight(range) {
    const rects = range.getClientRects();
    for (let rect of rects) {
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: rgba(255, 235, 59, 0.4); /* Yellow Transparent */
            border-bottom: 2px solid #fbc02d;
            pointer-events: none;
            z-index: 2147483647;
            border-radius: 2px;
        `;
        overlayContainer.appendChild(div);
    }
}

let tooltipEl = null;

function showTooltip(x, y, text) {
    if (tooltipEl) tooltipEl.remove();
    tooltipEl = document.createElement('div');
    tooltipEl.style.cssText = `
        position: absolute;
        top: ${y + 15}px;
        left: ${x}px;
        background: white;
        color: #333;
        border: 1px solid #ddd;
        padding: 8px 12px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2147483647;
        font-size: 13px;
        line-height: 1.4;
        max-width: 300px; /* Slightly wider */
        font-family: sans-serif;
    `;
    tooltipEl.innerText = text;
    document.body.appendChild(tooltipEl);

    // Dismiss logic
    const dismissEvents = ['scroll', 'mousedown'];
    const dismissHandler = () => {
        if (tooltipEl) {
            tooltipEl.remove();
            tooltipEl = null;
        }
        dismissEvents.forEach(e => window.removeEventListener(e, dismissHandler));
    };
    // Add a small delay so the click that created it doesn't immediately dismiss it
    setTimeout(() => {
        dismissEvents.forEach(e => window.addEventListener(e, dismissHandler));
    }, 100);

    // Auto remove after 5s
    setTimeout(() => {
        if (tooltipEl) {
            tooltipEl.remove();
            tooltipEl = null;
        }
    }, 5000);
}

function updateTooltip(text) {
    if (tooltipEl) tooltipEl.innerText = text;
}

function extractContext(range) {
    return range.commonAncestorContainer.textContent.substring(0, 100) + "...";
}
