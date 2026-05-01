import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/users', { email, username, password });
      navigate('/login');
    } catch (err: any) {
      console.error("Signup error:", err);
      let errorMessage = 'Error creating account. Please try again.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = typeof err.response.data === 'string' 
          ? err.response.data 
          : err.response.data?.message || errorMessage;
      } else if (err.request) {
        // The request was made but no response was received (e.g. Network Error / CORS)
        errorMessage = "Network Error: Could not connect to the backend. Please check your VITE_API_URL.";
      } else {
        // Something happened in setting up the request
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="one">
          <img src='pirma.svg'></img>
        </div>
        <div className="two">
          <h2>Create an Account</h2>
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="Enter your email address"
          />
        </div>

        <div className="form-group">
          <label>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            placeholder="Choose a username"
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="Create a password"
          />
        </div>

        <button type="submit" className="primary-button">Sign Up</button>
        
        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
        </div>
      </form>
    </div>
  );
}
