function searchGameOnPlatform(container, site, formattedGameName) {
    const searchUrl = site.search_url + formattedGameName;
    // createButton(container, searchUrl, site.name, `Search on ${site.name}`, site.image_url);
    createButton(container, searchUrl, site.name, searchUrl, site.image_url);
}


function createButton(container, searchLink, buttonText, tooltipText, iconPath) {
  const linkButton = document.createElement("button");
  
  const isExternal = iconPath.startsWith('http') || iconPath.startsWith('https') || iconPath.startsWith('data:');
  const finalIconUrl = isExternal ? iconPath : chrome.runtime.getURL(iconPath);

  linkButton.style.cssText = `
    background-color: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    margin: 0 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
    border-radius: 12px;
    overflow: hidden;
  `;

  const img = new Image();
  img.src = finalIconUrl;
  img.alt = buttonText;
  img.classList.add("site-icon");
  img.style.cssText = `
    width: 64px;
    height: 64px;
    object-fit: contain;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.5) 100%);
    padding: 5px;
    border-radius: 8px;
    transition: transform 0.3s ease;
  `;

  img.onerror = function() {
    this.style.display = 'none';
    linkButton.innerText = buttonText;
    linkButton.style.cssText += `
      background: #333;
      color: white;
      padding: 5px 10px;
      font-size: 11px;
    `;
  };

  linkButton.title = tooltipText;

  linkButton.addEventListener('mouseover', function() {
    img.style.transform = 'scale(1.1)';
    this.style.transform = 'translateY(-2px)';
  });

  linkButton.addEventListener('mouseout', function() {
    img.style.transform = 'scale(1)';
    this.style.transform = 'translateY(0)';
  });

  linkButton.appendChild(img);
  linkButton.classList.add("search-button");

  linkButton.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    chrome.runtime.sendMessage({ 
      action: "openLink",
      url: searchLink
    });
  };

  container.appendChild(linkButton);
}


function initializeExtension() {
  console.log("Initializing extension..."); // Debug log
  console.log("Checking for game name element..."); // Debug log
  const selectors = [
    '.apphub_AppName',
    '#appHubAppName',
    '.game_title_area .pageheader',
    '.game_description_header',
    '.breadcrumbs .blockbg:last-child a'
  ];

  let gameNameElement = null;
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      gameNameElement = element;
      break;
    }
  }

  if (gameNameElement) {
    const gameName = gameNameElement.textContent.trim();
    const formattedGameName = encodeURIComponent(
      gameName.toLowerCase()
        .replace(/['_™®©]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
    
    let buttonContainer = document.querySelector('.imsteam-button-container');
    if (!buttonContainer) {
      buttonContainer = document.createElement("div");
      buttonContainer.className = 'imsteam-button-container';
      buttonContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        margin-top: 10px;
        gap: 8px;
        padding: 5px;
        border-radius: 12px;
      `;
      
      if (gameNameElement.parentNode) {
        gameNameElement.parentNode.insertBefore(buttonContainer, gameNameElement.nextSibling);
      }
    }

    function createButtonsFromSettings(sites) {
      buttonContainer.innerHTML = "";
      sites.forEach((site) => {
        if (site.enabled) {
          searchGameOnPlatform(buttonContainer, site, formattedGameName);
        }
      });
    }

    function getSitesWithRetry(retryCount = 0, maxRetries = 3) {
      chrome.storage.local.get({ sites: [] }, (data) => {
        const storedSites = data.sites;
        if (storedSites && storedSites.length > 0) {
          createButtonsFromSettings(storedSites);
        } else if (retryCount < maxRetries) {
          // If no sites found, retry after a delay
          console.log(`Retrying to get sites data... Attempt ${retryCount + 1}`);
          setTimeout(() => {
            getSitesWithRetry(retryCount + 1, maxRetries);
          }, 1000); // Wait 1 second before retrying
        }
      });
    }

    getSitesWithRetry();

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.sites) {
        createButtonsFromSettings(changes.sites.newValue);
      }
    });
  }
}

initializeExtension();

let lastUrl = location.href;
const observer = new MutationObserver((mutations) => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(initializeExtension, 500);
  }
  
  const shouldReinit = mutations.some(mutation => {
    return Array.from(mutation.addedNodes).some(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return node.matches?.('.apphub_AppName, #appHubAppName, .game_title_area, .game_description_header') ||
               node.querySelector?.('.apphub_AppName, #appHubAppName, .game_title_area, .game_description_header');
      }
      return false;
    });
  });
  
  if (shouldReinit) {
    setTimeout(initializeExtension, 500);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

setTimeout(initializeExtension, 1000);
