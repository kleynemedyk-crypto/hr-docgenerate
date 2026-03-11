import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { downloadDocx, downloadPdf, buildDocumentText } from './docGenerator';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const FIELD_LABELS = {
  nom: 'Nom', prenom: 'Prénom', poste: 'Poste occupé',
  date_embauche: 'Date d\'embauche', salaire: 'Salaire brut (FCFA)',
  lieu_travail: 'Lieu de travail', periode_essai: 'Période d\'essai',
  date_fin: 'Date de fin', motif_cdd: 'Motif du CDD',
  etablissement: 'Établissement scolaire', filiere: 'Filière',
  date_debut: 'Date de début', tuteur: 'Maître de stage',
  gratification: 'Gratification (FCFA)', type_contrat: 'Type de contrat',
  date_fin_contrat: 'Date de fin de contrat',
  poste_actuel: 'Poste actuel', nouveau_poste: 'Nouveau poste',
  nouveau_salaire: 'Nouveau salaire (FCFA)', date_effet: 'Date d\'effet',
};

const FIELD_TYPES = {
  date_embauche: 'date', date_fin: 'date', date_debut: 'date',
  date_fin_contrat: 'date', date_effet: 'date',
  salaire: 'number', gratification: 'number', nouveau_salaire: 'number',
};

const DEFAULT_TEMPLATES = [
  { name: 'Contrat CDI', type: 'Contrat de travail', category: 'Contrats', icon: '📄', color: '#1a6b4a', fields: ['nom', 'prenom', 'poste', 'date_embauche', 'salaire', 'lieu_travail', 'periode_essai'], description: 'Contrat à durée indéterminée' },
  { name: 'Contrat CDD', type: 'Contrat de travail', category: 'Contrats', icon: '📋', color: '#2563a8', fields: ['nom', 'prenom', 'poste', 'date_embauche', 'date_fin', 'salaire', 'motif_cdd'], description: 'Contrat à durée déterminée' },
  { name: 'Convention de Stage', type: 'Convention', category: 'Stages', icon: '🎓', color: '#7c3aed', fields: ['nom', 'prenom', 'etablissement', 'filiere', 'date_debut', 'date_fin', 'tuteur', 'gratification'], description: 'Convention tripartite' },
  { name: 'Attestation de Travail', type: 'Attestation', category: 'Attestations', icon: '✅', color: '#b45309', fields: ['nom', 'prenom', 'poste', 'date_embauche', 'type_contrat'], description: 'Attestation d\'emploi actuel' },
  { name: 'Certificat de Travail', type: 'Certificat', category: 'Attestations', icon: '🏆', color: '#be185d', fields: ['nom', 'prenom', 'poste', 'date_embauche', 'date_fin_contrat', 'type_contrat'], description: 'Certificat de fin de contrat' },
  { name: 'Avenant au Contrat', type: 'Avenant', category: 'Contrats', icon: '📝', color: '#0f766e', fields: ['nom', 'prenom', 'poste_actuel', 'nouveau_poste', 'nouveau_salaire', 'date_effet'], description: 'Modification du contrat initial' },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
    fontFamily: 'Plus Jakarta Sans, sans-serif', background: '#fff',
    transition: 'border-color 0.2s',
  },
  btn: (bg, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 10,
    padding: '10px 20px', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
    transition: 'filter 0.15s',
  }),
  card: {
    background: '#fff', borderRadius: 16,
    border: '1px solid #e8ecf0', overflow: 'hidden',
  },
};

