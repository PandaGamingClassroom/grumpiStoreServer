const express = require("express");
const app = express();
const multer = require("multer");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose(); // Importa el módulo sqlite3
// const port = process.env.PORT || 3000;
const fs = require("fs");
const PORT = process.env.PORT || 3000;

/**********************
 *  RUTAS DE ACCESO
 *********************/
const filePath = "./data/trainers.json";
const filePathAmin = "./data/admin.json";
const filePathGrumpis = "./data/grumpis.json";
const filePathObjectsCombat = "./data/combatObjects.json";
const filePathObjectsEvolution = "./data/evolutionObjects.json";
const filePathRewards = "./data/rewards.json";
const filePathAttacks = "./data/attacks.json";

// Configuración de la base de datos
const db = new sqlite3.Database(":memory:");

/**
 * Comprobación de que el directorio
 * donde se están almacenando las imágenes
 * existe correctamente
 *
 */
const path = require("path");
const uploadDir = path.join(__dirname, "uploads", "grumpis");
const uploadDirMedals = path.join(__dirname, "uploads", "medals");
const uploadDirEnergies = path.join(__dirname, "uploads", "energies");
const uploadDirEncargados = path.join(__dirname, "uploads", "encargados");
const uploadDirLeagueBadges = path.join(__dirname, "uploads", "leagueBadges");
const howToGetGrumpi = path.join(uploadDir, "howToGetGrumpis");

module.exports = app;

/******************************
 *
 *    CONFIGURACIÓN PARA GIT
 *
 ******************************/
const chokidar = require("chokidar");
const simpleGit = require("simple-git");

// Configura simple-git
const git = simpleGit();

// Configura el directorio a observar
const watchDirectory = path.join(__dirname, "data");

// Función para hacer commit y push
const commitAndPush = async (filePath) => {
  try {
    console.log(`Detectado cambio en: ${filePath}`);

    // Agregar archivos modificados
    await git.add(filePath);

    // Hacer commit
    await git.commit(`Actualización automática de ${path.basename(filePath)}`);

    // Hacer push
    await git.push("origin", "main");

    console.log(`Commit y push realizados con éxito para: ${filePath}`);
  } catch (error) {
    console.error("Error al hacer commit y push:", error);
  }
};

// Configura el observador de archivos
const watcher = chokidar.watch(watchDirectory, {
  persistent: true,
  ignoreInitial: true, // No hacer commit para archivos al iniciar
});

watcher
  .on("change", (filePath) => commitAndPush(filePath))
  .on("error", (error) =>
    console.error("Error en el observador de archivos:", error)
  );

console.log(`Observando cambios en el directorio: ${watchDirectory}`);

/**
 *
 * Configuración de CORS
 *
 */
const corsOptions = {
  origin: "http://localhost:4200", // Origen permitido
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Métodos permitidos
  credentials: true, // Permitir cookies y otros credenciales
  optionsSuccessStatus: 200, // Algunas navegadores (Safari) necesitan este ajuste
};

app.use(cors(corsOptions));

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(uploadDirMedals, { recursive: true });

// Define la configuración de multer para el almacenamiento de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determina el directorio de destino en función de la ruta de la solicitud
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

// Crea las tablas
db.serialize(() => {
  // Tabla principal de entrenadores
  db.run(`
    CREATE TABLE IF NOT EXISTS trainers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_profesor INTEGER,
      nombre TEXT,
      password TEXT,
      rol TEXT,
      grumpidolar INTEGER,
      marca_combate INTEGER,
      medallas TEXT,
      grumpis TEXT,
      energias TEXT,
      total_energias INTEGER,
      objetos_combate TEXT,
      objetos_evolutivos TEXT,
      distintivos_liga TEXT,
      recompensas TEXT,
      FOREIGN KEY (id_profesor) REFERENCES profesores(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS profesores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      apellidos TEXT,
      usuario TEXT,
      password TEXT,
      rol TEXT
    )
  `);

  // Tabla de medallas
  db.run(`
    CREATE TABLE IF NOT EXISTS medallas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      imagen TEXT,
      trainer_id INTEGER,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    )
  `);

  // Tabla de grumpis
  db.run(`
    CREATE TABLE IF NOT EXISTS grumpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      imagen TEXT,
      n_grumpidex TEXT,
      descripcion TEXT,
      trainer_id INTEGER,
      ataques TEXT,
      tipo TEXT,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    )
  `);

  // Tabla de energías
  db.run(`
    CREATE TABLE IF NOT EXISTS energias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      tipo TEXT,
      imagen TEXT,
      trainer_id INTEGER,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    )
  `);

  // Tabla de objetos de combate
  db.run(`
    CREATE TABLE IF NOT EXISTS objetos_combate (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      imagen TEXT,
      precio INTEGER,
      trainer_id INTEGER,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    )
  `);

  // Tabla de objetos evolutivos
  db.run(`
    CREATE TABLE IF NOT EXISTS objetos_evolutivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      imagen TEXT,
      trainer_id INTEGER,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    )
  `);

  // Tabla de relación entre entrenadores y criaturas
  db.run(`
    CREATE TABLE IF NOT EXISTS trainer_creatures (
      trainer_id INTEGER,
      creature_id INTEGER,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id),
      FOREIGN KEY (creature_id) REFERENCES grumpis(id)
    )
  `);
});

// Cerrando la base de datos
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Cerrado la conexión con la base de datos.");
});

// Ejemplo de inserción de datos
db.serialize(() => {
  // Inserción de un entrenador
  db.run(
    `
    INSERT INTO trainers (nombre, password, grumpidolar)
    VALUES (?, ?, ?)
  `,
    ["Ash Ketchum", "password123", 1000],
    function (err) {
      if (err) {
        return console.error(err.message);
      }

      const trainer_id = this.lastID;

      let medallas = [];
      let grumpis = [];
      let energias = [];
      let objetos_combate = [];
      let objetos_evolutivos = [];

      // Inserción de medallas para el entrenador
      db.run(
        `
      INSERT INTO medallas (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `,
        ["Medalla Roca", "medalla_roca.png", trainer_id],
        function () {
          medallas.push(this.lastID);
        }
      );

      // Inserción de grumpis para el entrenador
      db.run(
        `
      INSERT INTO grumpis (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `,
        ["Grumpi Fuego", "grumpi_fuego.png", trainer_id],
        function () {
          grumpis.push(this.lastID);
        }
      );

      // Inserción de energías para el entrenador
      db.run(
        `
      INSERT INTO energias (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `,
        ["Energía Solar", "energia_solar.png", trainer_id],
        function () {
          energias.push(this.lastID);
        }
      );

      // Inserción de objetos de combate para el entrenador
      db.run(
        `
      INSERT INTO objetos_combate (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `,
        ["Espada del Grumpi", "espada_grumpi.png", trainer_id],
        function () {
          objetos_combate.push(this.lastID);
        }
      );

      // Inserción de objetos evolutivos para el entrenador
      db.run(
        `
      INSERT INTO objetos_evolutivos (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `,
        ["Piedra Evolutiva", "piedra_evolutiva.png", trainer_id],
        function () {
          objetos_evolutivos.push(this.lastID);
        }
      );

      // Actualiza el entrenador con los datos de sus atributos en formato JSON
      db.run(
        `
      UPDATE trainers
      SET medallas = ?, grumpis = ?, energias = ?, objetos_combate = ?, objetos_evolutivos = ?
      WHERE id = ?
    `,
        [
          JSON.stringify(medallas),
          JSON.stringify(grumpis),
          JSON.stringify(energias),
          JSON.stringify(objetos_combate),
          JSON.stringify(objetos_evolutivos),
          trainer_id,
        ]
      );
    }
  );
});

