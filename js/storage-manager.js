/**
 * AI Question Paper Generator - Storage Manager
 * Handles browser LocalStorage persistence, draft auto-saving, and project import/export.
 */

window.StorageManager = {
    STORAGE_KEY_PREFIX: "ai_qpg_project_",
    DRAFT_KEY: "ai_qpg_current_draft",
    API_KEY_STORAGE: "ai_qpg_gemini_api_key",

    /**
     * Save current project to LocalStorage.
     * @param {string} projectName 
     * @param {Object} projectData 
     */
    saveProject: function(projectName, projectData) {
        if (!projectName || !projectName.trim()) projectName = "Untitled Exam Project";
        
        const payload = {
            id: `proj_${Date.now()}`,
            name: projectName.trim(),
            updatedAt: new Date().toISOString(),
            data: projectData
        };

        const key = this.STORAGE_KEY_PREFIX + payload.id;
        localStorage.setItem(key, JSON.stringify(payload));
        this.saveDraft(projectData);
        return payload.id;
    },

    /**
     * Save active working draft.
     * @param {Object} projectData 
     */
    saveDraft: function(projectData) {
        try {
            localStorage.setItem(this.DRAFT_KEY, JSON.stringify({
                updatedAt: new Date().toISOString(),
                data: projectData
            }));
        } catch (e) {
            console.warn("Auto-save draft failed:", e);
        }
    },

    /**
     * Load draft if available.
     * @returns {Object|null}
     */
    loadDraft: function() {
        const raw = localStorage.getItem(this.DRAFT_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw).data;
        } catch (e) {
            return null;
        }
    },

    /**
     * List all saved projects in LocalStorage.
     * @returns {Array<Object>}
     */
    listProjects: function() {
        const list = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    list.push(item);
                } catch (e) {
                    console.warn("Corrupt project item in localStorage:", key);
                }
            }
        }
        return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    /**
     * Load project by ID.
     * @param {string} projectId 
     */
    loadProject: function(projectId) {
        const key = this.STORAGE_KEY_PREFIX + projectId;
        const raw = localStorage.getItem(key);
        if (!raw) throw new Error("Project not found.");
        return JSON.parse(raw).data;
    },

    /**
     * Delete project by ID.
     * @param {string} projectId 
     */
    deleteProject: function(projectId) {
        const key = this.STORAGE_KEY_PREFIX + projectId;
        localStorage.removeItem(key);
    },

    /**
     * Save or retrieve Gemini API Key.
     */
    saveApiKey: function(apiKey) {
        localStorage.setItem(this.API_KEY_STORAGE, apiKey ? apiKey.trim() : '');
    },

    getApiKey: function() {
        return localStorage.getItem(this.API_KEY_STORAGE) || '';
    }
};