// ─── AUTH VIEW ────────────────────────────────────────────────────────────────
function AuthView({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onAuth(data.user);
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, email, nom, prenom, role: 'user' });
      setSuccess('Compte créé ! Vérifiez votre email pour confirmer.');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a2e1e 0%, #0f4c35 50%, #1a6b4a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>📄</div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, fontFamily: 'Playfair Display, serif', margin: 0 }}>HR DocGen Pro</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>Génération automatique de documents RH</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 32, backdropFilter: 'blur(20px)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }} style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#0f172a' : '#64748b',
                fontWeight: mode === m ? 700 : 500, fontSize: 14,
                cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
                {m === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #fecaca' }}>{error}</div>}
          {success && <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #bbf7d0' }}>{success}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Prénom</label>
                  <input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom" style={S.input} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nom</label>
                  <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom" style={S.input} />
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" style={S.input} onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={S.input} onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())} />
            </div>
            <button onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading} style={{ ...S.btn('#1a6b4a'), padding: '12px', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
              {loading ? '⏳ Chargement...' : (mode === 'login' ? '→ Se connecter' : '→ Créer mon compte')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ templates, documents, onNewDoc, onGoTo }) {
  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0f4c35 0%, #1a6b4a 100%)', borderRadius: 20, padding: '32px 36px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 80, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 6 }}>Bienvenue sur</p>
          <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px', fontFamily: 'Playfair Display, serif' }}>HR DocGen Pro 🚀</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 24px' }}>Générez vos documents RH professionnels en moins de 30 secondes</p>
          <button onClick={onNewDoc} style={{ background: '#fff', color: '#0f4c35', border: 'none', padding: '11px 24px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            + Nouveau document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { v: documents.length, l: 'Documents générés', i: '📄' },
          { v: templates.length, l: 'Modèles disponibles', i: '📁' },
          { v: documents.filter(d => new Date(d.created_at) > new Date(Date.now() - 7 * 86400000)).length, l: 'Cette semaine', i: '📅' },
          { v: '< 30s', l: 'Temps de génération', i: '⚡' },
        ].map((s, i) => (
          <div key={i} style={{ ...S.card, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 26 }}>{s.i}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1, fontFamily: 'Playfair Display, serif' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.l}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        {/* Recent docs */}
        <div style={S.card}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Documents récents</h3>
            <button onClick={() => onGoTo('history')} style={{ background: 'none', border: 'none', color: '#1a6b4a', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Tout voir →</button>
          </div>
          {documents.slice(0, 5).length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Aucun document généré pour l'instant</div>
          ) : documents.slice(0, 5).map(d => (
            <div key={d.id} style={{ padding: '13px 22px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.beneficiary_name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{d.template_name} · {new Date(d.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>✓</span>
            </div>
          ))}
        </div>

        {/* Templates rapides */}
        <div style={S.card}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Modèles fréquents</h3>
          </div>
          {templates.slice(0, 5).map(t => (
            <div key={t.id} style={{ padding: '13px 22px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: (t.color || '#1a6b4a') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{t.icon || '📄'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{t.fields?.length || 0} champs</div>
              </div>
              <button onClick={() => onNewDoc(t)} style={{ ...S.btn((t.color || '#1a6b4a') + '18', t.color || '#1a6b4a'), padding: '5px 12px', fontSize: 12, border: `1px solid ${(t.color || '#1a6b4a')}30` }}>
                Générer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TEMPLATES VIEW ───────────────────────────────────────────────────────────
function TemplatesView({ templates, setTemplates, onGenerate, userRole }) {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldInput, setFieldInput] = useState('');
  const [form, setForm] = useState({ name: '', type: '', category: 'Contrats', icon: '📄', color: '#1a6b4a', description: '', fields: [] });

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || (t.category || '').toLowerCase().includes(search.toLowerCase()));

  const addField = () => {
    const f = fieldInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (f && !form.fields.includes(f)) { setForm(p => ({ ...p, fields: [...p.fields, f] })); setFieldInput(''); }
  };

  const saveTemplate = async () => {
    if (!form.name || !form.type) return;
    setSaving(true);
    const { data, error } = await supabase.from('templates').insert([{ ...form }]).select().single();
    if (!error && data) { setTemplates(p => [...p, data]); setShowNew(false); setForm({ name: '', type: '', category: 'Contrats', icon: '📄', color: '#1a6b4a', description: '', fields: [] }); }
    setSaving(false);
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Supprimer ce modèle ?')) return;
    await supabase.from('templates').delete().eq('id', id);
    setTemplates(p => p.filter(t => t.id !== id));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', fontFamily: 'Playfair Display, serif' }}>Modèles de documents</h2>
          <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>{templates.length} modèles disponibles</p>
        </div>
        {userRole === 'admin' && <button onClick={() => setShowNew(true)} style={S.btn('#1a6b4a')}>+ Nouveau modèle</button>}
      </div>

      <input placeholder="Rechercher un modèle…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, marginBottom: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {filtered.map(t => (
          <div key={t.id} style={{ ...S.card, transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ height: 5, background: t.color || '#1a6b4a' }} />
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: (t.color || '#1a6b4a') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{t.icon || '📄'}</div>
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{t.category}</span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t.name}</h3>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{t.description}</p>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>{(t.fields || []).length} champs dynamiques</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onGenerate(t)} style={{ ...S.btn(t.color || '#1a6b4a'), flex: 1, padding: '8px' }}>Générer</button>
                {userRole === 'admin' && (
                  <button onClick={() => deleteTemplate(t.id)} style={{ ...S.btn('#fff1f2', '#e11d48'), border: '1px solid #fecdd3', padding: '8px 12px' }}>🗑</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal nouveau modèle */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowNew(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 30, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 22px', fontFamily: 'Playfair Display, serif', fontSize: 18 }}>Nouveau modèle</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['Nom du modèle *', 'name', 'Ex: Contrat CDI Senior'], ['Type de document *', 'type', 'Ex: Contrat de travail'], ['Description', 'description', 'Description courte']].map(([label, key, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={S.input} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Catégorie</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={S.input}>
                  {['Contrats', 'Stages', 'Attestations', 'Avenants', 'Autres'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Champs dynamiques (ex: nom, poste, salaire)</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={fieldInput} onChange={e => setFieldInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addField()} placeholder="Ex: nom, poste, salaire…" style={{ ...S.input, flex: 1 }} />
                  <button onClick={addField} style={S.btn('#1a6b4a')}>+</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.fields.map(f => (
                    <span key={f} style={{ background: '#f0fdf4', color: '#166534', padding: '3px 10px', borderRadius: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {`{{${f}}}`} <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setForm(p => ({ ...p, fields: p.fields.filter(x => x !== f) }))}>×</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setShowNew(false)} style={{ ...S.btn('#f8fafc', '#374151'), flex: 1, border: '1px solid #e2e8f0' }}>Annuler</button>
                <button onClick={saveTemplate} disabled={saving} style={{ ...S.btn('#1a6b4a'), flex: 2 }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GENERATE VIEW ────────────────────────────────────────────────────────────
function GenerateView({ templates, user, profile, onGenerated, preselected }) {
  const [step, setStep] = useState(preselected ? 2 : 1);
  const [selected, setSelected] = useState(preselected || null);
  const [values, setValues] = useState({});
  const [docText, setDocText] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false); // eslint-disable-line
  const [dlLoading, setDlLoading] = useState('');

  useEffect(() => { if (preselected) { setSelected(preselected); setStep(2); } }, [preselected]);

  const handleGenerate = async () => {
    setSaving(true);
    const text = buildDocumentText(selected, values);
    setDocText(text);
    const nom = `${values.prenom || ''} ${values.nom || ''}`.trim() || 'Inconnu';
    const { error } = await supabase.from('documents').insert([{
      template_id: selected.id, template_name: selected.name,
      beneficiary_name: nom, values, content: text,
      author_name: profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() : user.email,
    }]);
    if (!error) { onGenerated(); setDone(true); setStep(3); }
    setSaving(false);
  };

  const handleDocx = async () => {
    setDlLoading('docx');
    await downloadDocx(selected, values);
    setDlLoading('');
  };

  const handlePdf = () => {
    setDlLoading('pdf');
    downloadPdf(selected, values);
    setDlLoading('');
  };

  const allFilled = selected?.fields?.every(f => values[f] && String(values[f]).trim() !== '');

  return (
    <div>
      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        {['Choisir un modèle', 'Remplir le formulaire', 'Télécharger'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: step > i + 1 ? '#1a6b4a' : step === i + 1 ? '#1a6b4a' : '#e2e8f0', color: step >= i + 1 ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 700 : 400, color: step >= i + 1 ? '#0f172a' : '#94a3b8' }}>{label}</span>
            {i < 2 && <div style={{ width: 28, height: 2, background: step > i + 1 ? '#1a6b4a' : '#e2e8f0' }} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Sélectionnez un type de document</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {templates.map(t => (
              <div key={t.id} onClick={() => { setSelected(t); setValues({}); setStep(2); }} style={{ ...S.card, padding: 20, cursor: 'pointer', border: '2px solid #e8ecf0', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = t.color || '#1a6b4a'; e.currentTarget.style.boxShadow = `0 4px 20px ${(t.color || '#1a6b4a')}25`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8ecf0'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon || '📄'}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{(t.fields || []).length} champs à remplir</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && selected && (
        <div style={{ ...S.card, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 28 }}>{selected.icon || '📄'}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{selected.name}</h3>
              <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 13 }}>Remplissez tous les champs obligatoires</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {(selected.fields || []).map(field => (
              <div key={field}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  {FIELD_LABELS[field] || field} <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <input
                  type={FIELD_TYPES[field] || 'text'}
                  value={values[field] || ''}
                  onChange={e => setValues(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={`Saisir ${(FIELD_LABELS[field] || field).toLowerCase()}`}
                  style={{ ...S.input, borderColor: values[field] ? '#1a6b4a' : '#e2e8f0', background: values[field] ? '#f0fdf4' : '#fff' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep(1)} style={{ ...S.btn('#f8fafc', '#374151'), border: '1px solid #e2e8f0' }}>← Retour</button>
            <button onClick={handleGenerate} disabled={!allFilled || saving} style={{ ...S.btn(allFilled ? '#1a6b4a' : '#94a3b8'), flex: 1, opacity: saving ? 0.8 : 1 }}>
              {saving ? '⏳ Génération...' : '⚡ Générer le document'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 20px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: '#166534' }}>Document généré et enregistré !</div>
              <div style={{ fontSize: 13, color: '#166534' }}>{selected.name} pour {values.prenom} {values.nom}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
            {/* Aperçu */}
            <div style={S.card}>
              <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e8ecf0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>📄 Aperçu du document</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{selected.name}</span>
              </div>
              <pre style={{ margin: 0, padding: 24, fontSize: 12, lineHeight: 1.8, fontFamily: 'Georgia, serif', color: '#374151', whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
                {docText}
              </pre>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ ...S.card, padding: 20 }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Télécharger</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={handleDocx} disabled={dlLoading === 'docx'} style={{ ...S.btn('#1a6b4a'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
                    {dlLoading === 'docx' ? '⏳ Génération...' : '⬇ Télécharger Word (.docx)'}
                  </button>
                  <button onClick={handlePdf} disabled={dlLoading === 'pdf'} style={{ ...S.btn('#dc2626'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
                    {dlLoading === 'pdf' ? '⏳ Génération...' : '⬇ Télécharger PDF'}
                  </button>
                </div>
              </div>

              <div style={{ ...S.card, padding: 20 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>📧 Envoyer par email</h4>
                <input placeholder="destinataire@email.com" style={{ ...S.input, marginBottom: 10 }} />
                <button style={{ ...S.btn('#2563a8'), width: '100%' }}>Envoyer</button>
              </div>

              <button onClick={() => { setStep(1); setSelected(null); setValues({}); setDone(false); }} style={{ ...S.btn('#f8fafc', '#374151'), border: '1px solid #e2e8f0' }}>
                + Nouveau document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView({ documents, onRegenerate }) {
  const [search, setSearch] = useState('');
  const filtered = documents.filter(d =>
    (d.beneficiary_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.template_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: 'Playfair Display, serif', color: '#0f172a' }}>Historique</h2>
        <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>{documents.length} documents générés</p>
      </div>
      <input placeholder="Rechercher par bénéficiaire ou type…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, marginBottom: 16 }} />
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Bénéficiaire', 'Type de document', 'Date', 'Auteur', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Aucun document trouvé</td></tr>
            ) : filtered.map((d, i) => (
              <tr key={d.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafbfc' : '#fff' }}>
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a6b4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                      {(d.beneficiary_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{d.beneficiary_name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 18px', fontSize: 14, color: '#374151' }}>{d.template_name}</td>
                <td style={{ padding: '14px 18px', fontSize: 13, color: '#64748b' }}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding: '14px 18px', fontSize: 13, color: '#64748b' }}>{d.author_name || '—'}</td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>✓ Généré</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [templates, setTemplates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [preselected, setPreselected] = useState(null);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadTemplates();
    loadDocuments();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  };

  const loadTemplates = async () => {
    const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setTemplates(data);
    } else {
      // Seed default templates on first load
      const { data: inserted } = await supabase.from('templates').insert(DEFAULT_TEMPLATES).select();
      setTemplates(inserted || DEFAULT_TEMPLATES);
    }
  };

  const loadDocuments = async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  const handleNewDoc = (template = null) => {
    setPreselected(template);
    setView('generate');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setTemplates([]); setDocuments([]);
  };

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
        <p style={{ color: '#64748b' }}>Chargement...</p>
      </div>
    </div>
  );

  if (!user) return <AuthView onAuth={setUser} />;

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
    { id: 'generate', label: 'Nouveau document', icon: '⚡' },
    { id: 'templates', label: 'Modèles', icon: '📁' },
    { id: 'history', label: 'Historique', icon: '🕐' },
  ];

  const userInitials = profile ? `${(profile.prenom || '')[0] || ''}${(profile.nom || '')[0] || ''}`.toUpperCase() : (user.email || '?')[0].toUpperCase();
  const userName = profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || user.email : user.email;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif', background: '#f4f6fa' }}>
      <style>{`
        button:hover:not(:disabled) { filter: brightness(0.93) !important; }
        input:focus { border-color: #1a6b4a !important; box-shadow: 0 0 0 3px rgba(26,107,74,0.1); }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 240, background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#1a6b4a,#2d8a64)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📄</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'Playfair Display, serif' }}>HR DocGen Pro</div>
              <div style={{ color: '#475569', fontSize: 11 }}>v2.0</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '14px 10px' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, border: 'none',
              background: view === item.id ? 'rgba(26,107,74,0.2)' : 'transparent',
              color: view === item.id ? '#4ade80' : '#94a3b8',
              fontSize: 13, fontWeight: view === item.id ? 700 : 500,
              cursor: 'pointer', textAlign: 'left', marginBottom: 2,
              borderLeft: view === item.id ? '3px solid #1a6b4a' : '3px solid transparent',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
              {item.id === 'history' && documents.length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#1e293b', color: '#64748b', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{documents.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '14px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a6b4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
              <div style={{ color: '#475569', fontSize: 11 }}>{profile?.role || 'Utilisateur'}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ ...S.btn('#1e293b', '#94a3b8'), width: '100%', fontSize: 12, padding: '7px', border: '1px solid rgba(255,255,255,0.07)' }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e8ecf0', padding: '14px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: 'Playfair Display, serif' }}>
              {navItems.find(n => n.id === view)?.label || 'HR DocGen Pro'}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={() => handleNewDoc()} style={S.btn('#1a6b4a')}>+ Nouveau document</button>
        </div>

        <div style={{ flex: 1, padding: '26px 30px', overflowY: 'auto' }}>
          {view === 'dashboard' && <Dashboard templates={templates} documents={documents} onNewDoc={handleNewDoc} onGoTo={setView} />}
          {view === 'templates' && <TemplatesView templates={templates} setTemplates={setTemplates} onGenerate={handleNewDoc} userRole={profile?.role || 'user'} />}
          {view === 'generate' && <GenerateView templates={templates} user={user} profile={profile} onGenerated={loadDocuments} preselected={preselected} />}
          {view === 'history' && <HistoryView documents={documents} />}
        </div>
      </div>
    </div>
  );
}
