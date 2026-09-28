/**
 * AI Question Paper Generator - Export & Document Engine
 * Generates PDF, DOCX, CSV, JSON project files and handles browser print formatting.
 */

window.ExportEngine = {
    /**
     * Trigger Browser Native Print with A4 Paper CSS rules.
     */
    printPaper: function() {
        window.print();
    },

    /**
     * Download Question Paper as formatted DOCX file (compatible with MS Word / LibreOffice).
     * @param {Object} paperConfig 
     * @param {Array<Object>} sections 
     */
    downloadDocx: function(paperConfig, sections) {
        const meta = paperConfig.metadata;
        
        let htmlDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>${meta.subject} - Question Paper</title>
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .upper { text-transform: uppercase; }
                .header-title { font-size: 16pt; font-weight: bold; text-align: center; }
                .header-sub { font-size: 13pt; font-weight: bold; text-align: center; }
                .header-meta { font-size: 11pt; font-weight: bold; text-align: center; margin-bottom: 15px; }
                .flex-meta { width: 100%; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 15px; }
                .sec-title { text-align: center; font-size: 12pt; font-weight: bold; margin-top: 20px; border-top: 1px dashed #666; padding-top: 10px; }
                .sec-inst { text-align: center; font-style: italic; font-size: 10pt; margin-bottom: 10px; }
                table.q-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                td.q-num { width: 35px; vertical-align: top; font-weight: bold; }
                td.q-text { vertical-align: top; text-align: justify; }
                td.q-marks { width: 50px; vertical-align: top; text-align: right; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header-title">${meta.institution}</div>
            <div class="header-sub">${meta.department}</div>
            <div class="header-sub">${meta.examTitle} - ${meta.academicYear}</div>
            <div class="header-meta">
                Course: ${meta.courseName} | Subject: ${meta.subject} (${meta.courseCode})<br>
                Semester: ${meta.semester} | Date: ${meta.date}
            </div>
            
            <table class="flex-meta">
                <tr>
                    <td align="left"><b>Duration:</b> ${meta.duration}</td>
                    <td align="right"><b>Maximum Marks:</b> ${meta.totalMarks}</td>
                </tr>
            </table>
        `;

        let questionCounter = 1;

        sections.forEach(sec => {
            htmlDoc += `
                <div class="sec-title">${sec.name}</div>
                <div class="sec-inst">${sec.instructions}</div>
                <table class="q-table">
            `;

            sec.questions.forEach(q => {
                let optionsHtml = '';
                if (q.type === 'MCQ' && q.options) {
                    optionsHtml = `<div style="margin-top: 4px; font-size: 10pt;">${q.options.join('&nbsp;&nbsp;&nbsp;&nbsp;')}</div>`;
                }

                htmlDoc += `
                    <tr>
                        <td class="q-num">${questionCounter}.</td>
                        <td class="q-text">${q.question}${optionsHtml}</td>
                        <td class="q-marks">[${q.marks}]</td>
                    </tr>
                `;
                questionCounter++;
            });

            htmlDoc += `</table>`;
        });

        htmlDoc += `</body></html>`;

        const blob = new Blob(['\ufeff', htmlDoc], {
            type: 'application/msword'
        });

        const fileName = `${meta.courseCode || 'EXAM'}_Question_Paper.doc`;
        this.triggerDownload(blob, fileName);
    },

    /**
     * Export Question Bank as CSV File.
     * @param {Array<Object>} questionBank 
     */
    exportBankCsv: function(questionBank) {
        let csvContent = "ID,Module,Topic,Difficulty,Type,Marks,ExpectedTime,Question\n";

        questionBank.forEach(q => {
            const escapedQ = `"${(q.question || '').replace(/"/g, '""')}"`;
            const row = [
                q.id,
                `"${q.module}"`,
                `"${q.topic}"`,
                q.difficulty,
                q.type,
                q.marks,
                q.expectedTime || '',
                escapedQ
            ].join(',');
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        this.triggerDownload(blob, 'Question_Bank_Export.csv');
    },

    /**
     * Download Project State Bundle as JSON File.
     * @param {Object} projectData 
     */
    exportProjectJson: function(projectData) {
        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const subject = projectData.syllabus?.subject || 'Exam';
        const fileName = `${subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_project.json`;
        this.triggerDownload(blob, fileName);
    },

    /**
     * Utility helper to trigger browser download.
     */
    triggerDownload: function(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
