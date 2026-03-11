import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

const COMPANY = {
  name: 'VOTRE ENTREPRISE',
  address: '123 Avenue Principale, Dakar, Sénégal',
  tel: '+221 XX XXX XX XX',
  email: 'rh@entreprise.com',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function replaceVars(text, values) {
  return Object.entries(values).reduce((t, [k, v]) => {
    const display = (k.includes('date') && v) ? formatDate(v) : (v || `[${k}]`);
    return t.replaceAll(`{{${k}}}`, display);
  }, text);
}

function buildDocumentText(template, values) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const nom = `${values.prenom || ''} ${values.nom || ''}`.trim();

  const docs = {
    'Contrat CDI': `CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE\n\nEntre les soussignés :\n\n${COMPANY.name}\nSiège social : ${COMPANY.address}\nReprésentée par son Directeur des Ressources Humaines\nd'une part,\n\nEt :\nMonsieur/Madame ${nom}\nd'autre part,\n\nIl a été convenu ce qui suit :\n\nARTICLE 1 – ENGAGEMENT\n${COMPANY.name} engage ${nom} à compter du ${formatDate(values.date_embauche)} en qualité de ${values.poste || '[poste]'}, dans le cadre d'un contrat à durée indéterminée.\n\nARTICLE 2 – PÉRIODE D'ESSAI\nLe présent contrat est soumis à une période d'essai de ${values.periode_essai || '[période]'} à compter de la date de prise de poste.\n\nARTICLE 3 – RÉMUNÉRATION\nLe salarié percevra une rémunération brute mensuelle de ${values.salaire || '[salaire]'} FCFA.\n\nARTICLE 4 – LIEU DE TRAVAIL\nLe salarié exercera ses fonctions à ${values.lieu_travail || '[lieu]'}.\n\nARTICLE 5 – DURÉE DU TRAVAIL\nLa durée du travail est fixée à 40 heures par semaine conformément à la législation en vigueur.\n\nFait à Dakar, le ${today}\n\nPour l'Employeur,                    Le Salarié,\n(Signature & Cachet)                 (Lu et approuvé)`,

    'Contrat CDD': `CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE\n\nEntre les soussignés :\n\n${COMPANY.name}\nSiège social : ${COMPANY.address}\nReprésentée par son Directeur des Ressources Humaines\nd'une part,\n\nEt :\nMonsieur/Madame ${nom}\nd'autre part,\n\nIl a été convenu ce qui suit :\n\nARTICLE 1 – OBJET ET DURÉE\nLe présent contrat est conclu pour une durée déterminée du ${formatDate(values.date_embauche)} au ${formatDate(values.date_fin)}.\nMotif : ${values.motif_cdd || '[motif]'}\n\nARTICLE 2 – FONCTION\n${nom} est engagé(e) en qualité de ${values.poste || '[poste]'}.\n\nARTICLE 3 – RÉMUNÉRATION\nRémunération brute mensuelle : ${values.salaire || '[salaire]'} FCFA.\n\nFait à Dakar, le ${today}\n\nPour l'Employeur,                    Le Salarié,\n(Signature & Cachet)                 (Lu et approuvé)`,

    'Convention de Stage': `CONVENTION DE STAGE\n\nEntre :\n\n${COMPANY.name} (Entreprise d'accueil)\nSiège : ${COMPANY.address}\n\nL'établissement : ${values.etablissement || '[établissement]'}\n\nEt le/la stagiaire : ${nom}\nFilière : ${values.filiere || '[filière]'}\n\nIl est convenu :\n\nARTICLE 1 – OBJET\nLa présente convention a pour objet de définir les conditions du stage de ${nom} au sein de ${COMPANY.name}.\n\nARTICLE 2 – DURÉE\nLe stage se déroulera du ${formatDate(values.date_debut)} au ${formatDate(values.date_fin)}.\n\nARTICLE 3 – TUTEUR\nLe stagiaire sera encadré par : ${values.tuteur || '[tuteur]'}\n\nARTICLE 4 – GRATIFICATION\nGratification mensuelle : ${values.gratification || 'Non rémunéré'} FCFA.\n\nFait à Dakar, le ${today}\n\nPour l'Entreprise,         L'Établissement,         Le Stagiaire,`,

    'Attestation de Travail': `ATTESTATION DE TRAVAIL\n\nJe soussigné(e), Directeur des Ressources Humaines de ${COMPANY.name},\n\nCERTIFIE\n\nque Monsieur/Madame ${nom} est actuellement employé(e) au sein de notre société en qualité de ${values.poste || '[poste]'}, dans le cadre d'un ${values.type_contrat || '[contrat]'}, depuis le ${formatDate(values.date_embauche)}.\n\nCette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.\n\nFait à Dakar, le ${today}\n\nLe Directeur des Ressources Humaines\n${COMPANY.name}\n(Signature & Cachet)`,

    'Certificat de Travail': `CERTIFICAT DE TRAVAIL\n\nJe soussigné(e), Directeur des Ressources Humaines de ${COMPANY.name},\n\nCERTIFIE\n\nque Monsieur/Madame ${nom} a été employé(e) au sein de notre société en qualité de ${values.poste || '[poste]'}, dans le cadre d'un ${values.type_contrat || '[contrat]'}, du ${formatDate(values.date_embauche)} au ${formatDate(values.date_fin_contrat)}.\n\nPendant cette période, ${nom} a fait preuve de sérieux et de compétence dans l'exercice de ses fonctions.\n\nCe certificat est délivré pour servir et valoir ce que de droit.\n\nFait à Dakar, le ${today}\n\nLe Directeur des Ressources Humaines\n(Signature & Cachet)`,

    'Avenant au Contrat': `AVENANT AU CONTRAT DE TRAVAIL\n\nEntre :\n${COMPANY.name} et Monsieur/Madame ${nom}\n\nIl est convenu de modifier le contrat de travail comme suit :\n\nARTICLE 1 – NOUVELLE FONCTION\nÀ compter du ${formatDate(values.date_effet)}, ${nom} occupera le poste de ${values.nouveau_poste || '[nouveau poste]'} en remplacement de ${values.poste_actuel || '[poste actuel]'}.\n\nARTICLE 2 – NOUVELLE RÉMUNÉRATION\nLa rémunération brute mensuelle est fixée à ${values.nouveau_salaire || '[salaire]'} FCFA.\n\nToutes les autres clauses du contrat initial restent inchangées.\n\nFait à Dakar, le ${today}\n\nPour l'Employeur,                    Le Salarié,\n(Signature & Cachet)                 (Lu et approuvé)`,
  };

  const content = docs[template.name] || template.fields.map(f => `${f} : ${values[f] || '[non renseigné]'}`).join('\n');
  return replaceVars(content, values);
}

