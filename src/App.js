import React, { useState, useEffect } from 'react';
import { Calendar, Euro, User, Mail, Phone, Trash2, CheckCircle, XCircle, Clock, TrendingUp, LogOut } from 'lucide-react';
import { sendConfirmationEmail, sendRejectionEmail } from './emailService';

const API_URL = 'https://villa-marina-api.onrender.com/api';

// ============================================
// COMPONENTE PRINCIPALE
// ============================================

const AdminPanel = () => {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Controlla se già autenticato
    const token = localStorage.getItem('adminToken');
    if (token === 'admin-authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    setLoginError('');
    
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        localStorage.setItem('adminToken', data.token);
        setPassword('');
        setUsername('');
      } else {
        const error = await response.json();
        setLoginError(error.error || 'Credenziali non valide');
      }
    } catch (error) {
      console.error('Errore login:', error);
      setLoginError('Errore di connessione al server');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setPassword('');
    setUsername('');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/bookings`),
        fetch(`${API_URL}/stats`)
      ]);

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      alert('Errore di connessione al server. Verifica che il backend sia attivo.');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (id, status) => {
    try {
      const booking = bookings.find(b => b.id === id);
      
      if (!booking) {
        alert('Prenotazione non trovata');
        return;
      }
      
      // Prepara i dati corretti per l'update
      const updateData = {
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        guests: booking.guests,
        startDate: booking.start_date,
        endDate: booking.end_date,
        price: booking.price,
        status: status,
        notes: booking.notes || ''
      };
      
      const response = await fetch(`${API_URL}/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Invia email al cliente
        try {
          if (status === 'confirmed') {
            await sendConfirmationEmail(booking);
            alert('✅ Prenotazione confermata! Email di conferma inviata al cliente.');
          } else if (status === 'cancelled') {
            await sendRejectionEmail(booking);
            alert('✅ Prenotazione rifiutata. Email inviata al cliente.');
          }
        } catch (emailError) {
          console.error('Errore invio email:', emailError);
          alert('✅ Prenotazione aggiornata, ma errore invio email.');
        }
        
        await loadData();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error || 'Impossibile aggiornare la prenotazione'}`);
      }
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      alert('Errore aggiornamento prenotazione. Controlla la connessione.');
    }
  };

  const deleteBooking = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa prenotazione?')) return;

    try {
      const response = await fetch(`${API_URL}/bookings/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
        alert('Prenotazione eliminata');
      }
    } catch (error) {
      alert('Errore cancellazione prenotazione');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Confermata';
      case 'pending': return 'In Attesa';
      case 'cancelled': return 'Cancellata';
      default: return status;
    }
  };

  // ============================================
  // SCHERMATA LOGIN
  // ============================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Login</h1>
            <p className="text-gray-600">Villa Marina - Pannello Amministrazione</p>
          </div>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Inserisci password"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:border-blue-500 focus:outline-none text-lg"
            autoFocus
          />
          
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-lg"
          >
            Accedi
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // PANNELLO ADMIN
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-xl">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header con Logout */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Pannello Admin</h1>
            <p className="text-gray-600">Gestione prenotazioni Villa Marina</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        {/* Statistiche */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Totale Prenotazioni</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_bookings || 0}</p>
                </div>
                <Calendar className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Confermate</p>
                  <p className="text-3xl font-bold text-green-600">{stats.confirmed || 0}</p>
                </div>
                <CheckCircle className="text-green-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Attesa</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending || 0}</p>
                </div>
                <Clock className="text-yellow-500" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fatturato Totale</p>
                  <p className="text-3xl font-bold text-blue-600">€{Math.round(stats.total_revenue || 0)}</p>
                </div>
                <TrendingUp className="text-blue-500" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Filtri */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tutte ({bookings.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'pending' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Attesa ({bookings.filter(b => b.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'confirmed' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Confermate ({bookings.filter(b => b.status === 'confirmed').length})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'cancelled' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancellate ({bookings.filter(b => b.status === 'cancelled').length})
            </button>
          </div>
        </div>

        {/* Tabella Prenotazioni */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ospiti
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Prezzo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Nessuna prenotazione trovata
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <User className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                          <div>
                            <p className="font-semibold text-gray-900">{booking.name}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Mail size={14} /> {booking.email}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Phone size={14} /> {booking.phone}
                            </p>
                            {booking.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">Note: {booking.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {new Date(booking.start_date).toLocaleDateString('it-IT')}
                          </p>
                          <p className="text-gray-600">↓</p>
                          <p className="font-medium text-gray-900">
                            {new Date(booking.end_date).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 font-medium">{booking.guests}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Euro size={16} className="text-blue-600" />
                          <span className="font-bold text-gray-900">{booking.price}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                          {getStatusIcon(booking.status)}
                          {getStatusText(booking.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                                title="Conferma"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                                title="Rifiuta"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteBooking(booking.id)}
                            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            title="Elimina"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Ultimo aggiornamento: {new Date().toLocaleString('it-IT')}</p>
          <p className="mt-1">API endpoint: {API_URL}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
