import json
import secrets
import sqlite3
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).with_name("edumatch.db")
ADMIN_USER = "admin"
ADMIN_PASSWORD = "edumatch"
TOKENS: set[str] = set()

DIMS = ("tech", "salud", "creativo", "social", "negocios", "legal")

CAREERS = [
    {"id": "software", "nombre": "Ingeniería de Software", "pesos": {"tech": 1.0, "negocios": 0.15}, "porque": "Te mueve armar soluciones y resolver problemas con tecnología."},
    {"id": "medicina", "nombre": "Medicina", "pesos": {"salud": 1.0, "social": 0.25}, "porque": "Te importa cuidar a las personas y entender cómo funciona el cuerpo."},
    {"id": "diseno", "nombre": "Diseño digital", "pesos": {"creativo": 1.0, "tech": 0.25}, "porque": "Se te da comunicar ideas con imagen, forma y herramientas digitales."},
    {"id": "admin", "nombre": "Administración de empresas", "pesos": {"negocios": 1.0, "social": 0.2}, "porque": "Te organiza organizar, decidir y llevar un plan a la práctica."},
    {"id": "psico", "nombre": "Psicología", "pesos": {"social": 1.0, "salud": 0.2}, "porque": "Escuchas a la gente y te interesa lo que hay detrás de cómo actúan."},
    {"id": "derecho", "nombre": "Derecho", "pesos": {"legal": 1.0, "social": 0.3}, "porque": "Argumentas, buscas lo justo y no te quedas callado frente a un problema."},
    {"id": "arq", "nombre": "Arquitectura", "pesos": {"creativo": 0.7, "tech": 0.4}, "porque": "Juntas lo visual con la estructura: te gusta que una idea se pueda construir."},
    {"id": "industrial", "nombre": "Ingeniería industrial", "pesos": {"tech": 0.5, "negocios": 0.6}, "porque": "Te gusta mejorar cómo se hacen las cosas, con orden y con lógica."},
    {"id": "com", "nombre": "Comunicación social", "pesos": {"social": 0.55, "creativo": 0.55}, "porque": "Cuentas ideas y conectas con otras personas con facilidad."},
    {"id": "conta", "nombre": "Contaduría", "pesos": {"negocios": 0.85, "tech": 0.25}, "porque": "Te cuadran los números, el orden y saber exactamente cómo va un proyecto."},
]

