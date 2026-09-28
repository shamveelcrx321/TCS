/**
 * AI Question Paper Generator - Paper Configurator & Validation Module
 * Manages paper metadata, custom section rules, and strict mathematical validation.
 */

window.PaperConfigurator = {
    /**
     * Create default configuration structure.
     * @param {Object} syllabus 
     * @returns {Object}
     */
    getDefaultConfig: function(syllabus = {}) {
        return {
            metadata: {
                institution: syllabus.institution || "NATIONAL INSTITUTE OF TECHNOLOGY",
                department: syllabus.department || "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING",
                courseName: syllabus.courseName || "B.Tech Examination",
                subject: syllabus.subject || "Data Structures and Algorithms",
                courseCode: syllabus.courseCode || "CST302",
                semester: syllabus.semester || "Semester III",
                examTitle: "End-Semester Examination",
                academicYear: "2026-2027",
                date: "15-11-2026",
                duration: syllabus.duration || "3 Hours",
                totalMarks: syllabus.totalMarks || 100,
                instructions: [
                    "Answer all questions in Part A. Answer any 5 questions each from Part B and Part C.",
                    "Neat diagrams and syntactically correct code snippets should be drawn where necessary.",
                    "Assume suitable missing data if any and state your assumptions clearly."
                ]
            },
            targetDifficulty: {
                beginner: 30,      // 30%
                intermediate: 50,  // 50%
                advanced: 20       // 20%
            },
            sections: [
                {
                    id: "sec-a",
                    name: "PART A",
                    instructions: "Answer ALL questions. Each question carries 2 marks.",
                    totalQuestions: 10,
                    questionsToAnswer: 10,
                    marksPerQuestion: 2,
                    targetDifficulty: "Beginner",
                    allowedTypes: ["Short answer", "MCQ", "Conceptual"],
                    allowedModules: [] // Empty means all modules
                },
                {
                    id: "sec-b",
                    name: "PART B",
                    instructions: "Answer ANY FIVE questions. Each question carries 6 marks.",
                    totalQuestions: 7,
                    questionsToAnswer: 5,
                    marksPerQuestion: 6,
                    targetDifficulty: "Intermediate",
                    allowedTypes: ["Long answer", "Problem-solving", "Algorithm", "Numerical"],
                    allowedModules: []
                },
                {
                    id: "sec-c",
                    name: "PART C",
                    instructions: "Answer ANY FIVE questions. Each question carries 10 marks.",
                    totalQuestions: 7,
                    questionsToAnswer: 5,
                    marksPerQuestion: 10,
                    targetDifficulty: "Advanced",
                    allowedTypes: ["Long answer", "Problem-solving", "Programming question", "Case study", "Numerical"],
                    allowedModules: []
                }
            ]
        };
    },

    /**
     * Perform strict mathematical validation on configuration.
     * @param {Object} config 
     * @returns {{valid: boolean, calculatedMarks: number, totalMarks: number, warnings: Array<string>, errors: Array<string>}}
     */
    validateConfig: function(config) {
        const errors = [];
        const warnings = [];

        const targetMarks = Number(config.metadata.totalMarks) || 100;
        let calculatedMarks = 0;
        let calculatedTotalQuestions = 0;

        if (!config.sections || config.sections.length === 0) {
            errors.push("At least one paper section must be defined.");
            return { valid: false, calculatedMarks: 0, totalMarks: targetMarks, warnings, errors };
        }

        config.sections.forEach((sec, idx) => {
            const secName = sec.name || `Section ${idx + 1}`;
            const toAns = Number(sec.questionsToAnswer) || 0;
            const totalQ = Number(sec.totalQuestions) || 0;
            const marksEach = Number(sec.marksPerQuestion) || 0;

            if (toAns > totalQ) {
                errors.push(`[${secName}] Questions to answer (${toAns}) cannot exceed total section questions (${totalQ}).`);
            }

            if (totalQ <= 0 || marksEach <= 0) {
                errors.push(`[${secName}] Questions count and marks per question must be greater than zero.`);
            }

            const sectionTotalMarks = toAns * marksEach;
            calculatedMarks += sectionTotalMarks;
            calculatedTotalQuestions += totalQ;
        });

        // Difficulty percentages check
        const diffSum = Number(config.targetDifficulty.beginner) + Number(config.targetDifficulty.intermediate) + Number(config.targetDifficulty.advanced);
        if (Math.abs(diffSum - 100) > 0.1) {
            warnings.push(`Target difficulty percentages sum up to ${diffSum}%, expected 100%.`);
        }

        // Mathematical marks equality check
        if (calculatedMarks !== targetMarks) {
            errors.push(`Mathematical Discrepancy Detected: Your configured section structure produces ${calculatedMarks} marks (based on choice rules), but requested paper total marks is ${targetMarks} marks. Please adjust marks per question or choice count.`);
        }

        return {
            valid: errors.length === 0,
            calculatedMarks,
            totalMarks: targetMarks,
            calculatedTotalQuestions,
            warnings,
            errors
        };
    }
};
