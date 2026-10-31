import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';

const qty = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });

// Birim | Çarpan | Barkod | Karşılığı | Sil — geniş ekranda tek satır, telefonda alt alta
const rowSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr)) 40px' },
  gap: 2,
  alignItems: 'start',
};

const equivalenceSx = { height: 40, display: 'flex', alignItems: 'center', fontSize: 13, color: 'text.secondary' };

export const unitError = (errors, i, name) => errors[`units[${i}].${name}`];

/**
 * Ürünün ek birimleri ve çarpanları. İlk satır temel birimdir (çarpan 1, salt okunur).
 * `rows`: [{ key, unitId, multiplier, barcode }] — değerler formdaki gibi metin.
 */
function ProductUnitsEditor({ rows, onChange, onAdd, baseUnit, unitOptions, errors, saving, baseUnitChanged }) {
  const update = (key, name, value) => onChange(rows.map((r) => (r.key === key ? { ...r, [name]: value } : r)));

  const labelOf = (unitId) => unitOptions.find((o) => o.id === unitId);

  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography component="legend" variant="subtitle2" sx={{ fontWeight: 600 }}>
          Birimler ve Çarpanlar
        </Typography>
        <Button
          size="small"
          startIcon={<AddOutlined />}
          onClick={onAdd}
          disabled={saving || !baseUnit}
        >
          Birim Ekle
        </Button>
      </Box>

      {baseUnitChanged && rows.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5, py: 0 }}>
          Temel birim değişti. Çarpanlar yeni temel birime ({baseUnit?.unitName}) göre yorumlanacak; lütfen kontrol edin.
        </Alert>
      )}

      {/* Temel birim satırı: çarpanı her zaman 1 */}
      <Box sx={{ ...rowSx, py: 0.5, borderBottom: 1, borderColor: 'divider', mb: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
          {baseUnit ? `${baseUnit.unitCode} - ${baseUnit.unitName}` : 'Önce temel birimi seçin'}
        </Typography>
        <Typography sx={{ fontSize: 13 }}>1</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>—</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Temel birim</Typography>
      </Box>

      {rows.map((row, i) => {
        // Temel birim ve diğer satırlarda seçilmiş birimler listede görünmez
        const taken = new Set(rows.filter((r) => r.key !== row.key).map((r) => r.unitId));
        const options = unitOptions.filter(
          (o) => o.id === row.unitId || (o.id !== baseUnit?.id && !taken.has(o.id))
        );
        const selected = labelOf(row.unitId);
        const multiplier = Number(row.multiplier);
        const showEquivalence = selected && baseUnit && row.multiplier !== '' && multiplier > 0;

        return (
          <Box key={row.key} role="group" aria-label={`${i + 1}. ek birim`} sx={{ ...rowSx, mb: 1.5 }}>
            <TextField
              select
              label="Birim"
              required
              fullWidth
              value={row.unitId}
              onChange={(e) => update(row.key, 'unitId', e.target.value)}
              error={Boolean(unitError(errors, i, 'unitId'))}
              helperText={unitError(errors, i, 'unitId')}
              disabled={saving}
            >
              {options.length === 0 && (
                <MenuItem value="" disabled>
                  Eklenecek birim kalmadı
                </MenuItem>
              )}
              {options.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Çarpan"
              required
              fullWidth
              type="number"
              value={row.multiplier}
              onChange={(e) => update(row.key, 'multiplier', e.target.value)}
              error={Boolean(unitError(errors, i, 'multiplier'))}
              helperText={unitError(errors, i, 'multiplier')}
              disabled={saving}
              slotProps={{ htmlInput: { step: '0.001', min: 0, inputMode: 'decimal' } }}
            />
            <TextField
              label="Barkod"
              fullWidth
              value={row.barcode}
              onChange={(e) => update(row.key, 'barcode', e.target.value)}
              error={Boolean(unitError(errors, i, 'barcode'))}
              helperText={unitError(errors, i, 'barcode')}
              disabled={saving}
              slotProps={{ htmlInput: { maxLength: 50 } }}
            />
            <Typography sx={equivalenceSx}>
              {showEquivalence ? `1 ${selected.unitName} = ${qty.format(multiplier)} ${baseUnit.unitName}` : ''}
            </Typography>
            <Box sx={{ height: 40, display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Birimi kaldır">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Birimi kaldır"
                    onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                    disabled={saving}
                  >
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default ProductUnitsEditor;
