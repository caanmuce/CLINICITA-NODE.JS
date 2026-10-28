const mysql = require("mysql2");

const conexion = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "clinicitabd"
});

conexion.connect((error)=>{
    if(error){
        console.log("Error al conectar con la base de datos");
    }else{
        console.log("Conexión exitosa");
    }
});

module.exports = conexion;