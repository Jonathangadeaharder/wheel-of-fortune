import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import WheelPage from './components/WheelPage.jsx';
import AdminPage from './components/AdminPage.jsx';
import './App.css';

function Navigation() {
  return (
    <nav className="navbar">
      <div className="nav-brand" style={{ textAlign: 'center' }}>
        <Trophy className="icon" />
        <span>Rueda de la Fortuna</span>
      </div>
    </nav>
  );
}

function App() {
  const [prizes, setPrizes] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastUpdateTimeRef = React.useRef(0);

  useEffect(() => {
    // Fetch data from server
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();

        if (data.prizes && data.prizes.length > 0) {
          // Only update if not recently modified (within last 2 seconds)
          const now = Date.now();
          if (now - lastUpdateTimeRef.current > 2000) {
            setPrizes(prevPrizes => {
              const prevJson = JSON.stringify(prevPrizes);
              const newJson = JSON.stringify(data.prizes);
              if (prevJson !== newJson) {
                return data.prizes;
              }
              return prevPrizes;
            });
          }
          setIsInitialized(true);
        } else if (!isInitialized) {
          // Use default prizes if server has none
          const defaultPrizes = [
        { id: 1, name: 'Café', quantity: 30, probability: 50, image_url: '', active: true, wheelCount: 3 },
        { id: 2, name: 'Gaseosa', quantity: 25, probability: 45, image_url: '', active: true, wheelCount: 1 },
        { id: 3, name: 'Agua', quantity: 30, probability: 50, image_url: '', active: true, wheelCount: 1 },
        { id: 4, name: 'Barra de Cereal', quantity: 20, probability: 40, image_url: '', active: true, wheelCount: 1 },
        { id: 5, name: 'Bombón', quantity: 15, probability: 35, image_url: '', active: true, wheelCount: 1 },
        { id: 6, name: 'Cachafaz', quantity: 12, probability: 30, image_url: '', active: true, wheelCount: 1 },
        { id: 7, name: 'Cerveza', quantity: 10, probability: 25, image_url: '', active: true, wheelCount: 1 },
        { id: 8, name: 'Guaymallén', quantity: 20, probability: 40, image_url: '', active: true, wheelCount: 1 },
        { id: 9, name: 'Jugo', quantity: 25, probability: 45, image_url: '', active: true, wheelCount: 1 },
        { id: 10, name: 'Kesitas', quantity: 18, probability: 38, image_url: '', active: true, wheelCount: 1 },
        { id: 11, name: 'Maní', quantity: 22, probability: 42, image_url: '', active: true, wheelCount: 1 },
        { id: 12, name: 'Marroc', quantity: 15, probability: 35, image_url: '', active: true, wheelCount: 1 },
        { id: 13, name: 'Muffin', quantity: 18, probability: 38, image_url: '', active: true, wheelCount: 1 },
        { id: 14, name: 'Papas', quantity: 25, probability: 45, image_url: '', active: true, wheelCount: 1 },
        { id: 15, name: 'Rex', quantity: 20, probability: 40, image_url: '', active: true, wheelCount: 1 },
        { id: 16, name: 'Saladix', quantity: 20, probability: 40, image_url: '', active: true, wheelCount: 1 },
        { id: 17, name: 'Pebete', quantity: 10, probability: 28, image_url: '', active: true, wheelCount: 1 },
        { id: 18, name: 'Miga', quantity: 12, probability: 30, image_url: '', active: true, wheelCount: 1 },
        { id: 19, name: 'Sánwich Mila', quantity: 8, probability: 25, image_url: '', active: true, wheelCount: 1 },
        { id: 20, name: 'Speed', quantity: 10, probability: 28, image_url: '', active: true, wheelCount: 1 },
        { id: 21, name: 'Será la próxima vez', probability: 50, image_url: '❌', active: true, wheelCount: 3, isLosePrize: true }
          ];
          setPrizes(defaultPrizes);
          setIsInitialized(true);
          // Save defaults to server
          await fetch('/api/prizes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaultPrizes)
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!isInitialized) {
        // Fallback to default prizes on error
        const defaultPrizes = [
        { id: 1, name: 'Café', quantity: 30, probability: 50, image_url: '', active: true, wheelCount: 3 },
        { id: 2, name: 'Gaseosa', quantity: 25, probability: 45, image_url: '', active: true, wheelCount: 1 },
        { id: 3, name: 'Agua', quantity: 30, probability: 50, image_url: '', active: true, wheelCount: 1 },
        { id: 4, name: 'Barra de Cereal', quantity: 20, probability: 40, image_url: '', active: true, wheelCount: 1 },
        { id: 5, name: 'Bombón', quantity: 15, probability: 35, image_url: '', active: true, wheelCount: 1 },
        { id: 6, name: 'Cachafaz', quantity: 12, probability: 30, image_url: '', active: true, wheelCount: 1 },
        { id: 7, name: 'Cerveza', quantity: 10, probability: 25, image_url: '', active: true, wheelCount: 1 },
        { id: 8, name: 'Guaymallén', quantity: 20, probability: 40, image_url: '', active: true, wheelCount: 1 },
        { id: 9, name: 'Jugo', quantity: 25, probability: 45, image_url: '', active: true, wheelCount: 1 },
        { id: 10, name: 'Kesitas', quantity: 18, probability: 38, image_url: '', active: true, wheelCount: 1 },
        { id: 11, name: 'Maní', quantity: 22, probability: 42, image_url: '', active: true, wheelCount: 1 },
        { id: 12, name: 'Marroc', quantity: 15, probability: 35, image_url: '', active: true, wheelCount: 1 },
        { id: 13, name: 'Muffin', quantity: 18, probability: 38, image_url: '', active: true, wheelCount: 1 },
        { id: 14, name: 'Papas', quantity: 25, probability: 45, image_url: '', active: true, wheelCount: 1 },
        { id: 15, name: 'Rex', quantity: 20, probability: 40, image_url: '', active: true, wheelCount: 1 },
        { id: 16, name: 'Saladix', quantity: 20, probability: 40, image_url: '', active: true, wheelCount: 1 },
        { id: 17, name: 'Pebete', quantity: 10, probability: 28, image_url: '', active: true, wheelCount: 1 },
        { id: 18, name: 'Miga', quantity: 12, probability: 30, image_url: '', active: true, wheelCount: 1 },
        { id: 19, name: 'Sánwich Mila', quantity: 8, probability: 25, image_url: '', active: true, wheelCount: 1 },
        { id: 20, name: 'Speed', quantity: 10, probability: 28, image_url: '', active: true, wheelCount: 1 },
        { id: 21, name: 'Será la próxima vez', probability: 50, image_url: '❌', active: true, wheelCount: 3, isLosePrize: true }
        ];
          setPrizes(defaultPrizes);
          setIsInitialized(true);
        }
      }
    };
    fetchData();
    
    // Poll for changes every 2 seconds to sync with admin changes
    const interval = setInterval(fetchData, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const updatePrizes = async (newPrizes) => {
    setPrizes(newPrizes);
    lastUpdateTimeRef.current = Date.now();
    // Save to server instead of localStorage
    try {
      await fetch('/api/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrizes)
      });
    } catch (error) {
      console.error('Error saving prizes:', error);
    }
  };

  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route 
              path="/" 
              element={<WheelPage prizes={prizes} updatePrizes={updatePrizes} />} 
            />
            <Route 
              path="/admin" 
              element={<AdminPage prizes={prizes} updatePrizes={updatePrizes} />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
