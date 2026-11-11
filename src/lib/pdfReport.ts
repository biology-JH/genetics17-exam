import type { GradeResult } from '../types';

function pdfSafeText(value: string): string {
  const replacements: Record<string, string> = {
    '→': ' -> ', '←': ' <- ', '×': ' x ', '÷': '/', '≤': '<=', '≥': '>=',
    '−': '-', '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"',
    '½': '1/2', '¼': '1/4', '¾': '3/4', '²': '^2', '³': '^3', '°': ' degrees ',
  };
  return value.replace(/[→←×÷≤≥−–—’‘“”½¼¾²³°]/g, (character) => replacements[character] ?? character)
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .replace(/[\t ]+/g, ' ')
    .trim();
}

export async function downloadGradedReport(studentName: string, result: GradeResult): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const document = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let cursor = 54;

  function ensureSpace(height: number): void {
    if (cursor + height <= pageHeight - margin) return;
    document.addPage();
    cursor = margin;
  }

  function line(text: string, size = 10, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [35, 53, 48], after = 8): void {
    document.setFont('helvetica', style);
    document.setFontSize(size);
    document.setTextColor(...color);
    const rows = document.splitTextToSize(pdfSafeText(text || ' '), contentWidth) as string[];
    const lineHeight = size * 1.45;
    ensureSpace(rows.length * lineHeight + after);
    document.text(rows, margin, cursor);
    cursor += rows.length * lineHeight + after;
  }

  function divider(): void {
    ensureSpace(18);
    document.setDrawColor(204, 216, 209);
    document.setLineWidth(.8);
    document.line(margin, cursor, pageWidth - margin, cursor);
    cursor += 18;
  }

  line('GENETICS / 17', 9, 'bold', [15, 119, 112], 7);
  line('Graded examination report', 24, 'normal', [21, 37, 34], 18);
  line(`Student Name: ${studentName.trim() || 'Not provided'}`, 11, 'bold', [35, 53, 48], 7);
  line(`Date: ${new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date())}`, 10, 'normal', [101, 115, 111], 16);
  line(`Total Score: ${result.score} / ${result.max_score}`, 15, 'bold', [15, 95, 90], 6);
  line(`Percentage: ${result.percentage}%    Estimated Grade Band: ${result.grade_band}`, 11, 'bold', [15, 95, 90], 5);
  line('The grade band is an indicative estimate, not an official Cambridge grade boundary. Corrections below are slide-derived study guidance, not an official Cambridge mark scheme.', 9, 'normal', [101, 115, 111], 16);
  divider();
  line('Incorrect answers — in exam order', 16, 'bold', [21, 37, 34], 12);

  if (result.incorrect_items.length === 0) {
    line('No incorrect items were recorded.', 11, 'normal', [15, 95, 90], 8);
  } else {
    for (const item of result.incorrect_items) {
      const slideList = item.source_slides.length ? item.source_slides.join(', ') : 'not recorded';
      line(`${item.question_id}  |  ${item.level}  |  ${item.earned} / ${item.available} marks  |  Source slides: ${slideList}`, 11, 'bold', [21, 37, 34], 7);
      for (const part of item.parts) {
        line(`Part ${part.part_id} — ${part.earned} / ${part.available}`, 9, 'bold', [15, 119, 112], 4);
        line(`Your answer: ${part.response.trim() || 'No response'}`, 9, 'normal', [75, 90, 84], 4);
        line(`Suggested answer: ${part.model_answer || 'Review the slide-grounded correction below.'}`, 9, 'normal', [75, 90, 84], 7);
      }
      line(`Correction: ${item.correction}`, 10, 'normal', [35, 53, 48], 6);
      line(`Syllabus guidance: ${item.syllabus_guidance}`, 10, 'normal', [35, 53, 48], 10);
      divider();
    }
  }

  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.setTextColor(123, 137, 132);
    document.text(`Chapter 17 Genetics  ·  ${page} / ${pages}`, pageWidth - margin, pageHeight - 22, { align: 'right' });
  }
  const safeName = studentName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.save(`genetics17-graded-report-${safeName || 'student'}.pdf`);
}
