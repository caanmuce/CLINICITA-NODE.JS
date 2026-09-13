const mysql = require("mysql2");

const conexion = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"clinicitabd"
});

conexion.connect((error)=>{
    if(error){
        console.log("Error al conectar con la base de datos");
    }else{
        console.log("Conexión exitosa");
    }
});

module.exports = conexion;