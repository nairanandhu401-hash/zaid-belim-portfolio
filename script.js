const STORAGE_KEY = "zaidBelimProjects";

const starterProjects = [
  { id: "1", title: "ZEDITS", category: "ZEDITS", description: "Creative edit showcase", video: "", image: "" },
  { id: "2", title: "BOMBAY", category: "BOMBAY", description: "Urban visual story", video: "", image: "" },
  { id: "3", title: "BHARAT", category: "BHARAT", description: "Culture and identity", video: "", image: "" },
  { id: "4", title: "MAHARASHTRA", category: "MAHARASHTRA", description: "A visual journey", video: "", image: "" },
  { id: "5", title: "MEWAR", category: "MEWAR", description: "Cinematic storytelling", video: "", image: "" },
  { id: "6", title: "BOLLYWOOD", category: "BOLLYWOOD", description: "Motion and visuals", video: "", image: "" }
];

let projects = loadProjects();
let activeFilter = "ALL";

const grid = document.getElementById("projectGrid");
const filters = document.getElementById("filters");
const adminPanel = document.getElementById("adminPanel");
const form = document.getElementById("projectForm");
const message = document.getElementById("adminMessage");

function loadProjects() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? starterProjects : JSON.parse(saved);
  } catch {
    return starterProjects;
  }
}

function saveProjects() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch {
    message.textContent = "Could not save projects. Export your data and try again.";
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderFilters() {
  const categories = ["ALL", ...new Set(projects.map(p => p.category))];

  filters.innerHTML = categories.map(category => `
    <button
      class="filter-button ${activeFilter === category ? "active" : ""}"
      data-category="${escapeHTML(category)}">
      ${escapeHTML(category)}
    </button>
  `).join("");
}

function renderProjects() {
  const visibleProjects = activeFilter === "ALL"
    ? projects
    : projects.filter(project => project.category === activeFilter);

  document.getElementById("projectCount").textContent =
    `${visibleProjects.length} PROJECT${visibleProjects.length === 1 ? "" : "S"}`;

  if (visibleProjects.length === 0) {
    grid.innerHTML = '<p class="empty-message">No projects in this category yet.</p>';
    return;
  }

  grid.innerHTML = visibleProjects.map(project => `
    <article class="project-card">
      <button
        class="project-thumbnail"
        data-project-id="${escapeHTML(project.id)}"
        aria-label="Play ${escapeHTML(project.title)}">

        ${project.image ? `
          <img
            src="${escapeHTML(project.image)}"
            alt="${escapeHTML(project.title)} thumbnail"
            loading="lazy">
        ` : ""}

        <span class="play-button">▶</span>
      </button>

      <div class="project-info">
        <div>
          <h3>${escapeHTML(project.title)}</h3>
          <p>${escapeHTML(project.description || "Creative project")}</p>
        </div>
        <span class="project-category">${escapeHTML(project.category)}</span>
      </div>
    </article>
  `).join("");
}

filters.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  activeFilter = button.dataset.category;
  renderFilters();
  renderProjects();
});

grid.addEventListener("click", event => {
  const button = event.target.closest("[data-project-id]");
  if (!button) return;

  openProject(button.dataset.projectId);
});

document.getElementById("adminToggle").addEventListener("click", () => {
  adminPanel.hidden = !adminPanel.hidden;

  if (!adminPanel.hidden) {
    adminPanel.scrollIntoView({ behavior: "smooth" });
  }
});

function validHttpsURL(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const title = document.getElementById("projectTitle").value.trim();
  const category = document.getElementById("projectCategory").value;
  const video = document.getElementById("projectVideo").value.trim();
  const image = document.getElementById("projectImage").value.trim();
  const description = document.getElementById("projectDescription").value.trim();

  if (!validHttpsURL(video) || (image && !validHttpsURL(image))) {
    message.textContent = "Use valid HTTPS links for the video and thumbnail.";
    return;
  }

  const project = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),
    title,
    category,
    video,
    image,
    description
  };

  projects.unshift(project);

  if (!saveProjects()) {
    projects.shift();
    return;
  }

  activeFilter = "ALL";
  renderFilters();
  renderProjects();
  form.reset();

  message.textContent =
    "Project added in this browser only. It is not yet published online.";
});

function getEmbedURL(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.slice(1);
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
      }

      const match = url.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return `https://www.youtube-nocookie.com/embed/${match[1]}`;
      }
    }

    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      const match = url.pathname.match(/\/(\d+)\/?$/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}

function openProject(id) {
  const project = projects.find(item => item.id === id);
  if (!project) return;

  const modal = document.getElementById("videoModal");
  const frame = document.getElementById("videoFrame");
  const player = document.getElementById("videoPlayer");
  const videoMessage = document.getElementById("videoMessage");

  document.getElementById("modalTitle").textContent = project.title;

  frame.hidden = true;
  frame.src = "";

  player.pause();
  player.removeAttribute("src");
  player.load();
  player.hidden = true;

  if (!project.video) {
    videoMessage.textContent =
      "Demo project. Add a real video URL using the Admin panel.";
  } else {
    videoMessage.textContent = "";

    const embed = getEmbedURL(project.video);

    if (embed) {
      frame.src = embed;
      frame.hidden = false;
    } else {
      player.src = project.video;
      player.hidden = false;
      player.play().catch(() => {});
      player.onerror = () => {
        videoMessage.textContent =
          "This video could not be played. Use a direct MP4 URL or supported YouTube/Vimeo link.";
      };
    }
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeVideo() {
  const modal = document.getElementById("videoModal");
  const frame = document.getElementById("videoFrame");
  const player = document.getElementById("videoPlayer");

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  frame.src = "";
  player.pause();
  player.removeAttribute("src");
  player.load();
}

document.getElementById("closeModal").addEventListener("click", closeVideo);

document.getElementById("videoModal").addEventListener("click", event => {
  if (event.target.id === "videoModal") closeVideo();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeVideo();
});

document.getElementById("exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(projects, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "zaid-projects.json";
  link.click();

  URL.revokeObjectURL(url);
});

document.getElementById("year").textContent = new Date().getFullYear();

renderFilters();
renderProjects();