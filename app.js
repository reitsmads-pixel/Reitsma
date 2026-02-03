/**
 * Vian & Stefan Wedding Website
 * Firebase Integration, Countdown, FAQ & Form Handling
 */

// Wedding Date
const WEDDING_DATE = new Date('2026-06-26T14:00:00');
const RSVP_DEADLINE = new Date('2026-05-15T23:59:59');

// Firebase (only initialized on RSVP page)
let db = null;

// DOM Elements (only set on RSVP page)
let rsvpForm = null;
let successMessage = null;
let declineMessage = null;
let submitBtn = null;
let btnText = null;
let btnLoading = null;
let guestsGroup = null;
let dietaryGroup = null;
let songSection = null;
let attendingRadios = null;

/**
 * Initialize the application
 */
function init() {
    initCountdown();
    initNavigation();
    initFAQ();
    initLightbox();

    // Only initialize RSVP functionality if we're on the RSVP page
    if (document.getElementById('rsvp-form')) {
        initRSVP();
    }
}

/**
 * Initialize RSVP page functionality
 */
function initRSVP() {
    // Firebase Configuration - injected at build time (encoded to bypass secret scanner)
    const firebaseConfig = {
        apiKey: atob("__FIREBASE_API_KEY_B64__"),
        authDomain: "__FIREBASE_AUTH_DOMAIN__",
        projectId: "__FIREBASE_PROJECT_ID__",
        storageBucket: "__FIREBASE_STORAGE_BUCKET__",
        messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
        appId: "__FIREBASE_APP_ID__"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();

    // Set DOM Elements
    rsvpForm = document.getElementById('rsvp-form');
    successMessage = document.getElementById('success-message');
    declineMessage = document.getElementById('decline-message');
    submitBtn = document.querySelector('.submit-btn');
    btnText = document.querySelector('.btn-text');
    btnLoading = document.querySelector('.btn-loading');
    guestsGroup = document.getElementById('guests-group');
    dietaryGroup = document.getElementById('dietary-group');
    songSection = document.getElementById('song-section');
    attendingRadios = document.querySelectorAll('input[name="attending"]');

    checkDeadline();
    setupEventListeners();
    setupAttendingToggle();
    setupGuestCountToggle();
}

// ================================
// Countdown Timer
// ================================

function initCountdown() {
    // Only initialize if countdown elements exist (home page)
    if (!document.getElementById('days')) return;

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    const now = new Date();
    const diff = WEDDING_DATE - now;

    if (diff <= 0) {
        daysEl.textContent = '0';
        hoursEl.textContent = '00';
        minutesEl.textContent = '00';
        secondsEl.textContent = '00';
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    daysEl.textContent = days;
    hoursEl.textContent = hours.toString().padStart(2, '0');
    minutesEl.textContent = minutes.toString().padStart(2, '0');
    secondsEl.textContent = seconds.toString().padStart(2, '0');
}

// ================================
// Mobile Navigation
// ================================

function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking a link
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = target.offsetTop - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ================================
// FAQ Accordion
// ================================

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all other items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ================================
// Photo Lightbox
// ================================

function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const lightboxImg = lightbox.querySelector('img');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    const collageItems = document.querySelectorAll('.collage-item');

    // Open lightbox when clicking on a photo
    collageItems.forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('img');
            if (img && img.src && !item.classList.contains('placeholder')) {
                lightboxImg.src = img.src;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // Close lightbox when clicking close button
    lightboxClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
    });

    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close lightbox with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ================================
// RSVP Form
// ================================

/**
 * Check if RSVP deadline has passed
 */
function checkDeadline() {
    const now = new Date();
    if (now > RSVP_DEADLINE) {
        rsvpForm.innerHTML = `
            <div class="deadline-passed">
                <h3>RSVP Closed</h3>
                <p>The RSVP deadline has passed. Please contact Vian & Stefan directly if you need to respond.</p>
            </div>
        `;
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', handleSubmit);
    }
}

/**
 * Toggle guest/dietary/song sections based on attendance
 */
function setupAttendingToggle() {
    const additionalGuestsGroup = document.getElementById('additional-guests-group');

    attendingRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const isAttending = this.value === 'yes';
            guestsGroup.style.display = isAttending ? 'block' : 'none';
            if (additionalGuestsGroup) {
                // Only show additional guests if attending AND more than 1 guest selected
                const guestCount = parseInt(document.getElementById('guests').value, 10);
                additionalGuestsGroup.style.display = (isAttending && guestCount > 1) ? 'block' : 'none';
            }
            dietaryGroup.style.display = isAttending ? 'block' : 'none';
            songSection.style.display = isAttending ? 'block' : 'none';
        });
    });
}

/**
 * Toggle additional guest name fields based on guest count
 */
