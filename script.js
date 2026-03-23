// DOM Elements
const promptForm = document.getElementById('promptForm');
const promptTitleInput = document.getElementById('promptTitle');
const promptContentInput = document.getElementById('promptContent');
const promptsContainer = document.getElementById('promptsContainer');
const promptCount = document.getElementById('promptCount');

// localStorage keys
const STORAGE_KEY = 'prompts';
const CURRENT_USER_ID = 'user-' + Math.random().toString(36).substr(2, 9);

/**
 * Initialize the application
 */
function init() {
    loadAndDisplayPrompts();
    promptForm.addEventListener('submit', handleFormSubmit);
    // Store user ID for rating tracking
    localStorage.setItem('currentUserId', CURRENT_USER_ID);
}

/**
 * Handle form submission
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const title = promptTitleInput.value.trim();
    const content = promptContentInput.value.trim();

    if (!title || !content) {
        alert('Please fill in all fields');
        return;
    }

    // Create new prompt object
    const prompt = {
        id: Date.now(),
        title: title,
        content: content,
        createdAt: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }),
        ratings: [],
        averageRating: 0,
        totalRatings: 0,
        notes: []
    };

    // Save to localStorage
    savePrompt(prompt);

    // Clear form
    promptForm.reset();
    promptTitleInput.focus();

    // Update display
    loadAndDisplayPrompts();
}

/**
 * Save a prompt to localStorage
 */
function savePrompt(prompt) {
    const prompts = getPrompts();
    prompts.push(prompt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

/**
 * Get all prompts from localStorage
 */
function getPrompts() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Delete a prompt from localStorage
 */
function deletePrompt(id) {
    if (!confirm('Are you sure you want to delete this prompt?')) {
        return;
    }

    let prompts = getPrompts();
    prompts = prompts.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));

    // Update display
    loadAndDisplayPrompts();
}

/**
 * Calculate average rating from ratings array
 */
function calculateAverageRating(ratings) {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.score, 0);
    return (sum / ratings.length).toFixed(1);
}

/**
 * Submit a rating for a prompt
 */
function submitRating(promptId, rating) {
    const prompts = getPrompts();
    const prompt = prompts.find(p => p.id === promptId);
    
    if (!prompt) return;
    
    // Initialize ratings if needed (for backward compatibility)
    if (!prompt.ratings) {
        prompt.ratings = [];
    }
    
    // Check if user already rated
    const existingRatingIndex = prompt.ratings.findIndex(r => r.userId === CURRENT_USER_ID);
    
    if (existingRatingIndex >= 0) {
        // Update existing rating
        prompt.ratings[existingRatingIndex].score = rating;
    } else {
        // Add new rating
        prompt.ratings.push({
            userId: CURRENT_USER_ID,
            score: rating,
            timestamp: new Date().toISOString()
        });
    }
    
    // Recalculate average
    prompt.averageRating = calculateAverageRating(prompt.ratings);
    prompt.totalRatings = prompt.ratings.length;
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    
    // Update display
    loadAndDisplayPrompts();
}

/**
 * Get user's current rating for a prompt
 */
function getUserRating(prompt) {
    if (!prompt.ratings) return 0;
    const userRating = prompt.ratings.find(r => r.userId === CURRENT_USER_ID);
    return userRating ? userRating.score : 0;
}

/**
 * Render star rating component for a prompt
 */
function renderStarRating(prompt) {
    const userRating = getUserRating(prompt);
    const starsHtml = Array.from({ length: 5 }, (_, i) => {
        const starRating = i + 1;
        const isFilled = starRating <= userRating;
        return `
            <span 
                class="star ${isFilled ? 'filled' : 'empty'}" 
                data-prompt-id="${prompt.id}" 
                data-rating="${starRating}"
                title="Rate ${starRating} star${starRating > 1 ? 's' : ''}"
            >
                ★
            </span>
        `;
    }).join('');
    
    const ratingLabel = userRating > 0 ? `<span class="rating-label">Your rating: ${userRating}</span>` : '';
    const avgDisplay = prompt.averageRating > 0 
        ? `<span class="rating-display">${prompt.averageRating} ★ (${prompt.totalRatings} ${prompt.totalRatings === 1 ? 'rating' : 'ratings'})</span>`
        : `<span class="rating-display">Not rated yet</span>`;
    
    return `
        <div class="rating-container">
            <div class="rating-input">
                ${starsHtml}
                ${ratingLabel}
            </div>
            <div class="rating-stats">
                ${avgDisplay}
            </div>
        </div>
    `;
}

