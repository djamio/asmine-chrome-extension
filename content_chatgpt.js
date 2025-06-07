
document.addEventListener("DOMContentLoaded", () => {
    console.log("Content script loaded on ChatGPT");
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === "injectPrompt") {
            const textarea = document.querySelector('textarea');
            if (textarea) {
                textarea.value = msg.prompt;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                const submitButton = textarea.closest('form').querySelector('button');
                if (submitButton) submitButton.click();
                sendResponse({ status: "Prompt injected" });
            } else {
                sendResponse({ status: "Textarea not found" });
            }
        } else if (msg.action === "getLastResponse") {
            const messages = document.querySelectorAll('.markdown.prose');
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1].innerText;
                sendResponse({ response: lastMessage });
            } else {
                sendResponse({ response: null });
            }
        }
    });
});