// Declara trainer_list como una variable global
let trainer_list = [];
let currentId = 1; // Inicialmente, el ID empieza en 1

// Lee los datos del archivo trainers.json si existe
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainer_list = JSON.parse(data);
} catch (err) {
  // Si hay un error al leer el archivo, asigna un array vacío a trainer_list
  trainer_list = [];
}

app.use(cors());
app.use(express.json()); // Middleware para analizar el cuerpo de la solicitud como JSON
// Servir las imágenes estáticas desde el directorio de uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
 * Método para obtener el listado de Entrenadores
 */
app.get("/", (req, res) => {
  // Lee el contenido del archivo trainers.json
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      // Manejar el error si no se puede leer el archivo
      console.error("Error al leer el archivo trainers.json:", err);
      res.status(500).json({ error: "Error al leer el archivo trainers.json" });
    } else {
      try {
        // Parsea el contenido del archivo JSON a un objeto JavaScript
        const trainerList = JSON.parse(data);
        // Envía el listado completo de entrenadores como respuesta
        res.json({ trainer_list: trainerList });
      } catch (parseError) {
        // Manejar el error si no se puede parsear el contenido JSON
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

/**
 * Método para guardar un nuevo entrenador
 */
app.post("/", (req, res) => {
  const nuevoEntrenador = req.body;
  nuevoEntrenador.id = currentId++; // Obtener los datos del cuerpo de la solicitud POST
  trainer_list.push(nuevoEntrenador); // Agregar el nuevo entrenador a la lista

  fs.writeFile(filePath, JSON.stringify(trainer_list), (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "Entrenador agregado correctamente", nuevoEntrenador });
  });
});

/**
 *
 * Función para añadir un nuevo usuario
 *
 */
app.post("/new-user", (req, res) => {
  const nuevoUsuario = req.body;
  nuevoUsuario.id = currentId++; // Obtener los datos del cuerpo de la solicitud POST
  trainer_list.push(nuevoUsuario); // Agregar el nuevo entrenador a la lista

  if (nuevoUsuario.rol == "entrenador") {
    fs.writeFile(filePath, JSON.stringify(trainer_list), (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        message: "Entrenador agregado correctamente",
        nuevoEntrenador,
      });
    });
  } else if (nuevoUsuario.rol == "profesor") {
    fs.writeFile(filePathAmin, JSON.stringify(trainer_list), (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        message: "Entrenador agregado correctamente",
        nuevoEntrenador,
      });
    });
  }
});

app.put("/user", (req, res) => {
  res.send("Got a PUT request at /user");
});

/**
 *
 * Función para eliminar un entrenador
 *
 */
app.delete("/user/:name", async (req, res) => {
  const userName = req.params.name;

  try {
    const data = await fs.promises.readFile(filePath, "utf8"); // Utiliza fs.promises para leer el archivo
    let trainers = JSON.parse(data);

    // Filtrar la lista de entrenadores para excluir el entrenador seleccionado
    const updatedTrainerList = trainers.filter(
      (trainer) => trainer.name !== userName
    );

    if (updatedTrainerList.length === trainers.length) {
      // El usuario no se encontró en la lista
      return res
        .status(404)
        .json({ error: `Usuario con nombre ${userName} no encontrado` });
    }

    await fs.promises.writeFile(
      filePath,
      JSON.stringify(updatedTrainerList, null, 2)
    );

    console.log(`Usuario con nombre ${userName} eliminado correctamente`);

    // Devolver la lista actualizada como respuesta
    res.status(200).json({
      message: `Usuario con nombre ${userName} eliminado correctamente`,
      trainer_list: updatedTrainerList,
    });
  } catch (err) {
    console.error("Error al procesar el archivo JSON:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 *
 * Actualiza los datos de un entrenador
 *
 */
app.put("/trainers/update/:name", (req, res) => {
  const trainerName = req.params.name;
  const {
    trainer_name,
    trainer_pass,
    grumpidolar,
    combatMark,
    objetosAEliminar,  // Usar el nombre correcto
    medalsToRemove,
  } = req.body;

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: `Error al leer el fichero [${filePath}]` });
      return;
    }

    let trainers = JSON.parse(data);
    let trainerIndex = trainers.findIndex((t) => t.name === trainerName);

    if (trainerIndex !== -1) {
      let updatedTrainer = trainers[trainerIndex];

      if (trainer_name !== undefined) {
        updatedTrainer.name = trainer_name;
      }
      if (trainer_pass !== undefined) {
        updatedTrainer.password = trainer_pass;
      }
      if (grumpidolar !== undefined) {
        updatedTrainer.grumpidolar = grumpidolar;
      }
      if (combatMark !== undefined) {
        updatedTrainer.marca_combate = combatMark;
      }

      /**
       * 
       * Se comprueba el tipo de objeto que se va a editar
       * para hacer la llamada a su función correspondiente.
       * 
       */
      if (Array.isArray(objetosAEliminar)) {
        const energiasAEliminar = objetosAEliminar.filter(objeto => objeto.tipo === 'energia');
        const medallasAEliminar = objetosAEliminar.filter(objeto => objeto.tipo === 'medalla');
        const grumpisAElimnar = objetosAEliminar.filter(objeto => objeto.tipo === 'grumpi');
        const objCombateAEliminar = objetosAEliminar.filter(objeto => objeto.tipo === 'combate');
        const objEvolutivoAEliminar = objetosAEliminar.filter(objeto => objeto.tipo === 'evolutivo');
        
        
        if (energiasAEliminar.length > 0) {
          deleteEnergiesFromTrainer(updatedTrainer, energiasAEliminar);
        } else if (medallasAEliminar.length > 0) {
          deleteMedalsFromTrainer(updatedTrainer, medallasAEliminar);
        } else if (grumpisAElimnar.length > 0) {
          editGrumpisFromTrainer(updatedTrainer, grumpisAElimnar);
        } else if (objCombateAEliminar.length > 0) {
          editObjCombat(updatedTrainer, objCombateAEliminar);
        } else if(objEvolutivoAEliminar.length > 0){
          editObjEvolution(updatedTrainer, objEvolutivoAEliminar)
        }
      }

      /**
       * Si todo ha salido  bien, se actualiza el fichero 
       * donde está almacenada la información de los entrenadores.
       */
      fs.writeFile(filePath, JSON.stringify(trainers, null, 2), (err) => {
        if (err) {
          res.status(500).json({ error: `Error al escribir en el fichero [${filePath}]` });
          return;
        }
        res.status(200).json({ message: "Entrenador actualizado correctamente" });
      });
    } else {
      res.status(404).json({ error: "Entrenador no encontrado" });
    }
  });
});

/**
 * Función para eliminar solo las energías seleccionadas
 * de la lista de energías del entrenador.
 * 
 * @param {*} updatedTrainer Recibe los datos del enetrenador a editar.
 * @param {*} objetosAEliminar Recibe los datos del objeto a editar.
 */
