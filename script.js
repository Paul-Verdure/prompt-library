// DOM Elements
const promptForm = document.getElementById('promptForm');
const promptTitleInput = document.getElementById('promptTitle');
const promptModelInput = document.getElementById('promptModel');
const promptContentInput = document.getElementById('promptContent');
const promptsContainer = document.getElementById('promptsContainer');
const promptCount = document.getElementById('promptCount');

// localStorage keys
const STORAGE_KEY = 'prompts';
const CURRENT_USER_ID = 'user-' + Math.random().toString(36).substr(2, 9);

/**
 * METADATA TRACKING SYSTEM
 */

/**
 * Estimate token count from text content
 * @param {string} text - The content to analyze
 * @param {boolean} isCode - Whether content is code (defaults to false)
 * @returns {Object} Token estimate with min, max, and confidence level
 */
function estimateTokens(text, isCode = false) {
    try {
        if (typeof text !== 'string' || text.length === 0) {
            return { min: 0, max: 0, confidence: 'high' };
        }

        const wordCount = text.trim().split(/\s+/).length;
        const charCount = text.length;

        // Base calculation: min = 0.75 * word_count, max = 0.25 * character_count
        let min = Math.ceil(0.75 * wordCount);
        let max = Math.ceil(0.25 * charCount);

        // If code, multiply both by 1.3 (code typically uses more tokens)
        if (isCode) {
            min = Math.ceil(min * 1.3);
            max = Math.ceil(max * 1.3);
        }

        // Determine confidence level
        const avgTokens = (min + max) / 2;
        let confidence;
        if (avgTokens < 1000) {
            confidence = 'high';
        } else if (avgTokens <= 5000) {
            confidence = 'medium';
        } else {
            confidence = 'low';
        }

        return { min, max, confidence };
    } catch (error) {
        console.error('Error estimating tokens:', error);
        return { min: 0, max: 0, confidence: 'high' };
    }
}

/**
 * Track metadata for a prompt
 * @param {string} modelName - The AI model name
 * @param {string} content - The prompt content
 * @returns {Object} Metadata object with model, timestamps, and token estimate
 */
function trackModel(modelName, content) {
    try {
        // Validate model name
        if (typeof modelName !== 'string' || modelName.trim().length === 0) {
            throw new Error('Model name must be a non-empty string');
        }
        if (modelName.length > 100) {
            throw new Error('Model name must not exceed 100 characters');
        }

        // Validate content
        if (typeof content !== 'string' || content.length === 0) {
            throw new Error('Content must be a non-empty string');
        }

        const now = new Date().toISOString();
        const tokenEstimate = estimateTokens(content);

        const metadata = {
            model: modelName.trim(),
            createdAt: now,
            updatedAt: now,
            tokenEstimate: tokenEstimate
        };

        return metadata;
    } catch (error) {
        console.error('Error tracking model:', error.message);
        throw error;
    }
}

/**
 * Update timestamp metadata
 * @param {Object} metadata - The metadata object to update
 * @returns {Object} Updated metadata with new updatedAt timestamp
 */
function updateTimestamps(metadata) {
    try {
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Metadata must be a valid object');
        }

        // Validate dates are ISO 8601
        const createdDate = new Date(metadata.createdAt);
        if (isNaN(createdDate.getTime())) {
            throw new Error('Invalid createdAt date format. Must be ISO 8601 string');
        }

        const now = new Date().toISOString();
        const updatedDate = new Date(now);

        // Ensure updatedAt >= createdAt
        if (updatedDate < createdDate) {
            throw new Error('Updated timestamp must be greater than or equal to created timestamp');
        }

        metadata.updatedAt = now;
        return metadata;
    } catch (error) {
        console.error('Error updating timestamps:', error.message);
        throw error;
    }
}

/**
 * Format ISO date to human-readable format
 * @param {string} isoDate - ISO 8601 date string
 * @returns {string} Formatted date string
 */
