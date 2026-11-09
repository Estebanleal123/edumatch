import { Route, Routes } from "react-router-dom";
import Prueba from "./pages/Prueba";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Prueba />} />
      <Route path="/admin" element={<Dashboard />} />
    </Routes>
  );
}