QUESTIONS = [
    {
        "id": "q1",
        "type": "single",
        "titulo": "Tu sábado ideal",
        "ayuda": "Toca la carta que de verdad te provoca.",
        "opciones": [
            {"id": "codigo", "emoji": "💻", "texto": "Armar algo en el computador o entender cómo funciona una app", "puntos": {"tech": 3}},
            {"id": "cuidar", "emoji": "🩺", "texto": "Acompañar a alguien que no se siente bien", "puntos": {"salud": 3}},
            {"id": "disenar", "emoji": "🎨", "texto": "Dibujar, editar un video o diseñar una pieza", "puntos": {"creativo": 3}},
            {"id": "vender", "emoji": "📈", "texto": "Organizar un plan, vender una idea o mover un evento", "puntos": {"negocios": 3}},
            {"id": "debatir", "emoji": "⚖️", "texto": "Debatir un tema y defender lo que te parece justo", "puntos": {"legal": 3}},
        ],
    },
    {
        "id": "q2",
        "type": "rank",
        "titulo": "Ordénalos",
        "ayuda": "Toca del que más va contigo al que menos. El 1 es el primero.",
        "opciones": [
            {"id": "logica", "emoji": "🧩", "texto": "Resolver un problema de lógica", "puntos": {"tech": 1}},
            {"id": "cuerpo", "emoji": "🧬", "texto": "Entender el cuerpo y la salud", "puntos": {"salud": 1}},
            {"id": "visual", "emoji": "✏️", "texto": "Crear algo que se vea bien", "puntos": {"creativo": 1}},
            {"id": "gente", "emoji": "💬", "texto": "Hablar con personas y entenderlas", "puntos": {"social": 1}},
        ],
    },
    {
        "id": "q3",
        "type": "single",
        "titulo": "Si lideras un proyecto del colegio",
        "ayuda": "Elige la propuesta que harías.",
        "opciones": [
            {"id": "plataforma", "emoji": "🖥️", "texto": "Una plataforma para organizar tareas del curso", "puntos": {"tech": 2, "negocios": 1}},
            {"id": "bienestar", "emoji": "💚", "texto": "Una campaña de bienestar y cuidado entre compañeros", "puntos": {"social": 2, "salud": 1}},
            {"id": "revista", "emoji": "📰", "texto": "Una revista o mural digital del colegio", "puntos": {"creativo": 3}},
            {"id": "emprendimiento", "emoji": "🚀", "texto": "Un semillero para emprender y vender algo real", "puntos": {"negocios": 3}},
            {"id": "convivencia", "emoji": "📜", "texto": "Un espacio para hablar de normas y resolver conflictos", "puntos": {"legal": 2, "social": 1}},
        ],
    },
    {
        "id": "q4",
        "type": "single",
        "titulo": "La que se te facilita",
        "ayuda": "No la que te toca: la que se te da.",
        "opciones": [
            {"id": "informatica", "emoji": "🔢", "texto": "Matemáticas o informática", "puntos": {"tech": 3}},
            {"id": "biologia", "emoji": "🧪", "texto": "Biología o química", "puntos": {"salud": 3}},
            {"id": "artes", "emoji": "🎭", "texto": "Artes", "puntos": {"creativo": 3}},
            {"id": "economia", "emoji": "💼", "texto": "Economía o sociales aplicadas", "puntos": {"negocios": 3}},
            {"id": "lenguaje", "emoji": "🗣️", "texto": "Lenguaje, debate o filosofía", "puntos": {"legal": 2, "social": 1}},
        ],
    },
    {
        "id": "q5",
        "type": "multi",
        "elige": 2,
        "titulo": "Reto de 48 horas",
        "ayuda": "Elige 2 cosas que sí te llevarías.",
        "opciones": [
            {"id": "computador", "emoji": "⌨️", "texto": "Un computador", "puntos": {"tech": 3}},
            {"id": "botiquin", "emoji": "🩹", "texto": "Un botiquín y ganas de cuidar", "puntos": {"salud": 3}},
            {"id": "tableta", "emoji": "🖌️", "texto": "Una tableta para diseñar", "puntos": {"creativo": 3}},
            {"id": "plan", "emoji": "🗂️", "texto": "Un plan de trabajo y una meta clara", "puntos": {"negocios": 3}},
            {"id": "escucha", "emoji": "🎧", "texto": "Tiempo para escuchar al equipo", "puntos": {"social": 3}},
        ],
    },
    {
        "id": "q6",
        "type": "speed",
        "segundos": 12,
        "titulo": "Responde rápido",
        "ayuda": "Un amigo está perdido con una decisión. ¿Qué haces primero?",
        "opciones": [
            {"id": "solucion", "emoji": "🛠️", "texto": "Busco una solución práctica", "puntos": {"tech": 2, "negocios": 1}},
            {"id": "emocion", "emoji": "🫶", "texto": "Le pregunto cómo se siente", "puntos": {"social": 3}},
            {"id": "idea", "emoji": "💡", "texto": "Le muestro otra forma de verlo", "puntos": {"creativo": 3}},
            {"id": "pasos", "emoji": "✅", "texto": "Le armo un plan con pasos", "puntos": {"negocios": 3}},
            {"id": "justo", "emoji": "🧭", "texto": "Le digo qué me parece justo", "puntos": {"legal": 3}},
        ],
    },
]

RANK_WEIGHTS = [4, 3, 2, 1]

