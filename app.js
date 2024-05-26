const express = require("express");
const app = express();
const multer = require("multer");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose(); // Importa el módulo sqlite3
const port = 3000;
const fs = require("fs");

// Ruta al archivo donde se guardarán los entrenadores
const filePath = "./trainers.json";
// Ruta del archivo donde se guardan los objetos de combate
const filePathObjectsCombat = "./combatObjects.json";
// Configuración de la base de datos
// const db = new sqlite3.Database("database.db"); // Crea una base de datos en memoria
const db = new sqlite3.Database(":memory:");



// Asegúrate de que el directorio de almacenamiento existe
const path = require("path");
const uploadDir = path.join(__dirname, "uploads", "grumpis");
const uploadDirMedals = path.join(__dirname, "uploads", "medals");
const uploadDirEnergies = path.join(__dirname, "uploads", "energies");
const uploadDirCombatObjects = path.join(__dirname, "uploads", "combatObjects");
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
      nombre TEXT,
      password TEXT,
      grumpidolar INTEGER,
      medallas TEXT,
      grumpis TEXT,
      energias TEXT,
      total_energias INTEGER,
      objetos_combate TEXT,
      objetos_evolutivos TEXT
    )
  `);

  // Tabla de medallas
  db.run(`
    CREATE TABLE IF NOT EXISTS medallas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      imagen TEXT,
      trainer_id INTEGER,
      FOREIGN KEY (trainer_id) REFERENCES trainers (id)
    )
  `);

  // Tabla de grumpis
  db.run(`
    CREATE TABLE IF NOT EXISTS grumpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      imagen TEXT,
      trainer_id INTEGER,
      FOREIGN KEY (trainer_id) REFERENCES trainers (id)
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
      FOREIGN KEY (trainer_id) REFERENCES trainers (id)
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
      FOREIGN KEY (trainer_id) REFERENCES trainers (id)
    )
  `);

  // Tabla de objetos evolutivos
  db.run(`
    CREATE TABLE IF NOT EXISTS objetos_evolutivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      imagen TEXT,
      trainer_id INTEGER,
      FOREIGN KEY (trainer_id) REFERENCES trainers (id)
    )
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS trainer_creatures (
    trainer_id INTEGER,
    creature_id INTEGER,
    FOREIGN KEY (trainer_id) REFERENCES trainers (id),
    FOREIGN KEY (creature_id) REFERENCES grumpis (id)
  )