// ─── Export DOCX réel ──────────────────────────────────────────────────────
export async function downloadDocx(template, values) {
  const content = buildDocumentText(template, values);
  const lines = content.split('\n');
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const paragraphs = lines.map((line, i) => {
    const isTitle = i === 0;
    const isArticle = line.startsWith('ARTICLE') || line === 'CERTIFIE';
    return new Paragraph({
      children: [new TextRun({
        text: line,
        bold: isTitle || isArticle,
        size: isTitle ? 28 : 24,
        font: 'Times New Roman',
      })],
      alignment: isTitle ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { after: line === '' ? 200 : 100 },
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: COMPANY.name, bold: true, size: 22, color: '1a6b4a' })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 400 },
        }),
        ...paragraphs,
        new Paragraph({
          children: [new TextRun({ text: `Référence : DOC-${Date.now()}`, size: 18, color: '999999' })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${template.name}_${values.nom || 'document'}_${today}.docx`);
}

// ─── Export PDF réel ───────────────────────────────────────────────────────
export function downloadPdf(template, values) {
  const content = buildDocumentText(template, values);
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxW = pageW - margin * 2;

  // En-tête entreprise
  doc.setFillColor(26, 107, 74);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name, margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.address, pageW - margin, 12, { align: 'right' });

  // Contenu
  doc.setTextColor(30, 30, 30);
  let y = 30;
  const lines = content.split('\n');

  lines.forEach((line) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    if (line === '') { y += 4; return; }

    const isTitle = lines.indexOf(line) === 0;
    const isArticle = line.startsWith('ARTICLE') || line === 'CERTIFIE';

    if (isTitle) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 107, 74);
      doc.text(line, pageW / 2, y, { align: 'center' });
      y += 10;
      doc.setDrawColor(26, 107, 74);
      doc.setLineWidth(0.5);
      doc.line(margin, y - 3, pageW - margin, y - 3);
      y += 4;
    } else if (isArticle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(line, margin, y);
      y += 6;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const wrapped = doc.splitTextToSize(line, maxW);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5 + 1;
    }
  });

  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i}/${pageCount} — ${COMPANY.name} — Réf: DOC-${Date.now()}`, pageW / 2, 290, { align: 'center' });
  }

  doc.save(`${template.name}_${values.nom || 'document'}_${today}.pdf`);
}

export { buildDocumentText };
