import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm'}>
      <p className="text-gray-600 mb-4">{message || 'Are you sure?'}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Confirm</button>
      </div>
    </Modal>
  );
}
