/**
 * Vian & Stefan Wedding RSVP
 * Firebase Integration & Form Handling
 */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCLUMmwhfiZHRCI4kiSeUUtduatu5xM7Hg",
    authDomain: "reitsma-ae8a3.firebaseapp.com",
    projectId: "reitsma-ae8a3",
    storageBucket: "reitsma-ae8a3.appspot.com",
    messagingSenderId: "",
    appId: ""
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const rsvpForm = document.getElementById('rsvp-form');
const successMessage = document.getElementById('success-message');
const declineMessage = document.getElementById('decline-message');
const submitBtn = document.querySelector('.submit-btn');
const btnText = document.querySelector('.btn-text');
const btnLoading = document.querySelector('.btn-loading');
const guestsGroup = document.getElementById('guests-group');
const dietaryGroup = document.getElementById('dietary-group');
const songSection = document.getElementById('song-section');
const attendingRadios = document.querySelectorAll('input[name="attending"]');

// RSVP Deadline
const RSVP_DEADLINE = new Date('2026-05-15T23:59:59');

/**
 * Initialize the application
 */
function init() {
    checkDeadline();
    setupEventListeners();
    setupAttendingToggle();
}

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
    rsvpForm.addEventListener('submit', handleSubmit);
}

/**
 * Toggle guest/dietary/song sections based on attendance
 */
function setupAttendingToggle() {
    attendingRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const isAttending = this.value === 'yes';
            guestsGroup.style.display = isAttending ? 'block' : 'none';
            dietaryGroup.style.display = isAttending ? 'block' : 'none';
            songSection.style.display = isAttending ? 'block' : 'none';
        });
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
    scrollToRSVP();
}

/**
 * Show decline message
 */
function showDeclineMessage() {
    rsvpForm.style.display = 'none';
    declineMessage.style.display = 'block';
    declineMessage.classList.add('fade-in');
    scrollToRSVP();
}

/**
 * Scroll to RSVP section
 */
function scrollToRSVP() {
    document.getElementById('rsvp').scrollIntoView({ behavior: 'smooth' });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