COLEGIOS = [
    {"nombre": "Colegio La Gaitana (IED)", "localidad": "Suba"},
    {"nombre": "Colegio Tibabuyes Universal (IED)", "localidad": "Suba"},
    {"nombre": "Colegio Delia Zapata Olivella (IED)", "localidad": "Suba"},
    {"nombre": "Colegio El Salitre - Suba (IED)", "localidad": "Suba"},
    {"nombre": "Colegio Nueva Colombia (IED)", "localidad": "Suba"},
    {"nombre": "Colegio Prado Veraniego (IED)", "localidad": "Suba"},
    {"nombre": "Colegio Eduardo Santos (IED)", "localidad": "Los Mártires"},
    {"nombre": "Colegio Liceo Nacional Antonia Santos (IED)", "localidad": "Los Mártires"},
    {"nombre": "Colegio San Francisco de Asís (IED)", "localidad": "Los Mártires"},
    {"nombre": "Colegio Técnico Menorah (IED)", "localidad": "Los Mártires"},
]
COLEGIOS_VALIDOS = {item["nombre"] for item in COLEGIOS}

SEEDS = [
    {"nombre": "Mateo Gil", "genero": "hombre", "colegio": "Colegio La Gaitana (IED)", "salon": "11A", "promedio": 4.2, "respuestas": {"q1": "codigo", "q2": ["logica", "visual", "gente", "cuerpo"], "q3": "plataforma", "q4": "informatica", "q5": ["computador", "plan"], "q6": "solucion"}},
    {"nombre": "Valentina Rojas", "genero": "mujer", "colegio": "Colegio La Gaitana (IED)", "salon": "11A", "promedio": 4.6, "respuestas": {"q1": "disenar", "q2": ["visual", "gente", "logica", "cuerpo"], "q3": "revista", "q4": "artes", "q5": ["tableta", "escucha"], "q6": "idea"}},
    {"nombre": "Sara Mendoza", "genero": "mujer", "colegio": "Colegio Eduardo Santos (IED)", "salon": "10B", "promedio": 3.9, "respuestas": {"q1": "cuidar", "q2": ["cuerpo", "gente", "visual", "logica"], "q3": "bienestar", "q4": "biologia", "q5": ["botiquin", "escucha"], "q6": "emocion"}},
    {"nombre": "Juan Pablo Ortiz", "genero": "hombre", "colegio": "Colegio Eduardo Santos (IED)", "salon": "11B", "promedio": 4.0, "respuestas": {"q1": "debatir", "q2": ["gente", "logica", "visual", "cuerpo"], "q3": "convivencia", "q4": "lenguaje", "q5": ["escucha", "plan"], "q6": "justo"}},
    {"nombre": "Camila Duarte", "genero": "mujer", "colegio": "Colegio Tibabuyes Universal (IED)", "salon": "11A", "promedio": 4.7, "respuestas": {"q1": "vender", "q2": ["gente", "logica", "visual", "cuerpo"], "q3": "emprendimiento", "q4": "economia", "q5": ["plan", "computador"], "q6": "pasos"}},
    {"nombre": "Andrés Peña", "genero": "hombre", "colegio": "Colegio Tibabuyes Universal (IED)", "salon": "10A", "promedio": 3.6, "respuestas": {"q1": "disenar", "q2": ["visual", "logica", "gente", "cuerpo"], "q3": "plataforma", "q4": "artes", "q5": ["tableta", "computador"], "q6": "idea"}},
]


def conectar():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def iniciar_db():
    with conectar() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS estudiantes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                genero TEXT NOT NULL,
                colegio TEXT NOT NULL,
                salon TEXT NOT NULL,
                promedio REAL NOT NULL,
                respuestas TEXT NOT NULL,
                recomendaciones TEXT NOT NULL,
                demo INTEGER NOT NULL DEFAULT 0,
                creado TEXT NOT NULL
            )
            """
        )
        total = conn.execute("SELECT COUNT(*) AS n FROM estudiantes").fetchone()["n"]
        if total == 0:
            for semilla in SEEDS:
                recomendaciones = recomendar(semilla["respuestas"])
                conn.execute(
                    """
                    INSERT INTO estudiantes
                    (nombre, genero, colegio, salon, promedio, respuestas, recomendaciones, demo, creado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (
                        semilla["nombre"],
                        semilla["genero"],
                        semilla["colegio"],
                        semilla["salon"],
                        semilla["promedio"],
                        json.dumps(semilla["respuestas"]),
                        json.dumps(recomendaciones),
                        datetime.now().isoformat(timespec="seconds"),
                    ),
                )
        sembrar_piloto(conn)


