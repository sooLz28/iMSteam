chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {

    async function getDefaultSites() {
    try {
        const response = await fetch('default_sites.json');
        if (!response.ok) {
            throw new Error("JSON file not found");
        }
        const data = await response.json();
        
        return data.websites.map(website => ({
            ...website,
            enabled: true
        }));
    } catch (error) {
        console.error("Error Fetching Data", error);
        return [];
    }
}

    chrome.storage.local.set({ sites: getDefaultSites()}, () => {
      console.log('Default sites initialized');
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openLink" && message.url) {
    chrome.tabs.create({ url: message.url });
  }
});
