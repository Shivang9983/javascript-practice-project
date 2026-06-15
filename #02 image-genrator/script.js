// DOM Selectors
const btnEl = document.getElementById("btn");
const errorMessageEl = document.getElementById("errorMessage");
const galleryEl = document.getElementById("gallery");
const inputEl = document.getElementById("input");
const searchQueryEl = document.getElementById("search-query");
const tags = document.querySelectorAll(".tag");

// Lightbox Selectors
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxAuthor = document.getElementById("lightbox-author");
const lightboxDownload = document.getElementById("lightbox-download");
const lightboxClose = document.getElementById("lightbox-close");

// Unsplash Access Token
const UNSPLASH_CLIENT_ID = "B8S3zB8gCPVCvzpAhCRdfXg_aki8PZM_q5pAyzDUvlc";

// Initialize Lucide icons on page load
document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
  // Proactively trigger initial photo load
  fetchImage();
});

// Category quick tags interaction
tags.forEach((tag) => {
  tag.addEventListener("click", () => {
    tags.forEach((t) => t.classList.remove("active"));
    tag.classList.add("active");
    searchQueryEl.value = tag.getAttribute("data-tag");
    fetchImage();
  });
});

// Show shimmer loader cards matching the count
function renderSkeletons(count) {
  let skeletonsHTML = "";
  for (let i = 0; i < count; i++) {
    skeletonsHTML += `<div class="skeleton-card"></div>`;
  }
  galleryEl.innerHTML = skeletonsHTML;
  galleryEl.style.display = "grid";
}

// Generate unique image names for downloading
function getFilename(photographer, index) {
  const formattedName = photographer.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `imagiflow-${formattedName}-${Date.now()}-${index + 1}.jpg`;
}

// Fetch images logic
async function fetchImage() {
  const count = parseInt(inputEl.value, 10);
  const query = searchQueryEl.value.trim() || "nature";

  // Validate quantity bounds
  if (isNaN(count) || count < 1 || count > 10) {
    errorMessageEl.style.display = "block";
    errorMessageEl.innerText = "Please choose a number between 1 and 10";
    return;
  }

  errorMessageEl.style.display = "none";
  renderSkeletons(count);

  try {
    // Disable generate button and change look while loading
    btnEl.disabled = true;
    btnEl.style.opacity = "0.7";

    // Randomize page number (up to page 5 to guarantee quality search results)
    const randomPage = Math.floor(Math.random() * 5) + 1;
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&page=${randomPage}&client_id=${UNSPLASH_CLIENT_ID}`;

    const response = await fetch(unsplashUrl);

    if (!response.ok) {
      throw new Error(`Unsplash API HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const photos = data.results || [];

    if (photos.length === 0) {
      throw new Error("No photos found matching this topic.");
    }

    // Render Unsplash Photos
    const normalizedPhotos = photos.map(pic => ({
      smallUrl: pic.urls.small,
      fullUrl: pic.urls.regular,
      photographer: pic.user ? pic.user.name : "Unsplash Creator",
      downloadUrl: pic.links ? pic.links.download : pic.urls.full
    }));

    renderGallery(normalizedPhotos);
  } catch (error) {
    console.warn("Unsplash API failed. Using Lorem Picsum as a fallback source...", error);
    await fetchPicsumFallback(count);
  } finally {
    btnEl.disabled = false;
    btnEl.style.opacity = "1";
  }
}

// Lorem Picsum Fallback Fetch
async function fetchPicsumFallback(count) {
  try {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const picsumUrl = `https://picsum.photos/v2/list?page=${randomPage}&limit=${count}`;
    
    const response = await fetch(picsumUrl);
    if (!response.ok) {
      throw new Error("Picsum fallback API failed");
    }

    const data = await response.json();
    
    const normalizedPhotos = data.map(pic => ({
      smallUrl: `https://picsum.photos/id/${pic.id}/600/450`,
      fullUrl: pic.download_url,
      photographer: pic.author || "Picsum Artist",
      downloadUrl: pic.download_url
    }));

    renderGallery(normalizedPhotos);
  } catch (err) {
    console.error("All image APIs failed.", err);
    errorMessageEl.style.display = "block";
    errorMessageEl.innerHTML = "An error occurred fetching images. Please try again later.";
    galleryEl.innerHTML = "";
  }
}

