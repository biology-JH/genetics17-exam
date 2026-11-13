import type { Answers, ExamPayload, GradeResult, MarkingPointFeedback } from '../types';

interface EmbeddedImage {
  data: string;
  format: 'PNG' | 'JPEG';
  width: number;
  height: number;
}

function pdfSafeText(value: string): string {
  const replacements: Record<string, string> = {
    '→': ' -> ', '←': ' <- ', '×': ' x ', '÷': '/', '≤': '<=', '≥': '>=',
    '−': '-', '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"',
    '½': '1/2', '¼': '1/4', '¾': '3/4', '²': '^2', '³': '^3', '°': ' degrees ',
    'ᴿ': '^R', 'ʳ': '^r', 'ᴬ': '^A', 'ᴮ': '^B', 'ᵒ': '^o', 'ᵂ': '^W', 'ᴺ': '^N', 'ⁿ': '^n',
  };
  return value.replace(/[→←×÷≤≥−–—’‘“”½¼¾²³°ᴿʳᴬᴮᵒᵂᴺⁿ]/g, (character) => replacements[character] ?? character)
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .replace(/[\t ]+/g, ' ')
    .trim();
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The diagram could not be read.'));
    reader.onerror = () => reject(new Error('The diagram could not be read.'));
    reader.readAsDataURL(blob);
  });
}

async function loadEmbeddedImage(url: string): Promise<EmbeddedImage> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'force-cache' });
  if (!response.ok) throw new Error('A source diagram could not be loaded for the PDF. Please retry after refreshing the exam.');
  const blob = await response.blob();
  const data = await readDataUrl(blob);
  const image = new Image();
  image.src = data;
  await image.decode();
  const format = blob.type.toLowerCase().includes('jpeg') || blob.type.toLowerCase().includes('jpg') ? 'JPEG' : 'PNG';
  return { data, format, width: image.naturalWidth, height: image.naturalHeight };
}

function dateLabel(): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date());
}

