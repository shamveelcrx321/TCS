/**
 * AI Question Paper Generator - Question Generator Module
 * Generates high-quality question banks at 3 difficulty levels (Beginner, Intermediate, Advanced)
 * for all confirmed syllabus topics using Gemini API or Smart Fallback Engine.
 */

window.QuestionGenerator = {
    /**
     * Generate full Question Bank from syllabus modules.
     * @param {Object} syllabus 
     * @param {Object} settings 
     * @param {string} apiKey 
     * @param {Function} progressCb 
     * @returns {Promise<Array<Object>>}
     */
    generateBank: async function(syllabus, settings, apiKey = '', progressCb = null) {
        const questionBank = [];
        const selectedTopics = [];

        syllabus.modules.forEach(mod => {
            mod.topics.filter(t => t.selected).forEach(top => {
                selectedTopics.push({ module: mod, topic: top });
            });
        });

        if (selectedTopics.length === 0) {
            throw new Error("No topics selected! Please select at least one topic in the syllabus tree.");
        }

        const totalSteps = selectedTopics.length;

        for (let idx = 0; idx < selectedTopics.length; idx++) {
            const item = selectedTopics[idx];
            if (progressCb) {
                const percent = Math.round(((idx + 1) / totalSteps) * 100);
                progressCb(percent, `Generating questions for topic (${idx + 1}/${totalSteps}): "${item.topic.name}"...`);
            }

            let topicQuestions = [];

            if (apiKey && apiKey.trim().length > 10) {
                try {
                    topicQuestions = await this.generateWithGemini(item.module, item.topic, settings, apiKey.trim());
                } catch (err) {
                    console.warn(`Gemini generation failed for ${item.topic.name}, using local engine:`, err);
                    topicQuestions = this.generateLocally(item.module, item.topic, settings, syllabus.subject);
                }
            } else {
                topicQuestions = this.generateLocally(item.module, item.topic, settings, syllabus.subject);
            }

            questionBank.push(...topicQuestions);
        }

        if (progressCb) progressCb(100, "Question Bank Generation Complete!");

        return questionBank;
    },

    /**
     * Generate questions for a single topic using Gemini API.
     */
    generateWithGemini: async function(module, topic, settings, apiKey) {
        const prompt = `You are a university professor setting an exam for "${topic.name}" under "${module.name}".
Generate a JSON array of high quality examination questions.

Requirements:
1. Beginner questions count: ${settings.beginnerCount || 3} (Tests definitions, fundamental concepts, basic terminology, simple 2-mark short questions).
2. Intermediate questions count: ${settings.intermediateCount || 3} (Tests applications, comparisons, working principles, short algorithms, 5-6 mark questions).
3. Advanced questions count: ${settings.advancedCount || 2} (Tests deep analysis, complex problem solving, design, multi-step proofs, 10-mark long questions).
4. Question Types allowed: ${settings.questionTypes ? settings.questionTypes.join(', ') : 'Short answer, Long answer, MCQ, Numerical, Problem-solving, Programming question, Algorithm'}.
5. Language: ${settings.language || 'English'}.
6. Strict Syllabus Mode: ${settings.strictMode ? 'YES (Strictly adhere to topic name and terms)' : 'NO'}.

Return ONLY a JSON Array containing objects with schema:
[
  {
    "id": "Q-TOPIC-1",
    "question": "Question text here",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."], // Optional, only if type is MCQ
    "module": "${module.name}",
    "topic": "${topic.name}",
    "difficulty": "Beginner | Intermediate | Advanced",
    "type": "Short answer | Long answer | MCQ | Numerical | Problem-solving | Programming question | Algorithm | Conceptual | Case study",
    "marks": 2,
    "expectedTime": "5 mins",
    "tags": ["Tag1", "Tag2"],
    "answerHint": "Brief key points or expected answer outline"
  }
]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());

        return parsed.map((q, idx) => ({
            ...q,
            id: q.id || `Q-${topic.id}-${idx + 1}`,
            module: module.name,
            topic: topic.name
        }));
    },

    /**
     * High Quality Standalone Rule-Based Local Generator Engine.
     */
    generateLocally: function(module, topic, settings, subjectName) {
        const questions = [];
        const tName = topic.name;
        const sub = topic.subtopics ? topic.subtopics.join(", ") : "core principles";

        // 1. Beginner Questions
        const bCount = settings.beginnerCount || 3;
        const beginnerTemplates = [
            {
                q: `Define ${tName}. State its primary characteristics and list two practical applications.`,
                type: "Short answer",
                marks: 2,
                time: "4 mins",
                hint: "Provide standard definition, key properties, and real-world usage."
            },
            {
                q: `What is the significance of ${sub} in the context of ${tName}?`,
                type: "Conceptual",
                marks: 2,
                time: "5 mins",
                hint: "Explain the fundamental purpose and role in system architecture."
            },
            {
                q: `Which of the following best describes the core operation of ${tName}?`,
                type: "MCQ",
                marks: 2,
                time: "2 mins",
                options: [
                    `A) Standard linear execution involving ${sub}`,
                    `B) Iterative evaluation with logarithmic upper bound`,
                    `C) Non-linear hierarchical state transition`,
                    `D) Asynchronous event-driven callback processing`
                ],
                hint: "Option A is the correct standard fundamental definition."
            },
            {
                q: `Differentiate between primitive concepts and ${tName}. Give suitable examples.`,
                type: "Short answer",
                marks: 2,
                time: "5 mins",
                hint: "Highlight key differences in memory, structural complexity, and operations."
            }
        ];

        for (let i = 0; i < Math.min(bCount, beginnerTemplates.length); i++) {
            const tmpl = beginnerTemplates[i];
            questions.push({
                id: `Q-BEG-${topic.id}-${i + 1}`,
                question: tmpl.q,
                options: tmpl.options || null,
                module: module.name,
                topic: topic.name,
                difficulty: "Beginner",
                type: tmpl.type,
                marks: tmpl.marks,
                expectedTime: tmpl.time,
                tags: [tName, "Beginner", tmpl.type],
                answerHint: tmpl.hint
            });
        }

        // 2. Intermediate Questions
        const iCount = settings.intermediateCount || 3;
        const intermediateTemplates = [
            {
                q: `Explain the working principle of ${tName} with a neat block diagram or flowchart. Analyze its step-by-step execution for ${sub}.`,
                type: "Long answer",
                marks: 5,
                time: "10 mins",
                hint: "Draw architecture diagram, explain stages 1-4, and trace execution."
            },
            {
                q: `Construct an algorithm or code implementation for ${tName}. Trace the output for a sample input dataset.`,
                type: settings.includeProgramming ? "Programming question" : "Algorithm",
                marks: 6,
                time: "12 mins",
                hint: "Provide complete syntactically correct function with boundary condition checks."
            },
            {
                q: `Compare and contrast ${tName} with alternative mechanisms in terms of time complexity, space overhead, and execution efficiency.`,
                type: "Problem-solving",
                marks: 5,
                time: "10 mins",
                hint: "Create a tabular comparison covering Best/Average/Worst cases."
            },
            {
                q: `Solve the following numerical problem: Given a system parameter set for ${tName}, compute the total overhead and efficiency percentage when processing ${sub}.`,
                type: "Numerical",
                marks: 6,
                time: "12 mins",
                hint: "Substitute values into theoretical formula, calculate step-by-step with units."
            }
        ];

        for (let i = 0; i < Math.min(iCount, intermediateTemplates.length); i++) {
            const tmpl = intermediateTemplates[i];
            if (tmpl.type === "Numerical" && !settings.includeNumerical) continue;
            if (tmpl.type === "Programming question" && !settings.includeProgramming) tmpl.type = "Algorithm";

            questions.push({
                id: `Q-INT-${topic.id}-${i + 1}`,
                question: tmpl.q,
                options: null,
                module: module.name,
                topic: topic.name,
                difficulty: "Intermediate",
                type: tmpl.type,
                marks: tmpl.marks,
                expectedTime: tmpl.time,
                tags: [tName, "Intermediate", tmpl.type],
                answerHint: tmpl.hint
            });
        }

        // 3. Advanced Questions
        const aCount = settings.advancedCount || 2;
        const advancedTemplates = [
            {
                q: `Design an optimal architecture integrating ${tName} to solve high-concurrency throughput bottlenecks in ${sub}. Prove its asymptotic worst-case bounds mathematically.`,
                type: "Problem-solving",
                marks: 10,
                time: "20 mins",
                hint: "System design diagram, mathematical proof of Big-O complexity, corner case handling."
            },
            {
                q: `Case Study: An enterprise application experiences catastrophic performance degradation due to un-optimized ${tName}. Analyze the root causes, propose a multi-tiered refactoring strategy, and demonstrate the quantitative improvement.`,
                type: "Case study",
                marks: 10,
                time: "22 mins",
                hint: "Identify bottlenecks, propose concrete modifications, present theoretical metrics comparison."
            },
            {
                q: `Formulate a comprehensive mathematical model for ${tName}. Derive the closed-form recurrence relation under skewed distribution conditions.`,
                type: "Numerical",
                marks: 10,
                time: "20 mins",
                hint: "Derive summation bounds, solve recurrence relation, state edge constraints."
            }
        ];

        for (let i = 0; i < Math.min(aCount, advancedTemplates.length); i++) {
            const tmpl = advancedTemplates[i];
            if (tmpl.type === "Numerical" && !settings.includeNumerical) continue;

            questions.push({
                id: `Q-ADV-${topic.id}-${i + 1}`,
                question: tmpl.q,
                options: null,
                module: module.name,
                topic: topic.name,
                difficulty: "Advanced",
                type: tmpl.type,
                marks: tmpl.marks,
                expectedTime: tmpl.time,
                tags: [tName, "Advanced", tmpl.type],
                answerHint: tmpl.hint
            });
        }

        return questions;
    }
};
