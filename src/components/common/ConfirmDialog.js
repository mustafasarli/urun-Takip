import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

// Onay penceresi. Dışarı tıklama ve Esc "Vazgeç" gibi davranır (işlem sürerken kapanmaz).
function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Evet',
  cancelText = 'Vazgeç',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog
      open={open}
      onClose={() => !busy && onCancel()}
      aria-labelledby="confirm-title"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="confirm-title" sx={{ fontSize: 16 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: 14 }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {/* Odak "Vazgeç"te başlar; yanlışlıkla Enter ile onaylanmaz */}
        <Button onClick={onCancel} disabled={busy} autoFocus>
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'İşleniyor…' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDialog;