PLANES = [
    (8, 4), (5, 6), (7, 3), (4, 8), (6, 5), (9, 3),
    (3, 9), (6, 7), (5, 5), (8, 6), (4, 6), (7, 5),
]
SALONES_PILOTO = ["10A", "10B", "11A", "11B", "11C"]
NOMBRES_HOMBRE = ["Santiago", "Tomás", "Nicolás", "Samuel", "Emiliano", "Diego", "Andrés", "Felipe", "Daniel", "Sebastián", "Martín", "Joaquín", "Alejandro", "David", "Camilo", "Esteban", "Julián", "Miguel", "Pablo", "Simón", "Jerónimo", "Luciano"]
NOMBRES_MUJER = ["Valentina", "Lucía", "Mariana", "Isabella", "Sofía", "Camila", "Salomé", "Antonella", "Gabriela", "Daniela", "Sara", "Emma", "Regina", "Renata", "Ana", "Juliana", "Manuela", "Laura", "Elena", "Paula", "Antonia", "Victoria"]
APELLIDOS = ["Cárdenas", "Herrera", "Quintero", "Beltrán", "Osorio", "Pardo", "Castaño", "Rincón", "Suárez", "Acosta", "Mejía", "Navarro", "Ibáñez", "Cifuentes", "Montoya", "Salazar", "Prieto", "Forero", "Bermúdez", "Arenas", "Pineda", "Ospina", "Galindo", "Restrepo"]
PERFILES = [
    {"q1": "codigo", "q2": ["logica", "visual", "gente", "cuerpo"], "q3": "plataforma", "q4": "informatica", "q5": ["computador", "plan"], "q6": "solucion"},
    {"q1": "cuidar", "q2": ["cuerpo", "gente", "visual", "logica"], "q3": "bienestar", "q4": "biologia", "q5": ["botiquin", "escucha"], "q6": "emocion"},
    {"q1": "disenar", "q2": ["visual", "gente", "logica", "cuerpo"], "q3": "revista", "q4": "artes", "q5": ["tableta", "escucha"], "q6": "idea"},
    {"q1": "vender", "q2": ["gente", "logica", "visual", "cuerpo"], "q3": "emprendimiento", "q4": "economia", "q5": ["plan", "computador"], "q6": "pasos"},
    {"q1": "debatir", "q2": ["gente", "logica", "cuerpo", "visual"], "q3": "convivencia", "q4": "lenguaje", "q5": ["escucha", "plan"], "q6": "justo"},
    {"q1": "codigo", "q2": ["gente", "logica", "visual", "cuerpo"], "q3": "plataforma", "q4": "lenguaje", "q5": ["computador", "escucha"], "q6": "emocion"},
]


def nombre_piloto(lista, indice):
    return f"{lista[indice % len(lista)]} {APELLIDOS[(indice // len(lista)) % len(APELLIDOS)]}"


