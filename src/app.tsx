import React, { useState } from 'react';

const App: React.FC = () => {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(0);

  return (
    <div className="container">
      <h1>Simple React App</h1>
      <p>A clean, modern web application built with React and TypeScript</p>

      <div className="features">
        <div className="feature">
          <h3>⚛️ React</h3>
          <p>Component-based UI</p>
        </div>
        <div className="feature">
          <h3>📘 TypeScript</h3>
          <p>Type-safe development</p>
        </div>
        <div className="feature">
          <h3>🎯 Simple</h3>
          <p>Easy to understand</p>
        </div>
      </div>

      <div className="counter">{count}</div>

      <button className="button" onClick={increment}>+</button>
      <button className="button" onClick={decrement}>-</button>
      <button className="button" onClick={reset}>Reset</button>
    </div>
  );
};

export default App;