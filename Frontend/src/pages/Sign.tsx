import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import Draggable from 'react-draggable';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Sign() {
  const { id } = useParams<{ id: string }>();
  // @ts-ignore - signature state kept for potential future use
  const [signature, setSignature] = useState<any>(null);
  const [documentInfo, setDocumentInfo] = useState<any>(null);
  
  // PDF Rendering State
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  
  // The scale used to render the PDF in the browser UI
  const pdfScale = 1.2; 
  
  // Signature State
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigPosition, setSigPosition] = useState({ x: 50, y: 50 });
  const [showSigPad, setShowSigPad] = useState(false);
  const sigPadRef = useRef<SignatureCanvas>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  // Fetch document details and PDF bytes
  useEffect(() => {
    const fetchSignatureDetails = async () => {
      try {
        setLoading(true);
        const sigRes = await api.get(`/signatures/${id}`);
        setSignature(sigRes.data);

        const docRes = await api.get(`/documents/${sigRes.data.documentId}`);
        setDocumentInfo(docRes.data);

        // Fetch PDF array buffer
        const pdfResponse = await fetch(docRes.data.unsignedFile);
        if (!pdfResponse.ok) throw new Error('Failed to fetch PDF file.');
        const bytes = await pdfResponse.arrayBuffer();
        setPdfBytes(bytes);

        // Load into PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
        const loadedPdf = await loadingTask.promise;
        setPdfDoc(loadedPdf);
        setTotalPages(loadedPdf.numPages);
      } catch (err: any) {
        setError(err.message || 'Error fetching document details.');
      } finally {
        setLoading(false);
      }
    };

    fetchSignatureDetails();
  }, [id]);

  // Render current page when pdfDoc or currentPage changes
  useEffect(() => {
    const renderPage = async (pageNum: number) => {
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: pdfScale });
      setPdfDimensions({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context!,
          viewport: viewport
        };
        await page.render(renderContext).promise;
      }
    };

    if (pdfDoc && canvasRef.current) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, pdfScale]);

  const handleApplySignature = () => {
    if (sigPadRef.current) {
      if (sigPadRef.current.isEmpty()) {
        setError('Please draw a signature before applying.');
        return;
      }
      
      try {
        // Just use getCanvas directly, getTrimmedCanvas is known to cause crashes in some environments
        const canvas = sigPadRef.current.getCanvas();
        const dataUrl = canvas.toDataURL('image/png');
        setSigDataUrl(dataUrl);
        setShowSigPad(false);
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Error getting signature data:', err);
        setError('Failed to capture signature image. Please try drawing it again.');
      }
    }
  };

  const handleClearSignature = () => {
    sigPadRef.current?.clear();
  };

  const handleSignAndSubmit = async () => {
    if (!sigDataUrl) return setError('Please draw and apply your signature first.');
    if (!pdfBytes) return setError('PDF not loaded.');
    
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Load the original PDF
      const pdfLibDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfLibDoc.getPages();
      const targetPage = pages[currentPage - 1]; // 0-indexed
      const { width: pdfWidth, height: pdfHeight } = targetPage.getSize();
      // 2. Embed the signature PNG
      const sigImage = await pdfLibDoc.embedPng(sigDataUrl);
      
      // 3. Calculate scaling and position
      // Draggable box is fixed to 200x100 for simplicity
      const uiSigWidth = 200;
      const uiSigHeight = 100;
      const scaleFactorX = pdfWidth / pdfDimensions.width;
      const scaleFactorY = pdfHeight / pdfDimensions.height;
      // Calculate true coordinates (PDF points)
      const pdfX = sigPosition.x * scaleFactorX;
      const pdfY = pdfHeight - (sigPosition.y * scaleFactorY) - (uiSigHeight * scaleFactorY);
      // pdf-lib has origin at bottom-left, our UI has origin at top-left
      // we must subtract from the targetPage's true height

      targetPage.drawImage(sigImage, {
        x: pdfX,
        y: pdfY,
        width: uiSigWidth * scaleFactorX,
        height: uiSigHeight * scaleFactorY,
      });

      // 4. Save and generate File
      const savedPdfBytes = await pdfLibDoc.save();
      const signedFile = new File([new Uint8Array(savedPdfBytes)], `signed_document_${documentInfo.documentId}.pdf`, { type: 'application/pdf' });

      // 5. Submit to backend
      const formData = new FormData();
      formData.append('signatureId', id!);
      formData.append('signerId', user?.id || '');
      formData.append('signedFile', signedFile);

      await api.post('/signatures/sign', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error signing document.');
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.post(`/signatures/${id}/cancel`, { signerId: user?.id || '' });
    } catch (err) {
      console.error("Failed to log cancellation:", err);
    }
    navigate('/dashboard');
  };
  if (error && !documentInfo) return <div className="sign-container-fullscreen"><div className="error-message">{error}</div></div>;

  return (
    <div className="sign-container-fullscreen">
      {loading ? (
          <div className="loader-containers">
            <div className="loading-circle"></div>
            <p>Loading your documents...</p>
          </div>
        ) : (
          <>
      <div className="sign-header">
        <h2>Sign Document #{documentInfo?.documentId}</h2>
        <div className="sign-actions">
          <button className="secondary-button" onClick={handleCancel} disabled={isSubmitting}>Cancel</button>
          <button className="primary-button" onClick={handleSignAndSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Sign & Submit'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="pdf-workspace">
        <div className="pdf-toolbar">
          <button 
            disabled={currentPage <= 1 || isSubmitting} 
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="secondary-button"
          >
            Prev Page
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            disabled={currentPage >= totalPages || isSubmitting} 
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="secondary-button"
          >
            Next Page
          </button>

          {!sigDataUrl ? (
            <button className="action-button" onClick={() => setShowSigPad(true)} disabled={isSubmitting}>Create Signature</button>
          ) : (
            <button className="secondary-button" onClick={() => setSigDataUrl(null)} disabled={isSubmitting}>Remove Signature</button>
          )}
        </div>

        <div 
          className="pdf-viewer-container" 
          style={{ 
            position: 'relative', 
            width: pdfDimensions.width, 
            height: pdfDimensions.height, 
            margin: '0 auto', 
            border: '1px solid #ccc', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            backgroundColor: 'white'
          }}
        >
          <canvas ref={canvasRef} />

          {sigDataUrl && (
              <Draggable
                nodeRef={dragRef} /* 1. Pass the ref to Draggable */
                bounds="parent"
                position={sigPosition}
                // @ts-ignore - event parameter is required by library signature but unused
                onStop={(_e, data) => setSigPosition({ x: data.x, y: data.y })}
                disabled={isSubmitting}
              >
              <div 
                ref={dragRef} /* 2. Pass the exact same ref to the immediate child */
                style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                cursor: isSubmitting ? 'not-allowed' : 'move', 
                width: 200, 
                height: 100, 
                border: '2px dashed #3b82f6', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                zIndex: 10
                }}
              >
              <img src={sigDataUrl} alt="signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </Draggable>
          )}
        </div>
      </div>

      {/* Signature Pad Modal */}
      {showSigPad && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{marginTop: 0}}>Draw Your Signature</h3>
            <div className="sig-pad-container">
              <SignatureCanvas 
                ref={sigPadRef}
                canvasProps={{ width: 500, height: 200, className: 'sig-canvas' }}
              />
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={handleClearSignature}>Clear</button>
              <button className="secondary-button" onClick={() => setShowSigPad(false)}>Cancel</button>
              <button className="primary-button" onClick={handleApplySignature}>Apply Signature</button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
