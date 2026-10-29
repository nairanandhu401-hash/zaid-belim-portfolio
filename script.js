
const themeToggle = document.getElementById("themeToggle");
const menu = document.getElementById("menu");
const nav = document.getElementById("nav");
const filterButtons = document.querySelectorAll("[data-filter]");
const projectCards = document.querySelectorAll(".project");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
});

menu.addEventListener("click", () => {
  nav.classList.toggle("open");
});

nav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    filterButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    const selected = button.dataset.filter;

    projectCards.forEach(card => {
      card.hidden =
        selected !== "all" && card.dataset.category !== selected;
    });
  });
});