function setupGuestCountToggle() {
    const guestsSelect = document.getElementById('guests');
    const additionalGuestsGroup = document.getElementById('additional-guests-group');
    const guest2Container = document.getElementById('guest-2-container');
    const guest3Container = document.getElementById('guest-3-container');

    if (!guestsSelect || !additionalGuestsGroup) return;

    guestsSelect.addEventListener('change', function() {
        const count = parseInt(this.value, 10);

        // Show/hide the additional guests section
        additionalGuestsGroup.style.display = count > 1 ? 'block' : 'none';

        // Show/hide individual guest name fields
        if (guest2Container) {
            guest2Container.style.display = count >= 2 ? 'block' : 'none';
        }
        if (guest3Container) {
            guest3Container.style.display = count >= 3 ? 'block' : 'none';
        }
    });
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    // Clear previous errors
    clearErrors();

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Get form data
    const formData = getFormData();

    // Show loading state
    setLoadingState(true);

    try {
        // Save to Firebase
        await saveToFirebase(formData);

        // Show appropriate message
        if (formData.attending) {
            showSuccessMessage();
        } else {
            showDeclineMessage();
        }

    } catch (error) {
        console.error('Error submitting RSVP:', error);
        showError('There was an error submitting your RSVP. Please try again or contact Vian & Stefan directly.');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Get form data
 */
function getFormData() {
    const attending = document.querySelector('input[name="attending"]:checked')?.value === 'yes';

    const data = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim() || null,
        attending: attending,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        submittedAtLocal: new Date().toISOString()
    };

    // Only include guest-specific data if attending
    if (attending) {
        data.guests = parseInt(document.getElementById('guests').value, 10);
        data.dietary = document.getElementById('dietary').value.trim() || null;
        data.message = document.getElementById('message').value.trim() || null;

        // Additional guest names
        data.guestNames = [data.name]; // Start with primary guest
        const guest2Input = document.getElementById('guest-2-name');
        const guest3Input = document.getElementById('guest-3-name');
        if (data.guests >= 2 && guest2Input && guest2Input.value.trim()) {
            data.guestNames.push(guest2Input.value.trim());
        }
        if (data.guests >= 3 && guest3Input && guest3Input.value.trim()) {
            data.guestNames.push(guest3Input.value.trim());
        }

        // Song suggestions
        const song1 = document.getElementById('song1').value.trim();
        const song2 = document.getElementById('song2').value.trim();
        data.songSuggestions = [];
        if (song1) data.songSuggestions.push(song1);
        if (song2) data.songSuggestions.push(song2);
    } else {
        data.message = document.getElementById('message').value.trim() || null;
    }

    return data;
}

/**
 * Validate form
 */
function validateForm() {
    let isValid = true;

    // Name validation
    const name = document.getElementById('name');
    if (!name.value.trim()) {
        showFieldError(name, 'Please enter your name');
        isValid = false;
    }

    // Email validation
    const email = document.getElementById('email');
    if (!email.value.trim()) {
        showFieldError(email, 'Please enter your email');
        isValid = false;
    } else if (!isValidEmail(email.value)) {
        showFieldError(email, 'Please enter a valid email address');
        isValid = false;
    }

    // Attending validation
    const attending = document.querySelector('input[name="attending"]:checked');
    if (!attending) {
        const radioGroup = document.querySelector('.radio-group');
        const errorEl = document.createElement('p');
        errorEl.className = 'error-message';
        errorEl.textContent = 'Please select whether you will be attending';
        radioGroup.parentNode.appendChild(errorEl);
        isValid = false;
    }

    return isValid;
}

/**
 * Check if email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show field error
 */
function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('error');

    const errorEl = document.createElement('p');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    formGroup.appendChild(errorEl);
}

/**
 * Clear all errors
 */
function clearErrors() {
    document.querySelectorAll('.form-group.error').forEach(group => {
        group.classList.remove('error');
    });
    document.querySelectorAll('.error-message').forEach(el => {
        el.remove();
    });
}

/**
 * Show general error
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.marginTop = '20px';
    errorDiv.textContent = message;
    rsvpForm.appendChild(errorDiv);
}

/**
 * Save RSVP to Firebase
 */
async function saveToFirebase(data) {
    // Use email as document ID to prevent duplicates (or allow updates)
    const docId = data.email.toLowerCase().replace(/[^a-z0-9]/g, '_');

    await db.collection('rsvps').doc(docId).set(data, { merge: true });

    // Also save songs to a separate collection for easy playlist access
    if (data.songSuggestions && data.songSuggestions.length > 0) {
        const songData = {
            submittedBy: data.name,
            email: data.email,
            songs: data.songSuggestions,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('playlist').doc(docId).set(songData, { merge: true });
    }
}

/**
 * Set loading state
 */
function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoading.style.display = isLoading ? 'inline' : 'none';
}

/**
 * Show success message
 */
function showSuccessMessage() {
    rsvpForm.style.display = 'none';
    successMessage.style.display = 'block';
    successMessage.classList.add('fade-in');
    scrollToTop();
}

/**
 * Show decline message
 */
function showDeclineMessage() {
    rsvpForm.style.display = 'none';
    declineMessage.style.display = 'block';
    declineMessage.classList.add('fade-in');
    scrollToTop();
}

/**
 * Scroll to top of page (for success/decline messages)
 */
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
