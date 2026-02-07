
// Background Script v3
console.log("English Learning Assistant: Background Loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SPEAK") {
    chrome.tts.speak(request.word, { lang: 'en-US', rate: 1.0 });
    sendResponse({ status: "ok" });
  }

  if (request.action === "PLAY_AUDIO") {
    // Try to play audio URL if available, otherwise use TTS
    if (request.url) {
      const audio = new Audio(request.url);
      audio.play().catch(() => {
        // Fallback to TTS if audio fails
        chrome.tts.speak(request.word, { lang: 'en-US', rate: 1.0 });
      });
    } else {
      chrome.tts.speak(request.word, { lang: 'en-US', rate: 1.0 });
    }
    sendResponse({ status: "ok" });
  }

  if (request.action === "LOOKUP_WORD") {
    handleLookup(request.word, request.context, request.sourceUrl).then(sendResponse);
    return true;
  }
});

async function handleLookup(word, context, sourceUrl) {
  try {
    console.log("Looking up:", word);
    // API Calls
    const enRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const enData = await enRes.json();

    let cnDef = "Translation loading...";
    // Simple Youdao fetch
    try {
      const cnRes = await fetch(`http://dict.youdao.com/suggest?num=1&doctype=json&q=${word}`);
      const cnData = await cnRes.json();
      if (cnData?.data?.entries?.[0]?.explain) {
        cnDef = cnData.data.entries[0].explain;
      } else {
        cnDef = "No CN definition";
      }
    } catch (e) { cnDef = "Network Error (CN)"; }

    let audioUrl = null;
    let enDef = "";
    let phonetic = "";

    if (Array.isArray(enData) && enData.length > 0) {
      const entry = enData[0];
      phonetic = entry.phonetic || "";
      const audioObj = entry.phonetics.find(p => p.audio);
      audioUrl = audioObj ? audioObj.audio : null;
      enDef = entry.meanings[0]?.definitions[0]?.definition || "";
    }

    const data = { word, cnDef, enDef, audioUrl, phonetic, context, sourceUrl, timestamp: Date.now() };

    // Save
    await chrome.storage.local.set({ [`vocab_${word}`]: data });

    return { success: true, data };
  } catch (e) {
    console.error("Lookup Error:", e);
    return { success: false, error: e.message };
  }
}
