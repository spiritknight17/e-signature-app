import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requestedDocs, setRequestedDocs] = useState<any[]>([]);
  const [documentsToSign, setDocumentsToSign] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true); 
        const docsRes = await api.get('/documents');
        const sigsRes = await api.get('/signatures');
        const allDocs = docsRes.data;
        const allSigs = sigsRes.data;

        const myRequests = allDocs.filter((d: any) => d.requester === user.id);
        setRequestedDocs(myRequests);

        const mySignatures = allSigs.filter((s: any) => s.signer === user.id);
        const toSignList = mySignatures.map((sig: any) => {
          const relatedDoc = allDocs.find((d: any) => d.documentId === sig.documentId);
          return { ...sig, document: relatedDoc };
        });

        setDocumentsToSign(toSignList);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        // 2. Stop loading whether it succeeded or failed
        setLoading(false); 
      }
    };

    fetchDashboardData();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {loading ? (
          <div className="loader-container">
            <div className="loading-circle"></div>
            <p>Loading your documents...</p>
          </div>
        ) : (
          <>
      <header className="dashboard-header">
        <img src='pirma.svg'></img>
        <h1>Welcome, {user?.username}</h1>
        <nav>
          <Link to="/upload" className="primary-button">Request Signature</Link>
          <button onClick={handleLogout} className="secondary-button">Logout</button>
        </nav>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          {/* ... (Documents to Sign content) */}
          <h2>Documents I Need to Sign</h2>
          {documentsToSign.length === 0 ? (
            <p className="empty-state">You have no pending documents to sign.</p>
          ) : (
            <ul className="document-list">
              {documentsToSign.map((sig) => (
                <li key={sig.signatureId} className="document-card">
                  <div className="doc-info">
                    <strong>Document #{sig.documentId}</strong>
                    <span className={`status badge-${sig.status}`}>{sig.status}</span>
                  </div>
                  {sig.status === 'pending' ? (
                     <Link to={`/sign/${sig.signatureId}`} className="action-button">Sign Now</Link>
                  ) : (
                     <a href={sig.document?.signedFile} target="_blank" rel="noreferrer" className="action-link">View Signed</a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-section">
          {/* ... (Requested Documents content) */}
          <h2>Documents I Requested</h2>
          {requestedDocs.length === 0 ? (
            <p className="empty-state">You haven't requested any signatures yet.</p>
          ) : (
            <ul className="document-list">
              {requestedDocs.map((doc) => (
                <li key={doc.documentId} className="document-card">
                  <div className="doc-info">
                    <strong>Document #{doc.documentId}</strong>
                    <span className={`status badge-${doc.status}`}>{doc.status}</span>
                  </div>
                  <div className="doc-actions">
                    <a href={doc.unsignedFile} target="_blank" rel="noreferrer" className="action-link">View Original</a>
                    {doc.signedFile && (
                      <a href={doc.signedFile} target="_blank" rel="noreferrer" className="action-button">View Signed</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      </>
        )}
    </div>
  );
}
