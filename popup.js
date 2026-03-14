let currentSites = [];
let editingSiteIndex = -1;

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
function retrieveSettings() {
  chrome.storage.local.get({ sites: getDefaultSites() }, function(data) {
    currentSites = data.sites;
    renderSiteList(currentSites);
  });
}
function saveSettings(sites) {
  chrome.storage.local.set({ sites: sites }, function() {
    console.log('Settings saved');
  });
}

function renderSiteList(sites) {
  const siteListContainer = document.getElementById("siteList");
  siteListContainer.innerHTML = "";

  sites.forEach((site, index) => {
    const siteDiv = document.createElement("div");
    siteDiv.classList.add("site-item");
    if (!site.enabled) {
      siteDiv.classList.add("disabled-site");
    }

    const siteIcon = document.createElement("img");
    siteIcon.classList.add("site-icon");
    siteIcon.src = site.image_url;
    siteIcon.alt = site.name;
    siteDiv.appendChild(siteIcon);

    const siteName = document.createElement("span");
    siteName.classList.add("site-name");
    siteName.textContent = site.name;
    siteDiv.appendChild(siteName);

    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("site-actions");

    const editButton = document.createElement("button");
    editButton.classList.add("btn", "btn-icon");
    editButton.innerHTML = "✏️";
    editButton.title = "Edit";
    editButton.onclick = (e) => {
      e.stopPropagation();
      openEditModal(index);
    };
    actionsDiv.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("btn", "btn-icon");
    deleteButton.innerHTML = "🗑️";
    deleteButton.title = "Delete";
    deleteButton.onclick = (e) => {
      e.stopPropagation();
      deleteSite(index);
    };
    actionsDiv.appendChild(deleteButton);

    siteDiv.appendChild(actionsDiv);

    siteDiv.addEventListener("click", () => {
      site.enabled = !site.enabled;
      saveSettings(sites);
      renderSiteList(sites);
    });

    siteListContainer.appendChild(siteDiv);
  });
}

function openAddModal() {
  document.getElementById("addSiteModal").style.display = "block";
  document.getElementById("addSiteForm").reset();
  handleIconTypeChange();
}

function closeAddModal() {
  document.getElementById("addSiteModal").style.display = "none";
}

function openEditModal(index) {
  editingSiteIndex = index;
  const site = currentSites[index];
  
  document.getElementById("editSiteName").value = site.name;
  document.getElementById("editSiteUrl").value = site.search_url;
  document.getElementById("editIconUrl").value = site.iconUrl;
  
  document.getElementById("editIconType").value = "url";
  handleEditIconTypeChange();
  
  document.getElementById("editModal").style.display = "block";
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  editingSiteIndex = -1;
}

function deleteSite(index) {
  if (confirm("Are you sure you want to delete this site?")) {
    currentSites.splice(index, 1);
    saveSettings(currentSites);
    renderSiteList(currentSites);
  }
}

function handleIconTypeChange() {
  const iconType = document.getElementById("iconType").value;
  document.getElementById("image_urlGroup").style.display = iconType === "url" ? "block" : "none";
  document.getElementById("iconUploadGroup").style.display = iconType === "upload" ? "block" : "none";
}

function handleEditIconTypeChange() {
  const iconType = document.getElementById("editIconType").value;
  document.getElementById("editIconUrlGroup").style.display = iconType === "url" ? "block" : "none";
  document.getElementById("editIconUploadGroup").style.display = iconType === "upload" ? "block" : "none";
}

async function resetToDefault() {
  if (confirm("This will restore all default sites. Custom sites will remain unchanged. Continue?")) {
    
    const defaultSites = await getDefaultSites();
    const defaultUrls = defaultSites.map(site => site.search_url);
    
    // filter user-made sites from default site by their search_urls
    const customSites = currentSites.filter(site => {
            return !defaultUrls.includes(site.search_url);
        });    
    
    currentSites = [...defaultSites, ...customSites];
    saveSettings(currentSites);
    renderSiteList(currentSites);
  }
}



document.addEventListener("DOMContentLoaded", () => {
  retrieveSettings();
  
  document.getElementById("addSiteBtn").addEventListener("click", openAddModal);
  document.getElementById("closeAddModal").addEventListener("click", closeAddModal);
  document.getElementById("cancelAdd").addEventListener("click", closeAddModal);
  
  document.getElementById("addSiteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("siteName").value;
    let search_url = document.getElementById("siteUrl").value.trim();
    const iconType = document.getElementById("iconType").value;
    let image_url;
    
    if (iconType === "url") {
      image_url = document.getElementById("image_url").value;
    } else {
      const iconFile = document.getElementById("iconFile").files[0];
      if (iconFile) {
        const reader = new FileReader();
        image_url = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(iconFile);
        });
      }
    }
    
    const newSite = {
      name,
      search_url,
      image_url,
      enabled: true,
    };
    
    currentSites.push(newSite);
    saveSettings(currentSites);
    renderSiteList(currentSites);
    closeAddModal();
  });
  
  document.getElementById("editSiteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (editingSiteIndex === -1) return;
    
    const site = currentSites[editingSiteIndex];
    site.name = document.getElementById("editSiteName").value;
    site.search_url = document.getElementById("editSiteUrl").value.trim();
    
    const iconType = document.getElementById("editIconType").value;
    if (iconType === "url") {
      site.image_url = document.getElementById("editimage_url").value;
    } else {
      const iconFile = document.getElementById("editIconFile").files[0];
      if (iconFile) {
        const reader = new FileReader();
        site.image_url = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(iconFile);
        });
      }
    }
    
    saveSettings(currentSites);
    renderSiteList(currentSites);
    closeEditModal();
  });
  
  document.getElementById("closeEditModal").addEventListener("click", closeEditModal);
  document.getElementById("cancelEdit").addEventListener("click", closeEditModal);
  document.getElementById("iconType").addEventListener("change", handleIconTypeChange);
  document.getElementById("editIconType").addEventListener("change", handleEditIconTypeChange);
  document.getElementById("resetDefault").addEventListener("click", resetToDefault);
});
