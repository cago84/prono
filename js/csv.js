// Export CSV assemblé dans le navigateur à partir des données de la fonction SQL admin_export.

export function csvCell(v) {
  let s = Array.isArray(v) ? v.join(' | ') : v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise l'injection de formules Excel
  return `"${s.replace(/"/g, '""')}"`;
}

// data = { questions: [{ id, text, questionnaireTitle }], people: [{ username, email, answers: { "<idQuestion>": valeur } }] }
export function buildCsv(data) {
  const { questions, people } = data;
  // En-têtes « Questionnaire : question » pour distinguer les questions de questionnaires différents
  const lines = [['Identifiant', 'Email', ...questions.map((q) => `${q.questionnaireTitle} : ${q.text}`)].map(csvCell).join(',')];
  for (const p of people) {
    lines.push([p.username, p.email, ...questions.map((q) => p.answers[q.id] ?? '')].map(csvCell).join(','));
  }
  return '\uFEFF' + lines.join('\r\n'); // BOM pour qu'Excel lise bien l'UTF-8
}

export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
