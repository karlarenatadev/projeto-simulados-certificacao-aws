import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '@/contexts/UserContext';
import './login.css';

export default function Login() {
  const { login } = useContext(UserContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, fullName, nickname);
    
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">Cloud Academy A3</h1>
        <p className="login-card__subtitle">Acesso exclusivo para associados A3Data</p>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-form__error">{error}</div>}
          
          <div className="login-form__group">
            <label className="login-form__label">E-mail Corporativo *</label>
            <input 
              type="email" 
              className="login-form__input" 
              placeholder="nome@a3data.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-form__group">
            <label className="login-form__label">Nome Completo</label>
            <input 
              type="text" 
              className="login-form__input" 
              placeholder="Ex: Maria da Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="login-form__group">
            <label className="login-form__label">Nickname (Opcional)</label>
            <input 
              type="text" 
              className="login-form__input" 
              placeholder="Ex: mariasilva"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <button type="submit" className="login-form__btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Acessar Plataforma'}
          </button>
        </form>
      </div>
    </div>
  );
}
