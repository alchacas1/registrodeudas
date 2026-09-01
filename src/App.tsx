import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { GroupPage } from "./pages/GroupPage";
import { AuthGate } from "./components/AuthGate";

function App() {
  return (
    <AuthGate><BrowserRouter>
      <Routes><Route path="/" element={<Home />} /><Route path="/group/:id" element={<GroupPage />} /></Routes>
    </BrowserRouter></AuthGate>
  );
}

export default App;
