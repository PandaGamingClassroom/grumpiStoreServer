const express = require("express");
const app = express();
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose(); // Importa el módulo sqlite3
const port = 3000;
const fs = require("fs");

// Ruta al archivo donde se guardarán los entrenadores
const filePath = "./trainers.json";
// Configuración de la base de datos
const db = new sqlite3.Database(":memory:"); // Crea una base de datos en memoria

// Crea una tabla para almacenar los entrenadores
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS trainers (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, password TEXT, grumpidolar TEXT)"
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
  res.json({ trainer_list });
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

app.delete("/user/:id", async (req, res) => {
    const userId = req.params.id;

    // Eliminar el usuario de la base de datos
    db.run("DELETE FROM trainers WHERE id = ?", [userId], function (err) {
      if (err) {
        console.error("Error al eliminar el usuario:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      console.log(`Usuario con ID ${userId} eliminado correctamente`);

      // Filtrar la lista de entrenadores para excluir el usuario eliminado
      const updatedTrainerList = trainer_list.filter(
        (trainer) => trainer.id !== parseInt(userId)
      );

      // Guardar la lista actualizada en el archivo JSON
      fs.writeFile(filePath, JSON.stringify(updatedTrainerList), (err) => {
        if (err) {
          console.error("Error al actualizar el archivo JSON:", err);
          return res.status(500).json({ error: "Error interno del servidor" });
        }

        console.log("BBDD actualizada correctamente");

        // Obtener la lista de entrenadores actualizada después de la eliminación
        const updatedTrainerListWithDB = []; // Lista actualizada con los datos de la base de datos

        // Consultar la base de datos para obtener la lista de entrenadores actualizada
        db.all("SELECT * FROM trainers", [], (err, rows) => {
          if (err) {
            console.error(
              "Error al obtener la lista actualizada de entrenadores:",
              err
            );
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          }

          updatedTrainerListWithDB.push(...rows);

          res.status(200).json({
            message: `Usuario con ID ${userId} eliminado correctamente`,
            trainer_list: updatedTrainerListWithDB, // Devolver la lista actualizada de entrenadores
          });
        });
      });
    });
});

app.listen(port, () => {
  console.log(`Servidor GrumpiStore, iniciado en el puerto: ${port}`);
});
