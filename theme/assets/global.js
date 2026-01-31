// Header scroll effect
document.addEventListener('DOMContentLoaded', function() {
  const header = document.querySelector('.header');
  if (header) {
    let lastScroll = 0;
    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset;
      if (currentScroll > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      lastScroll = currentScroll;
    });
  }

  // Mobile menu toggle
  const mobileMenuButton = document.querySelector('.mobile-menu-button');
  const mobileMenu = document.querySelector('.mobile-menu');
  const menuIconOpen = document.querySelector('.menu-icon-open');
  const menuIconClose = document.querySelector('.menu-icon-close');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function() {
      mobileMenu.classList.toggle('open');
      mobileMenuButton.classList.toggle('active');
      
      if (menuIconOpen && menuIconClose) {
        if (mobileMenu.classList.contains('open')) {
          menuIconOpen.classList.add('hidden');
          menuIconClose.classList.remove('hidden');
        } else {
          menuIconOpen.classList.remove('hidden');
          menuIconClose.classList.add('hidden');
        }
      }
    });
  }

  // Close mobile menu when clicking a link
  const mobileMenuLinks = document.querySelectorAll('.mobile-menu a');
  mobileMenuLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (mobileMenu) {
        mobileMenu.classList.remove('open');
        if (mobileMenuButton) {
          mobileMenuButton.classList.remove('active');
        }
        if (menuIconOpen && menuIconClose) {
          menuIconOpen.classList.remove('hidden');
          menuIconClose.classList.add('hidden');
        }
      }
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href.length > 1) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });
});
