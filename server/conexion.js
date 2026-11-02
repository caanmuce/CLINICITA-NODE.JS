const mysql = require("mysql2");

const conexion = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "clinicitabd",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

conexion.on("error", (error) => {
    console.error(`Error de conexión MySQL: ${error.code || error.message}`);
});

conexion.on("connection", (connection) => {
    connection.on("error", (error) => {
        console.error(`Error en conexión MySQL: ${error.code || error.message}`);
    });
});

module.exports = conexion;