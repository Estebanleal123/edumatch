import { useMemo, useState } from "react";

function plano(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export default function BuscadorColegio({ colegios, valor, onElegir }) {
  const [texto, setTexto] = useState(valor);
  const [abierto, setAbierto] = useState(false);

  const filtrados = useMemo(() => {
    const consulta = plano(texto.trim());
    if (!consulta || texto === valor) return colegios;
    return colegios.filter((item) => plano(`${item.nombre} ${item.localidad}`).includes(consulta));
  }, [colegios, texto, valor]);

  function escribir(event) {
    setTexto(event.target.value);
    setAbierto(true);
    if (event.target.value !== valor) onElegir("");
  }

  function elegir(item) {
    setTexto(item.nombre);
    onElegir(item.nombre);
    setAbierto(false);
  }

  return (
    <div className="combo">
      <input
        value={texto}
        onChange={escribir}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Busca y elige tu colegio"
        autoComplete="off"
        role="combobox"
        aria-expanded={abierto}
      />
      {abierto && (
        <ul className="combo-lista">
          {filtrados.length === 0 && <li className="combo-vacio">No hay un colegio con ese nombre</li>}
          {filtrados.map((item) => (
            <li key={item.nombre}>
              <button type="button" onMouseDown={() => elegir(item)}>
                <strong>{item.nombre}</strong>
                <span>{item.localidad}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
