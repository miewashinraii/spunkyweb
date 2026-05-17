document.addEventListener('DOMContentLoaded', () => {
  console.log('Document is ready!');

  // small helpers
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  const sectionsContainer = document.getElementById('sections');
  const achievements = document.getElementById('achievements');

  /* removed old autoplayBahteraOnView IIFE — initBahteraAutoplay now controls autoplay/unmute logic */
  // previously we had an IIFE here that attempted play() and forced `video.muted = true` on failure.
  // That behavior caused the video to stay muted on load. Kept intentionally empty so the
  // initBahteraAutoplay() block later handles unmuted autoplay + muted fallback.
  initLazyVideos();
  
  // nav safety
  if (toggle && menu) {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');

    toggle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
      // keep controls visible while menu is open
      if (!open) setControlsVisible(true);
    });

    document.addEventListener('click', (ev) => {
      if (!menu.hidden && !menu.contains(ev.target) && !toggle.contains(ev.target)) {
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // control visibility helpers
  function isMenuOpen() {
    return !!(toggle && toggle.getAttribute('aria-expanded') === 'true');
  }

  function setControlsVisible(show) {
    if (!topbar || !homeBtn) return;
    if (show) {
      topbar.classList.add('visible');
      homeBtn.classList.add('visible');
      topbar.hidden = false;
      homeBtn.hidden = false;
    } else {
      topbar.classList.remove('visible');
      homeBtn.classList.remove('visible');
      // hide after transition to avoid flicker
      setTimeout(() => {
        if (!topbar.classList.contains('visible')) topbar.hidden = true;
        if (!homeBtn.classList.contains('visible')) homeBtn.hidden = true;
      }, 220);
    }
  }

  // detect scroll into second section
  let scrolledToSecond = false;
  function updateScrolledState() {
    if (!sectionsContainer || !achievements) return;
    const scrollTop = sectionsContainer.scrollTop;
    const achOffset = achievements.offsetTop;
    scrolledToSecond = scrollTop >= Math.max(0, achOffset - 10);
  }
  if (sectionsContainer && achievements) {
    updateScrolledState();
    sectionsContainer.addEventListener('scroll', () => updateScrolledState(), { passive: true });
  }

  // improved hover logic:
  // keep visible when pointer is over topHoverZone OR over controls themselves
  let pointerInsideControlArea = false;

  function bindHoverKeepVisible(target) {
    if (!target) return;
    target.addEventListener('pointerenter', () => {
      pointerInsideControlArea = true;
      // only show when scrolled to second or menu is open
      if (scrolledToSecond || isMenuOpen()) setControlsVisible(true);
    });
    target.addEventListener('pointerleave', () => {
      pointerInsideControlArea = false;
      // small delay lets pointer move between zone and control without hiding
      setTimeout(() => {
        if (!pointerInsideControlArea && !isMenuOpen()) {
          // hide only if not over controls and menu closed
          setControlsVisible(false);
        }
      }, 180);
    });

    // keyboard accessibility: show on focus inside, hide on focus out
    target.addEventListener('focusin', () => {
      if (scrolledToSecond || isMenuOpen()) setControlsVisible(true);
    });
    target.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!pointerInsideControlArea && !isMenuOpen()) setControlsVisible(false);
      }, 180);
    });
  }

  // bind hover for hotspot and for the controls themselves
  bindHoverKeepVisible(topHoverZone);
  bindHoverKeepVisible(topbar);
  bindHoverKeepVisible(homeBtn);

  // home button scrolls to top smoothly
  if (homeBtn && sectionsContainer) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sectionsContainer.scrollTo({ top: 0, behavior: 'smooth' });
      setControlsVisible(false);
    });
  }

  // initial hidden state
  if (topbar) topbar.hidden = true;
  if (homeBtn) homeBtn.hidden = true;

  // -----------------------------
  // Read-more toggle for credits on work page (moved inside DOMContentLoaded)
  const readBtns = document.querySelectorAll('.read-more');
  readBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const controls = document.getElementById(btn.getAttribute('aria-controls'));
      if (!controls) return;
      const expanded = controls.classList.toggle('expanded');
      controls.classList.toggle('collapsed', !expanded);
      btn.setAttribute('aria-expanded', String(expanded));
      btn.textContent = expanded ? 'Show less' : 'Read more';
      if (expanded) controls.scrollIntoView({behavior:'smooth', block:'nearest'});
    });
  });

  // smooth-scroll links inside the sections scroll container
  const scrollLinks = document.querySelectorAll('a[data-scroll]');
  if (scrollLinks.length) {
    scrollLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href') || '';
        if (!href.startsWith('#')) return; // skip external targets
        const id = href.slice(1);
        const target = document.getElementById(id);
        if (target && sectionsContainer) {
          e.preventDefault();
          // scroll the sections container to the section's offset
          sectionsContainer.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
          // close nav overlay if open
          if (menu && toggle) {
            menu.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
          }
          // hide controls after click (optional)
          setTimeout(() => setControlsVisible(false), 300);
        }
      });
    });
  }

  // Ensure the bahtera section height matches the rendered video height after load/resize
  (function syncBahteraToVideo() {
    const video = document.querySelector('.bahtera-bg-video');
    if (!video) return;
    const section = video.closest('.section.bahtera');
    if (!section) return;

    function fit() {
      // let the video size define the section height
      const rect = video.getBoundingClientRect();
      if (rect && rect.height) {
        section.style.height = `${Math.ceil(rect.height)}px`;
      }
    }

    video.addEventListener('loadedmetadata', fit);
    video.addEventListener('loadeddata', fit);
    // sometimes dimensions are available a bit later
    video.addEventListener('play', fit);
    window.addEventListener('resize', fit);
    setTimeout(fit, 80);
  })();

  // Position laurels so they sit below the brand logo (avoid overlap)
  (function positionLaurels() {
    const hero = document.querySelector('.section.hero');
    if (!hero) return;
    const brand = hero.querySelector('.brand');
    const laurels = hero.querySelector('.laurels');
    if (!brand || !laurels) return;

    function update() {
      const heroRect = hero.getBoundingClientRect();
      const brandRect = brand.getBoundingClientRect();

      // base margin so laurels sit comfortably below the logo
      const margin = 18; // px; tweak if you want more spacing
      // compute top relative to hero box
      const top = Math.max(margin, Math.round(brandRect.bottom - heroRect.top + margin));
      laurels.style.top = `${top}px`;
      laurels.style.bottom = 'auto';
    }

    // update on load, images/fonts ready, resize and scroll inside sections container
    update();
    window.addEventListener('resize', update, { passive: true });
    // if you have a scrolling .sections container, update on its scroll as transforms may change
    const sections = document.getElementById('sections');
    if (sections) sections.addEventListener('scroll', update, { passive: true });

    // also update shortly after load to account for late image/font layout
    setTimeout(update, 250);
    // update when images inside the brand or laurels finish loading
    Array.from(hero.querySelectorAll('img')).forEach(img => {
      if (!img.complete) img.addEventListener('load', update);
    });
  })();

  // --- STILLS HOVER TITLE + DESCRIPTION: show only while hovering/focusing a card ---
  document.querySelectorAll('.section.stills').forEach(section => {
    const titleEl = section.querySelector('.stills-hover-title');
    const descEl = section.querySelector('.stills-hover-desc');
    if (!titleEl) return;

    // ensure hidden initially
    titleEl.classList.remove('visible');
    if (descEl) descEl.classList.remove('visible');

    const cards = Array.from(section.querySelectorAll('.project-card'));
    cards.forEach(card => {
      const name = card.dataset.title || '';
      const desc = card.dataset.desc || '';

      card.addEventListener('pointerenter', () => {
        titleEl.textContent = name;
        titleEl.classList.add('visible');
        if (descEl) {
          descEl.textContent = desc;
          // show desc only if present
          if (desc) descEl.classList.add('visible');
          else descEl.classList.remove('visible');
        }
      });

      card.addEventListener('pointerleave', () => {
        titleEl.classList.remove('visible');
        if (descEl) descEl.classList.remove('visible');
      });

      // keyboard accessibility
      card.addEventListener('focusin', () => {
        titleEl.textContent = name;
        titleEl.classList.add('visible');
        if (descEl) {
          descEl.textContent = desc;
          if (desc) descEl.classList.add('visible');
        }
      });
      card.addEventListener('focusout', () => {
        titleEl.classList.remove('visible');
        if (descEl) descEl.classList.remove('visible');
      });
    });

    // hide when pointer leaves the whole section
    section.addEventListener('pointerleave', () => {
      titleEl.classList.remove('visible');
      if (descEl) descEl.classList.remove('visible');
    });

    // hide when the page/sections scrolls
    const onScrollHide = () => {
      titleEl.classList.remove('visible');
      if (descEl) descEl.classList.remove('visible');
    };
    (sectionsContainer || window).addEventListener('scroll', onScrollHide, { passive: true });
    window.addEventListener('scroll', onScrollHide, { passive: true });

    // safety: hide when section is not visible
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) {
          titleEl.classList.remove('visible');
          if (descEl) descEl.classList.remove('visible');
        }
      });
    }, { threshold: 0.05 });
    io.observe(section);
  });

  // Dim other stills when one is hovered or keyboard-focused (accessibility friendly)
  document.querySelectorAll('.projects-grid').forEach(grid => {
    const cards = Array.from(grid.querySelectorAll('.project-card'));
    let leaveTimeout = null;

    // helper to clear dim state
    function clearDim() {
      if (leaveTimeout) { clearTimeout(leaveTimeout); leaveTimeout = null; }
      grid.classList.remove('grid-dim');
      cards.forEach(c => c.classList.remove('focused'));
    }

    // Pointer interactions (mouse/touch)
    cards.forEach(card => {
      card.addEventListener('pointerenter', () => {
        if (leaveTimeout) { clearTimeout(leaveTimeout); leaveTimeout = null; }
        cards.forEach(c => c.classList.remove('focused'));
        card.classList.add('focused');
        grid.classList.add('grid-dim');
      });

      card.addEventListener('pointerleave', () => {
        card.classList.remove('focused');
        // slightly longer delay to avoid flicker when moving between cards
        leaveTimeout = setTimeout(() => {
          // if no card is currently hovered, clear the dim
          if (!grid.querySelector('.project-card:hover')) {
            clearDim();
          }
        }, 80); // increased from 40ms -> 80ms
      });

      // Keyboard accessibility
      card.addEventListener('focusin', () => {
        if (leaveTimeout) { clearTimeout(leaveTimeout); leaveTimeout = null; }
        cards.forEach(c => c.classList.remove('focused'));
        card.classList.add('focused');
        grid.classList.add('grid-dim');
      });
      card.addEventListener('focusout', () => {
        card.classList.remove('focused');
        setTimeout(() => {
          if (!grid.querySelector(':focus-within')) {
            clearDim();
          }
        }, 80);
      });
    });

    // If the pointer leaves the whole grid, remove dim immediately
    grid.addEventListener('pointerleave', () => clearDim());
    grid.addEventListener('pointercancel', () => clearDim());

    // also remove dim if user clicks/taps outside the grid
    document.addEventListener('pointerdown', (e) => {
      if (!grid.contains(e.target)) clearDim();
    });
  });

  // --- Cinematic stills: hover title/desc + dim other cards only for cinematic section ---
  document.querySelectorAll('.section.stills.cinematic').forEach(section => {
    const grid = section.querySelector('.projects-grid');
    const titleEl = section.querySelector('.stills-hover-title');
    const descEl = section.querySelector('.stills-hover-desc');
    if (!grid) return;

    // ensure hidden initially
    if (titleEl) titleEl.classList.remove('visible');
    if (descEl) descEl.classList.remove('visible');

    const cards = Array.from(grid.querySelectorAll('.project-card'));
    let leaveTimeout = null;

    function clearDim() {
      if (leaveTimeout) { clearTimeout(leaveTimeout); leaveTimeout = null; }
      grid.classList.remove('grid-dim');
      cards.forEach(c => c.classList.remove('focused'));
      if (titleEl) titleEl.classList.remove('visible');
      if (descEl) descEl.classList.remove('visible');
    }

    // pointer + keyboard interactions (only for cinematic grid)
    cards.forEach(card => {
      const name = card.dataset.title || '';
      const desc = card.dataset.desc || '';

      card.addEventListener('pointerenter', () => {
        if (leaveTimeout) { clearTimeout(leaveTimeout); leaveTimeout = null; }
        cards.forEach(c => c.classList.remove('focused'));
        card.classList.add('focused');
        grid.classList.add('grid-dim');
        if (titleEl) { titleEl.textContent = name; titleEl.classList.add('visible'); }
        if (descEl) {
          descEl.textContent = desc || '';
          if (desc) descEl.classList.add('visible'); else descEl.classList.remove('visible');
        }
      });

      card.addEventListener('pointerleave', () => {
        card.classList.remove('focused');
        leaveTimeout = setTimeout(() => {
          if (!grid.querySelector('.project-card:hover')) clearDim();
        }, 60);
      });

      card.addEventListener('focusin', () => {
        if (leaveTimeout) { clearTimeout(leaveTimeout); leaveTimeout = null; }
        cards.forEach(c => c.classList.remove('focused'));
        card.classList.add('focused');
        grid.classList.add('grid-dim');
        if (titleEl) { titleEl.textContent = name; titleEl.classList.add('visible'); }
        if (descEl) {
          descEl.textContent = desc || '';
          if (desc) descEl.classList.add('visible'); else descEl.classList.remove('visible');
        }
      });

      card.addEventListener('focusout', () => {
        card.classList.remove('focused');
        setTimeout(() => {
          if (!grid.querySelector(':focus-within')) clearDim();
        }, 60);
      });
    });

    grid.addEventListener('pointerleave', () => clearDim());
    grid.addEventListener('pointercancel', () => clearDim());
    document.addEventListener('pointerdown', (e) => { if (!grid.contains(e.target)) clearDim(); });

    // hide if section scrolls out of view
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (!e.isIntersecting) clearDim(); });
    }, { threshold: 0.05 });
    io.observe(section);
  });

