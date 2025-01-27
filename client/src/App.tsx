import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import LandingPage from "./pages/LandingPage";
import BuilderPage from "./pages/BuilderPage";
import PreviewPage from "./pages/PreviewPage";
import Navbar from "./components/Navbar";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/preview" element={<PreviewPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
