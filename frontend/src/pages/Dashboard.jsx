import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Cerebro from "../components/Cerebro";
import Logo from "../components/Logo";
import { api } from "../api";

export default function Dashboard() {
  const [token, setToken] = useState(localStorage.getItem("edumatch_token") || "");
  const [usuario, setUsuario] = useState("admin");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [lista, setLista] = useState([]);
  const [colegio, setColegio] = useState("todos");
  const [salon, setSalon] = useState("todos");
  const [busca, setBusca] = useState("");

  async function entrar(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ usuario, clave }),
      });
      localStorage.setItem("edumatch_token", data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  function salir() {
    localStorage.removeItem("edumatch_token");
    setToken("");
    setLista([]);
  }

  useEffect(() => {
    if (!token) return;
    api("/api/admin/estudiantes")
      .then(setLista)
      .catch((err) => {
        setError(err.message);
        if (err.message.includes("admin")) salir();
      });
  }, [token]);

  const colegios = useMemo(() => ["todos", ...new Set(lista.map((item) => item.colegio))], [lista]);
  const salones = useMemo(() => ["todos", ...new Set(lista.map((item) => item.salon))], [lista]);
  const visibles = lista.filter((item) => {
    const okColegio = colegio === "todos" || item.colegio === colegio;
    const okSalon = salon === "todos" || item.salon === salon;
    const okNombre = item.nombre.toLowerCase().includes(busca.trim().toLowerCase());
    return okColegio && okSalon && okNombre;
  });

  const hombres = visibles.filter((item) => item.genero === "hombre").length;
  const mujeres = visibles.filter((item) => item.genero === "mujer").length;
  const promedio = visibles.length
    ? (visibles.reduce((suma, item) => suma + Number(item.promedio), 0) / visibles.length).toFixed(2)
    : "0";

  const carreras = {};
  visibles.forEach((item) => {
    const primera = item.recomendaciones[0];
    if (!primera) return;
    carreras[primera.carrera] = (carreras[primera.carrera] || 0) + 1;
  });
  const barras = Object.entries(carreras).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxBarra = Math.max(1, ...barras.map((item) => item[1]));

  if (!token) {
    return (
      <div className="app tone-mix">
        <div className="login-wrap">
          <form className="panel login" onSubmit={entrar}>
            <Cerebro />
            <div className="brand">
              <Logo tone="mix" />
              <div>
                <strong>EduMatch</strong>
                <span>Dashboard del admin</span>
              </div>
            </div>
            <h2>Entra para ver los resultados</h2>
            {error && <div className="error">{error}</div>}
            <label>Usuario</label>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            <label>Clave</label>
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
            <p className="hint">Demo: usuario admin, clave edumatch</p>
            <div className="row">
              <button className="btn" type="submit">Entrar</button>
              <Link className="linkish" to="/">Ir a la prueba</Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app tone-mix">
      <div className="dash">
        <aside className="side">
          <div className="brand">
            <Logo tone="mix" size={40} />
            <strong>EduMatch</strong>
          </div>
          <nav>
            <div className="navbtn on">Resultados</div>
            <Link className="navbtn" to="/">Prueba del estudiante</Link>
          </nav>
        </aside>
        <section className="main">
          <header className="dash-top" style={{ padding: 0, marginBottom: 16 }}>
            <div>
              <strong>Dashboard</strong>
              <div className="muted">Colegio, salón, promedio y 3 opciones por estudiante</div>
            </div>
            <div className="spacer" />
            <button className="btn eraser" type="button" onClick={salir}>Salir</button>
          </header>
          {error && <div className="error">{error}</div>}
          <div className="filters">
            <input placeholder="Buscar estudiante" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <select value={colegio} onChange={(e) => setColegio(e.target.value)}>
              {colegios.map((item) => <option key={item} value={item}>{item === "todos" ? "Todos los colegios" : item}</option>)}
            </select>
            <select value={salon} onChange={(e) => setSalon(e.target.value)}>
              {salones.map((item) => <option key={item} value={item}>{item === "todos" ? "Todos los salones" : item}</option>)}
            </select>
          </div>
          <div className="stats">
            <article className="stat"><span className="muted">Estudiantes</span><b>{visibles.length}</b></article>
            <article className="stat"><span className="muted">Hombres</span><b style={{ color: "var(--blue)" }}>{hombres}</b></article>
            <article className="stat"><span className="muted">Mujeres</span><b style={{ color: "var(--pink)" }}>{mujeres}</b></article>
            <article className="stat"><span className="muted">Promedio del grupo</span><b>{promedio}</b></article>
          </div>
          <div className="pizarra">
            <Cerebro />
          <div className="charts">
            <article className="chart-card">
              <strong>Por género</strong>
              <div className="donut-wrap">
                <Donut hombres={hombres} mujeres={mujeres} />
                <div className="legend">
                  <div><i className="swatch" style={{ background: "var(--blue)" }} />Hombres {hombres}</div>
                  <div><i className="swatch" style={{ background: "var(--pink)" }} />Mujeres {mujeres}</div>
                </div>
              </div>
            </article>
            <article className="chart-card">
              <strong>Carrera más alta por estudiante</strong>
              <div className="h-bars">
                {barras.length === 0 && <p className="muted">Todavía no hay pruebas.</p>}
                {barras.map(([nombre, total]) => (
                  <div key={nombre}>
                    <span>{nombre} · {total}</span>
                    <div className="h-track"><i style={{ width: `${(total / maxBarra) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </article>
          </div>
          <article className="chart-card">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Colegio</th>
                  <th>Salón</th>
                  <th>Promedio</th>
                  <th>3 opciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="who">
                        <i className={`dot ${item.genero}`} />
                        <div>
                          <strong>{item.nombre}</strong>
                          {item.demo && <div><span className="chip">ejemplo</span></div>}
                        </div>
                      </div>
                    </td>
                    <td>{item.colegio}</td>
                    <td>{item.salon}</td>
                    <td>{Number(item.promedio).toFixed(1)}</td>
                    <td>
                      <div className="mini">
                        {item.recomendaciones.map((opcion, indice) => (
                          <div key={opcion.carrera}>
                            <span>{indice + 1}. {opcion.carrera}</span>
                            <b style={{ color: item.genero === "mujer" ? "var(--pink)" : "var(--blue)" }}>{opcion.porcentaje}%</b>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
          </div>
        </section>
      </div>
    </div>
  );
}

function Donut({ hombres, mujeres }) {
  const total = hombres + mujeres || 1;
  const radio = 42;
  const circunferencia = 2 * Math.PI * radio;
  const azul = (hombres / total) * circunferencia;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={radio} fill="none" stroke="#fb4b93" strokeWidth="14" />
      <circle
        cx="60"
        cy="60"
        r={radio}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="14"
        strokeDasharray={`${azul} ${circunferencia - azul}`}
        strokeLinecap="butt"
        transform="rotate(-90 60 60)"
      />
      <circle cx="60" cy="60" r="28" fill="#1b4c52" />
    </svg>
  );
}
