import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Upload() {
  const [signerEmail, setSignerEmail] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        setPdfFile(null);
        return;
      }
      setError('');
      setPdfFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return setError('Please select a PDF file to upload.');
    setError('');
    setLoading(true);

    try {
      // 1. Look up signer by email
      let signerData;
      try {
        const res = await api.get(`/users/by-email/${signerEmail}`);
        signerData = res.data;
      } catch (err) {
        throw new Error('Signer email not found. Please ensure they have an account.');
      }

      // 2. Prepare FormData for file upload
      const formData = new FormData();
      formData.append('requester', user?.id || '');
      formData.append('unsignedFile', pdfFile);
      formData.append('signers', signerData.id);

      // 3. Request the signature (sending multipart/form-data)
      await api.post('/documents/request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error requesting signature.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form className="card-form" onSubmit={handleUpload}>
        <h2>Request a Signature</h2>
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label>Upload PDF Document</label>
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleFileChange} 
            required 
          />
          {pdfFile && <small className="help-text">Selected: {pdfFile.name}</small>}
        </div>

        <div className="form-group">
          <label>Signer Email</label>
          <input 
            type="email" 
            value={signerEmail} 
            onChange={(e) => setSignerEmail(e.target.value)} 
            required 
            placeholder="signer@example.com"
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="secondary-button">Cancel</button>
          <button type="submit" disabled={loading} className="primary-button">
            {loading ? 'Sending Request...' : 'Send Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
