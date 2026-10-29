
/*
  ZAID BELIM PORTFOLIO
  Frontend configuration

  IMPORTANT:
  - Use only the public/publishable Supabase key here.
  - NEVER put a service_role key, R2 secret, or private API secret here.
  - Configure the SQL security policies provided below before enabling admin.
*/

const CONFIG = {
  SUPABASE_URL: "YOUR_SUPABASE_PROJECT_URL",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY",
  CONTACT_EMAIL: "zaid@example.com",
  INSTAGRAM_URL: "https://www.instagram.com/",
  UPLOAD_API: "https://YOUR-CLOUDFLARE-WORKER-DOMAIN"
};

const hasSupabaseConfig =
  CONFIG.SUPABASE_URL.startsWith("https://") &&
  !CONFIG.SUPABASE_URL.includes("YOUR_") &&
  CONFIG.SUPABASE_ANON_KEY.length > 20 &&
  !CONFIG.SUPABASE_ANON_KEY.includes("YOUR_");

const db = hasSupabaseConfig
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  : null;

const $ = (selector) => document.querySelector(selector);

const grid = $("#projectGrid");
const filters = $("#filters");
const demoNote = $("#demoNote");
const videoModal = $("#videoModal");
const modalContent = $("#modalContent");
const adminModal = $("#adminModal");
const adminStatus = $("#adminStatus");
const loginForm = $("#loginForm");
const adminPanel = $("#adminPanel");
const adminProjects = $("#adminProjects");
const projectForm = $("#projectForm");

let projects = [];
let currentFilter = "All";
let isAdmin = false;

const demoProjects = [
  {
    id: "demo-1",
    title: "After Hours — Visual Study",
    category: "CGI",
    year: 2026,
    cover_url: "",
    video_url: "",
    published: true,
    demo: true
  },
  {
    id: "demo-2",
    title: "Bombay in Motion",
    category: "Film",
    year: 2026,
    cover_url: "",
    video_url: "",
    published: true,
    demo: true
  },
  {
    id: "demo-3",
    title: "Beyond Reality",
    category: "VFX",
    year: 2026,
    cover_url: "",
    video_url: "",
    published: true,
    demo: true
  }
];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function safeHttpURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function categoryMatches(project, filter) {
  if (filter === "All") return true;
  if (filter === "CGI") return project.category === "CGI";
  if (filter === "Film") return ["Film", "Film & Edit"].includes(project.category);
  return project.category === filter;
}

function categoryClass(category = "") {
  if (category === "CGI") return "visual-three";
  if (category === "Film" || category === "Film & Edit") return "visual-two";
  return "";
}