function formatDate(isoDate) {
    try {
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

/**
 * Get confidence color for token estimate
 * @param {string} confidence - Confidence level ('high', 'medium', 'low')
 * @returns {string} CSS class name for color
 */
function getConfidenceColor(confidence) {
    const colors = {
        'high': 'confidence-high',
        'medium': 'confidence-medium',
        'low': 'confidence-low'
    };
    return colors[confidence] || 'confidence-medium';
}


/**
 * EXPORT/IMPORT SYSTEM
 */

/**
 * Create backup of current data
 * @returns {Object} Backup object containing prompts and timestamp
 */
function createBackup() {
    try {
        const prompts = getPrompts();
        return {
            prompts: JSON.parse(JSON.stringify(prompts)), // Deep copy
            timestamp: new Date().toISOString(),
            backupId: 'backup-' + Date.now()
        };
    } catch (error) {
        console.error('Error creating backup:', error);
        throw new Error('Failed to create backup: ' + error.message);
    }
}

/**
 * Rollback data to a previous backup
 * @param {Object} backup - Backup object from createBackup()
 * @returns {boolean} Success status
 */
function rollbackData(backup) {
    try {
        if (!backup || !Array.isArray(backup.prompts)) {
            throw new Error('Invalid backup object');
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.prompts));
        return true;
    } catch (error) {
        console.error('Error rolling back data:', error);
        throw new Error('Failed to rollback data: ' + error.message);
    }
}

/**
 * Calculate export statistics from prompts
 * @param {Array} prompts - Array of prompt objects
 * @returns {Object} Statistics object
 */
function calculateExportStatistics(prompts) {
    if (!Array.isArray(prompts) || prompts.length === 0) {
        return {
            totalPrompts: 0,
            averageRating: 0,
            mostUsedModel: 'N/A',
            totalNotes: 0,
            totalRatings: 0
        };
    }

    // Calculate average rating across all prompts
    const totalRating = prompts.reduce((sum, p) => sum + (p.averageRating || 0), 0);
    const averageRating = prompts.length > 0 ? (totalRating / prompts.length).toFixed(2) : 0;

    // Find most used model
    const modelCounts = {};
    prompts.forEach(p => {
        const model = p.metadata?.model || 'Unknown';
        modelCounts[model] = (modelCounts[model] || 0) + 1;
    });
    const mostUsedModel = Object.entries(modelCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Count total notes and ratings
    const totalNotes = prompts.reduce((sum, p) => sum + (p.notes?.length || 0), 0);
    const totalRatings = prompts.reduce((sum, p) => sum + (p.ratings?.length || 0), 0);

    return {
        totalPrompts: prompts.length,
        averageRating: parseFloat(averageRating),
        mostUsedModel,
        totalNotes,
        totalRatings
    };
}

/**
 * Build complete export schema
 * @returns {Object} Complete export object with metadata
 */
function buildExportSchema() {
    try {
        const prompts = getPrompts();
        const statistics = calculateExportStatistics(prompts);

        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            exportedBy: 'Prompt Library v1.0',
            statistics: statistics,
            prompts: prompts
        };
    } catch (error) {
        console.error('Error building export schema:', error);
        throw new Error('Failed to build export schema: ' + error.message);
    }
}

/**
 * Validate export data structure
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateExportData(data) {
    const errors = [];

    try {
        // Check if data is object
        if (!data || typeof data !== 'object') {
            errors.push('Data must be a valid object');
            return { isValid: false, errors };
        }

        // Check required fields
        if (!data.version) {
            errors.push('Missing required field: version');
        }
        if (!data.exportDate) {
            errors.push('Missing required field: exportDate');
        }
        if (!Array.isArray(data.prompts)) {
            errors.push('Prompts must be an array');
        }

        // Validate version format
        if (data.version && !/^\d+\.\d+\.\d+/.test(data.version)) {
            errors.push('Invalid version format. Expected semantic versioning (e.g., 1.0.0)');
        }

        // Validate export date format
        if (data.exportDate && isNaN(new Date(data.exportDate).getTime())) {
            errors.push('Invalid ISO 8601 date format for exportDate');
        }

        // Validate each prompt
        if (Array.isArray(data.prompts)) {
            data.prompts.forEach((prompt, index) => {
                if (!prompt.id) {
                    errors.push(`Prompt at index ${index} missing id`);
                }
                if (!prompt.title) {
                    errors.push(`Prompt at index ${index} missing title`);
                }
                if (!prompt.content) {
                    errors.push(`Prompt at index ${index} missing content`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    } catch (error) {
        errors.push('Validation error: ' + error.message);
        return { isValid: false, errors };
    }
}

/**
 * Check for duplicate IDs between existing and importing prompts
 * @param {Array} existingPrompts - Current prompts in storage
 * @param {Array} importingPrompts - Prompts to import
 * @returns {Object} Conflict information
 */
function checkDuplicateIds(existingPrompts, importingPrompts) {
    const conflicts = [];
    const duplicateIds = new Set();

    existingPrompts.forEach(existing => {
        importingPrompts.forEach(importing => {
            if (existing.id === importing.id) {
                conflicts.push({
                    id: existing.id,
                    existingTitle: existing.title,
                    importingTitle: importing.title,
                    existingDate: existing.metadata?.createdAt,
                    importingDate: importing.metadata?.createdAt
                });
                duplicateIds.add(existing.id);
            }
        });
    });

    return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts,
        duplicateIds: duplicateIds
    };
}