function deleteEnergiesFromTrainer(updatedTrainer, objetosAEliminar) {
  // Añadir propiedad cantidad si no existe en las energías
  updatedTrainer.energias.forEach(energia => {
    if (energia.cantidad === undefined) {
      energia.cantidad = 1; // Asignar un valor predeterminado si no está presente
    }
  });

  // Depuración: Log antes de la eliminación
  console.log('Energías actuales en el entrenador: ', updatedTrainer.energias);
  console.log('Energías a eliminar: ', objetosAEliminar);

  // Verificación y eliminación de energías
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    objetosAEliminar.forEach((energia) => {
      console.log('Procesando energía para eliminar: ', energia);

      // Buscar la energía existente en el entrenador
      let existingEnergies = updatedTrainer.energias.filter(
        (e) => e.nombre === energia.nombre
      );

      let remainingAmount = energia.cantidad;

      existingEnergies.forEach((existingEnergy, index) => {
        if (remainingAmount <= 0) return;

        let reduceAmount = Math.min(existingEnergy.cantidad, remainingAmount);

        existingEnergy.cantidad -= reduceAmount;
        remainingAmount -= reduceAmount;

        // Eliminar la energía si la cantidad es menor o igual a 0
        if (existingEnergy.cantidad <= 0) {
          updatedTrainer.energias.splice(updatedTrainer.energias.indexOf(existingEnergy), 1);
        }
      });

      if (remainingAmount > 0) {
        console.log(`No se pudo eliminar toda la energía ${energia.nombre}. Quedaron ${remainingAmount} unidades sin eliminar.`);
      }
    });
  } else {
    console.log('No hay energías a eliminar o el formato de objetosAEliminar es incorrecto.');
  }

  console.log('Energías después de eliminación: ', updatedTrainer.energias);
}

/**
 * Función para editar las medallas seleccionadas
 * de la lista de medallas del entrenador también seleccionado.
 * 
 * @param {*} updatedTrainer Recibe los datos del entrenador seleccionado.
 * @param {*} objetosAEliminar Recibe las medallas que se quieren editar del entrenador.
 */
function deleteMedalsFromTrainer(updatedTrainer, objetosAEliminar) {
  // Convertir updatedTrainer.medallas en un mapa para un acceso más eficiente
  const medalMap = new Map();

  updatedTrainer.medallas.forEach(medalla => {
    // Asignar un valor predeterminado si no está presente
    medalMap.set(medalla, (medalMap.get(medalla) || 0) + 1);
  });

  // Depuración: Log antes de la eliminación
  console.log('Medallas actuales en el entrenador: ', Array.from(medalMap.entries()));
  console.log('Medallas a eliminar: ', objetosAEliminar);

  // Verificación y eliminación de medallas
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    objetosAEliminar.forEach(medalla => {
      console.log('Procesando medalla para eliminar: ', medalla);

      // Buscar la medalla existente en el mapa
      if (medalMap.has(medalla.nombre)) {
        let remainingAmount = medalla.cantidad;
        let currentAmount = medalMap.get(medalla.nombre);

        if (remainingAmount >= currentAmount) {
          // Si la cantidad a eliminar es mayor o igual a la cantidad actual, eliminar todas las instancias
          medalMap.delete(medalla.nombre);
        } else {
          // Reducir la cantidad actual
          medalMap.set(medalla.nombre, currentAmount - remainingAmount);
        }

        console.log(`Medalla ${medalla.nombre} procesada. Cantidad restante: ${remainingAmount}`);
      } else {
        console.log(`Medalla ${medalla.nombre} no encontrada en el inventario.`);
      }
    });
  } else {
    console.log('No hay medallas a eliminar o el formato de objetosAEliminar es incorrecto.');
  }

  // Actualizar updatedTrainer.medallas con las medallas restantes
  updatedTrainer.medallas = Array.from(medalMap.entries()).flatMap(([url, count]) => {
    // Verificar que count es un número válido antes de usarlo
    if (typeof count === 'number' && count > 0) {
      return Array(count).fill(url);
    } else {
      return [];
    }
  });

  console.log('Medallas después de eliminación: ', updatedTrainer.medallas);
}

/**
 * Función para editar los Grumpis seleccionados del entrenador.
 * 
 * @param {*} updatedTrainer Recibe la información del entrenador seleccionado.
 * @param {*} objetosAEliminar Recibe los Grumpis a editar de la lista del entrenador.
 */
function editGrumpisFromTrainer(updatedTrainer, objetosAEliminar) {
  // Añadir propiedad cantidad si no existe en los Grumpis
  updatedTrainer.grumpis.forEach(grumpi => {
    if (!Number.isFinite(grumpi.cantidad)) {  // Verifica si cantidad no es un número
      grumpi.cantidad = 1; // Asignar un valor predeterminado si no está presente o es inválido
    }
  });

  // Depuración: Log antes de la eliminación
  console.log('Grumpis actuales en el entrenador: ', updatedTrainer.grumpis);
  console.log('Grumpis a eliminar: ', objetosAEliminar);

  // Verificación y eliminación de Grumpis
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    objetosAEliminar.forEach((grumpi) => {
      console.log('Procesando grumpi para eliminar: ', grumpi);

      // Buscar los Grumpis existentes en el entrenador
      let existingGrumpis = updatedTrainer.grumpis.filter(
        (e) => e.nombre === grumpi.nombre
      );

      let remainingAmount = grumpi.cantidad || 1;  // Aseguramos que haya un valor para cantidad

      existingGrumpis.forEach((existingGrumpi) => {
        if (remainingAmount <= 0) return;

        let reduceAmount = Math.min(existingGrumpi.cantidad, remainingAmount);

        existingGrumpi.cantidad -= reduceAmount;
        remainingAmount -= reduceAmount;

        // Eliminar el Grumpi si la cantidad es menor o igual a 0
        if (existingGrumpi.cantidad <= 0) {
          const index = updatedTrainer.grumpis.indexOf(existingGrumpi);
          if (index > -1) {
            updatedTrainer.grumpis.splice(index, 1);
          }
        }
      });

      if (remainingAmount > 0) {
        console.log(`No se pudo eliminar todo el grumpi ${grumpi.nombre}. Quedaron ${remainingAmount} unidades sin eliminar.`);
      }
    });
  } else {
    console.log('No hay grumpis a eliminar o el formato de objetosAEliminar es incorrecto.');
  }

  // Depuración: Log después de la eliminación
  console.log('Grumpis después de la eliminación: ', updatedTrainer.grumpis);
}


/**
 * Función para editar los objetos de combate seleccionados.
 * 
 * @param {*} updatedTrainer Recibe los datos del entrenador seleccionado.
 * @param {*} objetosAEliminar Recibe los objetos de combate a editar del listado del entrenador.
 */
function editObjCombat(updatedTrainer, objetosAEliminar) {
  updatedTrainer.objetos_combate.forEach(objeto => {
    if (objeto.cantidad === undefined) {
      objeto.cantidad = 1; // Asignar un valor predeterminado si no está presente
    }
  });

  // Depuración: Log antes de la eliminación
  console.log('Objetos de combate actuales en el entrenador: ', updatedTrainer.energias);
  console.log('Objetos de combate a eliminar: ', objetosAEliminar);

  // Verificación y eliminación de energías
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    objetosAEliminar.forEach((objeto) => {
      console.log('Procesando energía para eliminar: ', objeto);

      // Buscar la energía existente en el entrenador
      let existingObjCombats = updatedTrainer.objetos_combate.filter(
        (e) => e.nombre === objeto.nombre
      );

      let remainingAmount = objeto.cantidad;

      existingObjCombats.forEach((existingObjCombat, index) => {
        if (remainingAmount <= 0) return;

        let reduceAmount = Math.min(existingObjCombat.cantidad, remainingAmount);

        existingObjCombat.cantidad -= reduceAmount;
        remainingAmount -= reduceAmount;

        // Eliminar la energía si la cantidad es menor o igual a 0
        if (existingObjCombat.cantidad <= 0) {
          updatedTrainer.objetos_combate.splice(updatedTrainer.objetos_combate.indexOf(existingObjCombat), 1);
        }
      });

      if (remainingAmount > 0) {
        console.log(`No se pudo eliminar toda la energía ${objeto.nombre}. Quedaron ${remainingAmount} unidades sin eliminar.`);
      }
    });
  } else {
    console.log('No hay energías a eliminar o el formato de objetosAEliminar es incorrecto.');
  }

  console.log('Energías después de eliminación: ', updatedTrainer.objetos_combate);
}

