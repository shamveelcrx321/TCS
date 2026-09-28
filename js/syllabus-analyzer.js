/**
 * AI Question Paper Generator - Syllabus Analyzer Module
 * Analyzes syllabus text, extracts structure (Modules, Topics, Concepts),
 * categorizes topics, and integrates with Gemini API or smart local parser fallback.
 */

window.SyllabusAnalyzer = {
    /**
     * Main analysis method.
     * @param {string} rawText 
     * @param {string} apiKey 
     * @param {Function} progressCb 
     * @returns {Promise<Object>}
     */
    analyze: async function(rawText, apiKey = '', progressCb = null) {
        if (progressCb) progressCb(10, "Identifying subject metadata & examination structure...");

        // Check if user provided Gemini API Key
        if (apiKey && apiKey.trim().length > 10) {
            try {
                if (progressCb) progressCb(30, "Calling Gemini AI for deep syllabus structure extraction...");
                return await this.analyzeWithGemini(rawText, apiKey.trim(), progressCb);
            } catch (err) {
                console.warn("Gemini API call failed, falling back to intelligent local analyzer:", err);
                if (progressCb) progressCb(50, "Switching to high-accuracy local parser...");
            }
        }

        // Fallback / Standalone Intelligent Local Analyzer
        return this.analyzeLocally(rawText, progressCb);
    },

    /**
     * Gemini AI API syllabus analyzer.
     */
    analyzeWithGemini: async function(rawText, apiKey, progressCb) {
        const prompt = `You are an expert university curriculum parser. Analyze the following syllabus text and extract a structured JSON response.

Return ONLY a valid JSON object matching this schema (no markdown block wrapper if possible, or inside \`\`\`json):
{
    "subject": "Subject Name",
    "courseCode": "Course Code",
    "department": "Department Name",
    "institution": "Institution / University Name",
    "semester": "Semester info",
    "duration": "Duration (e.g. 3 Hours)",
    "totalMarks": 100,
    "instructions": ["Instruction 1", "Instruction 2"],
    "learningOutcomes": ["Outcome 1", "Outcome 2"],
    "modules": [
        {
            "id": "mod-1",
            "name": "Module 1: Module Name",
            "weightage": 20,
            "topics": [
                {
                    "id": "top-1",
                    "name": "Topic Title",
                    "subtopics": ["Subtopic A", "Subtopic B"],
                    "conceptType": "Conceptual | Algorithmic | Numerical | Problem-Solving | Design | Case-Study",
                    "difficulty": "Beginner | Intermediate | Advanced",
                    "importance": "High | Medium | Low",
                    "selected": true
                }
            ]
        }
    ]
}

Syllabus Text:
${rawText.substring(0, 12000)}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Gemini API Error: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) throw new Error("Empty response from Gemini API");

        if (progressCb) progressCb(90, "Formatting extracted topics and metadata...");

        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());
        return this.normalizeStructure(parsed);
    },

    /**
     * Standalone Intelligent Local Parser.
     */
    analyzeLocally: function(rawText, progressCb) {
        if (progressCb) progressCb(40, "Parsing syllabus headings, units and chapters...");

        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        let subject = "Syllabus Examination Paper";
        let courseCode = "COURSE101";
        let department = "Department of Academics";
        let institution = "UNIVERSITY EXAMINATION BOARD";
        let semester = "Semester I";
        let duration = "3 Hours";
        let totalMarks = 100;
        let instructions = [];
        let learningOutcomes = [];

        // Header detection heuristics
        for (let i = 0; i < Math.min(lines.length, 15); i++) {
            const line = lines[i];
            if (/university|institute|college|school|board/i.test(line) && line.length < 80) {
                institution = line;
            } else if (/department|dept|faculty/i.test(line) && line.length < 80) {
                department = line;
            } else if (/syllabus|course|subject|title/i.test(line) && line.length < 90) {
                subject = line.replace(/syllabus[:\s]*/i, '').trim();
            } else if (/code[:\s]*([A-Z0-9-]+)/i.test(line)) {
                const match = line.match(/code[:\s]*([A-Z0-9-]+)/i);
                if (match) courseCode = match[1];
            }
        }

        if (progressCb) progressCb(70, "Categorizing topics and assigning cognitive difficulty...");

        // Module / Unit regex splitting
        const moduleRegex = /(?:MODULE|UNIT|CHAPTER|PART|SECTION)\s*([0-9IVX]+)[:\-\s]*(.*)/i;
        const modules = [];
        let currentModule = null;

        lines.forEach((line, index) => {
            const modMatch = line.match(moduleRegex);
            if (modMatch || line.toUpperCase().startsWith("MODULE ") || line.toUpperCase().startsWith("UNIT ")) {
                if (currentModule && currentModule.topics.length > 0) {
                    modules.push(currentModule);
                }
                const modNum = modMatch ? modMatch[1] : (modules.length + 1);
                const modTitle = modMatch ? modMatch[2] : line;
                currentModule = {
                    id: `mod-${modules.length + 1}`,
                    name: `Module ${modNum}: ${modTitle || 'General Topics'}`,
                    weightage: 20,
                    topics: []
                };
            } else if (currentModule) {
                // Topic bullet detection
                if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || /^[0-9]+\./.test(line)) {
                    const topicName = line.replace(/^[\-•*\d\.\s]+/, '').trim();
                    if (topicName.length > 4) {
                        const subparts = topicName.split(/[,;:]+/).map(s => s.trim()).filter(s => s.length > 2);
                        const subtopics = subparts.length > 1 ? subparts.slice(1) : ["Fundamentals", "Applications"];
                        
                        // Intelligent concept & difficulty classification
                        let conceptType = "Conceptual";
                        let difficulty = "Beginner";

                        if (/algorithm|sort|search|tree|graph|process|implementation/i.test(topicName)) {
                            conceptType = "Algorithmic";
                            difficulty = "Intermediate";
                        } else if (/calculate|matrix|equation|derivation|numerical|formula/i.test(topicName)) {
                            conceptType = "Numerical";
                            difficulty = "Advanced";
                        } else if (/design|architecture|analysis|complexity|proof|avl/i.test(topicName)) {
                            conceptType = "Problem-Solving";
                            difficulty = "Advanced";
                        }

                        currentModule.topics.push({
                            id: `top-${currentModule.id}-${currentModule.topics.length + 1}`,
                            name: subparts[0] || topicName,
                            subtopics: subtopics,
                            conceptType: conceptType,
                            difficulty: difficulty,
                            importance: "High",
                            selected: true
                        });
                    }
                }
            } else if (/course outcome|CO[1-9]/i.test(line)) {
                learningOutcomes.push(line);
            } else if (/instruction|pattern|part a|mark/i.test(line)) {
                instructions.push(line);
            }
        });

        if (currentModule && currentModule.topics.length > 0) {
            modules.push(currentModule);
        }

        // Fallback if no modules detected (create default module structure)
        if (modules.length === 0) {
            modules.push({
                id: "mod-1",
                name: "Module 1: General Core Concepts",
                weightage: 100,
                topics: [
                    { id: "top-1-1", name: "Fundamental Definitions & Principles", subtopics: ["Concepts", "Terminology"], conceptType: "Conceptual", difficulty: "Beginner", importance: "High", selected: true },
                    { id: "top-1-2", name: "Core Working Mechanics & Algorithms", subtopics: ["Working", "Application"], conceptType: "Algorithmic", difficulty: "Intermediate", importance: "High", selected: true },
                    { id: "top-1-3", name: "Advanced Analysis & Problem Solving", subtopics: ["Optimization", "Case Study"], conceptType: "Problem-Solving", difficulty: "Advanced", importance: "High", selected: true }
                ]
            });
        }

        // Evenly balance weightage
        const equalWeight = Math.round(100 / modules.length);
        modules.forEach(m => m.weightage = equalWeight);

        if (progressCb) progressCb(100, "Syllabus Analysis Completed!");

        return this.normalizeStructure({
            subject,
            courseCode,
            department,
            institution,
            semester,
            duration,
            totalMarks,
            instructions,
            learningOutcomes,
            modules
        });
    },

    /**
     * Ensure IDs and default flags exist across structure.
     */
    normalizeStructure: function(parsed) {
        if (!parsed.modules || !Array.isArray(parsed.modules)) parsed.modules = [];
        parsed.modules.forEach((mod, mIdx) => {
            mod.id = mod.id || `mod-${mIdx + 1}`;
            mod.weightage = mod.weightage || Math.round(100 / parsed.modules.length);
            if (!mod.topics || !Array.isArray(mod.topics)) mod.topics = [];
            mod.topics.forEach((top, tIdx) => {
                top.id = top.id || `top-${mod.id}-${tIdx + 1}`;
                top.subtopics = top.subtopics || ["Basic Concepts", "Applications"];
                top.conceptType = top.conceptType || "Conceptual";
                top.difficulty = top.difficulty || "Intermediate";
                top.importance = top.importance || "High";
                top.selected = top.selected !== undefined ? top.selected : true;
            });
        });
        return parsed;
    }
};
