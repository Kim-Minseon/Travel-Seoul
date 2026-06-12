// Mobile nav
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
});

// Navbar shadow on scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// Copy Korean name to clipboard
const toast = document.getElementById('copy-toast');
let toastTimeout;

document.querySelectorAll('.korean-name').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-korean');
    navigator.clipboard.writeText(text).then(() => {
      toast.style.opacity = '1';
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
    });
  });
});

// Food category filter
const filterBtns = document.querySelectorAll('.filter-btn');
const foodCards = document.querySelectorAll('.food-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.getAttribute('data-filter');
    foodCards.forEach(card => {
      const match = filter === 'all' || card.getAttribute('data-category') === filter;
      card.classList.toggle('hidden', !match);
    });
  });
});
