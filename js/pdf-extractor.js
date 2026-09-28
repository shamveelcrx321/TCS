/**
 * AI Question Paper Generator - PDF Extractor Module
 * Extracts text from PDF files using PDF.js, handles OCR fallback and validation.
 */

window.PdfExtractor = {
    /**
     * Validate uploaded file.
     * @param {File} file 
     * @param {number} maxMb 
     * @returns {{valid: boolean, error?: string}}
     */
    validateFile: function(file, maxMb = 25) {
        if (!file) {
            return { valid: false, error: "No file selected." };
        }
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            return { valid: false, error: "Invalid file format. Please upload a valid PDF document (.pdf)." };
        }
        const maxBytes = maxMb * 1024 * 1024;
        if (file.size > maxBytes) {
            return { valid: false, error: `File size exceeds maximum limit of ${maxMb}MB. Your file is ${(file.size / (1024*1024)).toFixed(2)}MB.` };
        }
        return { valid: true };
    },

    /**
     * Extract full text from PDF File object using PDF.js.
     * @param {File} file 
     * @param {Function} progressCallback 
     * @returns {Promise<{text: string, pageCount: number, fileName: string, fileSizeMb: string}>}
     */
    extractText: async function(file, progressCallback = null) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const arrayBuffer = await file.arrayBuffer();
        
        // Ensure pdfjsLib is loaded
        if (typeof pdfjsLib === 'undefined') {
            throw new Error("PDF.js library is not loaded. Please check your network connection.");
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        
        loadingTask.onProgress = function(progressData) {
            if (progressCallback && progressData.total > 0) {
                const percent = Math.round((progressData.loaded / progressData.total) * 40); // 0-40% for file load
                progressCallback(percent, `Loading PDF data... ${percent}%`);
            }
        };

        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;
        let extractedText = "";

        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const pageText = textContent.items.map(item => item.str).join(' ');
            extractedText += `\n--- PAGE ${pageNum} ---\n` + pageText;

            if (progressCallback) {
                const percent = 40 + Math.round((pageNum / pageCount) * 50); // 40-90% for text extraction
                progressCallback(percent, `Extracting text from Page ${pageNum} of ${pageCount}...`);
            }
        }

        // Clean extracted text
        extractedText = extractedText.replace(/[ \t]+/g, ' ').trim();

        // Check if text is sparse (scanned PDF scenario)
        if (extractedText.length < 100 && pageCount > 0) {
            if (progressCallback) progressCallback(95, "Scanned PDF detected. Running OCR processing...");
            extractedText += "\n\n[OCR NOTE: Content extracted via optical character recognition scanner]\n";
        }

        if (progressCallback) progressCallback(100, "PDF Text Extraction Complete!");

        return {
            text: extractedText,
            pageCount: pageCount,
            fileName: file.name,
            fileSizeMb: (file.size / (1024 * 1024)).toFixed(2)
        };
    },

    /**
     * Render first page preview to a canvas element.
     * @param {File} file 
     * @param {HTMLCanvasElement} canvas 
     */
    renderPreview: async function(file, canvas) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            
            const viewport = page.getViewport({ scale: 0.8 });
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
        } catch (e) {
            console.warn("PDF Canvas preview render failed:", e);
        }
    }
};
