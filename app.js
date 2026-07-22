/**
 * SP SPORTDATA SOLUTION - Core Interactive Application Script
 * Precision. Speed. Results.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navbar Scroll Effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  // 2. Mobile Menu Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = mobileToggle.querySelector('i') || mobileToggle;
      if (navMenu.classList.contains('active')) {
        mobileToggle.innerHTML = '✕';
      } else {
        mobileToggle.innerHTML = '☰';
      }
    });
  }

  // 3. Smooth Scrolling for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          navMenu?.classList.remove('active');
          if (mobileToggle) mobileToggle.innerHTML = '☰';

          const headerOffset = 90;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // 4. Counter Animation on Scroll
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length > 0) {
    const observerOptions = {
      threshold: 0.5
    };

    const animateCounters = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const countToStr = target.getAttribute('data-count') || target.innerText;
          const countTo = parseInt(countToStr.replace(/\D/g, ''));
          const suffix = countToStr.replace(/[0-9]/g, '');

          if (!isNaN(countTo)) {
            let currentCount = 0;
            const duration = 2000;
            const increment = countTo / (duration / 16);

            const timer = setInterval(() => {
              currentCount += increment;
              if (currentCount >= countTo) {
                target.innerText = countTo + suffix;
                clearInterval(timer);
              } else {
                target.innerText = Math.floor(currentCount) + suffix;
              }
            }, 16);
          }
          observer.unobserve(target);
        }
      });
    };

    const counterObserver = new IntersectionObserver(animateCounters, observerOptions);
    statNumbers.forEach(stat => counterObserver.observe(stat));
  }

  // 5. Contact Form Handler
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Sending Inquiry...';
        submitBtn.disabled = true;

        setTimeout(() => {
          alert('Thank you for contacting SP SPORTDATA SOLUTION! Our sports tech specialists will get back to you shortly.');
          contactForm.reset();
          submitBtn.innerText = originalText;
          submitBtn.disabled = false;
        }, 1200);
      }
    });
  }

  // 6. Early Access Form Handler (KabaddiTech)
  const earlyAccessForm = document.getElementById('earlyAccessForm');
  if (earlyAccessForm) {
    earlyAccessForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = earlyAccessForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerText = 'Access Requested!';
        submitBtn.style.background = '#10B981';
        submitBtn.disabled = true;
        setTimeout(() => {
          alert('You are registered for KabaddiTech early beta access! Updates will be sent to your email.');
        }, 800);
      }
    });
  }
});