function renderProjects() {
  const visible = projects.filter(project =>
    project.published && categoryMatches(project, currentFilter)
  );

  if (!visible.length) {
    grid.innerHTML = `
      <p class="small-muted">No projects in this category yet.</p>
    `;
    return;
  }

  grid.innerHTML = visible.map((project, index) => {
    const cover = safeHttpURL(project.cover_url);
    const title = escapeHTML(project.title);
    const category = escapeHTML(project.category);
    const year = escapeHTML(project.year);
    const video = safeHttpURL(project.video_url);
    const visual = cover
      ? `<img src="${escapeHTML(cover)}" alt="${title}" loading="lazy">`
      : `<span class="visual-shape shape-red"></span>
         <span class="visual-title">${title}</span>`;

    return `
      <article class="project-card ${index === 0 ? "project-featured" : ""}">
        <button class="project-visual ${cover ? "" : "placeholder-visual " + categoryClass(project.category)}"
          data-project-id="${escapeHTML(project.id)}"
          aria-label="Open ${title}">
          <span class="visual-number">${String(index + 1).padStart(2, "0")}</span>
          ${visual}
          <span class="visual-open">↗</span>
        </button>
        <div class="project-meta">
          <div>
            <h3>${title}</h3>
            <p>${category.toUpperCase()} · ${year}</p>
          </div>
          <span class="project-category">${category}</span>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-project-id]").forEach(button => {
    button.addEventListener("click", () => {
      const project = projects.find(item => item.id === button.dataset.projectId);
      if (project) openProject(project);
    });
  });
}

async function loadProjects() {
  if (!db) {
    projects = demoProjects;
    demoNote.hidden = false;
    renderProjects();
    return;
  }

  const { data, error } = await db
    .from("projects")
    .select("id,title,category,year,cover_url,video_url,published")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    demoNote.textContent =
      "Could not load published projects. Check Supabase table and Row Level Security.";
    demoNote.hidden = false;
    return;
  }

  projects = data || [];
  demoNote.hidden = projects.length > 0;
  renderProjects();
}

function openProject(project) {
  const url = safeHttpURL(project.video_url);
  if (!url) {
    adminStatus.textContent = project.demo
      ? "This is a design placeholder. Add a real project video URL in the admin setup."
      : "No playable video URL has been added to this project yet.";
    return;
  }

  modalContent.replaceChildren();

  let video;
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) {
    video = document.createElement("iframe");
    video.src = getEmbedURL(url);
    video.title = project.title;
    video.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    video.allowFullscreen = true;
  } else {
    video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
  }

  modalContent.appendChild(video);
  videoModal.classList.add("open");
  videoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function getEmbedURL(rawURL) {
  const url = new URL(rawURL);

  if (url.hostname.includes("youtu.be")) {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(url.pathname.slice(1))}`;
  }

  if (url.hostname.includes("youtube.com")) {
    if (url.pathname === "/watch") {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(url.searchParams.get("v") || "")}`;
    }
    if (url.pathname.startsWith("/embed/")) {
      return `https://www.youtube-nocookie.com${url.pathname}`;
    }
  }

  if (url.hostname.includes("vimeo.com")) {
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (/^\d+$/.test(id || "")) return `https://player.vimeo.com/video/${id}`;
  }

  return rawURL;
}

function closeVideo() {
  videoModal.classList.remove("open");
  videoModal.setAttribute("aria-hidden", "true");
  modalContent.replaceChildren();
  document.body.classList.remove("modal-open");
}

filters.addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  currentFilter = button.dataset.filter;
  filters.querySelectorAll(".filter").forEach(item =>
    item.classList.toggle("active", item === button)
  );
  renderProjects();
});

$("#modalClose").addEventListener("click", closeVideo);
videoModal.addEventListener("click", event => {
  if (event.target === videoModal) closeVideo();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeVideo();
    closeAdmin();
    $("#desktopNav")?.classList.remove("open");
  }
});

$("#contactLink").href = `mailto:${CONFIG.CONTACT_EMAIL}`;
$("#emailLink").href = `mailto:${CONFIG.CONTACT_EMAIL}`;
$("#instagramLink").href = CONFIG.INSTAGRAM_URL;

const desktopNav = document.querySelector(".desktop-nav");
$("#menuBtn").addEventListener("click", () => {
  desktopNav.classList.toggle("open");
});
desktopNav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => desktopNav.classList.remove("open"));
});

function openAdmin() {
  adminModal.classList.add("open");
  adminModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  adminStatus.textContent = db
    ? ""
    : "Backend not configured. Set up Supabase and its security policies before using admin.";
}

function closeAdmin() {
  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

$("#adminOpen").addEventListener("click", openAdmin);
$("#adminClose").addEventListener("click", closeAdmin);
adminModal.addEventListener("click", event => {
  if (event.target === adminModal) closeAdmin();
});

function showAdminState(signedIn) {
  isAdmin = signedIn;
  loginForm.hidden = signedIn;
  adminPanel.hidden = !signedIn;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!db) {
    adminStatus.textContent = "Supabase is not configured yet.";
    return;
  }

  adminStatus.textContent = "Signing in…";
  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value;

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    adminStatus.textContent = "Sign-in failed. Check the account details and Supabase setup.";
    return;
  }

  adminStatus.textContent = "Signed in.";
  showAdminState(true);
  await refreshAdminProjects();
});

$("#logoutBtn").addEventListener("click", async () => {
  if (db) await db.auth.signOut();
  showAdminState(false);
  adminStatus.textContent = "Signed out.";
});

