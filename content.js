
// Content Script - v3 (Robust Selection & Overlay)
console.log("English Learning Assistant: v3 Loaded");

// Visual Overlay Container (avoids modifying site DOM structure too much)
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

document.addEventListener('click', async (event) => {
    // Clean up previous overlays
    overlayContainer.innerHTML = '';

    // 1. Get Range
    let range;
    if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(event.clientX, event.clientY);
    }

    if (!range) return;

    // 2. Manual Word Expansion (Robust)
    // range.expand('word') is non-standard and flaky. Use custom logic.
    const wordRange = expandToWord(range);
    if (!wordRange) return;

    const word = wordRange.toString().trim();
    if (!word || !/^[a-zA-Z]+$/.test(word) || word.length < 2) return;

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
            updateTooltip(`✅ ${word} \n ${response.data.cnDef}`);
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
    const endRange = range.cloneRange();

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
        max-width: 250px;
        font-family: sans-serif;
    `;
    tooltipEl.innerText = text;
    document.body.appendChild(tooltipEl);

    // Dismiss on click elsewhere logic could be added
    setTimeout(() => { if (tooltipEl) tooltipEl.remove(); }, 5000);
}

function updateTooltip(text) {
    if (tooltipEl) tooltipEl.innerText = text;
}

function extractContext(range) {
    return range.commonAncestorContainer.textContent.substring(0, 100) + "...";
}
