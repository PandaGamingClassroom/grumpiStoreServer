const express = require("express");
const app = express();
const multer = require("multer");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose(); // Importa el módulo sqlite3
const port = 3000;
const fs = require("fs");

/**********************
 *  RUTAS DE ACCESO
 *********************/
const filePath = "./data/trainers.json";
const filePathAmin = "./data/admin.json";
const filePathGrumpis = "./data/grumpis.json";
const filePathObjectsCombat = "./data/combatObjects.json";
const filePathObjectsEvolution = "./data/evolutionObjects.json";
const filePathRewards = "./data/rewards.json";

// Configuración de la base de datos
// const db = new sqlite3.Database("database.db"); // Crea una base de datos en memoria
const db = new sqlite3.Database(":memory:");

// Asegúrate de que el directorio de almacenamiento existe
const path = require("path");
const uploadDir = path.join(__dirname, "uploads", "grumpis");
const uploadDirMedals = path.join(__dirname, "uploads", "medals");
const uploadDirEnergies = path.join(__dirname, "uploads", "energies");
const uploadDirEncargados = path.join(__dirname, "uploads", "encargados");
const uploadDirLeagueBadges = path.join(__dirname, "uploads", "leagueBadges");

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

app.delete("/user/:name", async (req, res) => {
  const userName = req.params.name;

  try {
    const data = await fs.readFile(filePath, "utf8");
    let trainers = JSON.parse(data);

    // Filtrar la lista de entrenadores para excluir el entrenador seleccionado
    const updatedTrainerList = trainers.filter(
      (trainer) => trainer.name !== userName
    );

    if (trainers.length === updatedTrainerList.length) {
      // El usuario no se encontró en la lista
      return res
        .status(404)
        .json({ error: `Usuario con nombre ${userName} no encontrado` });
    }

    await fs.writeFile(filePath, JSON.stringify(updatedTrainerList, null, 2));

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

// Ruta para actualizar entrenador
app.put("/trainers/update/:name", (req, res) => {
  const trainerName = req.params.name;
  const { trainer_name, trainer_pass, grumpidolar, combatMark } = req.body;

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Error al leer el fichero [${filepath}]" });
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

      fs.writeFile(filePath, JSON.stringify(trainers, null, 2), (err) => {
        if (err) {
          res
            .status(500)
            .json({ error: "Error al escribir en el fichero [${filepath}]" });
          return;
        }
        res
          .status(200)
          .json({ message: "Entrenador actualizado correctamente" }); // Modifica la respuesta para enviar un objeto JSON válido
      });
    } else {
      res.status(404).json({ error: "Entrenador no encontrado" });
    }
  });
});

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
  const { trainerName, creature } = req.body;
  console.log("Datos de la solicitud:", req.body);

  assignCreatureToTrainer(trainerName, creature)
    .then((message) => {
      res.status(200).json({ message: message }); // Enviar el mensaje como parte de un objeto JSON
    })
    .catch((error) => {
      console.error("Error al asignar el grumpi:", error);
      res.status(500).json({
        error: "Error al asignar el grumpi al entrenador: " + error.message,
      }); // Enviar el mensaje de error como parte de un objeto JSON
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
      return `http://localhost:3000/uploads/grumpis/${file}`;
    });

    // Devuelve las URLs de las imágenes como una respuesta JSON
    res.json({ imageUrls });
  });
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
  const trainer = trainerData.find((trainer) => trainer.name === trainerName);
  if (trainer) {
    if (!Array.isArray(trainer.energias)) {
      trainer.energias = []; // Inicializar si no está definida como un arreglo
    }
    trainer.energias.push(energia); // Agregar la energía al arreglo de energías del entrenador
    saveTrainerData(); // Guardar los cambios en el archivo JSON
    return Promise.resolve("Energía asignada correctamente al entrenador.");
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

// Ruta de asignación de energías
app.post("/assign-energie", (req, res) => {
  const { trainerName, energie } = req.body;
  console.log("Datos de la solicitud:", req.body);
  assignEnergieToTrainer(trainerName, energie)
    .then((message) => {
      res.status(200).json({ message: message });
    })
    .catch((error) => {
      console.error("Error al asignar la energía:", error);
      res
        .status(500)
        .json({ error: "Error al asignar la energía al entrenador: " + error });
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
    // Aquí actualizarías los datos del entrenador con la nueva medalla asignada
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
  const { trainerName, medalName } = req.body;
  console.log("Datos de la solicitud:", req.body);
  // Llamada a la función para asignar la medalla al entrenador
  assignMedalToTrainer(trainerName, medalName)
    .then((message) => {
      res.status(200).json({ message: message }); // Enviar el mensaje como parte de un objeto JSON
    })
    .catch((error) => {
      console.error("Error al asignar la medalla:", error);
      res.status(500).json({
        error: "Error al asignar la medalla al entrenador: " + error.message,
      }); // Enviar el mensaje de error como parte de un objeto JSON
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
      return res
        .status(404)
        .json({
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

// Agregar entrenadores a un profesor existente
app.post("/profesores/:id/entrenadores", (req, res) => {
  const profesorId = parseInt(req.params.id);
  const nuevosEntrenadores = req.body.entrenadores;

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Error al leer el archivo" });
    }

    const adminData = JSON.parse(data);
    const profesor = adminData.profesores.find((p) => p.id === profesorId);

    if (!profesor) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    profesor.entrenadores = profesor.entrenadores.concat(nuevosEntrenadores);

    fs.writeFile(filePath, JSON.stringify(adminData, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Error al escribir el archivo" });
      }

      res.status(200).json(profesor);
    });
  });
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

app.listen(port, () => {
  console.log(`Servidor GrumpiStore, iniciado en el puerto: ${port}`);
});