async function refreshAdminProjects() {
  if (!db || !isAdmin) return;

  const { data, error } = await db
    .from("projects")
    .select("id,title,category,year,published")
    .order("created_at", { ascending: false });

  if (error) {
    adminStatus.textContent = "Unable to load projects. Check admin database policies.";
    return;
  }

  adminProjects.innerHTML = (data || []).map(project => `
    <div class="admin-project-row">
      <span>${escapeHTML(project.title)} · ${project.published ? "PUBLISHED" : "DRAFT"}</span>
      <span>
        <button type="button" data-edit="${escapeHTML(project.id)}">EDIT</button>
        <button type="button" data-delete="${escapeHTML(project.id)}">DELETE</button>
      </span>
    </div>
  `).join("") || `<p class="small-muted">No projects yet.</p>`;

  adminProjects.querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => editProject(button.dataset.edit));
  });

  adminProjects.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => deleteProject(button.dataset.delete));
  });
}

async function editProject(id) {
  const project = projects.find(item => item.id === id);
  if (!project) {
    // Fetch unpublished projects too, since public project data only includes published items.
    const { data, error } = await db.from("projects").select("*").eq("id", id).single();
    if (error || !data) {
      adminStatus.textContent = "Could not open that project.";
      return;
    }
    fillProjectForm(data);
    return;
  }
  fillProjectForm(project);
}

function fillProjectForm(project) {
  $("#projectId").value = project.id;
  $("#projectTitle").value = project.title || "";
  $("#projectCategory").value = project.category || "VFX";
  $("#projectYear").value = project.year || new Date().getFullYear();
  $("#projectCover").value = project.cover_url || "";
  $("#projectVideo").value = project.video_url || "";
  $("#projectPublished").checked = !!project.published;
  adminStatus.textContent = "Editing project. Save to apply changes.";
  projectForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

projectForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!db || !isAdmin) {
    adminStatus.textContent = "Please sign in with the authorised admin account first.";
    return;
  }

  const id = $("#projectId").value;
  const title = $("#projectTitle").value.trim();
  const coverURL = $("#projectCover").value.trim();
  const videoURL = $("#projectVideo").value.trim();

  if (coverURL && !safeHttpURL(coverURL)) {
    adminStatus.textContent = "Cover image must use a valid HTTP or HTTPS URL.";
    return;
  }
  if (videoURL && !safeHttpURL(videoURL)) {
    adminStatus.textContent = "Video must use a valid HTTP or HTTPS URL.";
    return;
  }

  const record = {
    title,
    category: $("#projectCategory").value,
    year: Number($("#projectYear").value),
    cover_url: coverURL || null,
    video_url: videoURL || null,
    published: $("#projectPublished").checked
  };

  adminStatus.textContent = "Saving project…";

  const result = id
    ? await db.from("projects").update(record).eq("id", id).select().single()
    : await db.from("projects").insert(record).select().single();

  if (result.error) {
    console.error(result.error);
    adminStatus.textContent = "Save failed. Check admin Row Level Security policies.";
    return;
  }

  projectForm.reset();
  $("#projectId").value = "";
  $("#projectYear").value = new Date().getFullYear();
  $("#projectPublished").checked = true;

  adminStatus.textContent = "Project saved.";
  await Promise.all([loadProjects(), refreshAdminProjects()]);
});

async function deleteProject(id) {
  if (!db || !isAdmin) return;
  if (!confirm("Delete this project entry? This does not delete its video file from R2.")) return;

  const { error } = await db.from("projects").delete().eq("id", id);

  if (error) {
    adminStatus.textContent = "Delete failed. Check database permissions.";
    return;
  }

  adminStatus.textContent = "Project entry deleted.";
  await Promise.all([loadProjects(), refreshAdminProjects()]);
}

// Restore an existing authenticated session after page refresh.
async function initAdmin() {
  if (!db) return;
  const { data } = await db.auth.getSession();
  showAdminState(!!data.session);
  if (data.session) await refreshAdminProjects();

  db.auth.onAuthStateChange((_event, session) => {
    showAdminState(!!session);
    if (session) refreshAdminProjects();
  });
}

loadProjects();
initAdmin();