/**
 * Merge or replace prompts based on strategy
 * @param {Array} existingPrompts - Current prompts
 * @param {Array} importingPrompts - Prompts to import
 * @param {string} strategy - 'merge', 'replace', or 'keep' (if conflicts exist)
 * @returns {Array} Merged prompts
 */
function mergePrompts(existingPrompts, importingPrompts, strategy = 'merge') {
    try {
        if (strategy === 'replace') {
            return importingPrompts;
        }

        if (strategy === 'keep') {
            // Keep existing, only add new ones
            const existingIds = new Set(existingPrompts.map(p => p.id));
            const newPrompts = importingPrompts.filter(p => !existingIds.has(p.id));
            return [...existingPrompts, ...newPrompts];
        }

        if (strategy === 'merge') {
            // Merge: for duplicates, prefer newer based on metadata.updatedAt
            const merged = [...existingPrompts];
            const existingIds = new Map(existingPrompts.map(p => [p.id, p]));

            importingPrompts.forEach(importing => {
                if (existingIds.has(importing.id)) {
                    const existing = existingIds.get(importing.id);
                    const existingTime = new Date(existing.metadata?.updatedAt || 0).getTime();
                    const importingTime = new Date(importing.metadata?.updatedAt || 0).getTime();

                    if (importingTime > existingTime) {
                        // Replace with newer version
                        const index = merged.findIndex(p => p.id === importing.id);
                        merged[index] = importing;
                    }
                } else {
                    // Add new prompt
                    merged.push(importing);
                }
            });

            return merged;
        }

        throw new Error('Invalid merge strategy: ' + strategy);
    } catch (error) {
        console.error('Error merging prompts:', error);
        throw error;
    }
}

/**
 * Export prompts to JSON file
 */