def sembrar_piloto(conn):
    marca = conn.execute(
        "SELECT COUNT(*) AS n FROM estudiantes WHERE colegio = ?",
        ("Colegio La Gaitana (IED)",),
    ).fetchone()["n"]
    if marca:
        return
    indice_h = 0
    indice_m = 0
    for numero, colegio in enumerate(COLEGIOS):
        hombres, mujeres = PLANES[numero % len(PLANES)]
        for genero, cantidad, base in (("hombre", hombres, indice_h), ("mujer", mujeres, indice_m)):
            for paso in range(cantidad):
                indice = base + paso
                respuestas = PERFILES[(numero + paso + (0 if genero == "hombre" else 2)) % len(PERFILES)]
                conn.execute(
                    """
                    INSERT INTO estudiantes
                    (nombre, genero, colegio, salon, promedio, respuestas, recomendaciones, demo, creado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (
                        nombre_piloto(NOMBRES_HOMBRE if genero == "hombre" else NOMBRES_MUJER, indice),
                        genero,
                        colegio["nombre"],
                        SALONES_PILOTO[(numero + paso) % len(SALONES_PILOTO)],
                        round(3.2 + ((numero * 3 + paso * 5) % 17) / 10, 1),
                        json.dumps(respuestas),
                        json.dumps(recomendar(respuestas)),
                        datetime.now().isoformat(timespec="seconds"),
                    ),
                )
            if genero == "hombre":
                indice_h += cantidad
            else:
                indice_m += cantidad


def opcion(pregunta, opcion_id):
    for item in pregunta["opciones"]:
        if item["id"] == opcion_id:
            return item
    return None


def sumar(dims, puntos, factor=1):
    for clave, valor in puntos.items():
        dims[clave] += valor * factor


def aplicar(dims, pregunta, respuesta):
    tipo = pregunta["type"]
    if tipo in ("single", "speed"):
        if not isinstance(respuesta, str):
            raise HTTPException(400, "Revisa las respuestas de la prueba")
        elegida = opcion(pregunta, respuesta)
        if not elegida:
            raise HTTPException(400, "Hay una respuesta que no corresponde")
        sumar(dims, elegida["puntos"])
        return
    if tipo == "multi":
        if not isinstance(respuesta, list) or len(respuesta) != pregunta["elige"]:
            raise HTTPException(400, "Elige las opciones que pide la actividad")
        if len(set(respuesta)) != len(respuesta):
            raise HTTPException(400, "No repitas la misma opción")
        for opcion_id in respuesta:
            elegida = opcion(pregunta, opcion_id)
            if not elegida:
                raise HTTPException(400, "Hay una respuesta que no corresponde")
            sumar(dims, elegida["puntos"])
        return
    if tipo == "rank":
        ids = [item["id"] for item in pregunta["opciones"]]
        if not isinstance(respuesta, list) or sorted(respuesta) != sorted(ids):
            raise HTTPException(400, "Ordena todas las cartas de la actividad")
        for indice, opcion_id in enumerate(respuesta):
            elegida = opcion(pregunta, opcion_id)
            sumar(dims, elegida["puntos"], RANK_WEIGHTS[indice])


def maximos():
    topes = {clave: 0.0 for clave in DIMS}
    for pregunta in QUESTIONS:
        tipo = pregunta["type"]
        if tipo in ("single", "speed"):
            for clave in DIMS:
                topes[clave] += max(item["puntos"].get(clave, 0) for item in pregunta["opciones"])
        elif tipo == "multi":
            for clave in DIMS:
                valores = sorted((item["puntos"].get(clave, 0) for item in pregunta["opciones"]), reverse=True)
                topes[clave] += sum(valores[: pregunta["elige"]])
        elif tipo == "rank":
            for clave in DIMS:
                valores = sorted((item["puntos"].get(clave, 0) for item in pregunta["opciones"]), reverse=True)
                topes[clave] += sum(valor * peso for valor, peso in zip(valores, RANK_WEIGHTS))
    return topes


TOPES = None


def recomendar(respuestas: dict):
    global TOPES
    if TOPES is None:
        TOPES = maximos()
    dims = {clave: 0.0 for clave in DIMS}
    for pregunta in QUESTIONS:
        if pregunta["id"] not in respuestas:
            raise HTTPException(400, "Falta una parte de la prueba")
        aplicar(dims, pregunta, respuestas[pregunta["id"]])
    ranking = []
    for carrera in CAREERS:
        obtenido = sum(dims[clave] * peso for clave, peso in carrera["pesos"].items())
        posible = sum(TOPES[clave] * peso for clave, peso in carrera["pesos"].items())
        porcentaje = 0 if posible <= 0 else round(100 * obtenido / posible)
        ranking.append(
            {
                "carrera": carrera["nombre"],
                "porcentaje": int(porcentaje),
                "porque": carrera["porque"],
            }
        )
    ranking.sort(key=lambda item: item["porcentaje"], reverse=True)
    return ranking[:3]


def pregunta_publica(pregunta):
    publica = {
        "id": pregunta["id"],
        "type": pregunta["type"],
        "titulo": pregunta["titulo"],
        "ayuda": pregunta["ayuda"],
        "opciones": [
            {"id": item["id"], "emoji": item["emoji"], "texto": item["texto"]}
            for item in pregunta["opciones"]
        ],
    }
    if "elige" in pregunta:
        publica["elige"] = pregunta["elige"]
    if "segundos" in pregunta:
        publica["segundos"] = pregunta["segundos"]
    return publica


def fila_a_dict(fila):
    return {
        "id": fila["id"],
        "nombre": fila["nombre"],
        "genero": fila["genero"],
        "colegio": fila["colegio"],
        "salon": fila["salon"],
        "promedio": fila["promedio"],
        "recomendaciones": json.loads(fila["recomendaciones"]),
        "demo": bool(fila["demo"]),
        "creado": fila["creado"],
    }


class Intento(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    genero: str
    colegio: str = Field(min_length=2, max_length=120)
    salon: str = Field(min_length=1, max_length=20)
    promedio: float
    respuestas: dict


class Login(BaseModel):
    usuario: str
    clave: str


app = FastAPI(title="EduMatch")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def al_iniciar():
    iniciar_db()


def exigir_admin(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    if token not in TOKENS:
        raise HTTPException(401, "Entra como admin para ver el dashboard")
    return token


@app.get("/api/health")
def salud():
    return {"ok": True}


@app.get("/api/quiz")
def quiz():
    return [pregunta_publica(pregunta) for pregunta in QUESTIONS]


@app.get("/api/colegios")
def colegios():
    return COLEGIOS


@app.post("/api/intentos")
def crear_intento(datos: Intento):
    genero = datos.genero.strip().lower()
    if genero not in ("hombre", "mujer"):
        raise HTTPException(400, "Elige hombre o mujer")
    if datos.promedio < 0 or datos.promedio > 5:
        raise HTTPException(400, "El promedio va de 0 a 5")
    if datos.colegio.strip() not in COLEGIOS_VALIDOS:
        raise HTTPException(400, "Elige un colegio de Suba o Los Mártires")
    recomendaciones = recomendar(datos.respuestas)
    with conectar() as conn:
        cursor = conn.execute(
            """
            INSERT INTO estudiantes
            (nombre, genero, colegio, salon, promedio, respuestas, recomendaciones, demo, creado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (
                datos.nombre.strip(),
                genero,
                datos.colegio.strip(),
                datos.salon.strip(),
                round(datos.promedio, 2),
                json.dumps(datos.respuestas),
                json.dumps(recomendaciones),
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        nuevo_id = cursor.lastrowid
    return {
        "id": nuevo_id,
        "nombre": datos.nombre.strip(),
        "genero": genero,
        "recomendaciones": recomendaciones,
    }


@app.post("/api/login")
def login(datos: Login):
    if datos.usuario.strip() != ADMIN_USER or datos.clave != ADMIN_PASSWORD:
        raise HTTPException(401, "Usuario o clave incorrectos")
    token = secrets.token_hex(16)
    TOKENS.add(token)
    return {"token": token}


@app.get("/api/admin/estudiantes")
def estudiantes(authorization: str = Header(default="")):
    exigir_admin(authorization)
    with conectar() as conn:
        filas = conn.execute("SELECT * FROM estudiantes ORDER BY id DESC").fetchall()
    return [fila_a_dict(fila) for fila in filas]