function initLazyVideos() {
  const videos = document.querySelectorAll('video source[data-src]');

  const loadVideo = (source) => {
    if (!source.dataset.src) return;
    source.src = source.dataset.src;
    source.parentElement.load();
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const video = entry.target;
      const sources = video.querySelectorAll('source[data-src]');

      sources.forEach(loadVideo);

      io.unobserve(video);
    });
  }, {
    threshold: 0.15
  });

  document.querySelectorAll('video').forEach(v => io.observe(v));
}

  // ensure bahtera video attempts to autoplay reliably and controls remain interactive
  (function initBahteraAutoplay() {
    const section = document.getElementById('bahtera');
    if (!section) return;
    const video = section.querySelector('.bahtera-bg-video');
    const unmuteBtn = document.getElementById('bahteraUnmute');
    if (!video) return;

    // helper: attempt to play unmuted, return promise that resolves true if succeeded unmuted
    function tryPlayUnmuted() {
      // ensure video is unmuted before attempting
      video.muted = false;
      return Promise.resolve(video.play()).then(() => true).catch(() => false);
    }

    // helper: fallback to muted autoplay
    function playMutedFallback() {
      video.muted = true;
      // ensure controls remain usable
      return Promise.resolve(video.play()).then(() => {
        if (unmuteBtn) unmuteBtn.hidden = false;
      }).catch(() => {
        // still couldn't autoplay; leave button visible so user can start playback
        if (unmuteBtn) unmuteBtn.hidden = false;
      });
    }

    // unmute handler: try to unmute and play with sound on user gesture
    if (unmuteBtn) {
      unmuteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = false;
        // try to play unmuted; hide button if success
        video.play().then(() => {
          unmuteBtn.hidden = true;
        }).catch(() => {
          // if still blocked, keep button visible
          unmuteBtn.hidden = false;
        });
      });
    }

    // IntersectionObserver: when section is visible try to play unmuted, otherwise pause
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
          // first try unmuted; if rejected, fallback to muted + show unmute button
          tryPlayUnmuted().then(success => {
            if (!success) playMutedFallback();
          });
        } else {
          try { video.pause(); } catch (e) { /* ignore */ }
        }
      });
    }, { threshold: [0, 0.25, 0.45, 0.9] });

    io.observe(section);

    // cleanup on unload
    window.addEventListener('beforeunload', () => io.disconnect());
  })();

  // Play bahtera when user clicks "Watch Trailer" preview button:
  (function wireTrailerPreview() {
    const btn = document.getElementById('play-bahtera-btn');
    const bahteraSection = document.getElementById('bahtera');
    const video = bahteraSection ? bahteraSection.querySelector('.bahtera-bg-video') : null;
    const soundToggle = document.getElementById('bahteraSoundToggle');
    if (!btn || !video || !bahteraSection) return;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      // scroll trailer into view
      bahteraSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // try to play unmuted. If blocked, fallback to muted and show toggle.
      try {
        video.muted = false;
        await video.play();
        if (soundToggle) {
          soundToggle.hidden = false;
          soundToggle.textContent = 'Mute';
          soundToggle.setAttribute('aria-pressed', 'false');
        }
      } catch (err) {
        // autoplay with sound blocked — fallback
        try {
          video.muted = true;
          await video.play();
          if (soundToggle) {
            soundToggle.hidden = false;
            soundToggle.textContent = 'Unmute';
            soundToggle.setAttribute('aria-pressed', 'true');
          }
        } catch (err2) {
          // couldn't autoplay — reveal toggle so user can start playback manually
          if (soundToggle) {
            soundToggle.hidden = false;
            soundToggle.textContent = 'Unmute';
            soundToggle.setAttribute('aria-pressed', 'true');
          }
        }
      }
    });
  })();

  // Donation: copy link + small UX
  (function wireDonateCopy() {
    const copyBtn = document.getElementById('copyDonateBtn');
    const duitNowIdEl = document.getElementById('donateDuitNowId');
    const donateLink = document.getElementById('donateLink'); // fallback if you keep a link
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async () => {
      const textToCopy = duitNowIdEl ? duitNowIdEl.textContent.trim() : (donateLink ? donateLink.textContent.trim() : '');
      if (!textToCopy) return;
      try {
        await navigator.clipboard.writeText(textToCopy);
        copyBtn.textContent = 'Copied';
        setTimeout(() => (copyBtn.textContent = 'Copy DuitNow ID'), 1400);
      } catch (e) {
        // fallback copy flow
        const tmp = document.createElement('textarea');
        tmp.value = textToCopy;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); copyBtn.textContent = 'Copied'; } catch { alert('Copy this ID: ' + textToCopy); }
        tmp.remove();
        setTimeout(() => (copyBtn.textContent = 'Copy DuitNow ID'), 1400);
      }
    });
  })();
  // Mood & Tone stills gallery: 3 sets of 4 images
