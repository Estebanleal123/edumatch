import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BuscadorColegio from "../components/BuscadorColegio";
import Logo from "../components/Logo";
import { api } from "../api";

const FICHA = {
  "Ingeniería de Software": { area: "Tecnología", tags: ["Tecnología", "Lógica"] },
  Medicina: { area: "Salud", tags: ["Salud", "Cuidado"] },
  "Diseño digital": { area: "Tecnología y arte", tags: ["Creatividad", "Tecnología"] },
  "Administración de empresas": { area: "Negocios", tags: ["Organización", "Decisión"] },
  Psicología: { area: "Salud y humanidades", tags: ["Escucha", "Personas"] },
  Derecho: { area: "Negocios y comunicación", tags: ["Argumento", "Justicia"] },
  Arquitectura: { area: "Arte y construcción", tags: ["Espacio", "Estructura"] },
  "Ingeniería industrial": { area: "Tecnología", tags: ["Procesos", "Orden"] },
  "Comunicación social": { area: "Negocios y comunicación", tags: ["Relato", "Personas"] },
  Contaduría: { area: "Negocios", tags: ["Números", "Orden"] },
};

function fichaDe(nombre) {
  return FICHA[nombre] || { area: "Orientación", tags: ["Afinidad"] };
}

const vacio = { nombre: "", genero: "", colegio: "", salon: "", promedio: "" };