/**
 * Función para editar los objetos evolutivos de un entrenador.
 * @param {*} updatedTrainer 
 * @param {*} objetosAEliminar 
 */
function editObjEvolution(updatedTrainer, objetosAEliminar){
  // Añadir propiedad cantidad si no existe en los objetos evolutivos
  updatedTrainer.objetos_evolutivos.forEach(objEvo => {
    if (objEvo.cantidad === undefined) {
      objEvo.cantidad = 1; // Asignar un valor predeterminado si no está presente
    }
  });

  // Depuración: Log antes de la eliminación
  console.log('Objetos evolutivos actuales en el entrenador: ', updatedTrainer.objetos_evolutivos);
  console.log('Objetos evolutivos a eliminar: ', objetosAEliminar);

  // Verificación y eliminación de energías
  if (Array.isArray(objetosAEliminar) && objetosAEliminar.length > 0) {
    objetosAEliminar.forEach((objEvolu) => {
      console.log('Procesando energía para eliminar: ', objEvolu);

      // Buscar la energía existente en el entrenador
      let existingObjEvolutions = updatedTrainer.objetos_evolutivos.filter(
        (e) => e.nombre === objEvolu.nombre
      );

      let remainingAmount = objEvolu.cantidad;

      existingObjEvolutions.forEach((existingObjEvolution, index) => {
        if (remainingAmount <= 0) return;

        let reduceAmount = Math.min(existingObjEvolution.cantidad, remainingAmount);

        existingObjEvolution.cantidad -= reduceAmount;
        remainingAmount -= reduceAmount;

        // Eliminar la energía si la cantidad es menor o igual a 0
        if (existingObjEvolution.cantidad <= 0) {
          updatedTrainer.objetos_evolutivos.splice(updatedTrainer.objetos_evolutivos.indexOf(existingObjEvolution), 1);
        }
      });

      if (remainingAmount > 0) {
        console.log(`No se pudo eliminar toda la energía ${objEvolu.nombre}. Quedaron ${remainingAmount} unidades sin eliminar.`);
      }
    });
  } else {
    console.log('No hay energías a eliminar o el formato de objetosAEliminar es incorrecto.');
  }

  console.log('Energías después de eliminación: ', updatedTrainer.objetos_evolutivos);
}


/********************************************************************
 *
 *            ASIGNACIÓN DE grumpis A LOS ENTRENADORES
 *
 *******************************************************************/
// Cargar los datos de los entrenadores del archivo JSON al iniciar la aplicación
let trainerData = [];
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);
  // Inicializar la propiedad 'grumpis' si no está presente en cada objeto de entrenador
  trainerData.forEach((trainer) => {
    if (!trainer.grumpis) {
      trainer.grumpis = [];
    }
  });
  console.log("Datos de entrenadores cargados correctamente:", trainerData);
} catch (err) {
  console.error("Error al leer el archivo de entrenadores:", err);
}

// Función para actualizar y guardar los datos del entrenador en el archivo JSON
function saveTrainerData() {
  fs.writeFile(filePath, JSON.stringify(trainerData, null, 2), (err) => {
    if (err) {
      console.error("Error al guardar los datos del entrenador:", err);
    } else {
      console.log("Datos del entrenador guardados correctamente.", trainerData);
    }
  });
}

// Función para asignar una criatura a un entrenador
function assignCreatureToTrainer(trainerName, creature) {
  console.log("Grumpi para asignar al entrenador: ", creature);
  const trainer = trainerData.find((trainer) => trainer.name === trainerName);
  console.log("Entrenador buscado?: ", trainer);
  if (trainer) {
    // Asegurarse de que la propiedad 'grumpis' existe
    if (!trainer.grumpis) {
      trainer.grumpis = [];
    }
    trainer.grumpis.push(creature); // Asignar la criatura
    saveTrainerData(); // Guardar los cambios en los datos de los entrenadores
    return Promise.resolve("Criatura asignada correctamente al entrenador.");
  } else {
    return Promise.reject(
      new Error(`Entrenador con nombre ${trainerName} no encontrado.`)
    );
  }
}