`);
});

// Ejemplo de inserción de datos
db.serialize(() => {
  // Inserción de un entrenador
  db.run(`
    INSERT INTO trainers (nombre, password, grumpidolar)
    VALUES (?, ?, ?)
  `, ['Ash Ketchum', 'password123', 1000], function(err) {
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
    db.run(`
      INSERT INTO medallas (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `, ['Medalla Roca', 'medalla_roca.png', trainer_id], function() {
      medallas.push(this.lastID);
    });

    // Inserción de grumpis para el entrenador
    db.run(`
      INSERT INTO grumpis (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `, ['Grumpi Fuego', 'grumpi_fuego.png', trainer_id], function() {
      grumpis.push(this.lastID);
    });

    // Inserción de energías para el entrenador
    db.run(`
      INSERT INTO energias (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `, ['Energía Solar', 'energia_solar.png', trainer_id], function() {
      energias.push(this.lastID);
    });

    // Inserción de objetos de combate para el entrenador
    db.run(`
      INSERT INTO objetos_combate (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `, ['Espada del Grumpi', 'espada_grumpi.png', trainer_id], function() {
      objetos_combate.push(this.lastID);
    });

    // Inserción de objetos evolutivos para el entrenador
    db.run(`
      INSERT INTO objetos_evolutivos (nombre, imagen, trainer_id)
      VALUES (?, ?, ?)
    `, ['Piedra Evolutiva', 'piedra_evolutiva.png', trainer_id], function() {
      objetos_evolutivos.push(this.lastID);
    });

    // Actualiza el entrenador con los datos de sus atributos en formato JSON
    db.run(`
      UPDATE trainers
      SET medallas = ?, grumpis = ?, energias = ?, objetos_combate = ?, objetos_evolutivos = ?
      WHERE id = ?
    `, [
      JSON.stringify(medallas),
      JSON.stringify(grumpis),
      JSON.stringify(energias),
      JSON.stringify(objetos_combate),
      JSON.stringify(objetos_evolutivos),
      trainer_id
    ]);
  });
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
  const { trainer_name, trainer_pass, grumpidolar } = req.body;

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

      fs.writeFile(filePath, JSON.stringify(trainers, null, 2), (err) => {
        if (err) {
          res
            .status(500)
            .json({ error: "Error al escribir en el fichero [${filepath}]" });
          return;
        }
        res.status(200).json({ message: "Entrenador actualizado correctamente" }); // Modifica la respuesta para enviar un objeto JSON válido
      });
    } else {
      res.status(404).json({ error: "Entrenador no encontrado" });
    }
  });
});

/********************************************************************
 * 
 *            ASIGNACIÓN DE CRIATURAS A LOS ENTRENADORES
 * 
 *******************************************************************/
// Cargar los datos de los entrenadores del archivo JSON al iniciar la aplicación
let trainerData = [];
try {
  const data = fs.readFileSync(filePath, "utf8");
  trainerData = JSON.parse(data);
  // Inicializar la propiedad 'criaturas' si no está presente en cada objeto de entrenador
  trainerData.forEach((trainer) => {
    if (!trainer.criaturas) {
      trainer.criaturas = [];
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
function assignCreatureToTrainer(trainerName, creatureName) {
  // Aquí iría tu lógica para asignar la criatura al entrenador
  // Buscar el entrenador por nombre y actualizar sus datos en memoria
  const trainer = trainerData.find((trainer) => trainer.name === trainerName);
  if (trainer) {
    // Aquí actualizarías los datos del entrenador con la nueva criatura asignada
    trainer.criaturas.push(creatureName); // Por ejemplo, asumiendo que tienes una propiedad 'criaturas' en tu objeto de entrenador
    saveTrainerData(); // Guardar los cambios en el archivo JSON
    return Promise.resolve("Criatura asignada correctamente al entrenador.");
  } else {
    return Promise.reject(`Entrenador con nombre ${trainerName} no encontrado.`);
  }
}

// Ruta de asignación de criaturas
app.post("/assign-creature", (req, res) => {
  const { trainerName, creatureName } = req.body;
  console.log("Datos de la solicitud:", req.body);
  // Llamada a la función para asignar la criatura al entrenador
  assignCreatureToTrainer(trainerName, creatureName)
    .then((message) => {
      res.status(200).json({ message: message }); // Enviar el mensaje como parte de un objeto JSON
    })
    .catch((error) => {
      console.error("Error al asignar la criatura:", error);
      res
        .status(500)
        .json({ error: "Error al asignar la criatura al entrenador: " + error.message }); // Enviar el mensaje de error como parte de un objeto JSON
    });
});
/**************************************************************
 * 
 *    FIN DE ASIGNACIÓN DE CRIATURAS A LOS ENTRENADORES
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

    if (isNaN(grumpidolaresNumber) || grumpidolaresNumber <= 0) {
      console.log("Cantidad de Grumpidólares no válida: ", grumpidolaresNumber);
      return reject("Grumpidólares debe ser un número positivo.");
    }

    const trainer = trainerData.find((trainer) => trainer.name === trainerName);
    if (trainer) {
      console.log("Entrenador encontrado:", trainer);

      // Asegurarse de que trainer.grumpidolar es un número antes de sumar
      trainer.grumpidolar = Number(trainer.grumpidolar) || 0;

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

// Ruta para obtener las URLs de todas las imágenes
app.get('/getImageUrls', (req, res) => {
  // Lee todos los archivos en el directorio de imágenes
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error al leer el directorio de imágenes:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    // Construye las URLs de las imágenes
    const imageUrls = files.map(file => {
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
app.get('/getImageMedals', (req, res) => {
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
      res
        .status(500)
        .json({
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
      res.status(500).json({ error: "Error al leer el archivo combatObjects.json" });
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


app.listen(port, () => {
  console.log(`Servidor GrumpiStore, iniciado en el puerto: ${port}`);
});
