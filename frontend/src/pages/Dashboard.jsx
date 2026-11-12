import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { api } from "../api";

export default function Dashboard() {
  const [token, setToken] = useState(localStorage.getItem("edumatch_token") || "");
  const [usuario, setUsuario] = useState("admin");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [lista, setLista] = useState([]);
  const [elegido, setElegido] = useState("");
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
    setElegido("");
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

  const colegios = useMemo(() => agrupar(lista), [lista]);
  const actual = colegios.find((item) => item.nombre === elegido);
  const delColegio = actual ? actual.estudiantes : [];
  const salones = useMemo(() => ["todos", ...new Set(delColegio.map((item) => item.salon))], [delColegio]);
  const visibles = delColegio.filter((item) => {
    const okSalon = salon === "todos" || item.salon === salon;
    const okNombre = item.nombre.toLowerCase().includes(busca.trim().toLowerCase());
    return okSalon && okNombre;
  });

  const total = lista.length || 1;
  const promedioGeneral = lista.length
    ? (lista.reduce((suma, item) => suma + Number(item.promedio), 0) / lista.length).toFixed(2)
    : "0";
  const barrasColegio = colegios.map((item) => ({
    nombre: item.nombre,
    total: item.estudiantes.length,
    porcentaje: Math.round((item.estudiantes.length / total) * 100),
  }));
  const maxColegio = Math.max(1, ...barrasColegio.map((item) => item.total));
  const barrasCarrera = actual ? carrerasDe(visibles) : carrerasDe(lista);
  const maxCarrera = Math.max(1, ...barrasCarrera.map((item) => item.total));
  const hombresVista = (actual ? visibles : lista).filter((item) => item.genero === "hombre").length;
  const mujeresVista = (actual ? visibles : lista).filter((item) => item.genero === "mujer").length;

  function abrir(nombre) {
    setElegido(nombre);
    setSalon("todos");
    setBusca("");
  }

  if (!token) {
    return (
      <div className="app">
        <div className="login-wrap">
          <form className="panel login" onSubmit={entrar}>
            <div className="brand">
              <Logo />
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
    <div className="app">
      <div className="dash">
        <aside className="side">
          <div className="brand">
            <Logo size={40} />
            <strong>EduMatch</strong>
          </div>
          <nav>
            <button type="button" className={elegido ? "navbtn" : "navbtn on"} onClick={() => abrir("")}>Colegios</button>
            <Link className="navbtn" to="/">Prueba del estudiante</Link>
          </nav>
        </aside>
        <section className="main">
          <header className="dash-top" style={{ padding: 0, marginBottom: 16 }}>
            <div>
              <strong>{actual ? actual.nombre : "Colegios"}</strong>
              <div className="muted">
                {actual ? "Salón, promedio y 3 opciones de cada estudiante" : "Suba y Los Mártires. Entra a un colegio para ver a sus estudiantes."}
              </div>
            </div>
            <div className="spacer" />
            {actual && <button className="btn ghost" type="button" onClick={() => abrir("")}>Volver</button>}
            <button className="btn ghost" type="button" onClick={salir}>Salir</button>
          </header>
          {error && <div className="error">{error}</div>}

          {!actual && (
            <>
              <div className="stats">
                <article className="stat"><span className="muted">Colegios</span><b>{colegios.length}</b></article>
                <article className="stat"><span className="muted">Estudiantes</span><b>{lista.length}</b></article>
                <article className="stat"><span className="muted">Hombres</span><b style={{ color: "var(--blue)" }}>{hombresVista}</b></article>
                <article className="stat"><span className="muted">Promedio</span><b>{promedioGeneral}</b></article>
              </div>
              <div className="panel">
                <div className="charts">
                  <article className="chart-card">
                    <strong>Pruebas por colegio</strong>
                    <div className="h-bars">
                      {barrasColegio.length === 0 && <p className="muted">Todavía no hay pruebas.</p>}
                      {barrasColegio.map((item) => (
                        <div key={item.nombre}>
                          <span>{corto(item.nombre)} · {item.porcentaje}%</span>
                          <div className="h-track"><i style={{ width: `${(item.total / maxColegio) * 100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="chart-card">
                    <strong>Carrera más alta en el sector</strong>
                    <Barras items={barrasCarrera} maximo={maxCarrera} />
                  </article>
                </div>
                <div className="colegio-lista">
                  {colegios.map((item) => (
                    <button type="button" className="colegio-card" key={item.nombre} onClick={() => abrir(item.nombre)}>
                      <strong>{item.nombre}</strong>
                      <span>{item.estudiantes.length} estudiantes · promedio {item.promedio.toFixed(2)}</span>
                      {item.carrera && <b>{item.carrera} · {item.porcentaje}%</b>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {actual && (
            <>
              <div className="filters">
                <input placeholder="Buscar estudiante" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <select value={salon} onChange={(e) => setSalon(e.target.value)}>
                  {salones.map((item) => <option key={item} value={item}>{item === "todos" ? "Todos los salones" : item}</option>)}
                </select>
              </div>
              <div className="stats">
                <article className="stat"><span className="muted">Estudiantes</span><b>{visibles.length}</b></article>
                <article className="stat"><span className="muted">Hombres</span><b style={{ color: "var(--blue)" }}>{hombresVista}</b></article>
                <article className="stat"><span className="muted">Mujeres</span><b style={{ color: "var(--pink)" }}>{mujeresVista}</b></article>
                <article className="stat"><span className="muted">Promedio del grupo</span><b>{promedioDe(visibles)}</b></article>
              </div>
              <div className="panel">
                <div className="charts">
                  <article className="chart-card">
                    <strong>Por género</strong>
                    <div className="donut-wrap">
                      <Donut hombres={hombresVista} mujeres={mujeresVista} />
                      <div className="legend">
                        <div><i className="swatch" style={{ background: "var(--blue)" }} />Hombres {hombresVista}</div>
                        <div><i className="swatch" style={{ background: "var(--pink)" }} />Mujeres {mujeresVista}</div>
                      </div>
                    </div>
                  </article>
                  <article className="chart-card">
                    <strong>Carrera más alta por estudiante</strong>
                    <Barras items={barrasCarrera} maximo={maxCarrera} />
                  </article>
                </div>
                <article className="chart-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Estudiante</th>
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function agrupar(lista) {
  const grupos = new Map();
  lista.forEach((item) => {
    if (!grupos.has(item.colegio)) grupos.set(item.colegio, []);
    grupos.get(item.colegio).push(item);
  });
  return [...grupos.entries()].map(([nombre, estudiantes]) => {
    const top = carrerasDe(estudiantes)[0];
    return {
      nombre,
      estudiantes,
      promedio: estudiantes.reduce((suma, item) => suma + Number(item.promedio), 0) / estudiantes.length,
      carrera: top ? top.nombre : "",
      porcentaje: top ? Math.round((top.total / estudiantes.length) * 100) : 0,
    };
  }).sort((a, b) => b.estudiantes.length - a.estudiantes.length || a.nombre.localeCompare(b.nombre, "es"));
}

function carrerasDe(estudiantes) {
  const conteo = {};
  estudiantes.forEach((item) => {
    const primera = item.recomendaciones[0];
    if (primera) conteo[primera.carrera] = (conteo[primera.carrera] || 0) + 1;
  });
  return Object.entries(conteo)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function promedioDe(estudiantes) {
  if (!estudiantes.length) return "0";
  return (estudiantes.reduce((suma, item) => suma + Number(item.promedio), 0) / estudiantes.length).toFixed(2);
}

function corto(nombre) {
  return nombre.replace("Colegio ", "").replace(" (IED)", "");
}

function Barras({ items, maximo }) {
  if (!items.length) return <p className="muted">Todavía no hay pruebas.</p>;
  return (
    <div className="h-bars">
      {items.map((item) => (
        <div key={item.nombre}>
          <span>{item.nombre} · {item.total}</span>
          <div className="h-track"><i style={{ width: `${(item.total / maximo) * 100}%` }} /></div>
        </div>
      ))}
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
      <circle cx="60" cy="60" r="28" fill="#ffffff" />
    </svg>
  );
}
