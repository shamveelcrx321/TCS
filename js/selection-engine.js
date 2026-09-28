/**
 * AI Question Paper Generator - Intelligent Selection Engine
 * Selects questions from Question Bank to construct paper, handles topic balance,
 * syllabus coverage calculation, and duplicate detection.
 */

window.SelectionEngine = {
    /**
     * Generate complete paper by picking optimal questions from question bank.
     * @param {Array<Object>} questionBank 
     * @param {Object} paperConfig 
     * @param {Object} syllabus 
     * @returns {{sections: Array<Object>, diagnostics: Object}}
     */
    generatePaper: function(questionBank, paperConfig, syllabus) {
        if (!questionBank || questionBank.length === 0) {
            throw new Error("Question Bank is empty! Please generate questions first.");
        }

        const validation = window.PaperConfigurator.validateConfig(paperConfig);
        if (!validation.valid) {
            throw new Error(validation.errors.join("\n"));
        }

        const selectedQuestionIds = new Set();
        const paperSections = [];

        paperConfig.sections.forEach(secConfig => {
            const secQuestions = [];
            const neededCount = secConfig.totalQuestions;

            // Filter available pool for this section
            const candidatePool = questionBank.filter(q => {
                if (selectedQuestionIds.has(q.id)) return false;

                // Difficulty check (prefer section target difficulty, but allow fallback if pool is tight)
                // Module filter
                if (secConfig.allowedModules && secConfig.allowedModules.length > 0) {
                    if (!secConfig.allowedModules.includes(q.module)) return false;
                }

                return true;
            });

            // Score and sort candidates
            candidatePool.sort((a, b) => {
                // Match exact section target difficulty first
                const aDiffMatch = a.difficulty === secConfig.targetDifficulty ? 2 : 0;
                const bDiffMatch = b.difficulty === secConfig.targetDifficulty ? 2 : 0;
                
                // Match allowed types
                const aTypeMatch = secConfig.allowedTypes.includes(a.type) ? 1 : 0;
                const bTypeMatch = secConfig.allowedTypes.includes(b.type) ? 1 : 0;

                return (bDiffMatch + bTypeMatch) - (aDiffMatch + aTypeMatch);
            });

            // Pick top candidates ensuring module diversity
            const moduleTracker = {};
            for (let q of candidatePool) {
                if (secQuestions.length >= neededCount) break;

                const modCount = moduleTracker[q.module] || 0;
                // Avoid over-concentrating more than 3 questions per module per section unless necessary
                if (modCount >= 3 && candidatePool.length > neededCount * 1.5) continue;

                const paperQ = {
                    ...q,
                    marks: secConfig.marksPerQuestion // Override mark for section uniformity
                };

                secQuestions.push(paperQ);
                selectedQuestionIds.add(q.id);
                moduleTracker[q.module] = modCount + 1;
            }

            // Fallback if not enough matching questions found
            if (secQuestions.length < neededCount) {
                const remaining = questionBank.filter(q => !selectedQuestionIds.has(q.id));
                for (let q of remaining) {
                    if (secQuestions.length >= neededCount) break;
                    secQuestions.push({ ...q, marks: secConfig.marksPerQuestion });
                    selectedQuestionIds.add(q.id);
                }
            }

            paperSections.push({
                ...secConfig,
                questions: secQuestions
            });
        });

        // Diagnostics calculation
        const diagnostics = this.analyzePaperDiagnostics(paperSections, syllabus);

        return {
            sections: paperSections,
            diagnostics: diagnostics
        };
    },

    /**
     * Analyze paper diagnostics (Difficulty distribution, Syllabus coverage, Similarity detection).
     */
    analyzePaperDiagnostics: function(paperSections, syllabus) {
        let totalQuestions = 0;
        let totalMarks = 0;
        let begCount = 0, intCount = 0, advCount = 0;
        const moduleMarks = {};
        const topicCoverageSet = new Set();
        const allPaperQuestions = [];

        paperSections.forEach(sec => {
            const secToAns = sec.questionsToAnswer;
            const marksEach = sec.marksPerQuestion;
            totalMarks += (secToAns * marksEach);

            sec.questions.forEach(q => {
                totalQuestions++;
                allPaperQuestions.push(q);
                topicCoverageSet.add(q.topic);

                if (q.difficulty === "Beginner") begCount++;
                else if (q.difficulty === "Intermediate") intCount++;
                else if (q.difficulty === "Advanced") advCount++;

                moduleMarks[q.module] = (moduleMarks[q.module] || 0) + marksEach;
            });
        });

        // Calculate total topics in syllabus
        let totalSyllabusTopics = 0;
        if (syllabus && syllabus.modules) {
            syllabus.modules.forEach(m => {
                totalSyllabusTopics += m.topics.length;
            });
        }
        const coveragePercent = totalSyllabusTopics > 0 
            ? Math.round((topicCoverageSet.size / totalSyllabusTopics) * 100) 
            : 100;

        // Similarity / Duplicate Detection (Jaccard similarity algorithm)
        const duplicates = [];
        for (let i = 0; i < allPaperQuestions.length; i++) {
            for (let j = i + 1; j < allPaperQuestions.length; j++) {
                const q1 = allPaperQuestions[i];
                const q2 = allPaperQuestions[j];
                const similarity = this.calculateTextSimilarity(q1.question, q2.question);
                
                if (similarity > 0.65) { // 65% similarity threshold
                    duplicates.push({
                        q1Id: q1.id,
                        q1Num: i + 1,
                        q2Id: q2.id,
                        q2Num: j + 1,
                        similarityPercent: Math.round(similarity * 100),
                        q1Text: q1.question,
                        q2Text: q2.question
                    });
                }
            }
        }

        const denom = totalQuestions > 0 ? totalQuestions : 1;

        return {
            totalQuestions,
            totalMarks,
            difficultyDistribution: {
                beginner: Math.round((begCount / denom) * 100),
                intermediate: Math.round((intCount / denom) * 100),
                advanced: Math.round((advCount / denom) * 100)
            },
            moduleBreakdown: moduleMarks,
            syllabusCoveragePercent: coveragePercent,
            duplicateWarnings: duplicates
        };
    },

    /**
     * Calculate word-level Jaccard similarity index between two question texts.
     */
    calculateTextSimilarity: function(text1, text2) {
        const words1 = new Set(text1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3));
        const words2 = new Set(text2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3));

        if (words1.size === 0 || words2.size === 0) return 0;

        let intersection = 0;
        words1.forEach(w => {
            if (words2.has(w)) intersection++;
        });

        const union = words1.size + words2.size - intersection;
        return union > 0 ? intersection / union : 0;
    }
};
