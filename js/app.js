/**
 * AI Question Paper Generator - Main UI & Controller Application
 * Coordinates all modules, manages state, renders views, handles undo/redo.
 */

window.App = {
    // Global Application State
    state: {
        currentStep: 1, // 1 to 6
        pdfFile: null,
        pdfText: "",
        pdfMeta: null,
        syllabus: null,
        generationSettings: {
            beginnerCount: 3,
            intermediateCount: 3,
            advancedCount: 2,
            questionTypes: ["Short answer", "Long answer", "MCQ", "Numerical", "Problem-solving", "Programming question", "Algorithm"],
            language: "English",
            includeNumerical: true,
            includeProgramming: true,
            strictMode: true,
            avoidDuplicates: true
        },
        questionBank: [],
        paperConfig: null,
        generatedPaper: null, // { sections, diagnostics }
        undoStack: [],
        redoStack: [],
        filter: {
            search: "",
            module: "All",
            topic: "All",
            difficulty: "All",
            type: "All"
        }
    },

    /**
     * Application Entry Initialization.
     */
    init: function() {
        console.log("Initializing AI Question Paper Generator App...");
        this.bindEvents();
        this.loadSettings();

        // Check if draft exists
        const draft = window.StorageManager.loadDraft();
        if (draft && draft.syllabus) {
            this.state.syllabus = draft.syllabus;
            if (draft.questionBank) this.state.questionBank = draft.questionBank;
            if (draft.paperConfig) this.state.paperConfig = draft.paperConfig;
        }

        this.renderStep(1);
    },

    /**
     * Event Listeners Binding.
     */
    bindEvents: function() {
        const self = this;

        // File Drag and Drop
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('pdf-file-input');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-blue-500', 'bg-blue-50');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    self.handleFileUpload(e.dataTransfer.files[0]);
                }
            });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    self.handleFileUpload(e.target.files[0]);
                }
            });
        }

        // Gemini API Key Modal Elements
        const apiKeyBtn = document.getElementById('btn-api-settings');
        if (apiKeyBtn) {
            apiKeyBtn.addEventListener('click', () => {
                const existingKey = window.StorageManager.getApiKey();
                const keyInput = document.getElementById('api-key-input');
                if (keyInput) keyInput.value = existingKey;
                document.getElementById('api-modal').classList.remove('hidden');
            });
        }

        const saveApiBtn = document.getElementById('btn-save-api-key');
        if (saveApiBtn) {
            saveApiBtn.addEventListener('click', () => {
                const keyVal = document.getElementById('api-key-input').value;
                window.StorageManager.saveApiKey(keyVal);
                document.getElementById('api-modal').classList.add('hidden');
                self.showNotification("API Key updated successfully!", "success");
            });
        }
    },

    /**
     * Load settings from storage.
     */
    loadSettings: function() {
        const apiKey = window.StorageManager.getApiKey();
        const apiBadge = document.getElementById('api-status-badge');
        if (apiBadge) {
            if (apiKey) {
                apiBadge.textContent = "Gemini AI Active";
                apiBadge.className = "text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700 border border-green-300";
            } else {
                apiBadge.textContent = "Standard Local Engine";
                apiBadge.className = "text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-300";
            }
        }
    },

    /**
     * Handle PDF File Upload.
     */
    handleFileUpload: async function(file) {
        const self = this;
        const validation = window.PdfExtractor.validateFile(file);
        if (!validation.valid) {
            self.showNotification(validation.error, "error");
            return;
        }

        this.state.pdfFile = file;

        // Update UI info
        document.getElementById('upload-idle-state').classList.add('hidden');
        document.getElementById('upload-active-state').classList.remove('hidden');
        document.getElementById('file-name-display').textContent = file.name;
        document.getElementById('file-size-display').textContent = `${(file.size / (1024*1024)).toFixed(2)} MB`;

        const progressContainer = document.getElementById('upload-progress-container');
        const progressBar = document.getElementById('upload-progress-bar');
        const progressStatus = document.getElementById('upload-progress-status');

        progressContainer.classList.remove('hidden');

        try {
            const result = await window.PdfExtractor.extractText(file, (percent, statusText) => {
                progressBar.style.width = `${percent}%`;
                progressStatus.textContent = statusText;
            });

            this.state.pdfText = result.text;
            this.state.pdfMeta = result;

            document.getElementById('page-count-display').textContent = `${result.pageCount} Pages`;
            
            // Render canvas preview
            const canvas = document.getElementById('pdf-preview-canvas');
            if (canvas) {
                await window.PdfExtractor.renderPreview(file, canvas);
            }

            self.showNotification("PDF extracted successfully! Click 'Analyze Syllabus' to proceed.", "success");
            document.getElementById('btn-analyze-syllabus').disabled = false;
        } catch (err) {
            self.showNotification(`PDF Extraction Failed: ${err.message}`, "error");
        }
    },

    /**
     * Load Pre-configured Sample Syllabus.
     */
    loadSampleSyllabus: function(sampleKey) {
        const sample = window.SAMPLE_SYLLABI[sampleKey];
        if (!sample) return;

        this.state.pdfText = sample.text;
        this.state.syllabus = window.SyllabusAnalyzer.normalizeStructure(sample);
        
        // Auto initialize paper config metadata from sample
        this.state.paperConfig = window.PaperConfigurator.getDefaultConfig(this.state.syllabus);

        this.showNotification(`Loaded "${sample.subject}" sample syllabus!`, "info");
        this.renderStep(2);
    },

    /**
     * Step 1 -> Step 2: Trigger Syllabus Analysis.
     */
    analyzeSyllabus: async function() {
        if (!this.state.pdfText) {
            this.showNotification("Please upload a PDF or select a sample syllabus first.", "error");
            return;
        }

        const progressModal = document.getElementById('analysis-progress-modal');
        const progressBar = document.getElementById('analysis-progress-bar');
        const progressStatus = document.getElementById('analysis-progress-status');

        if (progressModal) progressModal.classList.remove('hidden');

        try {
            const apiKey = window.StorageManager.getApiKey();
            const analyzed = await window.SyllabusAnalyzer.analyze(this.state.pdfText, apiKey, (percent, msg) => {
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressStatus) progressStatus.textContent = msg;
            });

            this.state.syllabus = analyzed;
            this.state.paperConfig = window.PaperConfigurator.getDefaultConfig(analyzed);

            if (progressModal) progressModal.classList.add('hidden');
            this.renderStep(2);
        } catch (err) {
            if (progressModal) progressModal.classList.add('hidden');
            this.showNotification(`Syllabus Analysis Error: ${err.message}`, "error");
        }
    },

    /**
     * Step 2 -> Step 3: Trigger Question Bank Generation.
     */
    generateQuestionBank: async function() {
        if (!this.state.syllabus) return;

        const progressModal = document.getElementById('qbank-progress-modal');
        const progressBar = document.getElementById('qbank-progress-bar');
        const progressStatus = document.getElementById('qbank-progress-status');

        if (progressModal) progressModal.classList.remove('hidden');

        try {
            const apiKey = window.StorageManager.getApiKey();
            const bank = await window.QuestionGenerator.generateBank(
                this.state.syllabus,
                this.state.generationSettings,
                apiKey,
                (percent, msg) => {
                    if (progressBar) progressBar.style.width = `${percent}%`;
                    if (progressStatus) progressStatus.textContent = msg;
                }
            );

            this.state.questionBank = bank;
            window.StorageManager.saveDraft(this.state);

            if (progressModal) progressModal.classList.add('hidden');
            this.renderStep(3);
        } catch (err) {
            if (progressModal) progressModal.classList.add('hidden');
            this.showNotification(`Question Bank Generation Error: ${err.message}`, "error");
        }
    },

    /**
     * Step 4 -> Step 5: Trigger Question Paper Selection Engine.
     */
    generatePaper: function() {
        try {
            // Read UI values into paperConfig
            this.readPaperConfigFromUI();

            const result = window.SelectionEngine.generatePaper(
                this.state.questionBank,
                this.state.paperConfig,
                this.state.syllabus
            );

            this.state.generatedPaper = result;
            this.pushUndoState();
            window.StorageManager.saveDraft(this.state);

            this.renderStep(5);
        } catch (err) {
            this.showNotification(err.message, "error");
        }
    },

    /**
     * Read values from Paper Configuration Step 4 form into state.
     */
    readPaperConfigFromUI: function() {
        if (!this.state.paperConfig) {
            this.state.paperConfig = window.PaperConfigurator.getDefaultConfig(this.state.syllabus);
        }

        const meta = this.state.paperConfig.metadata;
        meta.institution = document.getElementById('cfg-institution')?.value || meta.institution;
        meta.department = document.getElementById('cfg-department')?.value || meta.department;
        meta.courseName = document.getElementById('cfg-coursename')?.value || meta.courseName;
        meta.subject = document.getElementById('cfg-subject')?.value || meta.subject;
        meta.courseCode = document.getElementById('cfg-code')?.value || meta.courseCode;
        meta.semester = document.getElementById('cfg-semester')?.value || meta.semester;
        meta.examTitle = document.getElementById('cfg-examtitle')?.value || meta.examTitle;
        meta.academicYear = document.getElementById('cfg-academicyear')?.value || meta.academicYear;
        meta.date = document.getElementById('cfg-date')?.value || meta.date;
        meta.duration = document.getElementById('cfg-duration')?.value || meta.duration;
        meta.totalMarks = Number(document.getElementById('cfg-totalmarks')?.value) || 100;
    },

    /**
     * Render Stepper Progress Header.
     */
    renderStepperHeader: function(stepNum) {
        for (let i = 1; i <= 6; i++) {
            const el = document.getElementById(`step-item-${i}`);
            if (!el) continue;
            el.classList.remove('active', 'completed');
            if (i < stepNum) {
                el.classList.add('completed');
            } else if (i === stepNum) {
                el.classList.add('active');
            }
        }
    },

    /**
     * Render Step View.
     */
    renderStep: function(stepNum) {
        this.state.currentStep = stepNum;
        this.renderStepperHeader(stepNum);

        for (let i = 1; i <= 6; i++) {
            const stepView = document.getElementById(`step-view-${i}`);
            if (stepView) {
                if (i === stepNum) stepView.classList.remove('hidden');
                else stepView.classList.add('hidden');
            }
        }

        // Render Step Specific View Contents
        switch (stepNum) {
            case 2:
                this.renderTopicTree();
                break;
            case 3:
                this.renderQuestionBankDashboard();
                break;
            case 4:
                this.renderPaperConfiguratorView();
                break;
            case 5:
                this.renderPaperPreviewView();
                break;
            case 6:
                this.renderExportAndStatsView();
                break;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Step 2: Render Interactive Topic Tree UI.
     */
    renderTopicTree: function() {
        const container = document.getElementById('topic-tree-container');
        if (!container || !this.state.syllabus) return;

        const syllabus = this.state.syllabus;
        
        let html = `
            <div class="mb-4 flex flex-wrap justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div>
                    <h3 class="text-lg font-bold text-blue-900">${syllabus.subject} (${syllabus.courseCode})</h3>
                    <p class="text-sm text-blue-700">${syllabus.department} • ${syllabus.modules.length} Modules Identified</p>
                </div>
                <div class="flex gap-2 mt-2 sm:mt-0">
                    <button onclick="App.addModule()" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700">
                        + Add Module
                    </button>
                    <button onclick="App.toggleAllTopics(true)" class="px-3 py-1.5 bg-white text-slate-700 rounded text-xs font-semibold border hover:bg-slate-50">
                        Select All
                    </button>
                    <button onclick="App.toggleAllTopics(false)" class="px-3 py-1.5 bg-white text-slate-700 rounded text-xs font-semibold border hover:bg-slate-50">
                        Deselect All
                    </button>
                </div>
            </div>
        `;

        syllabus.modules.forEach((mod, mIdx) => {
            html += `
                <div class="tree-node-module mb-4 shadow-sm">
                    <div class="tree-node-header flex justify-between items-center bg-slate-100 p-3 rounded-t border-b">
                        <div class="flex items-center gap-3">
                            <input type="checkbox" onchange="App.toggleModuleTopics('${mod.id}', this.checked)" 
                                   ${mod.topics.every(t => t.selected) ? 'checked' : ''} class="w-4 h-4 text-blue-600 rounded">
                            <input type="text" value="${mod.name}" onchange="App.updateModuleName('${mod.id}', this.value)" 
                                   class="font-bold text-slate-800 bg-transparent hover:bg-white focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 rounded text-sm w-80 md:w-96">
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium">${mod.topics.length} topics</span>
                            <button onclick="App.addTopicToModule('${mod.id}')" class="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 border border-blue-300 rounded bg-white">+ Topic</button>
                            <button onclick="App.deleteModule('${mod.id}')" class="text-xs text-red-600 hover:text-red-800 p-1">Delete</button>
                        </div>
                    </div>
                    <div class="tree-subtopics-container p-3 flex flex-col gap-2">
            `;

            mod.topics.forEach((top, tIdx) => {
                const diffBadgeClass = top.difficulty === 'Beginner' ? 'badge-beginner' : (top.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced');

                html += `
                    <div class="tree-topic-item flex items-center justify-between p-2 rounded border hover:border-blue-300 bg-white">
                        <div class="flex items-center gap-3 flex-1">
                            <input type="checkbox" ${top.selected ? 'checked' : ''} onchange="App.toggleTopicSelected('${top.id}', this.checked)" class="w-4 h-4 text-blue-600 rounded">
                            <input type="text" value="${top.name}" onchange="App.updateTopicName('${top.id}', this.value)" 
                                   class="text-sm font-medium text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border-b border-transparent focus:border-blue-500 px-1 py-0.5 rounded flex-1">
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs px-2 py-0.5 rounded ${diffBadgeClass}">${top.difficulty}</span>
                            <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">${top.conceptType}</span>
                            <button onclick="App.deleteTopic('${top.id}')" class="text-xs text-slate-400 hover:text-red-600 px-1">✕</button>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;
    },

    // Topic Tree Mutation Handlers
    toggleAllTopics: function(selected) {
        if (!this.state.syllabus) return;
        this.state.syllabus.modules.forEach(m => m.topics.forEach(t => t.selected = selected));
        this.renderTopicTree();
    },
    toggleModuleTopics: function(modId, selected) {
        const mod = this.state.syllabus.modules.find(m => m.id === modId);
        if (mod) {
            mod.topics.forEach(t => t.selected = selected);
            this.renderTopicTree();
        }
    },
    toggleTopicSelected: function(topId, selected) {
        for (let m of this.state.syllabus.modules) {
            const top = m.topics.find(t => t.id === topId);
            if (top) {
                top.selected = selected;
                break;
            }
        }
    },
    updateModuleName: function(modId, name) {
        const mod = this.state.syllabus.modules.find(m => m.id === modId);
        if (mod) mod.name = name;
    },
    updateTopicName: function(topId, name) {
        for (let m of this.state.syllabus.modules) {
            const top = m.topics.find(t => t.id === topId);
            if (top) {
                top.name = name;
                break;
            }
        }
    },
    deleteModule: function(modId) {
        this.state.syllabus.modules = this.state.syllabus.modules.filter(m => m.id !== modId);
        this.renderTopicTree();
    },
    deleteTopic: function(topId) {
        for (let m of this.state.syllabus.modules) {
            m.topics = m.topics.filter(t => t.id !== topId);
        }
        this.renderTopicTree();
    },
    addModule: function() {
        const newModId = `mod-${Date.now()}`;
        this.state.syllabus.modules.push({
            id: newModId,
            name: `Module ${this.state.syllabus.modules.length + 1}: New Core Module`,
            weightage: 20,
            topics: [
                { id: `top-${newModId}-1`, name: "New Specific Topic", subtopics: ["Principles"], conceptType: "Conceptual", difficulty: "Intermediate", importance: "High", selected: true }
            ]
        });
        this.renderTopicTree();
    },
    addTopicToModule: function(modId) {
        const mod = this.state.syllabus.modules.find(m => m.id === modId);
        if (mod) {
            mod.topics.push({
                id: `top-${modId}-${Date.now()}`,
                name: "New Topic Entry",
                subtopics: ["Overview"],
                conceptType: "Conceptual",
                difficulty: "Beginner",
                importance: "High",
                selected: true
            });
            this.renderTopicTree();
        }
    },

    /**
     * Step 3: Render Question Bank Dashboard.
     */
    renderQuestionBankDashboard: function() {
        const bank = this.state.questionBank;
        const container = document.getElementById('question-bank-cards-container');
        if (!container) return;

        // Populate filter dropdowns
        this.populateBankFilterDropdowns();

        // Metrics counters
        let beg = 0, int = 0, adv = 0;
        bank.forEach(q => {
            if (q.difficulty === 'Beginner') beg++;
            else if (q.difficulty === 'Intermediate') int++;
            else if (q.difficulty === 'Advanced') adv++;
        });

        document.getElementById('qb-total-count').textContent = bank.length;
        document.getElementById('qb-beginner-count').textContent = beg;
        document.getElementById('qb-intermediate-count').textContent = int;
        document.getElementById('qb-advanced-count').textContent = adv;

        // Apply filters
        const filtered = bank.filter(q => {
            const f = this.state.filter;
            if (f.search && !q.question.toLowerCase().includes(f.search.toLowerCase())) return false;
            if (f.module !== "All" && q.module !== f.module) return false;
            if (f.difficulty !== "All" && q.difficulty !== f.difficulty) return false;
            if (f.type !== "All" && q.type !== f.type) return false;
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="text-center py-12 text-slate-500 font-medium">No questions found matching the selected filters.</div>`;
            return;
        }

        let html = '';
        filtered.forEach(q => {
            const diffBadgeClass = q.difficulty === 'Beginner' ? 'badge-beginner' : (q.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced');

            let optionsHtml = '';
            if (q.type === 'MCQ' && q.options) {
                optionsHtml = `<div class="mcq-options-grid">${q.options.map(opt => `<div class="bg-slate-50 p-1.5 rounded border text-xs text-slate-700">${opt}</div>`).join('')}</div>`;
            }

            html += `
                <div class="bg-white border rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">${q.id}</span>
                            <span class="text-xs px-2 py-0.5 rounded font-semibold ${diffBadgeClass}">${q.difficulty}</span>
                            <span class="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">${q.type}</span>
                            <span class="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">${q.marks} Marks</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="App.editBankQuestion('${q.id}')" class="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                            <button onclick="App.duplicateBankQuestion('${q.id}')" class="text-xs text-slate-600 hover:text-slate-800 font-medium">Duplicate</button>
                            <button onclick="App.deleteBankQuestion('${q.id}')" class="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
                        </div>
                    </div>
                    <div class="text-sm text-slate-800 font-medium mb-2">${q.question}</div>
                    ${optionsHtml}
                    <div class="mt-3 pt-2 border-t flex justify-between items-center text-xs text-slate-500">
                        <div><span class="font-semibold text-slate-700">Module:</span> ${q.module}</div>
                        <div><span class="font-semibold text-slate-700">Topic:</span> ${q.topic}</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    populateBankFilterDropdowns: function() {
        const modSelect = document.getElementById('qb-filter-module');
        if (!modSelect || !this.state.syllabus) return;

        let options = '<option value="All">All Modules</option>';
        this.state.syllabus.modules.forEach(m => {
            options += `<option value="${m.name}">${m.name}</option>`;
        });
        modSelect.innerHTML = options;
    },

    updateQbFilters: function() {
        this.state.filter.search = document.getElementById('qb-search-input')?.value || "";
        this.state.filter.module = document.getElementById('qb-filter-module')?.value || "All";
        this.state.filter.difficulty = document.getElementById('qb-filter-difficulty')?.value || "All";
        this.state.filter.type = document.getElementById('qb-filter-type')?.value || "All";
        this.renderQuestionBankDashboard();
    },

    // Question Bank Mutations
    deleteBankQuestion: function(qId) {
        this.state.questionBank = this.state.questionBank.filter(q => q.id !== qId);
        this.renderQuestionBankDashboard();
    },
    duplicateBankQuestion: function(qId) {
        const target = this.state.questionBank.find(q => q.id === qId);
        if (target) {
            const dup = JSON.parse(JSON.stringify(target));
            dup.id = `Q-DUP-${Date.now()}`;
            dup.question = `[Copy] ${dup.question}`;
            this.state.questionBank.push(dup);
            this.renderQuestionBankDashboard();
        }
    },
    editBankQuestion: function(qId) {
        const target = this.state.questionBank.find(q => q.id === qId);
        if (!target) return;

        const newText = prompt("Edit Question Text:", target.question);
        if (newText && newText.trim()) {
            target.question = newText.trim();
            this.renderQuestionBankDashboard();
        }
    },

    /**
     * Step 4: Render Paper Configurator & Section Builder UI.
     */
    renderPaperConfiguratorView: function() {
        if (!this.state.paperConfig) {
            this.state.paperConfig = window.PaperConfigurator.getDefaultConfig(this.state.syllabus);
        }

        const config = this.state.paperConfig;
        const meta = config.metadata;

        // Populate basic metadata form inputs
        if (document.getElementById('cfg-institution')) document.getElementById('cfg-institution').value = meta.institution;
        if (document.getElementById('cfg-department')) document.getElementById('cfg-department').value = meta.department;
        if (document.getElementById('cfg-coursename')) document.getElementById('cfg-coursename').value = meta.courseName;
        if (document.getElementById('cfg-subject')) document.getElementById('cfg-subject').value = meta.subject;
        if (document.getElementById('cfg-code')) document.getElementById('cfg-code').value = meta.courseCode;
        if (document.getElementById('cfg-semester')) document.getElementById('cfg-semester').value = meta.semester;
        if (document.getElementById('cfg-examtitle')) document.getElementById('cfg-examtitle').value = meta.examTitle;
        if (document.getElementById('cfg-academicyear')) document.getElementById('cfg-academicyear').value = meta.academicYear;
        if (document.getElementById('cfg-date')) document.getElementById('cfg-date').value = meta.date;
        if (document.getElementById('cfg-duration')) document.getElementById('cfg-duration').value = meta.duration;
        if (document.getElementById('cfg-totalmarks')) document.getElementById('cfg-totalmarks').value = meta.totalMarks;

        this.renderSectionsBuilderList();
        this.runRealtimeMathValidation();
    },

    renderSectionsBuilderList: function() {
        const container = document.getElementById('sections-builder-container');
        if (!container || !this.state.paperConfig) return;

        let html = '';
        this.state.paperConfig.sections.forEach((sec, idx) => {
            html += `
                <div class="bg-white border rounded-lg p-4 shadow-sm mb-4">
                    <div class="flex justify-between items-center mb-3">
                        <input type="text" value="${sec.name}" onchange="App.updateSectionProp(${idx}, 'name', this.value)" 
                               class="font-bold text-slate-800 text-base border-b border-gray-300 focus:border-blue-500 px-1 py-0.5 rounded">
                        <button onclick="App.deleteSection(${idx})" class="text-xs text-red-600 hover:text-red-800 font-semibold">Remove Section</button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Total Questions</label>
                            <input type="number" min="1" value="${sec.totalQuestions}" onchange="App.updateSectionProp(${idx}, 'totalQuestions', Number(this.value))" 
                                   class="w-full border rounded px-2 py-1 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Questions to Answer</label>
                            <input type="number" min="1" value="${sec.questionsToAnswer}" onchange="App.updateSectionProp(${idx}, 'questionsToAnswer', Number(this.value))" 
                                   class="w-full border rounded px-2 py-1 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Marks per Question</label>
                            <input type="number" min="1" value="${sec.marksPerQuestion}" onchange="App.updateSectionProp(${idx}, 'marksPerQuestion', Number(this.value))" 
                                   class="w-full border rounded px-2 py-1 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Target Difficulty</label>
                            <select onchange="App.updateSectionProp(${idx}, 'targetDifficulty', this.value)" class="w-full border rounded px-2 py-1 text-sm">
                                <option value="Beginner" ${sec.targetDifficulty === 'Beginner' ? 'selected' : ''}>Beginner</option>
                                <option value="Intermediate" ${sec.targetDifficulty === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                                <option value="Advanced" ${sec.targetDifficulty === 'Advanced' ? 'selected' : ''}>Advanced</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Choice Instructions</label>
                        <input type="text" value="${sec.instructions}" onchange="App.updateSectionProp(${idx}, 'instructions', this.value)" 
                               class="w-full border rounded px-2 py-1 text-xs text-slate-700">
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    updateSectionProp: function(secIdx, prop, value) {
        if (this.state.paperConfig.sections[secIdx]) {
            this.state.paperConfig.sections[secIdx][prop] = value;
            this.runRealtimeMathValidation();
        }
    },
    addSection: function() {
        const nextLetter = String.fromCharCode(65 + this.state.paperConfig.sections.length);
        this.state.paperConfig.sections.push({
            id: `sec-${Date.now()}`,
            name: `PART ${nextLetter}`,
            instructions: "Answer ANY FIVE questions. Each question carries 5 marks.",
            totalQuestions: 7,
            questionsToAnswer: 5,
            marksPerQuestion: 5,
            targetDifficulty: "Intermediate",
            allowedTypes: ["Short answer", "Long answer"],
            allowedModules: []
        });
        this.renderSectionsBuilderList();
        this.runRealtimeMathValidation();
    },
    deleteSection: function(secIdx) {
        this.state.paperConfig.sections.splice(secIdx, 1);
        this.renderSectionsBuilderList();
        this.runRealtimeMathValidation();
    },

    runRealtimeMathValidation: function() {
        this.readPaperConfigFromUI();
        const validation = window.PaperConfigurator.validateConfig(this.state.paperConfig);
        const alertBox = document.getElementById('math-validation-alert-box');

        if (!alertBox) return;

        if (validation.valid) {
            alertBox.className = "p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 mb-6";
            alertBox.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-bold text-lg">✓ Mathematical Validation Passed</span>
                </div>
                <div class="text-xs mt-1">Section structure produces exactly ${validation.calculatedMarks} marks matching requested paper total of ${validation.totalMarks} marks across ${validation.calculatedTotalQuestions} questions.</div>
            `;
        } else {
            alertBox.className = "p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 mb-6";
            alertBox.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-bold text-lg">⚠ Mathematical Discrepancy Detected</span>
                </div>
                <ul class="text-xs mt-1 list-disc list-inside">
                    ${validation.errors.map(err => `<li>${err}</li>`).join('')}
                </ul>
            `;
        }
    },

    /**
     * Step 5: Render Question Paper Preview & Interactive Editing View.
     */
    renderPaperPreviewView: function() {
        if (!this.state.generatedPaper) return;

        const paper = this.state.generatedPaper;
        const meta = this.state.paperConfig.metadata;
        const paperContainer = document.getElementById('paper-preview-document');

        if (!paperContainer) return;

        let html = `
            <div class="paper-container border shadow-lg">
                <div class="exam-header">
                    <h1>${meta.institution}</h1>
                    <h2>${meta.department}</h2>
                    <h3>${meta.examTitle} - ${meta.academicYear}</h3>
                    <div class="font-semibold text-xs text-slate-700">Course: ${meta.courseName} | Subject: ${meta.subject} (${meta.courseCode}) | ${meta.semester}</div>
                    <div class="exam-meta-grid">
                        <span>Duration: ${meta.duration}</span>
                        <span>Maximum Marks: ${meta.totalMarks}</span>
                    </div>
                </div>
        `;

        let questionCounter = 1;

        paper.sections.forEach((sec, sIdx) => {
            html += `
                <div class="paper-section-title">${sec.name}</div>
                <div class="paper-section-instructions">${sec.instructions}</div>
                <div class="paper-question-list">
            `;

            sec.questions.forEach((q, qIdx) => {
                let optionsHtml = '';
                if (q.type === 'MCQ' && q.options) {
                    optionsHtml = `<div class="mcq-options-grid">${q.options.map(opt => `<div>${opt}</div>`).join('')}</div>`;
                }

                html += `
                    <div class="paper-question-row relative group">
                        <div class="paper-q-num">${questionCounter}.</div>
                        <div class="paper-q-text">
                            <div>${q.question}</div>
                            ${optionsHtml}
                        </div>
                        <div class="paper-q-marks">[${q.marks}]</div>

                        <!-- Hover Action Bar -->
                        <div class="hover-actions no-print">
                            <button onclick="App.editPaperQuestion(${sIdx}, ${qIdx})" class="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                            <button onclick="App.replacePaperQuestionModal(${sIdx}, ${qIdx})" class="text-xs px-2 py-0.5 bg-amber-600 text-white rounded hover:bg-amber-700">Replace</button>
                            <button onclick="App.deletePaperQuestion(${sIdx}, ${qIdx})" class="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                `;
                questionCounter++;
            });

            html += `</div>`;
        });

        html += `</div>`;
        paperContainer.innerHTML = html;

        // Render Diagnostics Sidebar
        this.renderDiagnosticsSidebar(paper.diagnostics);
    },

    renderDiagnosticsSidebar: function(diag) {
        const container = document.getElementById('paper-diagnostics-sidebar');
        if (!container) return;

        let duplicateAlertsHtml = '';
        if (diag.duplicateWarnings && diag.duplicateWarnings.length > 0) {
            duplicateAlertsHtml = `
                <div class="bg-amber-50 border border-amber-300 p-3 rounded text-amber-900 text-xs mb-4">
                    <div class="font-bold mb-1">⚠ High Similarity Warnings:</div>
                    ${diag.duplicateWarnings.map(d => `
                        <div class="mb-1">
                            Q${d.q1Num} & Q${d.q2Num} share ${d.similarityPercent}% similarity.
                        </div>
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="bg-white border rounded-lg p-4 shadow-sm text-sm">
                <h4 class="font-bold text-slate-800 mb-3 text-base border-b pb-2">Paper Diagnostics</h4>
                
                <div class="space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-slate-600">Total Marks Audit:</span>
                        <span class="font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs">✓ ${diag.totalMarks} Marks</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-600">Total Questions:</span>
                        <span class="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs">${diag.totalQuestions} Questions</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-600">Syllabus Coverage:</span>
                        <span class="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-xs">${diag.syllabusCoveragePercent}% Topics Covered</span>
                    </div>
                </div>

                <div class="mt-4 pt-3 border-t">
                    <div class="font-semibold text-slate-700 mb-2">Difficulty Breakdown:</div>
                    <div class="space-y-1.5 text-xs">
                        <div>
                            <div class="flex justify-between mb-0.5"><span>Beginner:</span><span>${diag.difficultyDistribution.beginner}%</span></div>
                            <div class="w-full bg-slate-100 rounded-full h-2"><div class="bg-green-500 h-2 rounded-full" style="width: ${diag.difficultyDistribution.beginner}%"></div></div>
                        </div>
                        <div>
                            <div class="flex justify-between mb-0.5"><span>Intermediate:</span><span>${diag.difficultyDistribution.intermediate}%</span></div>
                            <div class="w-full bg-slate-100 rounded-full h-2"><div class="bg-amber-500 h-2 rounded-full" style="width: ${diag.difficultyDistribution.intermediate}%"></div></div>
                        </div>
                        <div>
                            <div class="flex justify-between mb-0.5"><span>Advanced:</span><span>${diag.difficultyDistribution.advanced}%</span></div>
                            <div class="w-full bg-slate-100 rounded-full h-2"><div class="bg-red-500 h-2 rounded-full" style="width: ${diag.difficultyDistribution.advanced}%"></div></div>
                        </div>
                    </div>
                </div>

                ${duplicateAlertsHtml}
            </div>
        `;
    },

    // Paper Editing Handlers
    editPaperQuestion: function(sIdx, qIdx) {
        const q = this.state.generatedPaper.sections[sIdx].questions[qIdx];
        const newText = prompt("Edit Question Text:", q.question);
        if (newText && newText.trim()) {
            this.pushUndoState();
            q.question = newText.trim();
            this.recalculatePaperDiagnostics();
            this.renderPaperPreviewView();
        }
    },
    deletePaperQuestion: function(sIdx, qIdx) {
        this.pushUndoState();
        this.state.generatedPaper.sections[sIdx].questions.splice(qIdx, 1);
        this.recalculatePaperDiagnostics();
        this.renderPaperPreviewView();
    },
    replacePaperQuestionModal: function(sIdx, qIdx) {
        const q = this.state.generatedPaper.sections[sIdx].questions[qIdx];
        const alternatives = this.state.questionBank.filter(bankQ => bankQ.id !== q.id);

        if (alternatives.length === 0) {
            this.showNotification("No alternative questions available in the question bank.", "info");
            return;
        }

        const altChoiceText = alternatives.slice(0, 5).map((a, i) => `${i + 1}. [${a.difficulty}] ${a.question}`).join("\n\n");
        const userChoice = prompt(`Select alternative replacement question (Enter number 1-${Math.min(5, alternatives.length)}):\n\n${altChoiceText}`);

        const choiceNum = parseInt(userChoice, 10);
        if (choiceNum >= 1 && choiceNum <= Math.min(5, alternatives.length)) {
            this.pushUndoState();
            const replacement = alternatives[choiceNum - 1];
            this.state.generatedPaper.sections[sIdx].questions[qIdx] = {
                ...replacement,
                marks: q.marks
            };
            this.recalculatePaperDiagnostics();
            this.renderPaperPreviewView();
            this.showNotification("Question replaced successfully!", "success");
        }
    },
    recalculatePaperDiagnostics: function() {
        this.state.generatedPaper.diagnostics = window.SelectionEngine.analyzePaperDiagnostics(
            this.state.generatedPaper.sections,
            this.state.syllabus
        );
    },

    // Undo / Redo History Stack Management
    pushUndoState: function() {
        this.state.undoStack.push(JSON.stringify(this.state.generatedPaper));
        this.state.redoStack = [];
    },
    undoPaperEdit: function() {
        if (this.state.undoStack.length > 0) {
            this.state.redoStack.push(JSON.stringify(this.state.generatedPaper));
            const lastState = this.state.undoStack.pop();
            this.state.generatedPaper = JSON.parse(lastState);
            this.renderPaperPreviewView();
            this.showNotification("Undo action applied.", "info");
        }
    },
    redoPaperEdit: function() {
        if (this.state.redoStack.length > 0) {
            this.state.undoStack.push(JSON.stringify(this.state.generatedPaper));
            const nextState = this.state.redoStack.pop();
            this.state.generatedPaper = JSON.parse(nextState);
            this.renderPaperPreviewView();
            this.showNotification("Redo action applied.", "info");
        }
    },

    /**
     * Step 6: Render Export & Final Statistics View.
     */
    renderExportAndStatsView: function() {
        const diag = this.state.generatedPaper?.diagnostics;
        if (!diag) return;

        document.getElementById('stat-total-questions').textContent = diag.totalQuestions;
        document.getElementById('stat-total-marks').textContent = `${diag.totalMarks} Marks`;
        document.getElementById('stat-coverage').textContent = `${diag.syllabusCoveragePercent}%`;
        document.getElementById('stat-duplicates').textContent = diag.duplicateWarnings.length;
    },

    // Export Triggers
    exportPdf: function() {
        window.ExportEngine.printPaper();
    },
    exportDocx: function() {
        if (this.state.generatedPaper && this.state.paperConfig) {
            window.ExportEngine.downloadDocx(this.state.paperConfig, this.state.generatedPaper.sections);
        }
    },
    exportQuestionBankCsv: function() {
        if (this.state.questionBank) {
            window.ExportEngine.exportBankCsv(this.state.questionBank);
        }
    },
    saveProjectBundle: function() {
        const name = prompt("Enter project name:", this.state.syllabus?.subject || "Examination Paper Project");
        if (name) {
            window.StorageManager.saveProject(name, this.state);
            window.ExportEngine.exportProjectJson(this.state);
            this.showNotification("Project saved and downloaded successfully!", "success");
        }
    },

    /**
     * UI Notification Toast Helper.
     */
    showNotification: function(msg, type = "info") {
        const container = document.getElementById('notification-toast-container');
        if (!container) return;

        const bgClass = type === 'error' ? 'bg-red-600 text-white' : (type === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white');

        const toast = document.createElement('div');
        toast.className = `px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all transform duration-300 ${bgClass}`;
        toast.textContent = msg;

        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
};

// Initialize Application when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
});