function exportPrompts() {
    try {
        const exportData = buildExportSchema();
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create timestamp for filename
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const filename = `prompt-library-export-${timestamp}.json`;

        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        showNotification('Prompts exported successfully!', 'success');
        console.log('Exported', exportData.statistics.totalPrompts, 'prompts');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Error exporting prompts: ' + error.message, 'error');
    }
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 * @param {number} duration - Duration in ms (default 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

/**
 * Handle file import
 * @param {File} file - File to import
 */
function importPrompts(file) {
    if (!file) {
        showNotification('No file selected', 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const importData = JSON.parse(content);

            // Validate structure
            const validation = validateExportData(importData);
            if (!validation.isValid) {
                const errorMsg = validation.errors.join('\n');
                showNotification('Invalid import file:\n' + errorMsg, 'error', 5000);
                console.error('Validation errors:', validation.errors);
                return;
            }

            // Get existing prompts for conflict check
            const existingPrompts = getPrompts();
            const importingPrompts = importData.prompts;
            const conflictInfo = checkDuplicateIds(existingPrompts, importingPrompts);

            // If there are conflicts, show conflict resolution modal
            if (conflictInfo.hasConflicts) {
                showConflictResolutionModal(existingPrompts, importingPrompts, conflictInfo, importData);
            } else {
                // No conflicts, proceed with merge
                performImport(existingPrompts, importingPrompts, 'merge', importData);
            }
        } catch (error) {
            console.error('Import error:', error);
            if (error instanceof SyntaxError) {
                showNotification('Invalid JSON file', 'error');
            } else {
                showNotification('Error importing prompts: ' + error.message, 'error');
            }
        }
    };

    reader.onerror = () => {
        showNotification('Error reading file', 'error');
    };

    reader.readAsText(file);
}

/**
 * Perform the actual import
 * @param {Array} existingPrompts - Current prompts
 * @param {Array} importingPrompts - Prompts to import
 * @param {string} strategy - Merge strategy
 * @param {Object} importData - Full import data (for logging)
 */
function performImport(existingPrompts, importingPrompts, strategy, importData) {
    try {
        // Create backup before import
        const backup = createBackup();

        // Merge or replace based on strategy
        const mergedPrompts = mergePrompts(existingPrompts, importingPrompts, strategy);

        // Save merged data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedPrompts));

        // Success message with statistics
        const stats = importData.statistics;
        const msg = `Successfully imported! ✓\n` +
                   `Added/Updated: ${importingPrompts.length} prompts\n` +
                   `Strategy: ${strategy}\n` +
                   `Total prompts now: ${mergedPrompts.length}`;
        showNotification(msg, 'success', 4000);

        console.log('Import successful', {
            backupId: backup.backupId,
            strategy: strategy,
            importedCount: importingPrompts.length,
            totalCount: mergedPrompts.length
        });

        // Refresh display
        loadAndDisplayPrompts();

        // Close modal if open
        const modal = document.getElementById('conflictResolutionModal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Import failed:', error);
        showNotification('Import failed: ' + error.message, 'error');

        // Backup was already created, user can manually rollback if needed
    }
}

/**
 * Show conflict resolution modal
 * @param {Array} existingPrompts - Current prompts
 * @param {Array} importingPrompts - Prompts to import
 * @param {Object} conflictInfo - Conflict information
 * @param {Object} importData - Full import data
 */
function showConflictResolutionModal(existingPrompts, importingPrompts, conflictInfo, importData) {
    // Get or create modal element
    let modal = document.getElementById('conflictResolutionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'conflictResolutionModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    // Build conflict list HTML
    const conflictsList = conflictInfo.conflicts
        .map(conf => `
            <div class="conflict-item">
                <div class="conflict-header">
                    <strong>❌ Conflicting ID: ${conf.id}</strong>
                </div>
                <div class="conflict-details">
                    <div class="conflict-version">
                        <span class="conflict-label">Current:</span>
                        <span class="conflict-value">${escapeHtml(conf.existingTitle)}</span>
                        <span class="conflict-date">${formatDate(conf.existingDate)}</span>
                    </div>
                    <div class="conflict-version">
                        <span class="conflict-label">Importing:</span>
                        <span class="conflict-value">${escapeHtml(conf.importingTitle)}</span>
                        <span class="conflict-date">${formatDate(conf.importingDate)}</span>
                    </div>
                </div>
            </div>
        `)
        .join('');

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>⚠️ Import Conflicts Detected</h2>
                <p class="conflict-summary">Found ${conflictInfo.conflicts.length} prompt(s) with duplicate IDs</p>
            </div>
            <div class="modal-body">
                <div class="conflicts-list">
                    ${conflictsList}
                </div>
                <div class="conflict-explanation">
                    <p><strong>How to handle conflicts?</strong></p>
                    <ul>
                        <li><strong>Merge:</strong> Keep both, newer version replaces older based on update time</li>
                        <li><strong>Replace:</strong> Import all prompts, overwriting existing ones entirely</li>
                        <li><strong>Keep:</strong> Keep existing prompts, only add new ones</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeConflictModal()">Cancel</button>
                <button class="btn btn-warning" onclick="handleImportStrategy('keep')">Keep Existing</button>
                <button class="btn btn-info" onclick="handleImportStrategy('merge')">Merge</button>
                <button class="btn btn-danger" onclick="handleImportStrategy('replace')">Replace All</button>
            </div>
        </div>
    `;

    // Store import data for use in handler
    window._pendingImportData = {
        existingPrompts,
        importingPrompts,
        importData
    };

    modal.style.display = 'flex';
}

/**
 * Close conflict resolution modal
 */
function closeConflictModal() {
    const modal = document.getElementById('conflictResolutionModal');
    if (modal) {
        modal.style.display = 'none';
    }
    window._pendingImportData = null;
}

/**
 * Handle user's choice for import strategy
 * @param {string} strategy - 'merge', 'replace', or 'keep'
 */
function handleImportStrategy(strategy) {
    try {
        const importData = window._pendingImportData;
        if (!importData) {
            showNotification('Import data lost. Please try again.', 'error');
            return;
        }

        const { existingPrompts, importingPrompts, importData: fullImportData } = importData;
        performImport(existingPrompts, importingPrompts, strategy, fullImportData);
    } catch (error) {
        console.error('Error handling import strategy:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

/**
 * Initialize the application
 */
function init() {
    // Verify DOM elements are loaded
    if (!promptForm || !promptTitleInput || !promptModelInput || !promptContentInput) {
        console.error('Error: One or more form elements not found', {
            promptForm: !!promptForm,
            promptTitleInput: !!promptTitleInput,
            promptModelInput: !!promptModelInput,
            promptContentInput: !!promptContentInput
        });
        alert('Error: Form elements not properly loaded');
        return;
    }

    loadAndDisplayPrompts();
    promptForm.addEventListener('submit', handleFormSubmit);
    
    // Setup export/import button listeners
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportPrompts);
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            importFile?.click();
        });
    }

    if (importFile) {
        importFile.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) {
                importPrompts(file);
                // Reset file input
                e.target.value = '';
            }
        });
    }

    // Store user ID for rating tracking
    localStorage.setItem('currentUserId', CURRENT_USER_ID);
    console.log('App initialized successfully');
}

/**
 * Handle form submission
 */
function handleFormSubmit(e) {
    e.preventDefault();

    try {
        const title = promptTitleInput?.value?.trim() || '';
        const modelName = promptModelInput?.value?.trim() || '';
        const content = promptContentInput?.value?.trim() || '';

        if (!title || !modelName || !content) {
            alert('Please fill in all fields (Title, Model, and Content)');
            return;
        }

        // Track metadata with model name
        const metadata = trackModel(modelName, content);

        // Create new prompt object
        const prompt = {
            id: Date.now(),
            title: title,
            content: content,
            metadata: metadata,
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
    } catch (error) {
        console.error('Form submission error:', error);
        alert('Error creating prompt: ' + error.message);
    }
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
 * Render metadata component for a prompt
 */
function renderMetadata(metadata) {
    if (!metadata) {
        return '';
    }

    try {
        const { model, createdAt, updatedAt, tokenEstimate } = metadata;
        const confidenceClass = getConfidenceColor(tokenEstimate.confidence);
        const createdFormatted = formatDate(createdAt);
        const updatedFormatted = formatDate(updatedAt);
        const isDifferent = createdAt !== updatedAt;

        return `
            <div class="metadata-section">
                <div class="metadata-header">
                    <span class="metadata-model">🤖 ${escapeHtml(model)}</span>
                </div>
                <div class="metadata-timestamps">
                    <div class="timestamp-item">
                        <span class="timestamp-label">Created:</span>
                        <span class="timestamp-value">${createdFormatted}</span>
                    </div>
                    ${isDifferent ? `
                        <div class="timestamp-item">
                            <span class="timestamp-label">Updated:</span>
                            <span class="timestamp-value">${updatedFormatted}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="token-estimate">
                    <span class="token-label">Token Estimate:</span>
                    <div class="token-display">
                        <span class="token-range">${tokenEstimate.min} - ${tokenEstimate.max}</span>
                        <span class="token-confidence ${confidenceClass}">
                            ${tokenEstimate.confidence.charAt(0).toUpperCase() + tokenEstimate.confidence.slice(1)} confidence
                        </span>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error rendering metadata:', error);
        return '';
    }
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
        ${renderMetadata(prompt.metadata)}
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

    // Sort by metadata createdAt descending (newest first)
    const sortedPrompts = prompts.sort((a, b) => {
        try {
            const dateA = a.metadata && a.metadata.createdAt 
                ? new Date(a.metadata.createdAt).getTime() 
                : 0;
            const dateB = b.metadata && b.metadata.createdAt 
                ? new Date(b.metadata.createdAt).getTime() 
                : 0;
            return dateB - dateA;
        } catch (error) {
            console.error('Error sorting prompts:', error);
            return 0;
        }
    });

    // Display prompts
    sortedPrompts.forEach(prompt => {
        const card = createPromptCard(prompt);
        promptsContainer.appendChild(card);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
