import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Exports an HTML element as a downloadable PDF.
 * @param {string} elementId - The element's ID to capture.
 * @param {string} filename - Filename without extension.
 */
export const downloadPDF = async (elementId, filename) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`[downloadPDF] Element #${elementId} not found.`);
        return;
    }
    try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${filename}.pdf`);
    } catch (err) {
        console.error('[downloadPDF] Failed:', err);
    }
};

/**
 * Downloads text content as a .txt file.
 * @param {string} content - Text to download.
 * @param {string} filename - Filename with extension.
 */
export const downloadTextFile = (content, filename) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Copies text to clipboard. Returns true on success, false on failure.
 * Uses the modern Clipboard API — no browser alert().
 * @param {string} text - Text to copy.
 * @returns {Promise<boolean>}
 */
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for HTTP environments
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return true;
        } catch {
            console.error('[copyToClipboard] All methods failed:', err);
            return false;
        }
    }
};

/**
 * Builds a Google search URL for a free course.
 * @param {string} title - Course topic.
 * @param {string} platform - Preferred platform.
 * @returns {string} URL string.
 */
export const getCourseLink = (title, platform) => {
    const query = encodeURIComponent(`${title} free course ${platform || ''}`);
    return `https://www.google.com/search?q=${query}`;
};

/**
 * Returns an array of job board deep links for a given role and location.
 * @param {string} role - Target job title.
 * @param {string} location - City or country.
 * @returns {Array<{platform, url, color, icon}>}
 */
export const getJobLinks = (role, location) => {
    const safeRole = role || 'Software Engineer';
    const safeLocation = location || 'India';

    const q = encodeURIComponent(safeRole);
    const l = encodeURIComponent(safeLocation);
    const qDash = safeRole.trim().replace(/\s+/g, '-').toLowerCase();
    const lDash = safeLocation.trim().replace(/\s+/g, '-').toLowerCase();

    return [
        {
            platform: 'Naukri',
            url: `https://www.naukri.com/${qDash}-jobs-in-${lDash}`,
            color: 'blue',
            icon: 'Search'
        },
        {
            platform: 'LinkedIn',
            url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`,
            color: 'indigo',
            icon: 'Linkedin'
        },
        {
            platform: 'Indeed',
            url: `https://in.indeed.com/jobs?q=${q}&l=${l}`,
            color: 'emerald',
            icon: 'Search'
        },
        {
            platform: 'Internshala',
            url: `https://internshala.com/jobs/${qDash}-jobs-in-${lDash}`,
            color: 'purple',
            icon: 'Search'
        }
    ];
};

