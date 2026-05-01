import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const isEmail = identifier.includes('@');
      const payload = isEmail 
        ? { email: identifier, password }
        : { username: identifier, password };

      const response = await api.post('/users/login', payload);
      
      // Save session/user
      login(response.data.user, response.data.session.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid login credentials. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="one">
          <img src='pirma.svg'></img>
        </div>
        <div className="two">
          <h2>Login to Your Account</h2>
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label>Email or Username</label>
          <input 
            type="text" 
            value={identifier} 
            onChange={(e) => setIdentifier(e.target.value)} 
            required 
            placeholder="Enter your email or username"
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" className="primary-button">Login</button>
        
        <p className="auth-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
        </div>
      </form>
    </div>
  );
}
