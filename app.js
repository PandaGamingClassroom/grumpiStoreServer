const express = require("express");
const app = express();
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const chokidar = require("chokidar");
const simpleGit = require("simple-git");
const path = require("path");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3001;

module.exports = app;

// Aumenta el límite del tamaño del cuerpo a 10MB
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// RUTAS DE ACCESO
const filePath = "./data/trainers.json";
const filePathAmin = "./data/admin.json";
const filePathGrumpis = "./data/grumpis.json";
const filePathObjectsCombat = "./data/combatObjects.json";
const filePathObjectsEvolution = "./data/evolutionObjects.json";
const filePathRewards = "./data/rewards.json";
const filePathAttacks = "./data/attacks.json";
const filePathEnergies = "./data/energies.json";
const filePathMedals = "./data/medals.json";
const filePathLeagueBadges = "./data/leagueBadges.json";
const filePathAvatars = "./data/avatars.json";

// Directorios de almacenamiento de imágenes
const uploadDir = path.join(__dirname, "uploads", "grumpis");
const uploadDirMedals = path.join(__dirname, "uploads", "medals");
const uploadDirEnergies = path.join(__dirname, "uploads", "energies");
const uploadDirEncargados = path.join(__dirname, "uploads", "encargados");
const uploadDirLeagueBadges = path.join(__dirname, "uploads", "leagueBadges");
const howToGetGrumpi = path.join(uploadDir, "howToGetGrumpis");

/****************************************************************************
 *                                                                          *
 *    CONFIGURACIÓN PARA MONTAR UN SISTEMA DE ALMACENAMIENTO PERSISTENTE    *
 *                                                                          *
 ****************************************************************************/
// Determina la ruta del directorio de la base de datos en función del entorno
const isProduction = process.env.NODE_ENV === "production";
const dbDirectory = isProduction
  ? "/mnt/data"
  : path.join(__dirname, "mnt/data");
const dbPath = path.join(dbDirectory, "grumpi_data_base.db");

// Verificar y crear el directorio de la base de datos si no existe
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
  console.log(`Directorio creado: ${dbDirectory}`);
}

// Inicializar la base de datos correctamente
let db;
try {
  db = new Database(dbPath); // Asigna la base de datos correctamente aquí
  console.log(`Conectado a la base de datos en: ${dbPath}`);
} catch (error) {
  console.error("Error al conectar con la base de datos:", error);
  process.exit(1); // Salir si hay un error crítico al inicializar la base de datos
}

// Verificar si el archivo de la base de datos existe
if (fs.existsSync(dbPath)) {
  console.log(`El archivo de la base de datos existe en: ${dbPath}`);
} else {
  console.log("No se encontró el archivo de la base de datos.");
}

try {
  db.prepare(
    `
    ALTER TABLE trainers ADD COLUMN "order" INTEGER;
  `
  ).run();
  db.prepare(
    `
    ALTER TABLE profesores ADD COLUMN "order" INTEGER;
  `
  ).run();
  console.log("Columna 'order' agregada con éxito.");
} catch (err) {
  if (err.message.includes("duplicate column name")) {
    console.log("La columna 'order' ya existe.");
  } else {
    console.error("Error al agregar la columna 'order':", err);
  }
}

/**************************************
 *                                    *
 *       Configuración de CORS        *
 *                                    *
 *************************************/
// Permitir CORS para todas las solicitudes a imágenes
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200,
  })
);

