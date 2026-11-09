import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { api } from "../api";

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

  const tono = datos.genero || "mix";
  const pregunta = quiz[paso];

  useEffect(() => {
    api("/api/quiz").then(setQuiz).catch(() => setError("No pude cargar la prueba. Revisa que el servidor esté encendido."));
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
      setError("Elige hombre o mujer para armar tu color.");
      return;
    }
    const promedio = Number(datos.promedio);
    if (!datos.nombre.trim() || !datos.colegio.trim() || !datos.salon.trim() || Number.isNaN(promedio)) {
      setError("Completa nombre, colegio, salón y promedio.");
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
    <div className={`app tone-${tono}`}>
      <header className="topbar">
        <div className="brand">
          <Logo tone={tono} />
          <div>
            <strong>EduMatch</strong>
            <span>Orientación vocacional</span>
          </div>
        </div>
        <div className="spacer" />
        <Link className="linkish" to="/admin">Dashboard admin</Link>
      </header>

      <main className="wrap">
        {error && <div className="error">{error}</div>}

        {fase === "datos" && (
          <section className="hero">
            <h1>Descubre 3 carreras que van contigo</h1>
            <p>Responde una prueba corta, con actividades para elegir y ordenar. Al final guardamos tu resultado para que el colegio lo pueda ver en el dashboard.</p>
            <form className="panel" onSubmit={enviar}>
              <label>Cómo quieres el color de tu prueba</label>
              <div className="genders">
                <button type="button" className={datos.genero === "hombre" ? "gender on-hombre" : "gender"} onClick={() => cambiar("genero", "hombre")}>
                  <b>Hombre</b>
                  <span className="muted">Logo y acentos en azul</span>
                </button>
                <button type="button" className={datos.genero === "mujer" ? "gender on-mujer" : "gender"} onClick={() => cambiar("genero", "mujer")}>
                  <b>Mujer</b>
                  <span className="muted">Logo y acentos en rosa</span>
                </button>
              </div>
              <div className="grid-2">
                <div>
                  <label>Nombre</label>
                  <input value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                  <label>Colegio</label>
                  <input value={datos.colegio} onChange={(e) => cambiar("colegio", e.target.value)} placeholder="Nombre del colegio" />
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
        )}

        {fase === "quiz" && pregunta && (
          <section className="panel">
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

        {fase === "resultado" && resultado && (
          <section>
            <h1>Listo, {resultado.nombre.split(" ")[0]}</h1>
            <p className="muted">Estas son tus 3 opciones, de la que más te aplica a la que menos. Quedaron guardadas para el dashboard del colegio.</p>
            <div className="result">
              {resultado.recomendaciones.map((item, indice) => (
                <article key={item.carrera}>
                  <header>
                    <strong><span className="rank">{indice + 1}</span>{item.carrera}</strong>
                    <b>{item.porcentaje}%</b>
                  </header>
                  <div className="bar"><span style={{ width: `${item.porcentaje}%` }} /></div>
                  <p className="muted">{item.porque}</p>
                </article>
              ))}
            </div>
            <div className="row">
              <button className="btn" type="button" onClick={reiniciar}>Registrar otro estudiante</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
