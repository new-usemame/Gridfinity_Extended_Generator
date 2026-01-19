import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { HomePage } from './pages/HomePage/HomePage';
import { Generator } from './pages/Generator/Generator';
import { About } from './pages/About/About';
import { Features } from './pages/Features/Features';
import { Comparison } from './pages/Comparison/Comparison';
import { Donate } from './pages/Donate/Donate';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/generator" element={<Generator />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/comparison" element={<Comparison />} />
        <Route path="/donate" element={<Donate />} />
      </Routes>
    </Layout>
  );
}

export default App;