export default function Prueba() {
  const [fase, setFase] = useState("datos");
  const [datos, setDatos] = useState(vacio);
  const [quiz, setQuiz] = useState([]);
  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [queda, setQueda] = useState(null);
  const [colegios, setColegios] = useState([]);

  const pregunta = quiz[paso];
  const primera = resultado?.recomendaciones?.[0];

  useEffect(() => {
    api("/api/quiz").then(setQuiz).catch(() => setError("No pude cargar la prueba. Revisa que el servidor esté encendido."));
    api("/api/colegios").then(setColegios).catch(() => setError("No pude cargar los colegios. Revisa que el servidor esté encendido."));
  }, []);

  useEffect(() => {
    if (!pregunta || pregunta.type !== "speed") {
      setQueda(null);
      return;
    }
    setQueda(pregunta.segundos);
    const id = setInterval(() => {
      setQueda((valor) => (valor === null ? valor : Math.max(0, valor - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [pregunta]);

  function cambiar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  function respuestaActual() {
    return respuestas[pregunta?.id];
  }

  function lista(valor) {
    setRespuestas((prev) => ({ ...prev, [pregunta.id]: valor }));
  }

  function elegirUna(id) {
    lista(id);
  }

  function elegirVarias(id) {
    const actual = Array.isArray(respuestaActual()) ? respuestaActual() : [];
    if (actual.includes(id)) lista(actual.filter((item) => item !== id));
    else if (actual.length < pregunta.elige) lista([...actual, id]);
  }

  function ordenar(id) {
    const actual = Array.isArray(respuestaActual()) ? respuestaActual() : [];
    if (actual.includes(id)) lista(actual.filter((item) => item !== id));
    else lista([...actual, id]);
  }

  function pasoListo() {
    const valor = respuestaActual();
    if (!pregunta) return false;
    if (pregunta.type === "single" || pregunta.type === "speed") return typeof valor === "string";
    if (pregunta.type === "multi") return Array.isArray(valor) && valor.length === pregunta.elige;
    if (pregunta.type === "rank") return Array.isArray(valor) && valor.length === pregunta.opciones.length;
    return false;
  }

  async function enviar(event) {
    event.preventDefault();
    setError("");
    if (!datos.genero) {
      setError("Elige hombre o mujer.");
      return;
    }
    const promedio = Number(datos.promedio);
    if (!datos.nombre.trim() || !datos.salon.trim() || Number.isNaN(promedio)) {
      setError("Completa nombre, salón y promedio.");
      return;
    }
    if (!colegios.some((item) => item.nombre === datos.colegio)) {
      setError("Busca tu colegio y selecciónalo de la lista.");
      return;
    }
    if (promedio < 0 || promedio > 5) {
      setError("El promedio va de 0 a 5.");
      return;
    }
    setFase("quiz");
    setPaso(0);
  }

  async function terminar() {
    setCargando(true);
    setError("");
    try {
      const data = await api("/api/intentos", {
        method: "POST",
        body: JSON.stringify({
          ...datos,
          promedio: Number(datos.promedio),
          respuestas,
        }),
      });
      setResultado(data);
      setFase("resultado");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setDatos(vacio);
    setRespuestas({});
    setResultado(null);
    setPaso(0);
    setFase("datos");
    setError("");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <strong>EduMatch</strong>
            <span>Orientación vocacional</span>
          </div>
        </div>
        <div className="spacer" />
        <Link className="linkish" to="/admin">Dashboard</Link>
      </header>

      <main className="wrap">
        {error && <div className="error">{error}</div>}

        {fase === "datos" && (
          <>
          <section className="hero-dark">
            <div>
              <span className="pill">Orientación para el colegio</span>
              <p className="frase">Piensa bien lo que quieres elegir.</p>
              <h1>Tu futuro profesional empieza a tomar forma.</h1>
              <p>Seis actividades cortas y, al final, tres carreras ordenadas según lo que respondiste.</p>
            </div>
            <div className="hero-stats">
              <article className="hero-stat"><b>10</b><span>Carreras en el catálogo</span></article>
              <article className="hero-stat"><b>Top 3</b><span>Opciones al terminar</span></article>
              <article className="hero-stat"><b>6</b><span>Actividades de la prueba</span></article>
              <article className="hero-stat"><b>10</b><span>Colegios de Suba y Los Mártires</span></article>
            </div>
          </section>
          <section className="sheet">
            <h2>Cuéntanos de ti</h2>
            <p className="kicker">El colegio ve el resultado en el dashboard. El género solo queda en el registro.</p>
            <form onSubmit={enviar}>
              <label>Género</label>
              <div className="genders">
                <button type="button" className={datos.genero === "hombre" ? "gender on" : "gender"} onClick={() => cambiar("genero", "hombre")}>
                  <b>Hombre</b>
                </button>
                <button type="button" className={datos.genero === "mujer" ? "gender on" : "gender"} onClick={() => cambiar("genero", "mujer")}>
                  <b>Mujer</b>
                </button>
              </div>
              <div className="grid-2">
                <div>
                  <label>Nombre</label>
                  <input value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                  <label>Colegio de Suba o Los Mártires</label>
                  <BuscadorColegio colegios={colegios} valor={datos.colegio} onElegir={(nombre) => cambiar("colegio", nombre)} />
                </div>
                <div>
                  <label>Salón</label>
                  <input value={datos.salon} onChange={(e) => cambiar("salon", e.target.value)} placeholder="11A" />
                </div>
                <div>
                  <label>Promedio (0 a 5)</label>
                  <input value={datos.promedio} onChange={(e) => cambiar("promedio", e.target.value)} placeholder="4.2" inputMode="decimal" />
                </div>
              </div>
              <div className="row">
                <button className="btn" type="submit">Empezar la prueba</button>
              </div>
            </form>
          </section>
          </>
        )}

        {fase === "quiz" && pregunta && (
          <section className="sheet">
            <div className="steps">
              {quiz.map((item, indice) => <i key={item.id} className={indice <= paso ? "on" : ""} />)}
            </div>
            <p className="muted">Actividad {paso + 1} de {quiz.length}</p>
            <h2>{pregunta.titulo}</h2>
            <p className="muted">{pregunta.ayuda}</p>
            {pregunta.type === "speed" && (
              <div className="timer" aria-hidden="true">
                <span style={{ width: `${(queda / pregunta.segundos) * 100}%` }} />
              </div>
            )}
            {pregunta.type === "speed" && queda === 0 && <p>Se acabó el tiempo. Igual elige una.</p>}
            <div className="cards">
              {pregunta.opciones.map((opcion) => {
                const valor = respuestaActual();
                const activo = Array.isArray(valor) ? valor.includes(opcion.id) : valor === opcion.id;
                const posicion = Array.isArray(valor) ? valor.indexOf(opcion.id) : -1;
                const alClick = () => {
                  if (pregunta.type === "rank") ordenar(opcion.id);
                  else if (pregunta.type === "multi") elegirVarias(opcion.id);
                  else elegirUna(opcion.id);
                };
                return (
                  <button type="button" key={opcion.id} className={activo ? "card on" : "card"} onClick={alClick}>
                    {pregunta.type === "rank" && <span className="pos">{posicion >= 0 ? posicion + 1 : ""}</span>}
                    <span className="emo">{opcion.emoji}</span>
                    <span>{opcion.texto}</span>
                  </button>
                );
              })}
            </div>
            <div className="row">
              <button className="btn ghost" type="button" onClick={() => setPaso((n) => Math.max(0, n - 1))} disabled={paso === 0}>Atrás</button>
              {paso < quiz.length - 1 ? (
                <button className="btn" type="button" disabled={!pasoListo()} onClick={() => setPaso((n) => n + 1)}>Siguiente</button>
              ) : (
                <button className="btn" type="button" disabled={!pasoListo() || cargando} onClick={terminar}>{cargando ? "Guardando..." : "Ver mis 3 opciones"}</button>
              )}
            </div>
          </section>
        )}

        {fase === "resultado" && resultado && primera && (
          <>
            <section className="hero-dark">
              <div>
                <span className="pill">Perfil listo</span>
                <h1>Hola, {resultado.nombre.split(" ")[0]}.</h1>
                <p className="frase">{primera.carrera}</p>
                <p>Según las actividades, tienes una afinidad del <span className="resaltado">{primera.porcentaje}%</span> con tu primera opción.</p>
                <div className="avance">
                  <header><span>Prueba vocacional</span><span>Completada</span></header>
                  <div className="track"><span style={{ width: "100%" }} /></div>
                </div>
              </div>
              <div className="hero-stats">
                <article className="hero-stat"><b>3</b><span>Carreras recomendadas</span></article>
                <article className="hero-stat"><b>Top 1</b><span>{primera.carrera}</span></article>
                <article className="hero-stat"><b>{Number(datos.promedio).toFixed(1)}</b><span>Promedio registrado</span></article>
                <article className="hero-stat"><b>{primera.porcentaje}%</b><span>Afinidad más alta</span></article>
              </div>
            </section>
            <section className="sheet">
              <div className="ficha">
                <div>
                  <span className="pill light">{fichaDe(primera.carrera).area}</span>
                  <h2>{primera.carrera}</h2>
                  <p>{primera.porque}</p>
                  <div className="metas">
                    <article className="meta"><span>Afinidad</span><b>{primera.porcentaje}%</b></article>
                    <article className="meta"><span>Lugar</span><b>1 de 3</b></article>
                    <article className="meta"><span>Promedio</span><b>{Number(datos.promedio).toFixed(1)}</b></article>
                  </div>
                </div>
                <div className="anillo-box">
                  <Anillo valor={primera.porcentaje} />
                  <p>Sale de tus respuestas en las seis actividades.</p>
                </div>
              </div>
            </section>
            <section className="bloque">
              <h2>Tus tres opciones</h2>
              <p className="kicker">De la que más coincide contigo a la que menos. Quedaron guardadas para el colegio.</p>
              <div className="carrera-grid">
                {resultado.recomendaciones.map((item) => {
                  const ficha = fichaDe(item.carrera);
                  return (
                    <article className="carrera" key={item.carrera}>
                      <header>
                        <span className="pill light">{ficha.area}</span>
                        <span className="match">{item.porcentaje}% match</span>
                      </header>
                      <h3>{item.carrera}</h3>
                      <p>{item.porque}</p>
                      <div className="tags">{ficha.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div>
                    </article>
                  );
                })}
              </div>
              <div className="row">
                <button className="btn" type="button" onClick={reiniciar}>Registrar otro estudiante</button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Anillo({ valor }) {
  const radio = 68;
  const vuelta = 2 * Math.PI * radio;
  const lleno = (Math.max(0, Math.min(100, valor)) / 100) * vuelta;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label={`${valor}% de afinidad`}>
      <circle cx="90" cy="90" r={radio} fill="none" stroke="#f3e4dc" strokeWidth="14" />
      <circle
        cx="90"
        cy="90"
        r={radio}
        fill="none"
        stroke="#e07a4f"
        strokeWidth="14"
        strokeDasharray={`${lleno} ${vuelta - lleno}`}
        strokeLinecap="round"
        transform="rotate(-90 90 90)"
      />
      <text x="90" y="86" textAnchor="middle" fontSize="32" fontWeight="800" fill="#1c2433" fontFamily="Manrope, Segoe UI, sans-serif">{valor}%</text>
      <text x="90" y="108" textAnchor="middle" fontSize="12" fontWeight="700" fill="#6d675f" fontFamily="Manrope, Segoe UI, sans-serif">AFINIDAD</text>
    </svg>
  );
}