// Configuración CORS existente para las demás rutas
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://grumpi-store.vercel.app",
      "https://another-allowed-origin.com",
    ];
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Configuración de la política de referencia
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(uploadDirMedals, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadDir;
    if (req.path === "/upload") {
      uploadDir = "uploads/grumpis";
    } else if (req.path === "/upload-medal") {
      uploadDir = "uploads/medals";
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

/*********************************************
 *                                           *
 *            CREACIÓN DE TABLAS BD          *
 *                                           *
 *********************************************/
function createTables() {
  const createTrainersTable = `
    CREATE TABLE IF NOT EXISTS trainers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      password TEXT,
      rol TEXT,
      id_profesor INTEGER,
      avatar TEXT,
      grumpis TEXT,
      medallas TEXT,
      objetos_combate TEXT,
      objetos_evolutivos TEXT,
      marca_combate TEXT,
      distintivos_liga TEXT,
      grumpidolar INTEGER,
      recompensas TEXT,
      energies TEXT,
      order INTEGER
    );
  `;

  const createGrumpisTable = `
    CREATE TABLE IF NOT EXISTS grumpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainer_id INTEGER,
      nombre TEXT NOT NULL,
      PS INTEGER,
      n_grumpidex TEXT,
      clase TEXT,
      img_general TEXT,
      img_conseguir TEXT,
      descripcion TEXT,
      Ciclo1 TEXT,
      Ciclo2 TEXT,
      Ciclo3 TEXT,
      tipo TEXT,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    );
  `;

  const createTrainerGrumpisTable = `
    CREATE TABLE IF NOT EXISTS trainer_grumpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainer_id INTEGER NOT NULL,
      grumpi_id INTEGER NOT NULL,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id),
      FOREIGN KEY (grumpi_id) REFERENCES grumpis(id),
      UNIQUE(trainer_id, grumpi_id) -- Evita duplicados en la relación
    );
  `;

  const createAtaquesTable = `
    CREATE TABLE IF NOT EXISTS ataques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grumpi_id INTEGER,
      nombre TEXT NOT NULL,
      efecto TEXT,
      tipo TEXT,
      FOREIGN KEY (grumpi_id) REFERENCES grumpis(id)
    );
  `;

  const createProfesoresTable = `
    CREATE TABLE IF NOT EXISTS profesores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      usuario TEXT NOT NULL,
      password TEXT NOT NULL,
      rol TEXT,
      order INTEGER
    );
  `;

  try {
    db.exec(createTrainersTable);
    db.exec(createGrumpisTable);
    db.exec(createTrainerGrumpisTable);
    db.exec(createAtaquesTable);
    db.exec(createProfesoresTable);
    console.log("Tablas creadas correctamente.");
  } catch (err) {
    console.error("Error creando tablas:", err.message);
  }
}
createTables();

/**
 *
 * FUNCIÓN PARA AÑADIR LOS GRUMPIS EXISTENTES
 * A LA BASE DE DATOS.
 *
 * Estos están almacenados en el archivo: grumpis.json
 *
 */
function loadGrumpisFromFile() {
  try {
    const data = fs.readFileSync(filePathGrumpis, "utf8");
    const grumpis = JSON.parse(data);

    const insertStmt = db.prepare(`
      INSERT INTO grumpis (
        trainer_id,
        nombre,
        PS,
        n_grumpidex,
        img_general,
        img_conseguir,
        descripcion,
        Ciclo1,
        Ciclo2,
        Ciclo3,
        tipo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    grumpis.forEach((grumpi) => {
      insertStmt.run(
        grumpi.trainer_id,
        grumpi.nombre,
        grumpi.PS,
        grumpi.n_grumpidex,
        grumpi.img_general,
        grumpi.img_conseguir,
        grumpi.descripcion,
        grumpi.Ciclo1,
        grumpi.Ciclo2,
        grumpi.Ciclo3,
        grumpi.tipo
      );
    });

    console.log(
      "Grumpis cargados e insertados correctamente en la base de datos."
    );
  } catch (err) {
    console.error("Error al cargar los grumpis desde el archivo:", err.message);
  }
}

loadGrumpisFromFile();

// Declara trainer_list como una variable global
let trainer_list = [];

// Lee los datos del archivo trainers.json si existe
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainer_list = JSON.parse(data);
} catch (err) {
  // Si hay un error al leer el archivo, asigna un array vacío a trainer_list
  trainer_list = [];
}

app.use(express.json()); // Middleware para analizar el cuerpo de la solicitud como JSON
// Servir las imágenes estáticas desde el directorio de uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * PROFESOR ADMINISTRADOR POR DEFECTO.
 * Este profesor es añadido por defecto
 * con el rol de administrador.
 */
const defaultProfesor = {
  id: 1,
  nombre: "Pablo",
  apellidos: "Moreno Ortega",
  usuario: "admin",
  password: "1",
  rol: "administrador",
};

function addDefaultProfesor() {
  try {
    const existingProfesor = db
      .prepare(
        `
      SELECT * FROM profesores WHERE id = ?
    `
      )
      .get(defaultProfesor.id);

    if (!existingProfesor) {
      db.prepare(
        `
        INSERT INTO profesores (id, nombre, apellidos, usuario, password, rol)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(
        defaultProfesor.id,
        defaultProfesor.nombre,
        defaultProfesor.apellidos,
        defaultProfesor.usuario,
        defaultProfesor.password,
        defaultProfesor.rol
      );
      console.log("Profesor predeterminado añadido correctamente.");
    } else {
      console.log("El profesor predeterminado ya existe.");
    }
  } catch (err) {
    console.error("Error al agregar el profesor predeterminado:", err);
  }
}

addDefaultProfesor();

/** --------------------------------------------------------------------------------- */

/**************************************************
 *
 *
 *
 *                    ENTRENADORES
 *
 *
 *
 *************************************************/
// Cargar la lista de entrenadores desde el archivo al iniciar
fs.readFile(filePath, "utf8", (err, data) => {
  if (err && err.code !== "ENOENT") {
    console.error("Error al leer el archivo:", err);
  } else if (data) {
    try {
      trainer_list = JSON.parse(data);
      // Si hay entrenadores en la lista, ajustar currentId al mayor ID + 1
      if (trainer_list.length > 0) {
        currentId = Math.max(...trainer_list.map((trainer) => trainer.id)) + 1;
      }
    } catch (e) {
      console.error("Error al parsear JSON:", e);
    }
  }
});

/**
 *
 * Método para obtener el listado de Entrenadores
 *
 */
app.get("/", (req, res) => {
  try {
    const trainerList = db.prepare("SELECT * FROM trainers").all();
    res.json({
      trainer_list: trainerList,
    });
  } catch (dbError) {
    console.error(
      "Error al obtener los entrenadores de la base de datos:",
      dbError
    );
    res
      .status(500)
      .json({ error: "Error al obtener los entrenadores de la base de datos" });
  }
});

/**
 *
 * Método para guardar un nuevo entrenador
 *
 */
app.post("/", (req, res) => {
  const nuevoEntrenador = req.body;
  try {
    const insert = db.prepare(
      "INSERT INTO trainers (name, age, experience) VALUES (?, ?, ?)"
    );
    insert.run(
      nuevoEntrenador.name,
      nuevoEntrenador.age,
      nuevoEntrenador.experience
    );

    res.json({ message: "Entrenador agregado correctamente", nuevoEntrenador });
  } catch (dbError) {
    console.error(
      "Error al agregar el entrenador a la base de datos:",
      dbError
    );
    res
      .status(500)
      .json({ error: "Error al agregar el entrenador a la base de datos" });
  }
});

/**
 *
 * Función para añadir un nuevo usuario
 *
 */
app.post("/new-user", (req, res) => {
  const nuevoUsuario = req.body;

  try {
    if (nuevoUsuario.rol === "entrenador") {
      // Inserta en la tabla `trainers`
      const insertQuery = db.prepare(`
        INSERT INTO trainers (id, name, password, rol, id_profesor) 
        VALUES (?, ?, ?, ?, ?)
      `);
      insertQuery.run(
        nuevoUsuario.id,
        nuevoUsuario.name,
        nuevoUsuario.password,
        nuevoUsuario.rol,
        nuevoUsuario.id_profesor
      );

      res.json({
        message: "Entrenador agregado correctamente",
        nuevoUsuario,
      });
    } else if (nuevoUsuario.rol === "profesor") {
      // Inserta en la tabla `profesores`
      const insertQuery = db.prepare(`
        INSERT INTO profesores (id, nombre, apellidos, usuario, password, rol) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertQuery.run(
        nuevoUsuario.id,
        nuevoUsuario.nombre,
        nuevoUsuario.apellidos,
        nuevoUsuario.usuario,
        nuevoUsuario.password,
        nuevoUsuario.rol
      );

      res.json({
        message: "Profesor agregado correctamente",
        nuevoUsuario,
      });
    } else {
      // Rol no válido
      res.status(400).json({ error: "Rol no válido" });
    }
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error al insertar en la base de datos: " + err.message });
  }
});

/**
 *
 * Función para eliminar un entrenador
 *
 */
app.delete("/user/:id", (req, res) => {
  const trainerId = parseInt(req.params.id, 10);
  if (isNaN(trainerId)) {
    return res.status(400).json({ error: "ID de entrenador inválido" });
  }
  try {
    const deleteStmt = db.prepare("DELETE FROM trainers WHERE id = ?");
    const result = deleteStmt.run(trainerId);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: `Usuario con id ${trainerId} no encontrado` });
    }

    res.status(200).json({
      message: `Usuario con id ${trainerId} eliminado correctamente`,
    });
  } catch (dbError) {
    console.error(
      "Error al eliminar el entrenador de la base de datos:",
      dbError
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 *
 * Actualiza los datos de un entrenador
 *
 */
app.put("/trainers/update/:id", (req, res) => {
  const trainerId = parseInt(req.params.id, 10);
  if (isNaN(trainerId)) {
    return res.status(400).json({ error: "ID de entrenador inválido" });
  }

  const { name, password, avatar, grumpidolar, combatMark, objetosAEliminar } =
    req.body;

  try {
    const trainer = db
      .prepare("SELECT * FROM trainers WHERE id = ?")
      .get(trainerId);

    if (!trainer) {
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }

    // Actualiza los campos si existen y no están vacíos
    if (name !== undefined && name !== "") {
      trainer.name = name;
    }
    if (avatar !== undefined && avatar !== "") {
      trainer.avatar = avatar;
    }
    if (password !== undefined && password !== "") {
      trainer.password = password;
    }
    if (grumpidolar !== undefined && grumpidolar !== "") {
      trainer.grumpidolar = grumpidolar;
    }
    if (combatMark !== undefined && combatMark !== null) {
      trainer.marca_combate = combatMark;
    }

    // Ejecutar la actualización
    const updateStmt = db.prepare(`
      UPDATE trainers 
      SET name = ?, password = ?, grumpidolar = ?, marca_combate = ?, avatar = ?
      WHERE id = ?
    `);
    updateStmt.run(
      trainer.name,
      trainer.password,
      trainer.grumpidolar,
      trainer.marca_combate,
      trainer.avatar,
      trainer.id
    );

    console.log("Trainer actualizado:", trainer);

    // Manejar la eliminación de objetos
    if (Array.isArray(objetosAEliminar)) {
      handleObjectDeletion(trainer.id, objetosAEliminar);
    }

    res.status(200).json({ message: "Entrenador actualizado correctamente" });
  } catch (dbError) {
    console.error(
      "Error al actualizar el entrenador en la base de datos:",
      dbError
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Función modularizada para manejar la eliminación de objetos
function handleObjectDeletion(trainerId, objetosAEliminar) {
  const energiasAEliminar = objetosAEliminar.filter(
    (objeto) => objeto.tipo === "energia"
  );
  const medallasAEliminar = objetosAEliminar.filter(
    (objeto) => objeto.tipo === "medalla"
  );
  const grumpisAEliminar = objetosAEliminar.filter(
    (objeto) => objeto.tipo === "grumpi"
  );
  const objCombateAEliminar = objetosAEliminar.filter(
    (objeto) => objeto.tipo === "combate"
  );
  const objEvolutivoAEliminar = objetosAEliminar.filter(
    (objeto) => objeto.tipo === "evolutivo"
  );

  console.log("Objetos a eliminar:", {
    energiasAEliminar,
    medallasAEliminar,
    grumpisAEliminar,
    objCombateAEliminar,
    objEvolutivoAEliminar,
  });

  // Elimina los objetos de cada tipo si existen
  if (energiasAEliminar.length > 0) {
    editEnergiesFromTrainer(trainerId, energiasAEliminar);
  }
  if (medallasAEliminar.length > 0) {
    deleteMedalsFromTrainer(trainerId, medallasAEliminar);
  }
  if (grumpisAEliminar.length > 0) {
    editGrumpisFromTrainer(trainerId, grumpisAEliminar);
  }
  if (objCombateAEliminar.length > 0) {
    editObjCombat(trainerId, objCombateAEliminar);
  }
  if (objEvolutivoAEliminar.length > 0) {
    editObjEvolution(trainerId, objEvolutivoAEliminar);
  }
}

/**
 * Función para eliminar solo las energías seleccionadas
 * de la lista de energías del entrenador.
 *
 * @param {*} updatedTrainer Recibe los datos del enetrenador a editar.
 * @param {*} objetosAEliminar Recibe los datos del objeto a editar.
 */
function editEnergiesFromTrainer(trainerId, objetosAEliminar) {
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    const trainerStmt = db.prepare(`SELECT * FROM trainers WHERE id = ?`);
    const trainer = trainerStmt.get(trainerId);

    if (trainer) {
      let energies = JSON.parse(trainer.energies) || [];

      objetosAEliminar.forEach((energia) => {
        console.log("Procesando energía para eliminar: ", energia);

        let cantidadAEliminar = energia.cantidad || 1;

        energies = energies
          .map((e) => {
            if (e.nombre === energia.nombre) {
              let reduceAmount = Math.min(e.cantidad, cantidadAEliminar);

              if (e.cantidad <= reduceAmount) {
                cantidadAEliminar -= e.cantidad;
                return null;
              } else {
                cantidadAEliminar -= reduceAmount;
                return { ...e, cantidad: e.cantidad - reduceAmount };
              }
            }
            return e;
          })
          .filter((e) => e !== null);

        if (cantidadAEliminar > 0) {
          console.log(
            `No se pudo eliminar toda la cantidad de la energía ${energia.nombre}. Quedaron ${cantidadAEliminar} unidades sin eliminar.`
          );
        }
      });

      const updateStmt = db.prepare(
        `UPDATE trainers SET energies = ? WHERE id = ?`
      );
      updateStmt.run(JSON.stringify(energies), trainerId);

      console.log("Energías actualizadas correctamente.");
    } else {
      console.log("Entrenador no encontrado.");
    }
  } else {
    console.log(
      "No hay energías a eliminar o el formato de objetosAEliminar es incorrecto."
    );
  }
}

/**
 * Función para editar las medallas seleccionadas
 * de la lista de medallas del entrenador también seleccionado.
 *
 * @param {*} updatedTrainer Recibe los datos del entrenador seleccionado.
 * @param {*} objetosAEliminar Recibe las medallas que se quieren editar del entrenador.
 */
function deleteMedalsFromTrainer(trainerId, objetosAEliminar) {
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    const trainerStmt = db.prepare(`SELECT * FROM trainers WHERE id = ?`);
    const trainer = trainerStmt.get(trainerId);

    if (trainer) {
      let medallas = JSON.parse(trainer.medallas) || [];

      objetosAEliminar.forEach((medalla) => {
        if (medalla.tipo === "medalla") {
          medallas = medallas.filter((m) => m.nombre !== medalla.nombre);
        }
      });

      const updateStmt = db.prepare(
        `UPDATE trainers SET medallas = ? WHERE id = ?`
      );
      updateStmt.run(JSON.stringify(medallas), trainerId);

      console.log("Medallas actualizadas correctamente.");
    } else {
      console.log("Entrenador no encontrado.");
    }
  } else {
    console.log(
      "No hay medallas a eliminar o el formato de objetosAEliminar es incorrecto."
    );
  }
}

/**
 * Función para editar los Grumpis seleccionados del entrenador.
 *
 * @param {*} updatedTrainer Recibe la información del entrenador seleccionado.
 * @param {*} objetosAEliminar Recibe los Grumpis a editar de la lista del entrenador.
 */
function editGrumpisFromTrainer(trainerId, objetosAEliminar) {
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    const trainerStmt = db.prepare(`SELECT * FROM trainers WHERE id = ?`);
    const trainer = trainerStmt.get(trainerId);

    if (trainer) {
      let grumpis = JSON.parse(trainer.grumpis) || [];

      // Guardar los nombres de los grumpis a eliminar
      const grumpisAEliminar = objetosAEliminar.map((grumpi) => grumpi.nombre);

      // Filtrar los grumpis que no están en la lista de eliminados
      grumpis = grumpis.filter((g) => !grumpisAEliminar.includes(g.nombre));

      // Actualizar en la base de datos
      const updateStmt = db.prepare(
        `UPDATE trainers SET grumpis = ? WHERE id = ?`
      );
      updateStmt.run(JSON.stringify(grumpis), trainerId);

      console.log("Grumpis actualizados correctamente.");
    } else {
      console.log("Entrenador no encontrado.");
    }
  } else {
    console.log(
      "No hay grumpis a eliminar o el formato de objetosAEliminar es incorrecto."
    );
  }
}



/**
 * Función para editar los objetos de combate seleccionados.
 *
 * @param {*} updatedTrainer Recibe los datos del entrenador seleccionado.
 * @param {*} objetosAEliminar Recibe los objetos de combate a editar del listado del entrenador.
 */
function editObjCombat(trainerId, objetosAEliminar) {
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    const trainerStmt = db.prepare(`SELECT * FROM trainers WHERE id = ?`);
    const trainer = trainerStmt.get(trainerId);

    if (trainer) {
      let objetosCombate = JSON.parse(trainer.objetos_combate) || [];

      objetosAEliminar.forEach((objeto) => {
        console.log("Procesando objeto de combate para eliminar: ", objeto);

        let cantidadAEliminar = objeto.cantidad || 1;

        objetosCombate = objetosCombate
          .map((o) => {
            if (o.nombre === objeto.nombre) {
              let reduceAmount = Math.min(o.cantidad, cantidadAEliminar);

              if (o.cantidad <= reduceAmount) {
                cantidadAEliminar -= o.cantidad;
                return null;
              } else {
                cantidadAEliminar -= reduceAmount;
                return { ...o, cantidad: o.cantidad - reduceAmount };
              }
            }
            return o;
          })
          .filter((o) => o !== null);

        if (cantidadAEliminar > 0) {
          console.log(
            `No se pudo eliminar toda la cantidad del objeto de combate ${objeto.nombre}. Quedaron ${cantidadAEliminar} unidades sin eliminar.`
          );
        }
      });

      const updateStmt = db.prepare(
        `UPDATE trainers SET objetos_combate = ? WHERE id = ?`
      );
      updateStmt.run(JSON.stringify(objetosCombate), trainerId);

      console.log("Objetos de combate actualizados correctamente.");
    } else {
      console.log("Entrenador no encontrado.");
    }
  } else {
    console.log(
      "No hay objetos de combate a eliminar o el formato de objetosAEliminar es incorrecto."
    );
  }
}

/**
 * Función para editar los objetos evolutivos de un entrenador.
 * @param {*} updatedTrainer
 * @param {*} objetosAEliminar
 */
function editObjEvolution(trainerId, objetosAEliminar) {
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    const trainerStmt = db.prepare(`SELECT * FROM trainers WHERE id = ?`);
    const trainer = trainerStmt.get(trainerId);

    if (trainer) {
      let objetosEvolutivos = JSON.parse(trainer.objetos_evolutivos) || [];

      objetosAEliminar.forEach((objEvolu) => {
        console.log("Procesando objeto evolutivo para eliminar: ", objEvolu);

        let cantidadAEliminar = objEvolu.cantidad || 1;

        objetosEvolutivos = objetosEvolutivos
          .map((o) => {
            if (o.nombre === objEvolu.nombre) {
              let reduceAmount = Math.min(o.cantidad, cantidadAEliminar);

              if (o.cantidad <= reduceAmount) {
                cantidadAEliminar -= o.cantidad;
                return null;
              } else {
                cantidadAEliminar -= reduceAmount;
                return { ...o, cantidad: o.cantidad - reduceAmount };
              }
            }
            return o;
          })
          .filter((o) => o !== null);

        if (cantidadAEliminar > 0) {
          console.log(
            `No se pudo eliminar toda la cantidad del objeto evolutivo ${objEvolu.nombre}. Quedaron ${cantidadAEliminar} unidades sin eliminar.`
          );
        }
      });

      const updateStmt = db.prepare(
        `UPDATE trainers SET objetos_evolutivos = ? WHERE id = ?`
      );
      updateStmt.run(JSON.stringify(objetosEvolutivos), trainerId);

      console.log("Objetos evolutivos actualizados correctamente.");
    } else {
      console.log("Entrenador no encontrado.");
    }
  } else {
    console.log(
      "No hay objetos evolutivos a eliminar o el formato de objetosAEliminar es incorrecto."
    );
  }
}

/********************************************************************
 *
 *            ASIGNACIÓN DE GRUMPIS A LOS ENTRENADORES
 *
 *******************************************************************/

function assignCreatureToTrainer(trainer_id, creature) {
  console.log("Grumpi para asignar al entrenador: ", creature);
  const trainer = db
    .prepare("SELECT * FROM trainers WHERE id = ?")
    .get(trainer_id);

  if (trainer) {
    let trainerGrumpis = trainer.grumpis ? JSON.parse(trainer.grumpis) : [];

    const alreadyAssigned = trainerGrumpis.some(
      (grumpi) => grumpi.id === creature.id
    );

    if (!alreadyAssigned) {
      trainerGrumpis.push(creature);

      const updateStmt = db.prepare(`
        UPDATE trainers
        SET grumpis = ?
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(trainerGrumpis), trainer.id);

      console.log("Grumpi asignado correctamente al entrenador.");
    } else {
      console.log("El grumpi ya está asignado a este entrenador.");
    }

    return Promise.resolve("Criatura asignada correctamente al entrenador.");
  } else {
    return Promise.reject(
      new Error(`Entrenador con nombre ${trainerName} no encontrado.`)
    );
  }
}

// Ruta de asignación de grumpis
app.post("/assign-creature", (req, res) => {
  const { trainerIDs, creature } = req.body;
  console.log("Datos de la solicitud:", req.body);

  // Crea una promesa para cada entrenador en el array
  const promises = trainerIDs.map((trainer_id) =>
    assignCreatureToTrainer(trainer_id, creature)
  );

  // Espera a que todas las promesas se completen
  Promise.all(promises)
    .then((messages) => {
      res.status(200).json({
        message: "Criatura asignada con éxito a todos los entrenadores.",
        details: messages,
      });
    })
    .catch((error) => {
      console.error("Error al asignar el grumpi:", error);
      res.status(500).json({
        error:
          "Error al asignar el grumpi a los entrenadores: " + error.message,
      });
    });
});

/**************************************************************
 *
 *    FIN DE ASIGNACIÓN DE grumpis A LOS ENTRENADORES
 *
 *************************************************************/

/**---------------------------------------------------------------------------------------------*/

/**************************************************************
 *
 *    ASIGNACIÓN DE GRUMPIDOLARES A LOS ENTRENADORES
 *
 *************************************************************/

function assignGrumpidolaresToTrainer(trainerName, grumpidolar) {
  return new Promise((resolve, reject) => {
    console.log("Cantidad de Grumpidólares recibida (original): ", grumpidolar);

    const grumpidolaresNumber = Math.round(parseFloat(grumpidolar));
    console.log(
      "Cantidad de Grumpidólares convertida (redondeada): ",
      grumpidolaresNumber
    );

    if (isNaN(grumpidolaresNumber) || grumpidolaresNumber <= 0) {
      console.log("Cantidad de Grumpidólares no válida: ", grumpidolaresNumber);
      return reject("Grumpidólares debe ser un número positivo.");
    }

    const trainer = db
      .prepare("SELECT * FROM trainers WHERE name = ?")
      .get(trainerName);

    if (trainer) {
      console.log("Entrenador encontrado:", trainer);

      const currentGrumpidolares = parseFloat(trainer.grumpidolar) || 0;
      const newGrumpidolares = Math.round(
        currentGrumpidolares + grumpidolaresNumber
      ); // Redondear resultado final

      const updateStmt = db.prepare(
        "UPDATE trainers SET grumpidolar = ? WHERE id = ?"
      );
      const result = updateStmt.run(newGrumpidolares, trainer.id);

      console.log(
        "Cantidad de Grumpidólares después de la asignación:",
        newGrumpidolares
      );

      if (result.changes > 0) {
        resolve("Grumpidólares asignados correctamente al entrenador.");
      } else {
        reject("Error al actualizar los Grumpidólares en la base de datos.");
      }
    } else {
      reject(`Entrenador con nombre ${trainerName} no encontrado.`);
    }
  });
}

app.post("/assign-grumpidolares", (req, res) => {
  console.log("assign-grumpidolares:", req.body);

  const { trainerName, grumpidolar } = req.body;
  if (
    typeof trainerName !== "string" ||
    trainerName.trim() === "" ||
    grumpidolar === undefined ||
    isNaN(Number(grumpidolar))
  ) {
    return res.status(400).json({ error: "Datos inválidos en la solicitud." });
  }
  assignGrumpidolaresToTrainer(trainerName, grumpidolar)
    .then((message) => {
      res.status(200).json({ message: message });
    })
    .catch((error) => {
      console.error("Error al asignar los Grumpidólares:", error);
      res.status(400).json({ error: error });
    });
});

/**
 *
 *  ASIGNACIÓN DE GRUMPIDÓLARES AL ENTRENADOR DESPUÉS DE REALIZAR
 *  LA COMPRA DE OBJETOS.
 *
 */
function assignGrumpidolaresAfterBuyToTrainer(trainer_id, grumpidolar) {
  return new Promise((resolve, reject) => {
    console.log("Cantidad de Grumpidólares a restar:", grumpidolar);

    if (grumpidolar === undefined || grumpidolar === null) {
      console.log("Grumpidólares no definidos o nulos.");
      return reject("Grumpidólares deben estar definidos.");
    }

    const grumpidolaresToSubtract = grumpidolar;
    console.log(
      "Cantidad de Grumpidólares a restar (entero):",
      grumpidolaresToSubtract
    );

    if (isNaN(grumpidolaresToSubtract) || grumpidolaresToSubtract < 0) {
      console.log(
        "Cantidad de Grumpidólares no válida:",
        grumpidolaresToSubtract
      );
      return reject("Grumpidólares debe ser un número positivo.");
    }

    const trainer = db
      .prepare("SELECT * FROM trainers WHERE id = ?")
      .get(trainer_id);

    if (trainer) {
      console.log("Entrenador encontrado:", trainer);

      const currentGrumpidolares = trainer.grumpidolar;
      console.log(
        "Cantidad actual de Grumpidólares del entrenador:",
        currentGrumpidolares
      );
      console.log("Cantidad a restar al entrenador:", grumpidolaresToSubtract);

      const newGrumpidolares = currentGrumpidolares - grumpidolaresToSubtract;

      if (newGrumpidolares < 0) {
        console.log("El entrenador no tiene suficientes Grumpidólares.");
        return reject("El entrenador no tiene suficientes Grumpidólares.");
      }

      const updateStmt = db.prepare(
        "UPDATE trainers SET grumpidolar = ? WHERE id = ?"
      );
      updateStmt.run(grumpidolaresToSubtract, trainer.id);

      console.log(
        "Cantidad de Grumpidólares después de la compra:",
        newGrumpidolares
      );
      resolve("Grumpidólares restados correctamente al entrenador.");
    } else {
      reject(`Entrenador con nombre ${trainer_id} no encontrado.`);
    }
  });
}

app.post("/assignGrumpidolares-after-buy", (req, res) => {
  console.log("assignGrumpidolares-after-buy:", req.body);

  const { trainer_id, grumpidolares } = req.body;

  console.log("Cantidad de Grumpidólares para actualizar:", grumpidolares);

  assignGrumpidolaresAfterBuyToTrainer(trainer_id, grumpidolares)
    .then((message) => {
      res.status(200).json({ message: message });
    })
    .catch((error) => {
      console.error("Error al asignar los Grumpidólares:", error);
      res.status(400).json({ error: error });
    });
});

/**
 *
 *  FIN DE LA ASIGNACIÓN DE GRUMPIDÓLARES AL ENTRENADOR
 *  DESPUÉS DE REALIZAR LA COMPRA DE OBJETOS.
 *
 */

/**************************************************************
 *
 *    FIN DE ASIGNACIÓN DE GRUMPIDOLARES A LOS ENTRENADORES
 *
 *************************************************************/

/**
 * Método para obtener la información de un entrenador por nombre
 */
app.get("/trainer/:nombre", (req, res) => {
  const nombre = req.params.nombre;

  try {
    const trainer = db
      .prepare("SELECT * FROM trainers WHERE name = ?")
      .get(nombre);

    if (!trainer) {
      return res
        .status(200)
        .json({ success: false, error: "Entrenador no encontrado" });
    }

    /**
     *
     * PARSEANDO LAS LISTAS DEL ENTRENADOR
     *
     */
    parseDataTrainer(trainer);

    res.json({ success: true, data: trainer });
  } catch (error) {
    console.error(
      "Error al obtener la información del entrenador desde la base de datos:",
      error
    );
    res
      .status(500)
      .json({ success: false, error: "Error interno del servidor" });
  }
});

app.get("/trainer_by_id/:id", (req, res) => {
  const trainerId = parseInt(req.params.id, 10);

  try {
    const trainer = db
      .prepare("SELECT * FROM trainers WHERE id = ?")
      .get(trainerId);

    if (!trainer) {
      return res
        .status(200)
        .json({ success: false, error: "Entrenador no encontrado" });
    }

    // Parseando las listas del entrenador
    parseDataTrainer(trainer);

    res.json({ success: true, data: trainer });
  } catch (error) {
    console.error(
      "Error al obtener la información del entrenador desde la base de datos:",
      error
    );
    res
      .status(500)
      .json({ success: false, error: "Error interno del servidor" });
  }
});

/**
 * Función para parsear las listas de la mochila del entrenador.
 * @param {Recibe los datos del entrenador} trainer
 */
function parseDataTrainer(trainer) {
  if (trainer.grumpis && trainer.grumpis !== "undefined") {
    try {
      trainer.grumpis = JSON.parse(trainer.grumpis);
    } catch (error) {
      console.error("Error al parsear grumpis:", error);
      trainer.grumpis = [];
    }
  } else {
    trainer.grumpis = [];
  }

  if (trainer.energies && trainer.energies !== "undefined") {
    try {
      trainer.energies = JSON.parse(trainer.energies);
    } catch (error) {
      console.error("Error al parsear las energías:", error);
      trainer.energies = [];
    }
  } else {
    trainer.energies = [];
  }

  if (trainer.medallas && trainer.medallas !== "undefined") {
    try {
      trainer.medallas = JSON.parse(trainer.medallas);
    } catch (error) {
      console.error("Error al parsear las medallas:", error);
      trainer.medallas = [];
    }
  } else {
    trainer.medallas = [];
  }

  if (trainer.objetos_combate && trainer.objetos_combate !== "undefined") {
    try {
      trainer.objetos_combate = JSON.parse(trainer.objetos_combate);
    } catch (error) {
      console.error("Error al parsear los objetos de combate:", error);
      trainer.objetos_combate = [];
    }
  } else {
    trainer.objetos_combate = [];
  }

  if (
    trainer.objetos_evolutivos &&
    trainer.objetos_evolutivos !== "undefined"
  ) {
    try {
      trainer.objetos_evolutivos = JSON.parse(trainer.objetos_evolutivos);
    } catch (error) {
      console.error("Error al parsear los objetos evolutivos:", error);
      trainer.objetos_evolutivos = [];
    }
  } else {
    trainer.objetos_evolutivos = [];
  }

  if (trainer.recompensas && trainer.recompensas !== "undefined") {
    try {
      trainer.recompensas = JSON.parse(trainer.recompensas);
    } catch (error) {
      console.error("Error al parsear las recompensas:", error);
      trainer.recompensas = [];
    }
  } else {
    trainer.recompensas = [];
  }

  if (trainer.distintivos_liga && trainer.distintivos_liga !== "undefined") {
    try {
      trainer.distintivos_liga = JSON.parse(trainer.distintivos_liga);
    } catch (error) {
      console.error("Error al parsear los distintivos de liga:", error);
      trainer.distintivos_liga = [];
    }
  } else {
    trainer.distintivos_liga = [];
  }
}

/***************************************************************
 *                                                              *
 *                                                              *
 *                                                              *
 *                            AVATARES                          *
 *                                                              *
 *                                                              *
 *                                                              *
 ***************************************************************/
app.get("/getAvatars", (req, res) => {
  fs.readFile(filePathAvatars, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo avatars.json:", err);
      res.status(500).json({ error: "Error al leer el archivo avatars.json" });
    } else {
      try {
        const avatars_list = JSON.parse(data);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.json({ avatars_list: avatars_list });
      } catch (parseError) {
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/***************************************************************
 *                                                              *
 *                                                              *
 *                                                              *
 *                            GRUMPIS                           *
 *                                                              *
 *                                                              *
 *                                                              *
 ***************************************************************/

/**
 *
 * OBTENCIÓN DE LOS GRUMPIS
 * Se obtienen desde el archivo JSON "grumpis.json"
 */
app.get("/getGrumpis", (req, res) => {
  fs.readFile(filePathGrumpis, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo grumpis.json:", err);
      res.status(500).json({ error: "Error al leer el archivo grumpis.json" });
    } else {
      try {
        const grumpis_list = JSON.parse(data);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.json({ grumpis_list: grumpis_list });
      } catch (parseError) {
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/**
 *
 * OBTENER TODOS LOS ATAQUES
 *
 */
app.get("/getAllAttacks", (req, res) => {
  fs.readFile(filePathAttacks, "utf8", (err, data) => {
    if (err) {
      // Manejar el error si no se puede leer el archivo
      console.error("Error al leer el archivo attacks.json:", err);
      res.status(500).json({ error: "Error al leer el archivo attacks.json" });
    } else {
      try {
        const attacks_list = JSON.parse(data);
        res.json({ attacks_list: attacks_list });
      } catch (parseError) {
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/**
 *
 * Función para obtener las imágenes de los grumpis
 * almacenadas en un archivo json.
 *
 */
app.get("/getImageUrls", (req, res) => {
  // Lee todos los archivos en el directorio de imágenes
  fs.readdir(howToGetGrumpi, (err, files) => {
    if (err) {
      console.error("Error al leer el directorio de imágenes:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    // Construye las URLs de las imágenes
    const imageUrls = files.map((file) => {
      return `https://grumpistoreserver.onrender.com/uploads/grumpis/howToGetGrumpis/${file}`;
    });

    // Devuelve las URLs de las imágenes como una respuesta JSON
    res.json({ imageUrls });
  });
});

/**
 *
 * FUNCIÓN PARA AÑADIR UN NUEVO GRUMPI A LA LISTA
 *
 */
app.post("/grumpis", upload.single("image"), (req, res) => {
  try {
    const grumpiData = JSON.parse(req.body.grumpiData);

    // Verificar que el archivo ha sido cargado
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No se ha cargado ninguna imagen" });
    }

    // Definir la ruta a la imagen y actualizar la URL de la imagen
    const fileExt = path.extname(req.file.originalname);
    const imageUrl = `https://grumpistoreserver.onrender.com/uploads/grumpis/${req.file.filename}${fileExt}`;

    // Asignar la URL de la imagen al objeto grumpiData
    grumpiData.img = imageUrl;

    // Preparar la consulta SQL para insertar el nuevo grumpi
    const query = `
      INSERT INTO grumpis (nombre, PS,n_grumpidex, clase, img_general, img_conseguir, descripcion, Ciclo1, Ciclo2, Ciclo3, tipo, trainer_id )
      VALUES (?, ?, ?, ?)
    `;
    const params = [
      grumpiData.numero,
      grumpiData.name,
      grumpiData.description,
      grumpiData.img,
    ];

    db.run(query, params, function (err) {
      if (err) {
        console.error("Error al guardar el Grumpi en la base de datos:", err);
        return res
          .status(500)
          .json({ message: "Error al guardar el Grumpi", error: err.message });
      }

      // Devolver una respuesta exitosa
      console.log("Grumpi guardado en la base de datos:", grumpiData);
      res
        .status(201)
        .json({ message: "Grumpi guardado correctamente", grumpi: grumpiData });
    });
  } catch (err) {
    console.error("Error al procesar la solicitud de Grumpi", err);
    res
      .status(500)
      .json({ message: "Error al guardar el Grumpi", error: err.message });
  }
});

/***************************************************************
 *                                                              *
 *                                                              *
 *                                                              *
 *                           MEDALLAS                           *
 *                                                              *
 *                                                              *
 *                                                              *
 ***************************************************************/
/**
 *
 * OBTENCIÓN DE MEDALLAS
 *
 */
app.get("/getImageMedals", (req, res) => {
  fs.readFile(filePathMedals, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo medals.json:", err);
      res.status(500).json({ error: "Error al leer el archivo medals.json" });
    } else {
      try {
        const medals_list = JSON.parse(data);
        res.json({ medals_list: medals_list });
      } catch (parseError) {
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/******************************************
 *
 * OBTENER LAS IMÁGENES DE LAS ENERGÍAS
 *
 ******************************************/
app.get("/getImageEnergies", (req, res) => {
  fs.readFile(filePathEnergies, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo energies.json:", err);
      res.status(500).json({ error: "Error al leer el archivo energies.json" });
    } else {
      try {
        const energy_list = JSON.parse(data);
        res.json({ energy_list: energy_list });
      } catch (parseError) {
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/********************************************************
 *
 *    OBTENER LAS IMAGENES DE LOS GRUMPIS
 *    CON LA DESCRIPCIÓN DE COMO CONSEGUIRLOS
 *
 *******************************************************/
app.get("/getImageGrumpiHowToGet", (req, res) => {
  fs.readdir(howToGetGrumpi, (err, files) => {
    if (err) {
      console.error(
        "Error al leer el directorio de imágenes de los Grumpi con descripción:",
        err
      );
      return res.status(500).json({ error: "Error interno del servidor" });
    }
    const imageUrls = files.map((file) => {
      return `https://grumpistoreserver.onrender.com/uploads/howToGetGrumpis/${file}`;
    });
    res.json({ imageUrls });
  });
});

/******************************************
 *
 * ASIGNAR ENERGÍAS
 *
 ******************************************/
// Función para asignar una energía a un entrenador
function assignEnergyToTrainer(trainer_id, energyImagePath) {
  console.log(
    "Ruta de la energía para asignar al entrenador: ",
    energyImagePath
  );
  const trainer = db
    .prepare("SELECT * FROM trainers WHERE id = ?")
    .get(trainer_id);

  if (trainer) {
    let trainerEnergyObject = trainer.energies
      ? JSON.parse(trainer.energies)
      : [];

    const alreadyAssigned = trainerEnergyObject.includes(energyImagePath);

    if (!alreadyAssigned) {
      trainerEnergyObject.push(energyImagePath);

      const updateStmt = db.prepare(`
        UPDATE trainers
        SET energies = ?
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(trainerEnergyObject), trainer.id);

      console.log("Energía asignada correctamente al entrenador.");
      return Promise.resolve("Energía asignada correctamente al entrenador.");
    } else {
      console.log("La energía ya está asignada a este entrenador.");
      return Promise.resolve("La energía ya está asignada a este entrenador.");
    }
  } else {
    return Promise.reject(
      new Error(`Entrenador con nombre ${trainer_id} no encontrado.`)
    );
  }
}

/*******************************************
 *
 *    ASIGNAR ENERGÍA A LOS ENTRENADORES
 *
 ******************************************/
app.post("/assign-energie", (req, res) => {
  const { trainerNames, trainer_id, energie } = req.body;
  console.log("assign-energie:", req.body);

  if (!energie) {
    return res.status(400).json({
      error: "Datos de energía incompletos. Asegúrate de enviar una imagen.",
    });
  }

  if (trainer_id) {
    console.log("Se recibió un solo ID de entrenador:", trainer_id);
    assignEnergyToTrainer(trainer_id, energie)
      .then((message) => {
        res.status(200).json({
          message: "Energía asignada con éxito al entrenador.",
          details: message,
        });
      })
      .catch((error) => {
        console.error("Error al asignar la energía:", error);
        res.status(500).json({
          error: "Error al asignar la energía: " + error.message,
        });
      });
  } else if (Array.isArray(trainerNames) && trainerNames.length > 0) {
    console.log("Trainer IDs recibidos:", trainerNames);

    const promises = trainerNames.map((trainer_id) => {
      console.log("Asignando energía a entrenador con ID:", trainer_id);
      return assignEnergyToTrainer(trainer_id, energie);
    });

    Promise.all(promises)
      .then((messages) => {
        res.status(200).json({
          message: "Energía asignada con éxito a todos los entrenadores.",
          details: messages,
        });
      })
      .catch((error) => {
        console.error("Error al asignar la energía:", error);
        res.status(500).json({
          error:
            "Error al asignar la energía a los entrenadores: " + error.message,
        });
      });
  } else {
    return res.status(400).json({
      error:
        "Lista de entrenadores no válida. Debe ser un array de IDs o un ID válido.",
    });
  }
});

/******************************************
 *
 * FIN ASIGNAR LAS ENERGÍAS
 *
 ******************************************/

app.post("/upload", upload.single("image"), (req, res) => {
  console.log("Archivo recibido:", req.file);
  console.log("Datos del formulario:", req.body);
  if (!req.file) {
    return res.status(400).json({ message: "No se ha subido ninguna imagen" });
  }
  res.json({ message: "Imagen subida correctamente", file: req.file });
});

/******************************
 *
 *        SUBIR MEDALLAS
 *
 *****************************/
app.post("/upload-medal", upload.single("image"), (req, res) => {
  console.log("Medalla recibida:", req.file);
  if (!req.file) {
    return res.status(400).json({ message: "No se ha subido ninguna imagen" });
  }
  res.json({
    message: "Imagen de medalla subida correctamente",
    file: req.file,
  });
});

/********************************************************************
 *                                                                  *
 *            ASIGNACIÓN DE MEDALLAS A LOS ENTRENADORES             *
 *                                                                  *
 *******************************************************************/

// Función para actualizar y guardar los datos del entrenador en el archivo JSON
function saveTrainerData() {
  fs.writeFile(filePath, JSON.stringify(trainerData, null, 2), (err) => {
    if (err) {
      console.error("Error al guardar los datos del entrenador:", err);
    } else {
      console.log("Datos del entrenador guardados correctamente.");
    }
  });
}

// Función para asignar una medalla a un entrenador
function assignMedalToTrainer(trainerName, medalImagePath) {
  console.log(
    "Ruta de la medalla para asignar al entrenador: ",
    medalImagePath
  );
  const trainer = db
    .prepare("SELECT * FROM trainers WHERE id = ?")
    .get(trainerName);

  if (trainer) {
    let trainerMedals = trainer.medallas ? JSON.parse(trainer.medallas) : [];

    const alreadyAssigned = trainerMedals.includes(medalImagePath);

    if (!alreadyAssigned) {
      trainerMedals.push(medalImagePath);

      const updateStmt = db.prepare(`
        UPDATE trainers
        SET medallas = ?
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(trainerMedals), trainer.id);

      console.log("Medalla asignada correctamente al entrenador.");
      return Promise.resolve("Medalla asignada correctamente al entrenador.");
    } else {
      console.log("La medalla ya está asignada a este entrenador.");
      return Promise.resolve("La medalla ya está asignada a este entrenador.");
    }
  } else {
    return Promise.reject(
      new Error(`Entrenador con nombre ${trainerName} no encontrado.`)
    );
  }
}

/**
 *
 * Asignación de medallas al entrenador.
 *
 */
app.post("/assign-medal", (req, res) => {
  const { trainerNames, medal } = req.body;
  console.log("assign-medal:", req.body);

  if (!medal) {
    return res.status(400).json({
      error: "Datos de medalla incompletos. Asegúrate de enviar una imagen.",
    });
  }

  const promises = trainerNames.map((trainerName) =>
    assignMedalToTrainer(trainerName, medal)
  );

  Promise.all(promises)
    .then((messages) => {
      res.status(200).json({
        message: "Medalla asignada con éxito a todos los entrenadores.",
        details: messages,
      });
    })
    .catch((error) => {
      console.error("Error al asignar la medalla:", error);
      res.status(500).json({
        error:
          "Error al asignar la medalla a los entrenadores: " + error.message,
      });
    });
});

/********************************
 *
 *      OBJETOS DE COMBATE
 *
 *******************************/
app.get("/getImageCombatObjects", (req, res) => {
  fs.readFile(filePathObjectsCombat, "utf8", (err, data) => {
    if (err) {
      // Manejar el error si no se puede leer el archivo
      console.error("Error al leer el archivo trainers.json:", err);
      res
        .status(500)
        .json({ error: "Error al leer el archivo combatObjects.json" });
    } else {
      try {
        // Parsea el contenido del archivo JSON a un objeto JavaScript
        const objectsList = JSON.parse(data);
        // Envía el listado completo de entrenadores como respuesta
        res.json({ objectsList: objectsList });
      } catch (parseError) {
        // Manejar el error si no se puede parsear el contenido JSON
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});
/************************************************************
 *
 *
 *  ASIGNACIÓN DE LOS OBJETOS DE COMBATE A UN ENTRENADOR
 *
 *
 ***********************************************************/

// Función para asignar un objeto de combate a un entrenador
function assignCombatObjectToTrainer(trainer_id, combatObject) {
  console.log(
    "Ruta del objeto de combate para asignar al entrenador: ",
    combatObject
  );
  const trainer = db
    .prepare("SELECT * FROM trainers WHERE id = ?")
    .get(trainer_id);

  if (trainer) {
    let trainerCombatObj = trainer.objetos_combate
      ? JSON.parse(trainer.objetos_combate)
      : [];

    // Simplemente agregar el objeto sin importar si ya existe
    trainerCombatObj.push(combatObject);

    const updateStmt = db.prepare(`
      UPDATE trainers
      SET objetos_combate = ?
      WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(trainerCombatObj), trainer.id);

    console.log("Objeto de combate asignado correctamente al entrenador.");
    return Promise.resolve(
      "Objeto de combate asignado correctamente al entrenador."
    );
  } else {
    return Promise.reject(
      new Error(`Entrenador con nombre ${trainer_id} no encontrado.`)
    );
  }
}

// Ruta de asignación de objetos de combate
app.post("/assign-combatObjects", (req, res) => {
  let { trainerIDs, combatObject } = req.body;
  console.log("assign-combatObjects - Request body:", req.body);

  // Asignar el objeto de combate a cada entrenador
  const promises = trainerIDs.map((trainer_id) =>
    assignCombatObjectToTrainer(trainer_id, combatObject)
  );

  Promise.all(promises)
    .then((messages) => {
      res.status(200).json({
        message:
          "Objeto de combate asignado con éxito a todos los entrenadores.",
        details: messages,
      });
    })
    .catch((error) => {
      console.error("Error al asignar el objeto de combate:", error);
      res.status(500).json({
        error:
          "Error al asignar el objeto de combate a los entrenadores: " +
          error.message,
      });
    });
});

/***************************************************************
 *                                                              *
 *                                                              *
 *                                                              *
 *                       OBJETOS EVOLUTIVOS                     *
 *                                                              *
 *                                                              *
 *                                                              *
 ***************************************************************/

/******************************************************
 *
 *  OBTENER LAS IMÁGENES DE LOS OBJETOS EVOLUTIVOS
 *
 ******************************************************/
app.get("/getEvoOBjects", (req, res) => {
  fs.readFile(filePathObjectsEvolution, "utf8", (err, data) => {
    if (err) {
      // Manejar el error si no se puede leer el archivo
      console.error("Error al leer el archivo evolutionObjects.json:", err);
      res
        .status(500)
        .json({ error: "Error al leer el archivo evolutionObjects.json" });
    } else {
      try {
        // Parsea el contenido del archivo JSON a un objeto JavaScript
        const objectsList = JSON.parse(data);
        // Envía el listado completo de entrenadores como respuesta
        res.json({ objectsList: objectsList });
      } catch (parseError) {
        // Manejar el error si no se puede parsear el contenido JSON
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/******************************************
 *
 *       ASIGNAR OBJETOS EVOLUTIVOS
 *
 ******************************************/

// Función para asignar una energía a un entrenador
function assignEvoObjectsToTrainer(trainerID, evoObject) {
  console.log(
    "Ruta del objeto evolutivo para asignar al entrenador: ",
    evoObject
  );
  const trainer = db
    .prepare("SELECT * FROM trainers WHERE id = ?")
    .get(trainerID);

  if (trainer) {
    let trainerEvolutionObjects = trainer.objetos_evolutivos
      ? JSON.parse(trainer.objetos_evolutivos)
      : [];

    const alreadyAssigned = trainerEvolutionObjects.includes(evoObject);

    if (!alreadyAssigned) {
      trainerEvolutionObjects.push(evoObject);

      const updateStmt = db.prepare(`
        UPDATE trainers
        SET objetos_evolutivos = ?
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(trainerEvolutionObjects), trainer.id);

      console.log("Objeto evolutivo asignado correctamente al entrenador.");
      return Promise.resolve(
        "Objeto evolutivo asignado correctamente al entrenador."
      );
    } else {
      console.log("El objeto evolutivo ya está asignado a este entrenador.");
      return Promise.resolve(
        "El objeto evolutivo ya está asignado a este entrenador."
      );
    }
  } else {
    return Promise.reject(
      new Error(`Entrenador con nombre ${trainerName} no encontrado.`)
    );
  }
}

// Ruta de asignación de los objetos evolutivos
app.post("/assign-evo-objects", (req, res) => {
  const { trainerID, evoObject } = req.body;
  console.log("assign-evo-objects:", req.body);
  assignEvoObjectsToTrainer(trainerID, evoObject)
    .then((message) => {
      res.status(200).json({ message: message });
    })
    .catch((error) => {
      console.error("Error al asignar el objeto evolutivo:", error);
      res.status(500).json({
        error: "Error al asignar el objeto evolutivo al entrenador: " + error,
      });
    });
});

/******************************************
 *
 *    FIN DE ASIGNAR OBJETOS EVOLUTIVOS
 *
 ******************************************/

/******************************************
 *
 *    ASIGNAR MARCAS DE COMBATE
 *
 ******************************************/

function assignCombatMarksToTrainer(trainerName, combatMark) {
  return new Promise((resolve, reject) => {
    console.log("Cantidad de Grumpidólares recibida (original): ", grumpidolar);
    const combatMarkNumber = Number(combatMark);
    console.log("Cantidad de Grumpidólares convertida: ", combatMarkNumber);

    if (isNaN(combatMarkNumber) || combatMarkNumber <= 0) {
      console.log("Cantidad de Grumpidólares no válida: ", combatMarkNumber);
      return reject("Grumpidólares debe ser un número positivo.");
    }

    const trainer = trainerData.find((trainer) => trainer.name === trainerName);
    if (trainer) {
      console.log("Entrenador encontrado:", trainer);

      // Asegurarse de que trainer.grumpidolar es un número antes de sumar
      trainer.marca_combate = Number(trainer.marca_combate) || 0;
      trainer.marca_combate += combatMark;

      console.log(
        "Cantidad de marcas de comabte después de la asignación:",
        trainer.marca_combate
      );

      saveTrainerData();
      resolve("Marcas de combate asignadas correctamente al entrenador.");
    } else {
      reject(`Entrenador con nombre ${trainerName} no encontrado.`);
    }
  });
}
app.post("/assign-combatMarks", (req, res) => {
  const { trainerName, combatMark } = req.body;
  console.log("Datos de la solicitud:", req.body);
  assignCombatMarksToTrainer(trainerName, req.body.combatMark)
    .then((message) => {
      res.status(200).json({ message: message });
    })
    .catch((error) => {
      console.error("Error al asignar las marcas de combate:", error);
      res.status(400).json({ error: error });
    });
});
/******************************************
 *
 *    FIN DE ASIGNAR MARCAS DE COMBATE
 *
 ******************************************/

/**
 *
 *  GESTIÓN DE PROFESORES
 *
 */
let profesoresList = [];
let idDelProfe = 1; // Inicialmente, el ID empieza en 1

// Lee los datos del archivo trainers.json si existe
try {
  const data = fs.readFileSync(filePathAmin, "utf8");
  profesoresList = JSON.parse(data);
} catch (err) {
  // Si hay un error al leer el archivo, asigna un array vacío a trainer_list
  profesoresList = [];
}
fs.readFile(filePathAmin, "utf8", (err, data) => {
  if (err && err.code !== "ENOENT") {
    console.error("Error al leer el archivo:", err);
  } else if (data) {
    try {
      profesoresList = JSON.parse(data);
      // Si hay entrenadores en la lista, ajustar currentId al mayor ID + 1
      if (profesoresList.length > 0) {
        idDelProfe =
          Math.max(...profesoresList.map((profesor) => profesor.id)) + 1;
      }
    } catch (e) {
      console.error("Error al parsear JSON:", e);
    }
  }
});

/**
 * Función para obtener los datos de los profesores.
 * Hace uso de la BD.
 */
app.get("/profesores", (req, res) => {
  try {
    // Consultar la base de datos para obtener la lista de profesores
    const profesoresList = db
      .prepare(
        `
      SELECT * FROM profesores
    `
      )
      .all();

    // Verificar si se encontraron profesores
    if (profesoresList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron profesores en la base de datos",
      });
    }

    // Devolver la lista de profesores encontrados en la base de datos
    res.json({ profesoresList: profesoresList });
  } catch (err) {
    console.error("Error al obtener la lista de profesores:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

const readJsonFile = (filePathAmin) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePathAmin, "utf8", (err, data) => {
      if (err) {
        return reject(err);
      }
      try {
        const jsonData = JSON.parse(data);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    });
  });
};

/**
 *
 *  OBTENER UN PROFESOR POR SU NOMBRE
 *
 */
app.get("/profesor/:nombre", (req, res) => {
  const nombre = req.params.nombre;
  try {
    const profesor = db
      .prepare("SELECT * FROM profesores WHERE nombre = ?")
      .get(nombre);

    if (!profesor) {
      return res
        .status(200)
        .json({ success: false, error: "Profesor no encontrado" });
    }
    res.json({ success: true, data: profesor });
  } catch (error) {
    console.error(
      "Error al obtener la información del profesor desde la base de datos:",
      error
    );
    res
      .status(500)
      .json({ success: false, error: "Error interno del servidor" });
  }
});

app.get("/profesor/:id", async (req, res) => {
  const profesorId = parseInt(req.params.id);

  try {
    const profesores = await readJsonFile(filePathAmin);
    const entrenadores = await readJsonFile(filePath);

    const profesor = profesores.find((p) => p.id === profesorId);

    if (!profesor) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    const entrenadoresAsignados = entrenadores.filter(
      (t) => t.id_profesor === profesorId
    );

    res.json({
      profesor,
      entrenadores: entrenadoresAsignados,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Obtiene la lista de enteenadores de un profesor.
 * Hace uso de BD.
 *
 */
app.get("/profesor/:id/entrenadores", async (req, res) => {
  const profesorId = parseInt(req.params.id);

  try {
    // Consultar la base de datos para obtener entrenadores asignados al profesor, ordenados por el campo 'order'
    const entrenadoresDb = db
      .prepare(
        `
      SELECT * FROM trainers WHERE id_profesor = ? ORDER BY "order" ASC
    `
      )
      .all(profesorId);

    if (entrenadoresDb.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron entrenadores para el profesor indicado",
      });
    }

    // Devolver los entrenadores encontrados en la base de datos
    res.json({ success: true, data: entrenadoresDb });
  } catch (err) {
    console.error("Error al obtener entrenadores:", err);
    res
      .status(500)
      .json({ success: false, error: "Error interno del servidor" });
  }
});

/**
 * Agrega un nuevo entrenador
 * Hace uso de BD
 */
app.post("/profesores/:id/entrenadores", (req, res) => {
  const profesorId = parseInt(req.params.id);
  const nuevoUsuario = req.body;

  let insertQuery;

  try {
    if (nuevoUsuario.rol === "entrenador") {
      insertQuery = db.prepare(`
        INSERT INTO trainers (name, password, rol, avatar, id_profesor) 
        VALUES (?, ?, ?, ?, ?)
      `);
      insertQuery.run(
        nuevoUsuario.name,
        nuevoUsuario.password,
        nuevoUsuario.rol,
        nuevoUsuario.avatar,
        profesorId
      );
    } else if (nuevoUsuario.rol === "profesor") {
      // Inserta en la tabla `profesores`
      insertQuery = db.prepare(`
        INSERT INTO profesores (nombre, apellidos, usuario, password, rol) 
        VALUES (?, ?, ?, ?, ?)
      `);
      insertQuery.run(
        nuevoUsuario.nombre,
        nuevoUsuario.apellidos,
        nuevoUsuario.usuario,
        nuevoUsuario.password,
        nuevoUsuario.rol
      );
    } else {
      // Si el rol no es válido
      return res.status(400).json({ message: "Rol no válido" });
    }

    // Obtener el ID del último registro insertado
    const lastInsertRowId = db
      .prepare("SELECT last_insert_rowid() as id")
      .get().id;

    // Asignar el ID generado al nuevo usuario
    nuevoUsuario.id = lastInsertRowId;
    nuevoUsuario.id_profesor = profesorId;

    // Respuesta con el nuevo usuario agregado
    res.status(201).json({
      message: `${nuevoUsuario.rol} agregado correctamente`,
      nuevoUsuario,
    });
  } catch (dbError) {
    console.error("Error al insertar en la base de datos:", dbError);
    res.status(500).json({ error: "Error al insertar en la base de datos" });
  }
});

/**
 *
 * Modificación de la contraseña del profesor
 * Hace uso de BD
 *
 */
app.put("/profesors/update/:name", (req, res) => {
  const professorName = req.params.name; // Nombre del profesor a actualizar
  const { professor_name, password } = req.body; // Campos a actualizar

  console.log("Profesor que se va a editar: ", professorName);
  console.log("Atributos a editar del profesor: ", professor_name, password);

  // Actualización en la base de datos
  try {
    // Prepara la consulta de actualización
    const updateQuery = db.prepare(`
      UPDATE profesores
      SET nombre = ?, password = ?
      WHERE nombre = ?
    `);

    // Ejecuta la consulta de actualización
    const result = updateQuery.run(
      professor_name || professorName,
      password || null,
      professorName
    );

    // Verifica si se actualizó alguna fila
    if (result.changes === 0) {
      return res.status(404).json({ error: "Profesor no encontrado." });
    }

    console.log("Profesor actualizado en la base de datos.");

    // Actualización en el archivo JSON
    fs.readFile(filePathAmin, "utf8", (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ error: `Error al leer el fichero [${filePathAmin}]` });
      }

      let professors;
      try {
        professors = JSON.parse(data);
      } catch (parseErr) {
        return res
          .status(500)
          .json({ error: "Error al parsear los datos de los profesores." });
      }

      const professorIndex = professors.findIndex(
        (prof) => prof.nombre === professorName
      );

      if (professorIndex === -1) {
        return res
          .status(404)
          .json({ error: "Profesor no encontrado en el archivo." });
      }

      // Actualizar los datos del profesor en el archivo JSON
      if (professor_name) professors[professorIndex].nombre = professor_name;
      if (password) professors[professorIndex].password = password;

      // Guardar los datos actualizados en el archivo
      fs.writeFile(
        filePathAmin,
        JSON.stringify(professors, null, 2),
        "utf8",
        (writeErr) => {
          if (writeErr) {
            return res.status(500).json({
              error: "Error al guardar los datos actualizados en el archivo.",
            });
          }

          res.status(200).json({
            message: "Profesor actualizado correctamente.",
            data: professors[professorIndex],
          });
        }
      );
    });
  } catch (dbError) {
    console.error(
      "Error al actualizar el profesor en la base de datos:",
      dbError
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 *
 * Modificación de todos los datos del profesor
 * Hace uso de la BD
 *
 */
app.put("/profesors/update_all_data/:name", (req, res) => {
  const professorName = req.params.name; // Nombre del profesor a actualizar
  const { usuario, professor_name, password } = req.body; // Campos a actualizar

  console.log("Profesor que se va a editar: ", professorName);
  console.log(
    "Atributos a editar del profesor: ",
    usuario,
    professor_name,
    password
  );

  try {
    // Primero, actualiza en la base de datos
    const updateQuery = db.prepare(`
      UPDATE profesores
      SET nombre = ?, password = ?, usuario = ?
      WHERE nombre = ?
    `);

    const result = updateQuery.run(
      professor_name || professorName, // Usar el nombre nuevo si se proporciona
      password || null, // Usar null si no se proporciona una nueva contraseña
      usuario || null, // Usar null si no se proporciona un nuevo usuario
      professorName // El nombre antiguo para encontrar al profesor
    );

    // Verificar si se actualizó alguna fila en la base de datos
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: "Profesor no encontrado en la base de datos." });
    }

    console.log("Profesor actualizado en la base de datos.");

    // Después de actualizar en la base de datos, actualizar en el archivo JSON
    fs.readFile(filePathAmin, "utf8", (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ error: `Error al leer el fichero [${filePathAmin}]` });
      }

      let professors;
      try {
        professors = JSON.parse(data);
      } catch (parseErr) {
        return res
          .status(500)
          .json({ error: "Error al parsear los datos de los profesores." });
      }

      const professorIndex = professors.findIndex(
        (prof) => prof.nombre === professorName
      );

      if (professorIndex === -1) {
        return res
          .status(404)
          .json({ error: "Profesor no encontrado en el archivo." });
      }

      // Actualizar los datos del profesor en el archivo JSON
      if (professor_name) professors[professorIndex].nombre = professor_name;
      if (password) professors[professorIndex].password = password;
      if (usuario) professors[professorIndex].usuario = usuario;

      // Guardar los datos actualizados en el archivo
      fs.writeFile(
        filePathAmin,
        JSON.stringify(professors, null, 2),
        "utf8",
        (writeErr) => {
          if (writeErr) {
            return res.status(500).json({
              error: "Error al guardar los datos actualizados en el archivo.",
            });
          }

          res.status(200).json({
            message: "Profesor actualizado correctamente.",
            data: professors[professorIndex],
          });
        }
      );
    });
  } catch (dbError) {
    console.error(
      "Error al actualizar el profesor en la base de datos:",
      dbError
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 *
 * Función para eliminar un profesor
 * Hace uso de la BD
 */
app.delete("/professor_to_delete/:name", async (req, res) => {
  const userName = req.params.name;

  try {
    // Eliminar el profesor de la base de datos
    const deleteQuery = db.prepare(`DELETE FROM profesores WHERE nombre = ?`);
    const result = deleteQuery.run(userName);

    if (result.changes === 0) {
      return res.status(404).json({
        error: `Profesor con nombre ${userName} no encontrado en la base de datos`,
      });
    }

    console.log(
      `Profesor con nombre ${userName} eliminado de la base de datos`
    );

    // Leer y actualizar el archivo JSON
    const data = await fs.promises.readFile(filePathAmin, "utf8");
    let profesor_list = JSON.parse(data);

    // Filtrar la lista de profesores para excluir el profesor seleccionado
    const updatedProfessorList = profesor_list.filter(
      (professor) => professor.nombre !== userName
    );

    if (updatedProfessorList.length === profesor_list.length) {
      return res.status(404).json({
        error: `Profesor con nombre ${userName} no encontrado en el archivo`,
      });
    }

    await fs.promises.writeFile(
      filePathAmin,
      JSON.stringify(updatedProfessorList, null, 2)
    );

    console.log(
      `Profesor con nombre ${userName} eliminado correctamente del archivo`
    );

    // Devolver la lista actualizada como respuesta
    res.status(200).json({
      message: `Profesor con nombre ${userName} eliminado correctamente`,
      profesor_list: updatedProfessorList,
    });
  } catch (err) {
    console.error("Error al procesar el archivo JSON o la base de datos:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 *
 * FIN DE GESTIÓN DE PROFESORES
 *
 */

/***************************************************************
 *                                                              *
 *                                                              *
 *                                                              *
 *                          RECOMPENSAS                         *
 *                                                              *
 *                                                              *
 *                                                              *
 ***************************************************************/
/**
 * Obtención de la lista de recompensas
 */
app.get("/getRewards", (req, res) => {
  fs.readFile(filePathRewards, "utf8", (err, data) => {
    if (err) {
      // Manejar el error si no se puede leer el archivo
      console.error("Error al leer el archivo rewards.json:", err);
      res.status(500).json({ error: "Error al leer el archivo rewards.json" });
    } else {
      try {
        // Parsea el contenido del archivo JSON a un objeto JavaScript
        const rewardsList = JSON.parse(data);
        // Envía el listado completo de entrenadores como respuesta
        res.json({ rewardsList: rewardsList });
      } catch (parseError) {
        // Manejar el error si no se puede parsear el contenido JSON
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/**
 * Asignación de recompensas al entrenador
 */

function saveTrainerData() {
  fs.writeFileSync(filePath, JSON.stringify(trainerData, null, 2), "utf8");
}

function assignRewardToTrainer(trainer_id, reward) {
  console.log("Ruta de la recompensa para asignar al entrenador: ", reward);
  const trainer = db
    .prepare("SELECT * FROM trainers WHERE id = ?")
    .get(trainer_id);

  if (trainer) {
    let trainerRewards = trainer.recompensas
      ? JSON.parse(trainer.recompensas)
      : [];

    const alreadyAssigned = trainerRewards.includes(reward);

    if (!alreadyAssigned) {
      trainerRewards.push(reward);

      const updateStmt = db.prepare(`
        UPDATE trainers
        SET recompensas = ?
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(trainerRewards), trainer.id);

      console.log("Recompensa asignada correctamente al entrenador.");
      return Promise.resolve(
        "Recompensa asignada correctamente al entrenador."
      );
    } else {
      console.log("La recompensa ya está asignada a este entrenador.");
      return Promise.resolve(
        "La recompensa ya está asignada a este entrenador."
      );
    }
  } else {
    return Promise.reject(
      new Error(`Entrenador con nombre ${trainerName} no encontrado.`)
    );
  }
}

app.post("/assign-rewards", (req, res) => {
  const { trainer_id, reward } = req.body;
  console.log("assign-rewards:", req.body);

  if (!reward) {
    return res.status(400).json({
      error: "Datos de recompensa incompletos. Asegúrate de enviar una imagen.",
    });
  }

  const assignRewardPromise = assignRewardToTrainer(trainer_id, reward);

  assignRewardPromise
    .then((message) => {
      res.status(200).json({
        message: "Recompensa asignada con éxito.",
        details: message,
      });
    })
    .catch((error) => {
      console.error("Error al asignar la recompensa:", error);
      res.status(500).json({
        error: "Error al asignar la recompensa al entrenador: " + error.message,
      });
    });
});

/**
 *
 * Función que se utiliza para cuando un entrenador
 * compra objetos que se pagan con energías.
 *
 * Este método llama a la función {spendEnergies()}
 * que es donde se trata toda la lógica.
 *
 */
app.post("/spend-energies", (req, res) => {
  const { trainer_id, energiesToSpend, totalEnergies } = req.body;
  console.log("spend-energies:", req.body);
  spendEnergies(trainer_id, energiesToSpend, totalEnergies)
    .then((message) => {
      res.status(200).json({ message: message });
    })
    .catch((error) => {
      console.error("Error al gastar energías:", error);
      res.status(500).json({ error: "Error al gastar energías: " + error });
    });
});

async function spendEnergies(trainer_id, energiesToSpend, totalEnergies) {
  try {
    const trainerStmt = db.prepare("SELECT * FROM trainers WHERE id = ?");
    const trainer = trainerStmt.get(trainer_id);

    if (!trainer) {
      throw new Error(`Entrenador con ID ${trainer_id} no encontrado.`);
    }

    if (!trainer.energies) {
      throw new Error("El entrenador no tiene energías asignadas.");
    }

    let energies;
    try {
      energies = JSON.parse(trainer.energies);
      if (!Array.isArray(energies)) {
        throw new Error("El formato de las energías es inválido.");
      }
    } catch (error) {
      throw new Error("Error al parsear energías desde la base de datos.");
    }

    for (const energyToSpend of energiesToSpend) {
      const type = energyToSpend.type.toLowerCase(); // Aseguramos el uso de minúsculas
      const availableEnergiesOfType = energies.filter(
        (e) => e.tipo.toLowerCase() === type
      );

      const totalAvailable = availableEnergiesOfType.reduce(
        (sum, e) => sum + e.cantidad,
        0
      );
      if (totalAvailable < energyToSpend.quantity) {
        throw new Error(
          `No tienes suficientes energías del tipo ${energyToSpend.type}. Tienes ${totalAvailable}, pero necesitas ${energyToSpend.quantity}.`
        );
      }
    }

    for (const energyToSpend of energiesToSpend) {
      const type = energyToSpend.type.toLowerCase();
      let remainingToSpend = energyToSpend.quantity;
      for (let i = 0; i < energies.length && remainingToSpend > 0; i++) {
        let energia = energies[i];

        if (energia.tipo.toLowerCase() === type) {
          if (energia.cantidad <= remainingToSpend) {
            remainingToSpend -= energia.cantidad;
            energies.splice(i, remainingToSpend);
            i--;
          } else {
            energia.cantidad -= remainingToSpend;
            remainingToSpend = 0;
          }
        }
      }
    }

    console.log("Energías restantes después de gastar:", energies);

    const updatedEnergiesStr = JSON.stringify(energies);
    const updateStmt = db.prepare(
      "UPDATE trainers SET energies = ? WHERE id = ?"
    );
    updateStmt.run(updatedEnergiesStr, trainer.id);

    return "Energías gastadas correctamente.";
  } catch (error) {
    console.error("Error en spendEnergies:", error);
    return Promise.reject(error.message);
  }
}

/***************************************************************
 *                                                              *
 *                                                              *
 *                                                              *
 *                          ENCARGADOS                          *
 *                                                              *
 *                                                              *
 *                                                              *
 ***************************************************************/
/**
 * Obtención de la lista de encargados
 */
app.get("/getEncargados", (req, res) => {
  fs.readdir(uploadDirEncargados, (err, files) => {
    if (err) {
      console.error("Error al leer el directorio de imágenes:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    // Construye las URLs de las imágenes
    const imageUrls = files.map((file) => {
      return `https://grumpi-app-server-6bfd34c5eb89.herokuapp.com/uploads/encargados/${file}`;
    });

    // Devuelve las URLs de las imágenes como una respuesta JSON
    res.json({ imageUrls });
  });
});

/***************************************************************
 *                                                              *
 *                                                              *
 *                                                              *
 *                     DISTINTIVOS DE LIGA                      *
 *                                                              *
 *                                                              *
 *                                                              *
 ***************************************************************/
/**
 * Obtención de la lista de los distintivos de liga
 */
app.get("/getLeagueBadges", (req, res) => {
  fs.readFile(filePathLeagueBadges, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo leagueBadges.json:", err);
      res
        .status(500)
        .json({ error: "Error al leer el archivo leagueBadges.json" });
    } else {
      try {
        const leagueBadges_list = JSON.parse(data);
        res.json({ leagueBadges_list: leagueBadges_list });
      } catch (parseError) {
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/**
 *
 * Asigna distintivo de liga a varios entrenadores.
 *
 */
app.post("/assign-badge", (req, res) => {
  const { trainerNames, badge } = req.body;
  console.log("assign-badge:", req.body);

  // Crea una promesa para cada entrenador en el array
  const promises = trainerNames.map((trainerName) =>
    assignBadgeToTrainer(trainerName, badge)
  );

  // Espera a que todas las promesas se completen
  Promise.all(promises)
    .then((messages) => {
      res.status(200).json({
        message:
          "Distintivo de liga asignado con éxito a todos los entrenadores.",
        details: messages,
      });
    })
    .catch((error) => {
      console.error("Error al asignar el distintivo de liga:", error);
      res.status(500).json({
        error:
          "Error al asignar el distintivo de liga a los entrenadores: " +
          error.message,
      });
    });
});

/**
 * Función para validar si los entrenadores tienen ya una lista de
 * distintivos o no, en el caso de no tenerla, la crean.
 * Si ya tuvieran esta lista creada, solo se añadirá el nuevo elemento
 * a los entrenadores seleccionados.
 *
 * @param {*} trainerName
 * @param {*} badgeName
 * @returns
 */
function assignBadgeToTrainer(trainerName, badgeName) {
  console.log(
    "Ruta del distintivo de liga para asignar al entrenador: ",
    badgeName
  );
  const trainer = db
    .prepare("SELECT * FROM trainers WHERE id = ?")
    .get(trainerName);

  if (trainer) {
    let trainerLeagueBadges = trainer.distintivos_liga
      ? JSON.parse(trainer.distintivos_liga)
      : [];

    const alreadyAssigned = trainerLeagueBadges.includes(badgeName);

    if (!alreadyAssigned) {
      trainerLeagueBadges.push(badgeName);

      const updateStmt = db.prepare(`
        UPDATE trainers
        SET distintivos_liga = ?
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(trainerLeagueBadges), trainer.id);

      console.log("Distintivo de liga asignado correctamente al entrenador.");
      return Promise.resolve(
        "Distintivo de liga asignado correctamente al entrenador."
      );
    } else {
      console.log("El distintivo de liga ya está asignado a este entrenador.");
      return Promise.resolve(
        "El distintivo de liga ya está asignado a este entrenador."
      );
    }
  } else {
    return Promise.reject(
      new Error(`Entrenador con nombre ${trainerName} no encontrado.`)
    );
  }
}

app.post("/trainers/updateOrder", (req, res) => {
  const trainers = req.body.trainers;

  try {
    const stmt = db.prepare(`UPDATE trainers SET \`order\` = ? WHERE id = ?`);

    trainers.forEach((trainer, index) => {
      stmt.run(index, trainer.id);
    });

    res.status(200).json({ message: "Orden actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar el orden:", err);
    res.status(500).json({ message: "Error al actualizar el orden." });
  }
});

app.post("/profesors/updateOrder", (req, res) => {
  const profesors = req.body.profesors;

  try {
    const stmt = db.prepare(`UPDATE profesores SET \`order\` = ? WHERE id = ?`);

    profesors.forEach((trainer, index) => {
      stmt.run(index, trainer.id); 
    });

    res.status(200).json({ message: "Orden actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar el orden:", err);
    res.status(500).json({ message: "Error al actualizar el orden." });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor GrumpiStore, iniciado en el puerto: ${PORT}`);
});
