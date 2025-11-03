import React from 'react';
import './App.css';
import PassKeyAuth from './PassKeyAuth';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>PassKey Authentication Example</h1>
        <p>This application demonstrates PassKey authentication with Keycloak integration</p>
      </header>
      
      <main className="App-main">
        <PassKeyAuth />
      </main>
    </div>
  )
}

export default App