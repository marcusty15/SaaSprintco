import { useState, useEffect } from 'react';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font } from '../lib/theme';
import { api } from '../lib/api';

export default function Settings() {
  const { dark } = useThemeStore();
  const T = dark ? DARK : LIGHT;

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  // Config general
  const [companyName, setCompanyName]     = useState('');
  const [marginPercent, setMarginPercent] = useState('');
  const [ivaPercent, setIvaPercent]       = useState('');

  // Tasas
  const [rateUSD, setRateUSD] = useState('');
  const [rateEUR, setRateEUR] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const data = await api.get('/settings');
      setCompanyName(data.company_name   || '');
      setMarginPercent(data.margin_percent || '');
      setIvaPercent(data.iva_percent      || '');
      setRateUSD(data.rate_USD !== undefined ? String(data.rate_USD) : '');
      setRateEUR(data.rate_EUR !== undefined ? String(data.rate_EUR) : '');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGeneral(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put('/settings', { company_name: companyName, margin_percent: marginPercent, iva_percent: ivaPercent });
      setSuccess('Configuración guardada correctamente');
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleSaveRates(e) {
    e.preventDefault();
    setSavingRates(true); setError(''); setSuccess('');
    try {
      await api.put('/settings/rates', { USD: rateUSD, EUR: rateEUR });
      setSuccess('Tasas de cambio actualizadas');
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally { setSavingRates(false); }
  }

  const card  = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, marginBottom: 16 };
  const inp   = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', fontFamily: font };
  const lbl   = { fontSize: 12, color: T.textMid, fontWeight: 600, display: 'block', marginBottom: 6 };
  const secTi = { fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 };
  const btnP  = { padding: '10px 20px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: T.textLight, fontSize: 13 }}>Cargando...</div>
  );

  return (
    <div style={{ maxWidth: 560 }}>

      {success && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: T.accentLight, border: `1px solid ${T.accent}44`, fontSize: 13, color: T.accentDark, fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: T.peachLight, border: `1px solid ${T.danger}44`, fontSize: 13, color: T.danger }}>
          {error}
        </div>
      )}

      {/* Config general */}
      <div style={card}>
        <div style={secTi}>Empresa</div>
        <form onSubmit={handleSaveGeneral}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Nombre de la empresa</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inp} placeholder="Color Express" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Margen de ganancia (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={marginPercent} onChange={e => setMarginPercent(e.target.value)} style={inp} placeholder="35" />
            </div>
            <div>
              <label style={lbl}>IVA (%)</label>
              <select value={ivaPercent} onChange={e => setIvaPercent(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="0">0% — No aplica</option>
                <option value="8">8%</option>
                <option value="16">16% — Venezuela</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} style={{ ...btnP, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Tasas de cambio */}
      <div style={card}>
        <div style={secTi}>Tasas de cambio (Bolívares)</div>
        <form onSubmit={handleSaveRates}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={lbl}>1 USD = Bs</label>
              <input type="number" min="0" step="0.01" value={rateUSD} onChange={e => setRateUSD(e.target.value)} style={inp} placeholder="36.50" />
            </div>
            <div>
              <label style={lbl}>1 EUR = Bs</label>
              <input type="number" min="0" step="0.01" value={rateEUR} onChange={e => setRateEUR(e.target.value)} style={inp} placeholder="39.80" />
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: T.blueLight, border: `1px solid ${T.blue}33`, fontSize: 12, color: T.blue, marginBottom: 20 }}>
            💡 Las tasas se usan en cotizaciones y órdenes para calcular el total en Bs.
          </div>
          <button type="submit" disabled={savingRates} style={{ ...btnP, opacity: savingRates ? 0.7 : 1 }}>
            {savingRates ? 'Actualizando...' : 'Actualizar tasas'}
          </button>
        </form>
      </div>

    </div>
  );
}