(function initStillsGallery() {
  const gallery = document.getElementById('stillsGallery');
  const prevBtn = document.getElementById('stillsPrev');
  const nextBtn = document.getElementById('stillsNext');

  if (!gallery || !prevBtn || !nextBtn) return;

  const sets = [
    [
      'assets/images/stills-1.jpg',
      'assets/images/stills-3.jpg',
      'assets/images/stills-2.jpg',
      'assets/images/stills-4.jpg'
    ],
    [
      'assets/images/stills-6.jpg',
      'assets/images/stills-8.jpg',
      'assets/images/stills-11.jpg',
      'assets/images/stills-12.jpg'
    ],
    [
      'assets/images/stills-5.jpg',
      'assets/images/stills-7.jpg',
      'assets/images/stills-9.jpg',
      'assets/images/stills-10.jpg'
    ]
  ];

  const cards = Array.from(gallery.querySelectorAll('.project-card img'));
  let currentSet = 0;

  function renderSet(index) {
    gallery.classList.add('is-changing');

    setTimeout(() => {
      cards.forEach((img, imgIndex) => {
        img.src = sets[index][imgIndex];
        img.alt = `Bahtera still ${imgIndex + 1}`;
      });

      gallery.classList.remove('is-changing');
    }, 180);
  }

  prevBtn.addEventListener('click', () => {
    currentSet = (currentSet - 1 + sets.length) % sets.length;
    renderSet(currentSet);
  });

  nextBtn.addEventListener('click', () => {
    currentSet = (currentSet + 1) % sets.length;
    renderSet(currentSet);
  });
})();
// About/team carousel: 3 people per page
(function initTeamCarousel() {
  const grid = document.getElementById('teamGrid');
  const prevBtn = document.getElementById('teamPrev');
  const nextBtn = document.getElementById('teamNext');

  if (!grid || !prevBtn || !nextBtn) return;

  const pages = [
    [
      { role: 'Director', name: 'Abid Danish', img: 'assets/images/stills-1.jpg' },
      { role: 'Producer', name: 'Nurin Mysara', img: 'assets/images/stills-2.jpg' },
      { role: 'Director of Photography', name: 'Khuzairi', img: 'assets/images/stills-3.jpg' }
    ],
    [
      { role: 'Production Designer', name: 'Alyssia Cheang', img: 'assets/images/stills-4.jpg' },
      { role: 'Post-Pro Supervisor', name: 'Nashita Afra', img: 'assets/images/stills-5.jpg' },
      { role: 'Assistant Director', name: 'Ali', img: 'assets/images/stills-6.jpg' }
    ],
    [
      { role: 'Sound Designer', name: 'Ali', img: 'assets/images/stills-7.jpg' },
      { role: 'Editor', name: 'Ali', img: 'assets/images/stills-8.jpg' },
      { role: 'Art Assistant', name: 'Ali', img: 'assets/images/stills-9.jpg' }
    ]
  ];

  let currentPage = 0;

  function renderTeamPage(index) {
    grid.classList.add('is-changing');

    setTimeout(() => {
      grid.innerHTML = pages[index].map(member => `
        <article class="team-card">
          <img src="${member.img}" alt="${member.name}">
          <h3>${member.role}</h3>
          <p>${member.name}</p>
        </article>
      `).join('');

      grid.classList.remove('is-changing');
    }, 180);
  }

  prevBtn.addEventListener('click', () => {
    currentPage = (currentPage - 1 + pages.length) % pages.length;
    renderTeamPage(currentPage);
  });

  nextBtn.addEventListener('click', () => {
    currentPage = (currentPage + 1) % pages.length;
    renderTeamPage(currentPage);
  });
})();

});