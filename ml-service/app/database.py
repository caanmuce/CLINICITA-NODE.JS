"""Conexión a base de datos MySQL."""
import logging
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional

import pymysql

from .config import settings

logger = logging.getLogger(__name__)


class MySQLPool:
    """Adaptador de conexiones compatible con los consumidores del servicio."""

    def __init__(self) -> None:
        self._connection_config = {
            "host": settings.db_host,
            "port": settings.db_port,
            "user": settings.db_user,
            "password": settings.db_password,
            "database": settings.db_name,
            "charset": "utf8mb4",
            "cursorclass": pymysql.cursors.DictCursor,
            "autocommit": True,
        }

    def get_conn(self) -> pymysql.Connection:
        return pymysql.connect(**self._connection_config)

    def release(self, conn: pymysql.Connection) -> None:
        conn.close()

    def close(self) -> None:
        """Mantiene la interfaz de cierre del administrador de conexiones."""


_pool: Optional[MySQLPool] = None


def get_db_pool() -> MySQLPool:
    """Obtiene o crea el administrador de conexiones MySQL."""
    global _pool
    if _pool is None:
        _pool = MySQLPool()
        logger.info(
            "Administrador MySQL creado: %s:%s/%s",
            settings.db_host,
            settings.db_port,
            settings.db_name,
        )
    return _pool


@contextmanager
def get_connection() -> Generator[pymysql.Connection, None, None]:
    """Context manager para obtener una conexión."""
    pool = get_db_pool()
    conn = pool.get_conn()
    try:
        yield conn
    finally:
        pool.release(conn)


def execute_query(query: str, params: tuple = None) -> List[Dict[str, Any]]:
    """Ejecuta una consulta y retorna sus resultados como diccionarios."""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            if cursor.description:
                return cursor.fetchall()
            return []


def execute_query_df(query: str, params: tuple = None) -> "pd.DataFrame":
    """Ejecuta una consulta y retorna un DataFrame de pandas."""
    import pandas as pd

    with get_connection() as conn:
        return pd.read_sql(query, conn, params=params)


def close_pool() -> None:
    """Cierra el administrador de conexiones."""
    global _pool
    if _pool:
        _pool.close()
        _pool = None
        logger.info("Administrador MySQL cerrado")