// Ruta de asignación de grumpis
app.post("/assign-creature", (req, res) => {
  const { trainerNames, creature } = req.body;
  console.log("Datos de la solicitud:", req.body);

  // Crea una promesa para cada entrenador en el array
  const promises = trainerNames.map((trainerName) =>
    assignCreatureToTrainer(trainerName, creature)
  );

  // Espera a que todas las promesas se completen
  Promise.all(promises)
    .then((messages) => {
      res.status(200).json({
        message: "Criatura asignada con éxito a todos los entrenadores.",
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
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);

  if (!Array.isArray(trainerData)) {
    throw new Error("Los datos de entrenadores no son un array.");
  }

  trainerData.forEach((trainer) => {
    if (typeof trainer.grumpidolar === "undefined") {
      trainer.grumpidolar = 0;
    }
  });

  console.log("Datos de entrenadores cargados correctamente:", trainerData);
} catch (err) {
  console.error("Error al leer el archivo de entrenadores:", err);
}

function saveTrainerData() {
  fs.writeFile(filePath, JSON.stringify(trainerData, null, 2), (err) => {
    if (err) {
      console.error("Error al guardar los datos del entrenador:", err);
    } else {
      console.log("Datos del entrenador guardados correctamente.");
    }
  });
}

function assignGrumpidolaresToTrainer(trainerName, grumpidolar) {
  return new Promise((resolve, reject) => {
    console.log("Cantidad de Grumpidólares recibida (original): ", grumpidolar);
    const grumpidolaresNumber = Number(grumpidolar);
    console.log("Cantidad de Grumpidólares convertida: ", grumpidolaresNumber);

    if (isNaN(grumpidolaresNumber) || grumpidolaresNumber <= 0) {
      console.log("Cantidad de Grumpidólares no válida: ", grumpidolaresNumber);
      return reject("Grumpidólares debe ser un número positivo.");
    }

    const trainer = trainerData.find((trainer) => trainer.name === trainerName);
    if (trainer) {
      console.log("Entrenador encontrado:", trainer);

      // Asegurarse de que trainer.grumpidolar es un número antes de sumar
      trainer.grumpidolar = Number(trainer.grumpidolar) || 0;
      trainer.grumpidolar += grumpidolaresNumber;

      console.log(
        "Cantidad de Grumpidólares después de la asignación:",
        trainer.grumpidolar
      );

      saveTrainerData();
      resolve("Grumpidólares asignados correctamente al entrenador.");
    } else {
      reject(`Entrenador con nombre ${trainerName} no encontrado.`);
    }
  });
}

app.post("/assign-grumpidolares", (req, res) => {
  const { trainerName, grumpidolar } = req.body;
  console.log("Datos de la solicitud:", req.body);
  assignGrumpidolaresToTrainer(trainerName, req.body.grumpidolares)
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
function assignGrumpidolaresAfterBuyToTrainer(trainerName, grumpidolar) {
  return new Promise((resolve, reject) => {
    console.log("Cantidad de Grumpidólares recibida (original): ", grumpidolar);
    const grumpidolaresNumber = Number(grumpidolar);
    console.log("Cantidad de Grumpidólares convertida: ", grumpidolaresNumber);

    if (isNaN(grumpidolaresNumber) || grumpidolaresNumber < 0) {
      console.log("Cantidad de Grumpidólares no válida: ", grumpidolaresNumber);
      return reject("Grumpidólares debe ser un número positivo.");
    }

    const trainer = trainerData.find((trainer) => trainer.name === trainerName);
    if (trainer) {
      console.log("Entrenador encontrado:", trainer);

      // Asegurarse de que trainer.grumpidolar es un número antes de sumar
      trainer.grumpidolar = Number(trainer.grumpidolar) || 0;
      trainer.grumpidolar = grumpidolaresNumber;

      console.log(
        "Cantidad de Grumpidólares después de la compra:",
        trainer.grumpidolar
      );

      saveTrainerData();
      resolve("Grumpidólares asignados correctamente al entrenador.");
    } else {
      reject(`Entrenador con nombre ${trainerName} no encontrado.`);
    }
  });
}

app.post("/assignGrumpidolares-after-buy", (req, res) => {
  console.log("Datos de la solicitud:", req.body);
  console.log(
    "Cantidad de Grumpidólares para actualizar: ",
    req.body.grumpidolares
  );
  assignGrumpidolaresAfterBuyToTrainer(
    req.body.trainerName,
    req.body.grumpidolares
  )
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

  // Lee los datos del archivo trainers.json
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo trainers.json:", err);
      return res
        .status(500)
        .json({ success: false, error: "Error interno del servidor" });
    }

    try {
      const trainerList = JSON.parse(data);
      // Busca el entrenador por nombre en la lista
      const trainer = trainerList.find((trainer) => trainer.name === nombre);

      if (!trainer) {
        // Si no se encuentra ningún entrenador con ese nombre, devuelve un mensaje de error
        res
          .status(200)
          .json({ success: false, error: "Entrenador no encontrado" });
      } else {
        // Si se encuentra el entrenador, devuelve sus datos
        res.json({ success: true, data: trainer });
      }
    } catch (error) {
      console.error("Error al parsear el archivo trainers.json:", error);
      res
        .status(500)
        .json({ success: false, error: "Error interno del servidor" });
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
 * OBTENCIÓN DE LOS GRUMPIS
 */
app.get("/getGrumpis", (req, res) => {
  fs.readFile(filePathGrumpis, "utf8", (err, data) => {
    if (err) {
      // Manejar el error si no se puede leer el archivo
      console.error("Error al leer el archivo grumpis.json:", err);
      res.status(500).json({ error: "Error al leer el archivo grumpis.json" });
    } else {
      try {
        // Parsea el contenido del archivo JSON a un objeto JavaScript
        const grumpis_list = JSON.parse(data);
        // Envía el listado completo de entrenadores como respuesta
        res.json({ grumpis_list: grumpis_list });
      } catch (parseError) {
        // Manejar el error si no se puede parsear el contenido JSON
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
        // Parsea el contenido del archivo JSON a un objeto JavaScript
        const attacks_list = JSON.parse(data);
        // Envía el listado completo de entrenadores como respuesta
        res.json({ attacks_list: attacks_list });
      } catch (parseError) {
        // Manejar el error si no se puede parsear el contenido JSON
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
});

// Ruta para obtener las URLs de todas las imágenes
app.get("/getImageUrls", (req, res) => {
  // Lee todos los archivos en el directorio de imágenes
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error("Error al leer el directorio de imágenes:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    // Construye las URLs de las imágenes
    const imageUrls = files.map((file) => {
      return `http://localhost:3000/uploads/grumpis/howToGetGrumpis/${file}`;
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

    // Definir la ruta al archivo grumpis.json
    const grumpisFile = path.join(__dirname, "data", "grumpis.json");

    let grumpis = [];
    if (fs.existsSync(grumpisFile)) {
      // Leer el archivo grumpis.json (si existe)
      grumpis = JSON.parse(fs.readFileSync(grumpisFile, "utf8"));
    } else {
      console.log("El archivo grumpis.json no existe, se creará uno nuevo.");
    }
    // Asignar un ID único
    grumpiData.id = grumpis.length + 1;

    // Actualizar la URL de la imagen
    const fileExt = path.extname(req.file.originalname);
    grumpiData.img = `http://localhost:3000/uploads/grumpis/${grumpiData.numero}${fileExt}`;

    // Agregar el nuevo Grumpi a la lista
    grumpis.push(grumpiData);

    // Escribir los datos actualizados de vuelta al archivo grumpis.json
    fs.writeFileSync(grumpisFile, JSON.stringify(grumpis, null, 2));
    console.log("Grumpi guardado en grumpis.json:", grumpiData);
    res
      .status(201)
      .json({ message: "Grumpi guardado correctamente", grumpi: grumpiData });
  } catch (err) {
    console.error("Error al guardar el Grumpi en grumpis.json", err); // Log the error details
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
  // Lee todos los archivos en el directorio de imágenes
  fs.readdir(uploadDirMedals, (err, files) => {
    if (err) {
      console.error("Error al leer el directorio de imágenes:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    // Construye las URLs de las imágenes
    const imageUrls = files.map((file) => {
      return `http://localhost:3000/uploads/medals/${file}`;
    });

    // Devuelve las URLs de las imágenes como una respuesta JSON
    res.json({ imageUrls });
  });
});

/******************************************
 *
 * OBTENER LAS IMÁGENES DE LAS ENERGÍAS
 *
 ******************************************/
app.get("/getImageEnergies", (req, res) => {
  // Lee todos los archivos en el directorio de imágenes
  fs.readdir(uploadDirEnergies, (err, files) => {
    if (err) {
      console.error("Error al leer el directorio de imágenes:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    // Construye las URLs de las imágenes
    const imageUrls = files.map((file) => {
      return `http://localhost:3000/uploads/energies/${file}`;
    });

    // Devuelve las URLs de las imágenes como una respuesta JSON
    res.json({ imageUrls });
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
      return `http://localhost:3000/uploads/howToGetGrumpis/${file}`;
    });
    res.json({ imageUrls });
  });
});

/******************************************
 *
 * ASIGNAR ENERGÍAS
 *
 ******************************************/
// Cargar los datos de los entrenadores del archivo JSON al iniciar la aplicación
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);
  // Inicializar la propiedad 'energias' si no está presente en cada objeto de entrenador
  trainerData.forEach((trainer) => {
    if (!trainer.energias) {
      trainer.energias = [];
    }
  });
  console.log("Datos de entrenadores cargados correctamente:", trainerData);
} catch (err) {
  console.error("Error al leer el archivo de entrenadores:", err);
}

// Función para asignar una energía a un entrenador
function assignEnergieToTrainer(trainerName, energia) {
  // Aquí iría tu lógica para asignar la medalla al entrenador
  // Buscar el entrenador por nombre y actualizar sus datos en memoria
  const trainer = trainerData.find((trainer) => trainer.name === trainerName);
  if (trainer) {
    /**
     * Se asegura que la propiedad 'medallas' existe en el entrenador.
     */
    if (!trainer.energias) {
      trainer.energias = [];
    }
    trainer.energias.push(energia); // Por ejemplo, asumiendo que tienes una propiedad 'medallas' en tu objeto de entrenador
    saveTrainerData(); // Guardar los cambios en el archivo JSON
    return Promise.resolve("Medalla asignada correctamente al entrenador.");
  } else {
    return Promise.reject(
      `Entrenador con nombre ${trainerName} no encontrado.`
    );
  }
}

// Función para guardar los datos de entrenadores en el archivo JSON
function saveTrainerData() {
  try {
    fs.writeFileSync(filePath, JSON.stringify(trainerData, null, 2), "utf8");
    console.log("Datos de entrenadores guardados correctamente.");
  } catch (err) {
    console.error("Error al guardar los datos de entrenadores:", err);
  }
}

/*******************************************
 *
 *    ASIGNAR ENERGÍA A LOS ENTRENADORES
 *
 ******************************************/
app.post("/assign-energie", (req, res) => {
  const { trainerNames, energie } = req.body;
  console.log("Datos de la solicitud:", req.body);

  // Crea una promesa para cada entrenador en el array
  const promises = trainerNames.map((trainerName) =>
    assignEnergieToTrainer(trainerName, energie)
  );

  // Espera a que todas las promesas se completen
  Promise.all(promises)
    .then((messages) => {
      res.status(200).json({
        message: "Medalla asignada con éxito a todos los entrenadores.",
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

function buyEnergiesToTrainer(trainerName, energy) {
  return new Promise((resolve, reject) => {
    // Buscar el entrenador por nombre y actualizar sus datos en memoria
    const trainer = trainerData.find((trainer) => trainer.name === trainerName);
    if (trainer) {
      console.log("Datos del entrenador: ", trainer);
      console.log("Energia a comprar por el entrenador: ", energy);
      trainer.energias.push(energy); // Asumiendo que tienes una propiedad 'objetos_combate' en tu objeto de entrenador
      saveTrainerData(); // Guardar los cambios en el archivo JSON
      resolve("Energía comprada asignada correctamente al entrenador.");
    } else {
      reject(new Error(`Entrenador con nombre ${trainerName} no encontrado.`));
    }
  });
}

app.post("/buyEnergies", (req, res) => {
  const { trainerName, energy } = req.body;
  console.log("Datos de la solicitud:", req.body);
  // Llamada a la función para asignar el objeto de combate al entrenador
  buyEnergiesToTrainer(trainerName, energy)
    .then((message) => {
      res.status(200).json({ message: message }); // Enviar el mensaje como parte de un objeto JSON
    })
    .catch((error) => {
      console.error("Error al realizar la compra de energías:", error);
      res.status(500).json({
        error:
          "Error al realizar la compra de energías por el entrenador: " +
          error.message,
      }); // Enviar el mensaje de error como parte de un objeto JSON
    });
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
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);
  // Inicializar la propiedad 'medallas' si no está presente en cada objeto de entrenador
  trainerData.forEach((trainer) => {
    if (!trainer.medallas) {
      trainer.medallas = [];
    }
  });
  console.log("Datos de entrenadores cargados correctamente:", trainerData);
} catch (err) {
  console.error("Error al leer el archivo de entrenadores:", err);
}

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
function assignMedalToTrainer(trainerName, medalName) {
  // Aquí iría tu lógica para asignar la medalla al entrenador
  // Buscar el entrenador por nombre y actualizar sus datos en memoria
  const trainer = trainerData.find((trainer) => trainer.name === trainerName);
  if (trainer) {
    /**
     * Se asegura que la propiedad 'medallas' existe en el entrenador.
     */
    if (!trainer.medallas) {
      trainer.medallas = [];
    }
    trainer.medallas.push(medalName); // Por ejemplo, asumiendo que tienes una propiedad 'medallas' en tu objeto de entrenador
    saveTrainerData(); // Guardar los cambios en el archivo JSON
    return Promise.resolve("Medalla asignada correctamente al entrenador.");
  } else {
    return Promise.reject(
      `Entrenador con nombre ${trainerName} no encontrado.`
    );
  }
}

// Ruta de asignación de medallas
app.post("/assign-medal", (req, res) => {
  const { trainerNames, medal } = req.body;
  console.log("Datos de la solicitud:", req.body);

  // Crea una promesa para cada entrenador en el array
  const promises = trainerNames.map((trainerName) =>
    assignMedalToTrainer(trainerName, medal)
  );

  // Espera a que todas las promesas se completen
  Promise.all(promises)
    .then((messages) => {
      res.status(200).json({
        message: "Medalla asignada con éxito a todos los entrenadores.",
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

/**
 * Comprobación si la lista de objetos de combate existe
 * entre los atributos del entrenador.
 * Si no existe, se genera.
 */
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);
  // Inicializar la propiedad 'objetos_combate' si no está presente en cada objeto de entrenador
  trainerData.forEach((trainer) => {
    if (!trainer.objetos_combate) {
      trainer.objetos_combate = [];
    }
  });
  console.log("Datos de entrenadores cargados correctamente:", trainerData);
} catch (err) {
  console.error("Error al leer el archivo de entrenadores:", err);
}
// Función para asignar un objeto de combate a un entrenador
function assignCombatObjectToTrainer(trainerName, combatObject) {
  return new Promise((resolve, reject) => {
    // Buscar el entrenador por nombre y actualizar sus datos en memoria
    const trainer = trainerData.find((trainer) => trainer.name === trainerName);
    if (trainer) {
      console.log("Datos del entrenador: ", trainer);
      console.log("Objeto a asignar al entrenador: ", combatObject);
      trainer.objetos_combate.push(combatObject); // Asumiendo que tienes una propiedad 'objetos_combate' en tu objeto de entrenador
      saveTrainerData(); // Guardar los cambios en el archivo JSON
      resolve("Objeto de combate asignado correctamente al entrenador.");
    } else {
      reject(new Error(`Entrenador con nombre ${trainerName} no encontrado.`));
    }
  });
}

// Ruta de asignación de objetos de combate
app.post("/assign-combatObjects", (req, res) => {
  const { trainerName, combatObject } = req.body;
  console.log("Datos de la solicitud:", req.body);
  // Llamada a la función para asignar el objeto de combate al entrenador
  assignCombatObjectToTrainer(trainerName, combatObject)
    .then((message) => {
      res.status(200).json({ message: message }); // Enviar el mensaje como parte de un objeto JSON
    })
    .catch((error) => {
      console.error("Error al asignar el objeto de combate:", error);
      res.status(500).json({
        error:
          "Error al asignar el objeto de combate al entrenador: " +
          error.message,
      }); // Enviar el mensaje de error como parte de un objeto JSON
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
// Cargar los datos de los entrenadores del archivo JSON al iniciar la aplicación
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);
  // Inicializar la propiedad 'energias' si no está presente en cada objeto de entrenador
  trainerData.forEach((trainer) => {
    if (!trainer.objetos_evolutivos) {
      trainer.objetos_evolutivos = [];
    }
  });
  console.log("Datos de entrenadores cargados correctamente:", trainerData);
} catch (err) {
  console.error("Error al leer el archivo de entrenadores:", err);
}

// Función para asignar una energía a un entrenador
function assignEvoObjectsToTrainer(trainerName, evoObject) {
  return new Promise((resolve, reject) => {
    // Buscar el entrenador por nombre y actualizar sus datos en memoria
    const trainer = trainerData.find((trainer) => trainer.name === trainerName);
    if (trainer) {
      console.log("Datos del entrenador:", trainer);
      console.log("Objeto evolutivo a asignar al entrenador:", evoObject);

      // Verificar si el entrenador tiene suficientes energías del tipo requerido
      const energyType = evoObject.tipo;
      const energyAmount = evoObject.precio;

      const availableEnergies = trainer.energias.filter(
        (e) => e.tipo.toLowerCase() === energyType.toLowerCase()
      );
      if (availableEnergies.length >= energyAmount) {
        // Descontar las energías del tipo requerido
        trainer.energias = trainer.energias.filter((e, index) => {
          return !(
            e.tipo.toLowerCase() === energyType.toLowerCase() &&
            index < energyAmount
          );
        });
        // Asignar el objeto evolutivo
        trainer.objetos_evolutivos.push(evoObject);
        saveTrainerData(); // Guardar los cambios en el archivo JSON
        resolve("Objeto evolutivo asignado correctamente al entrenador.");
      } else {
        reject(
          new Error(
            `El entrenador no tiene suficientes energías de tipo ${energyType}.`
          )
        );
      }
    } else {
      reject(new Error(`Entrenador con nombre ${trainerName} no encontrado.`));
    }
  });
}

// Ruta de asignación de los objetos evolutivos
app.post("/assign-evo-objects", (req, res) => {
  const { trainerName, evoObject } = req.body;
  console.log("Datos de la solicitud:", req.body);
  assignEvoObjectsToTrainer(trainerName, evoObject)
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
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);

  if (!Array.isArray(trainerData)) {
    throw new Error("Los datos de entrenadores no son un array.");
  }

  trainerData.forEach((trainer) => {
    if (typeof trainer.marca_combate === "undefined") {
      trainer.marca_combate = 0;
    }
  });

  console.log("Datos de entrenadores cargados correctamente:", trainerData);
} catch (err) {
  console.error("Error al leer el archivo de entrenadores:", err);
}
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

app.get("/profesores", (req, res) => {
  // Lee el contenido del archivo trainers.json
  fs.readFile(filePathAmin, "utf8", (err, data) => {
    if (err) {
      // Manejar el error si no se puede leer el archivo
      console.error("Error al leer el archivo admin.json:", err);
      res.status(500).json({ error: "Error al leer el archivo admin.json" });
    } else {
      try {
        // Parsea el contenido del archivo JSON a un objeto JavaScript
        const prof_list = JSON.parse(data);
        // Envía el listado completo de entrenadores como respuesta
        res.json({ profesoresList: prof_list });
      } catch (parseError) {
        // Manejar el error si no se puede parsear el contenido JSON
        console.error("Error al parsear el contenido JSON:", parseError);
        res.status(500).json({ error: "Error al parsear el contenido JSON" });
      }
    }
  });
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

  // Lee los datos del archivo trainers.json
  fs.readFile(filePathAmin, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo trainers.json:", err);
      return res
        .status(500)
        .json({ success: false, error: "Error interno del servidor" });
    }

    try {
      const profe_list = JSON.parse(data);
      // Busca el entrenador por nombre en la lista
      console.log("Lista profesores: ", profe_list);
      const profe = profe_list.find((profesor) => profesor.nombre === nombre);

      if (!profe) {
        // Si no se encuentra ningún entrenador con ese nombre, devuelve un mensaje de error
        res
          .status(200)
          .json({ success: false, error: "Profesor no encontrado" });
      } else {
        // Si se encuentra el entrenador, devuelve sus datos
        res.json({ success: true, data: profe });
      }
    } catch (error) {
      console.error("Error al parsear el archivo admin.json:", error);
      res
        .status(500)
        .json({ success: false, error: "Error interno del servidor" });
    }
  });
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

// Endpoint para obtener la lista de entrenadores de un profesor por su ID
app.get("/profesor/:id/entrenadores", async (req, res) => {
  const profesorId = parseInt(req.params.id);

  try {
    const entrenadores = await readJsonFile(filePath);
    const entrenadoresAsignados = entrenadores.filter(
      (t) => t.id_profesor === profesorId
    );

    if (entrenadoresAsignados.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron entrenadores para el profesor indicado",
      });
    }

    res.json({ success: true, data: entrenadoresAsignados });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Error interno del servidor" });
  }
});

// Agregar un nuevo profesor
app.post("/profesores", (req, res) => {
  const nuevoProfesor = req.body;

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Error al leer el archivo" });
    }

    const adminData = JSON.parse(data);
    nuevoProfesor.id = adminData.profesores.length
      ? adminData.profesores[adminData.profesores.length - 1].id + 1
      : 1;
    adminData.profesores.push(nuevoProfesor);

    fs.writeFile(filePath, JSON.stringify(adminData, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Error al escribir el archivo" });
      }

      res.status(201).json(nuevoProfesor);
    });
  });
});

// Endpoint para agregar un nuevo entrenador
app.post("/profesores/:id/entrenadores", (req, res) => {
  const profesorId = parseInt(req.params.id);
  const nuevoUsuario = req.body;

  let filePath;

  if (nuevoUsuario.rol === "entrenador") {
    filePath = "./data/trainers.json";
  } else if (nuevoUsuario.rol === "profesor") {
    filePath = "./data/admin.json";
  } else {
    return res.status(400).json({ message: "Rol no válido" });
  }

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        // El archivo no existe, crear el archivo con el nuevo usuario
        nuevoUsuario.id = 1;
        nuevoUsuario.id_profesor = profesorId;
        fs.writeFile(
          filePath,
          JSON.stringify([nuevoUsuario], null, 2),
          (err) => {
            if (err) {
              return res
                .status(500)
                .json({ error: "Error al escribir el archivo" });
            }
            return res.status(201).json(nuevoUsuario);
          }
        );
      } else {
        return res.status(500).json({ error: "Error al leer el archivo" });
      }
    } else {
      const usuarios = JSON.parse(data);
      nuevoUsuario.id = usuarios.length
        ? usuarios[usuarios.length - 1].id + 1
        : 1;
      nuevoUsuario.id_profesor = profesorId;

      usuarios.push(nuevoUsuario);

      fs.writeFile(filePath, JSON.stringify(usuarios, null, 2), (err) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Error al escribir el archivo" });
        }
        res.status(201).json(nuevoUsuario);
      });
    }
  });
});

// Obtener entrenadores por ID de profesor
app.get("/profesor/:id/entrenadores", async (req, res) => {
  const profesorId = parseInt(req.params.id);

  try {
    const entrenadores = await readJsonFile(filePath);
    const entrenadoresAsignados = entrenadores.filter(
      (t) => t.id_profesor === profesorId
    );

    if (entrenadoresAsignados.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron entrenadores para el profesor indicado",
      });
    }

    res.json({ success: true, data: entrenadoresAsignados });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Error interno del servidor" });
  }
});

/**
 *
 * Modificación de la contraseña del profesor
 *
 */
app.put("/profesors/update/:name", (req, res) => {
  const professorName = req.params.name; // Cambié 'nombre' por 'name' para coincidir con la ruta.
  const { professor_name, password } = req.body; // Aquí obtienes tanto el nombre como la contraseña desde el cuerpo de la solicitud.

  console.log("Profesor que se va a editar: ", professorName);
  console.log("Atributos a editar del profesor: ", professor_name, password);

  fs.readFile(filePathAmin, "utf8", (err, data) => {
    if (err) {
      res
        .status(500)
        .json({ error: `Error al leer el fichero [${filePathAmin}]` });
      return;
    }

    let professors;
    try {
      professors = JSON.parse(data);
    } catch (parseErr) {
      res
        .status(500)
        .json({ error: "Error al parsear los datos de los profesores." });
      return;
    }

    const professorIndex = professors.findIndex(
      (prof) => prof.nombre === professorName
    );

    if (professorIndex === -1) {
      res.status(404).json({ error: "Profesor no encontrado." });
      return;
    }

    // Actualizar los datos del profesor
    if (professor_name) professors[professorIndex].nombre = professor_name;
    if (password) professors[professorIndex].password = password; // Aquí se actualiza la contraseña si está presente.

    // Guardar los datos actualizados en el archivo
    fs.writeFile(
      filePathAmin,
      JSON.stringify(professors, null, 2),
      "utf8",
      (writeErr) => {
        if (writeErr) {
          res
            .status(500)
            .json({ error: "Error al guardar los datos actualizados." });
          return;
        }

        res.status(200).json({
          message: "Profesor actualizado correctamente.",
          data: professors[professorIndex],
        });
      }
    );
  });
});


/**
 * 
 * Modificación de todos los datos del profesor
 * 
 */
app.put("/profesors/update_all_data/:name", (req, res) => {
  const professorName = req.params.name; // Cambié 'nombre' por 'name' para coincidir con la ruta.
  const { usuario, professor_name, password } = req.body; // Aquí obtienes tanto el nombre como la contraseña desde el cuerpo de la solicitud.

  console.log("Profesor que se va a editar: ", professorName);
  console.log("Atributos a editar del profesor: ", usuario, professor_name, password);

  fs.readFile(filePathAmin, "utf8", (err, data) => {
    if (err) {
      res
        .status(500)
        .json({ error: `Error al leer el fichero [${filePathAmin}]` });
      return;
    }

    let professors;
    try {
      professors = JSON.parse(data);
    } catch (parseErr) {
      res
        .status(500)
        .json({ error: "Error al parsear los datos de los profesores." });
      return;
    }

    const professorIndex = professors.findIndex(
      (prof) => prof.nombre === professorName
    );

    if (professorIndex === -1) {
      res.status(404).json({ error: "Profesor no encontrado." });
      return;
    }

    // Actualizar los datos del profesor
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
          res
            .status(500)
            .json({ error: "Error al guardar los datos actualizados." });
          return;
        }

        res.status(200).json({
          message: "Profesor actualizado correctamente.",
          data: professors[professorIndex],
        });
      }
    );
  });
});

/**
 * 
 * Función para eliminar un profesor
 * 
 */
app.delete("/professor_to_delete/:name", async (req, res) => {
  const userName = req.params.name;

  try {
    const data = await fs.promises.readFile(filePathAmin, "utf8");
    let profesor_list = JSON.parse(data);

    // Filtrar la lista de profesores para excluir el profesor seleccionado
    const updatedProfessorList = profesor_list.filter(
      (professor) => professor.nombre !== userName
    );

    if (updatedProfessorList.length === profesor_list.length) {
      return res
        .status(404)
        .json({ error: `Profesor con nombre ${userName} no encontrado` });
    }

    await fs.promises.writeFile(
      filePathAmin,
      JSON.stringify(updatedProfessorList, null, 2)
    );

    console.log(`Profesor con nombre ${userName} eliminado correctamente`);

    // Devolver la lista actualizada como respuesta
    res.status(200).json({
      message: `Profesor con nombre ${userName} eliminado correctamente`,
      profesor_list: updatedProfessorList,
    });
  } catch (err) {
    console.error("Error al procesar el archivo JSON:", err);
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
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);
  trainerData.forEach((trainer) => {
    if (!trainer.recompensas) {
      trainer.recompensas = [];
    }
    if (!trainer.energies) {
      trainer.energies = [];
    }
  });
  console.log("Datos de entrenadores cargados correctamente:", trainerData);
} catch (err) {
  console.error("Error al leer el archivo de entrenadores:", err);
}

function saveTrainerData() {
  fs.writeFileSync(filePath, JSON.stringify(trainerData, null, 2), "utf8");
}

function assignRewardToTrainer(trainerName, reward) {
  const trainer = trainerData.find((trainer) => trainer.name === trainerName);
  if (trainer) {
    trainer.recompensas.push(reward);
    saveTrainerData();
    return Promise.resolve("Recompensa asignada correctamente al entrenador.");
  } else {
    return Promise.reject(
      `Entrenador con nombre ${trainerName} no encontrado.`
    );
  }
}

function spendEnergies(trainerName, energiesToSpend) {
  const trainer = trainerData.find((trainer) => trainer.name === trainerName);
  if (trainer) {
    energiesToSpend.forEach((energyToSpend) => {
      const index = trainer.energias.findIndex(
        (energy) => energy.tipo === energyToSpend.type
      );
      if (index !== -1) {
        trainer.energias.splice(index, energyToSpend.quantity);
      }
    });
    saveTrainerData();
    return Promise.resolve("Energías gastadas correctamente.");
  } else {
    return Promise.reject(
      `Entrenador con nombre ${trainerName} no encontrado.`
    );
  }
}

app.post("/assign-rewards", (req, res) => {
  const { trainerName, reward } = req.body;
  console.log("Datos de la solicitud:", req.body);
  assignRewardToTrainer(trainerName, reward)
    .then((message) => {
      res.status(200).json({ message: message });
    })
    .catch((error) => {
      console.error("Error al asignar la recompensa:", error);
      res.status(500).json({
        error: "Error al asignar la recompensa al entrenador: " + error,
      });
    });
});

app.post("/spend-energies", (req, res) => {
  const { trainerName, energiesToSpend } = req.body;
  console.log("Datos de la solicitud:", req.body);
  spendEnergies(trainerName, energiesToSpend)
    .then((message) => {
      res.status(200).json({ message: message });
    })
    .catch((error) => {
      console.error("Error al gastar energías:", error);
      res.status(500).json({ error: "Error al gastar energías: " + error });
    });
});

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
      return `http://localhost:3000/uploads/encargados/${file}`;
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
  fs.readdir(uploadDirLeagueBadges, (err, files) => {
    if (err) {
      console.error("Error al leer el directorio de imágenes:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    // Construye las URLs de las imágenes
    const imageUrls = files.map((file) => {
      return `http://localhost:3000/uploads/leagueBadges/${file}`;
    });

    // Devuelve las URLs de las imágenes como una respuesta JSON
    res.json({ imageUrls });
  });
});

/**
 *
 * Asigna distintivo de liga a varios entrenadores.
 *
 */
app.post("/assign-badge", (req, res) => {
  const { trainerNames, badge } = req.body;
  console.log("Datos de la solicitud:", req.body);

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
  // Aquí iría tu lógica para asignar el distintivo al entrenador
  // Buscar el entrenador por nombre y actualizar sus datos en memoria
  const trainer = trainerData.find((trainer) => trainer.name === trainerName);
  if (trainer) {
    // Se asegura que la propiedad 'distintivos' existe en el entrenador.
    if (!trainer.distintivos_liga) {
      trainer.distintivos_liga = [];
    }
    trainer.distintivos_liga.push(badgeName); // Por ejemplo, asumiendo que tienes una propiedad 'distintivos' en tu objeto de entrenador
    saveTrainerData(); // Guardar los cambios en el archivo JSON
    return Promise.resolve(
      "Distintivo de liga asignado correctamente al entrenador."
    );
  } else {
    return Promise.reject(
      `Entrenador con nombre ${trainerName} no encontrado.`
    );
  }
}
app.listen(PORT, () => {
  console.log(`Servidor GrumpiStore, iniciado en el puerto: ${PORT}`);
});
