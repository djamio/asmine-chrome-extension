// // Service worker for handling extension icon click
// chrome.action.onClicked.addListener((tab) => {
//   chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     files: ['slider.js']
//   });
// });

// // Message handler for communication between content script and extension
// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   if (msg.action === 'injectPrompt' || msg.action === 'getLastResponse') {
//     chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
//       if (tabs.length > 0) {
//         chrome.scripting.executeScript({
//           target: { tabId: tabs[0].id },
//           func: msg.action === 'injectPrompt' ? injectPrompt : getLastResponse,
//           args: [msg.prompt]
//         }, results => {
//           sendResponse({ status: "done", response: results[0]?.result });
//         });
//       } else {
//         sendResponse({ status: "No active tab" });
//       }
//     });
//     return true; // Keep message channel open for async response
//   }
// });

// function injectPrompt(prompt) {
//   const textarea = document.querySelector('textarea');
//   if (textarea) {
//     textarea.value = prompt;
//     textarea.dispatchEvent(new Event('input', { bubbles: true }));
//     const btn = textarea.closest('form').querySelector('button');
//     if (btn) btn.click();
//     return "Prompt injected!";
//   }
//   return "Textarea not found.";
// }

// function getLastResponse() {
//   const messages = document.querySelectorAll('.markdown.prose');
//   return messages.length > 0 ? messages[messages.length - 1].innerText : "No response.";
// }