/**
 * Get a preview of the content (first few words)
 */
function getContentPreview(content, wordCount = 20) {
    const words = content.split(/\s+/).slice(0, wordCount);
    const preview = words.join(' ');
    return content.split(/\s+/).length > wordCount ? preview + '...' : preview;
}

/**
 * Toggle notes panel visibility
 */
function toggleNotes(promptId) {
    const notesPanel = document.querySelector(`[data-notes-panel="${promptId}"]`);
    if (notesPanel) {
        notesPanel.classList.toggle('visible');
    }
}

/**
 * Add a new note to a prompt
 */
function addNote(promptId) {
    const prompts = getPrompts();
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    const noteInput = document.querySelector(`[data-note-input="${promptId}"]`);
    const noteContent = noteInput.value.trim();

    if (!noteContent) {
        alert('Please enter a note');
        return;
    }

    if (!prompt.notes) {
        prompt.notes = [];
    }

    const note = {
        noteId: Date.now(),
        content: noteContent,
        createdAt: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    prompt.notes.unshift(note); // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    loadAndDisplayPrompts();
}

/**
 * Delete a note from a prompt
 */
function deleteNote(promptId, noteId) {
    if (!confirm('Delete this note?')) return;

    const prompts = getPrompts();
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    if (prompt.notes) {
        prompt.notes = prompt.notes.filter(n => n.noteId !== noteId);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    loadAndDisplayPrompts();
}

/**
 * Edit a note
 */
function editNote(promptId, noteId) {
    const notesContainer = document.querySelector(`[data-notes-list="${promptId}"]`);
    const noteElement = notesContainer.querySelector(`[data-note-id="${noteId}"]`);

    const prompts = getPrompts();
    const prompt = prompts.find(p => p.id === promptId);
    const note = prompt.notes.find(n => n.noteId === noteId);

    if (!note) return;

    // Replace with edit mode
    const editHtml = `
        <div class="note-item editing" data-note-id="${noteId}">
            <textarea class="note-edit-input" maxlength="500">${escapeHtml(note.content)}</textarea>
            <div class="note-edit-buttons">
                <button class="btn-save-edit" onclick="saveNoteEdit(${promptId}, ${noteId})">Save</button>
                <button class="btn-cancel-edit" onclick="cancelNoteEdit(${promptId}, ${noteId})">Cancel</button>
            </div>
        </div>
    `;
    noteElement.outerHTML = editHtml;
    setTimeout(() => {
        noteElement.nextElementSibling?.querySelector('textarea').focus();
    }, 0);
}

/**
 * Save edited note
 */
function saveNoteEdit(promptId, noteId) {
    const editInput = document.querySelector(`[data-note-id="${noteId}"] .note-edit-input`);
    const newContent = editInput.value.trim();

    if (!newContent) {
        alert('Note cannot be empty');
        return;
    }

    const prompts = getPrompts();
    const prompt = prompts.find(p => p.id === promptId);
    const note = prompt.notes.find(n => n.noteId === noteId);
    note.content = newContent;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    loadAndDisplayPrompts();
}

/**
 * Cancel note editing
 */
function cancelNoteEdit(promptId, noteId) {
    loadAndDisplayPrompts();
}

/**
 * Render notes for a prompt
 */
function renderNotes(prompt) {
    if (!prompt.notes || prompt.notes.length === 0) {
        return `
            <div class="notes-empty">
                <p>No notes yet. Add one below.</p>
            </div>
        `;
    }

    return prompt.notes
        .map(note => `
            <div class="note-item" data-note-id="${note.noteId}">
                <div class="note-content">
                    <p class="note-text">${escapeHtml(note.content)}</p>
                    <span class="note-date">${note.createdAt}</span>
                </div>
                <div class="note-actions">
                    <button class="btn-note-edit" onclick="editNote(${prompt.id}, ${note.noteId})" title="Edit note">✎</button>
                    <button class="btn-note-delete" onclick="deleteNote(${prompt.id}, ${note.noteId})" title="Delete note">✕</button>
                </div>
            </div>
        `)
        .join('');
}

/**
 * Create a prompt card HTML element
 */
function createPromptCard(prompt) {
    const notesCount = (prompt.notes && prompt.notes.length > 0) ? prompt.notes.length : 0;
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.innerHTML = `
        <h3 class="prompt-card-title">${escapeHtml(prompt.title)}</h3>
        <p class="prompt-card-preview">${escapeHtml(getContentPreview(prompt.content))}</p>
        <div class="rating-section">
            ${renderStarRating(prompt)}
        </div>
        <div class="notes-section">
            <button class="btn-notes-toggle" onclick="toggleNotes(${prompt.id})" title="Toggle notes">
                📝 Notes${notesCount > 0 ? ` (${notesCount})` : ''}
            </button>
            <div class="notes-panel" data-notes-panel="${prompt.id}">
                <div class="notes-list" data-notes-list="${prompt.id}">
                    ${renderNotes(prompt)}
                </div>
                <div class="notes-input-area">
                    <textarea 
                        class="notes-input" 
                        data-note-input="${prompt.id}"
                        placeholder="Add a note (max 500 characters)..."
                        maxlength="500"
                    ></textarea>
                    <div class="notes-input-footer">
                        <span class="char-counter"><span class="char-count">0</span>/500</span>
                        <button class="btn-add-note" onclick="addNote(${prompt.id})">Add Note</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="prompt-card-footer">
            <span class="prompt-card-date">${prompt.createdAt}</span>
            <button class="btn-delete" onclick="deletePrompt(${prompt.id})">Delete</button>
        </div>
    `;
    
    // Attach event listeners for star ratings
    card.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', (e) => {
            const promptId = parseInt(e.target.dataset.promptId);
            const rating = parseInt(e.target.dataset.rating);
            submitRating(promptId, rating);
        });
        
        star.addEventListener('mouseover', (e) => {
            const promptId = parseInt(e.target.dataset.promptId);
            const hoverRating = parseInt(e.target.dataset.rating);
            const stars = card.querySelectorAll('.star');
            stars.forEach((s, index) => {
                s.classList.toggle('hover', index < hoverRating);
            });
        });
    });
    
    card.querySelector('.rating-input')?.addEventListener('mouseleave', (e) => {
        card.querySelectorAll('.star').forEach(s => s.classList.remove('hover'));
    });

    // Add character counter for notes input
    const noteInput = card.querySelector(`[data-note-input="${prompt.id}"]`);
    if (noteInput) {
        noteInput.addEventListener('input', (e) => {
            const charCount = card.querySelector('.char-count');
            charCount.textContent = e.target.value.length;
        });
    }
    
    return card;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Load and display all prompts
 */
function loadAndDisplayPrompts() {
    const prompts = getPrompts();
    promptsContainer.innerHTML = '';

    // Update count
    promptCount.textContent = prompts.length;

    if (prompts.length === 0) {
        // Show empty state
        promptsContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">📭</div>
                <h3>No prompts yet</h3>
                <p>Create your first prompt using the form above</p>
            </div>
        `;
        return;
    }

    // Display prompts in reverse order (newest first)
    prompts
        .reverse()
        .forEach(prompt => {
            const card = createPromptCard(prompt);
            promptsContainer.appendChild(card);
        });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