export async function downloadMarkedScript(studentName: string, exam: ExamPayload, answers: Answers, result: GradeResult): Promise<void> {
  if (result.track !== exam.track) throw new Error('The marked script does not match the selected exam track.');
  const { jsPDF } = await import('jspdf');
  const document = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let cursor = 54;

  function ensureSpace(height: number): void {
    if (cursor + height <= pageHeight - margin) return;
    document.addPage();
    cursor = margin;
  }

  function writeText(text: string, size = 10, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [35, 53, 48], after = 7, indent = 0): void {
    document.setFont('helvetica', style);
    document.setFontSize(size);
    document.setTextColor(...color);
    const rows = document.splitTextToSize(pdfSafeText(text || ' '), contentWidth - indent) as string[];
    const lineHeight = size * 1.42;
    ensureSpace(rows.length * lineHeight + after);
    document.text(rows, margin + indent, cursor);
    cursor += rows.length * lineHeight + after;
  }

  function writeRule(): void {
    ensureSpace(18);
    document.setDrawColor(204, 216, 209);
    document.setLineWidth(.8);
    document.line(margin, cursor, pageWidth - margin, cursor);
    cursor += 17;
  }

  function writeImage(image: EmbeddedImage, alt: string, source: string): void {
    const maxWidth = contentWidth;
    const maxHeight = 245;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    ensureSpace(height + 38);
    document.addImage(image.data, image.format, margin, cursor, width, height, undefined, 'FAST');
    cursor += height + 7;
    writeText(`${alt} · ${source}`, 8.5, 'normal', [101, 115, 111], 10);
  }

  const imageUrls = [...new Set(exam.questions.map((question) => question.visual_hint).filter(Boolean))];
  const loadedImages = new Map<string, EmbeddedImage>();
  await Promise.all(imageUrls.map(async (url) => loadedImages.set(url, await loadEmbeddedImage(url))));

  const formattedName = studentName.trim() || 'Not provided';
  writeText('GENETICS / 17', 10, 'bold', [15, 119, 112], 8);
  writeText(`Marked script · ${result.track} track`, 23, 'normal', [21, 37, 34], 13);
  writeText('CIE IGCSE Biology 0610 · Topic 17: Inheritance', 11, 'bold', [35, 53, 48], 12);
  writeText(`Student Name: ${formattedName}`, 11, 'bold', [35, 53, 48], 5);
  writeText(`Date: ${dateLabel()}`, 10, 'normal', [101, 115, 111], 12);
  writeText(`Final score: ${result.score} / ${result.max_score} · ${result.percentage}% · Indicative band ${result.grade_band}`, 13, 'bold', [15, 95, 90], 7);
  writeText(`Grading method: ${result.grading_mode === 'openrouter_free' ? 'OpenRouter free-router structured grading on written responses; multiple-choice items and totals computed by the server' : 'deterministic server-side rubric matcher'}`, 9.5, 'normal', [101, 115, 111], 8);
  writeText('The A*–G estimate is indicative only, not an official Cambridge grade boundary. The suggested answers and marking points in this script are slide-derived and are not an official Cambridge mark scheme.', 9, 'normal', [101, 115, 111], 12);
  writeText('Score breakdown by paper', 13, 'bold', [21, 37, 34], 5);
  for (const paper of result.paper_scores) writeText(`${paper.paper}: ${paper.score} / ${paper.max_score} marks`, 10, 'normal', [35, 53, 48], 3, 12);
  writeRule();
  writeText('Questions, submitted answers and suggested marking points', 15, 'bold', [21, 37, 34], 12);

  const markedById = new Map(result.marked_questions.map((item) => [item.question_id, item]));
  for (let index = 0; index < exam.questions.length; index += 1) {
    const question = exam.questions[index];
    const marked = markedById.get(question.id);
    if (!marked) throw new Error(`Marked-script data is missing for ${question.id}.`);
    writeRule();
    writeText(`Question ${index + 1} · ${question.paper} · ${question.level} · ${marked.earned} / ${marked.available} marks`, 12, 'bold', [21, 37, 34], 5);
    writeText(`Objective IDs: ${question.objective_ids.join(', ')} · Cognitive skill: ${question.cognitive_skill} · Difficulty ${question.difficulty}/5`, 8.5, 'normal', [101, 115, 111], 5);
    writeText(`Source: ${question.source_deck}, slide${question.source_slides.length === 1 ? '' : 's'} ${question.source_slides.join(', ')}`, 8.5, 'normal', [101, 115, 111], 7);
    writeText(question.stem, 11, 'bold', [35, 53, 48], 8);
    if (question.visual_hint) {
      const image = loadedImages.get(question.visual_hint);
      if (!image) throw new Error(`The source diagram for ${question.id} is unavailable.`);
      writeImage(image, question.visual_alt || 'PowerPoint source diagram', `${question.source_deck}, slide${question.source_slides.length === 1 ? '' : 's'} ${question.source_slides.join(', ')}`);
    }

    const feedbackByPart = new Map(marked.parts.map((part) => [part.part_id, part]));
    for (let partIndex = 0; partIndex < question.parts.length; partIndex += 1) {
      const part = question.parts[partIndex];
      const feedback = feedbackByPart.get(part.id);
      if (!feedback) throw new Error(`Marked-script data is missing for ${question.id}, part ${part.id}.`);
      writeText(`(${String.fromCharCode(97 + partIndex)}) ${part.prompt} [${part.marks} mark${part.marks === 1 ? '' : 's'}]`, 10, 'bold', [21, 37, 34], 5);
      if (part.input_type === 'radio') {
        for (const option of part.options) writeText(`${answers[question.id]?.[part.id] === option ? '(selected)' : '( )'} ${option}`, 9, 'normal', [75, 90, 84], 2, 12);
      }
      writeText(`Student answer: ${feedback.response.trim() || 'No response'}`, 9.5, 'normal', [75, 90, 84], 4);
      writeText(`Marks awarded: ${feedback.earned} / ${feedback.available}`, 9.5, 'bold', feedback.earned === feedback.available ? [15, 95, 90] : [140, 76, 53], 4);
      writeText(`Suggested answer: ${feedback.model_answer || 'No model answer supplied.'}`, 9.5, 'normal', [35, 53, 48], 4);
      if (feedback.marking_points.length) {
        writeText('Suggested marking points:', 9, 'bold', [15, 119, 112], 2);
        for (const point of feedback.marking_points as MarkingPointFeedback[]) {
          writeText(`• ${point.awarded ?? 0}/${point.marks} marks — ${point.description}`, 9, 'normal', [35, 53, 48], 2, 12);
          if (point.evidence_quote) writeText(`Evidence quote: “${point.evidence_quote}”`, 8.5, 'normal', [75, 90, 84], 2, 12);
          if (point.rationale) writeText(`Rubric decision: ${point.rationale}`, 8.5, 'normal', [101, 115, 111], 2, 12);
        }
      }
    }
    writeText(`Slide-derived correction: ${marked.correction}`, 9.5, 'normal', [35, 53, 48], 4);
    writeText(`Topic 17 guidance: ${marked.syllabus_guidance}`, 9.5, 'normal', [35, 53, 48], 9);
  }

  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.setTextColor(123, 137, 132);
    document.text(`Chapter 17 Genetics · ${result.track} · ${page} / ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }
  const safeName = studentName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.save(`genetics17-${result.track.toLowerCase()}-marked-script-${safeName || 'student'}.pdf`);
}