// Build and display gallery cards
function renderGallery(photos) {
  let cardsHTML = "";
  
  photos.forEach((photo, index) => {
    cardsHTML += `
      <div class="gallery-card" data-index="${index}" data-full="${photo.fullUrl}" data-photographer="${photo.photographer}" data-download="${photo.downloadUrl}">
        <img src="${photo.smallUrl}" alt="Photo by ${photo.photographer}" loading="lazy" />
        <div class="card-overlay">
          <div class="card-info">
            <span class="card-author-title">Photographer</span>
            <span class="card-author">${photo.photographer}</span>
          </div>
          <div class="card-actions">
            <button class="card-btn btn-view" title="View Fullscreen">
              <i data-lucide="maximize-2"></i>
            </button>
            <button class="card-btn btn-download" title="Download Image">
              <i data-lucide="download"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  galleryEl.innerHTML = cardsHTML;
  galleryEl.style.display = "grid";

  // Re-initialize Lucide Icons for dynamic content
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // Setup click listeners for cards and card action buttons
  setupGalleryInteractions();
}

// Handle image details/actions with event delegation inside gallery
function setupGalleryInteractions() {
  const cards = galleryEl.querySelectorAll(".gallery-card");

  cards.forEach((card) => {
    // Lightbox triggers on card body click or view button click
    card.addEventListener("click", (e) => {
      const isDownloadBtn = e.target.closest(".btn-download");
      
      if (isDownloadBtn) {
        // Trigger download direct
        e.stopPropagation();
        const downloadUrl = card.getAttribute("data-download");
        const photographer = card.getAttribute("data-photographer");
        const index = parseInt(card.getAttribute("data-index"), 10);
        triggerDirectDownload(downloadUrl, getFilename(photographer, index), isDownloadBtn);
        return;
      }
      
      // Open Lightbox
      const fullUrl = card.getAttribute("data-full");
      const photographer = card.getAttribute("data-photographer");
      const downloadUrl = card.getAttribute("data-download");
      openLightbox(fullUrl, photographer, downloadUrl);
    });
  });
}

// Download image direct as binary blob (prevents opening in new tab)
async function triggerDirectDownload(url, filename, buttonElement) {
  const originalHTML = buttonElement.innerHTML;
  try {
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<i data-lucide="loader" class="animate-spin"></i>`;
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Direct download failed, falling back to open in tab...", error);
    window.open(url, "_blank");
  } finally {
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalHTML;
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }
}

// Lightbox Modal functions
function openLightbox(fullUrl, photographer, downloadUrl) {
  lightboxImg.src = fullUrl;
  lightboxAuthor.innerText = photographer;
  
  // Set up lightbox download button action
  lightboxDownload.onclick = (e) => {
    e.preventDefault();
    triggerDirectDownload(downloadUrl, getFilename(photographer, 99), lightboxDownload);
  };

  lightbox.classList.add("active");
  document.body.style.overflow = "hidden"; // Disable scroll when active
}

function closeLightbox() {
  lightbox.classList.remove("active");
  document.body.style.overflow = ""; // Re-enable scroll
  // Clear image source after transition to prevent flicker next time
  setTimeout(() => {
    lightboxImg.src = "";
  }, 300);
}

// Lightbox Events
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) {
    closeLightbox();
  }
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("active")) {
    closeLightbox();
  }
});

// Primary CTA button click
btnEl.addEventListener("click", fetchImage);

// Trigger fetch on pressing 'Enter' in search box
searchQueryEl.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    fetchImage();
  }
});