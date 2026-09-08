import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import models
from .database import engine
from .routers import estadisticas, mesas, pagos, pedidos, productos
from .websocket import manager

models.Base.metadata.create_all(bind=engine)

# Migración ligera: agrega columnas nuevas a tablas ya existentes.
# create_all no altera tablas existentes, así que sin esto una base de
# datos creada antes de este cambio se quedaría sin la columna.
with engine.connect() as _conn:
    _columnas_pagos = [fila[1] for fila in _conn.execute(text("PRAGMA table_info(pagos)"))]
    if "propina" not in _columnas_pagos:
        _conn.execute(text("ALTER TABLE pagos ADD COLUMN propina FLOAT NOT NULL DEFAULT 0"))
        _conn.commit()

    _columnas_pedidos = [fila[1] for fila in _conn.execute(text("PRAGMA table_info(pedidos)"))]
    if "cliente" not in _columnas_pedidos:
        _conn.execute(text("ALTER TABLE pedidos ADD COLUMN cliente VARCHAR"))
        _conn.commit()
    if "reloj_desde" not in _columnas_pedidos:
        _conn.execute(text("ALTER TABLE pedidos ADD COLUMN reloj_desde DATETIME"))
        _conn.execute(text("UPDATE pedidos SET reloj_desde = fecha_apertura WHERE reloj_desde IS NULL"))
        _conn.commit()
    if "ultimo_servido_en" not in _columnas_pedidos:
        _conn.execute(text("ALTER TABLE pedidos ADD COLUMN ultimo_servido_en DATETIME"))
        _conn.commit()

    _columnas_items = [fila[1] for fila in _conn.execute(text("PRAGMA table_info(items_pedido)"))]
    if "cantidad_servida" not in _columnas_items:
        _conn.execute(text("ALTER TABLE items_pedido ADD COLUMN cantidad_servida INTEGER NOT NULL DEFAULT 0"))
        _conn.commit()

app = FastAPI(title="Comandas Taquería")

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allowed_origins == "*" else allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mesas.router)
app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(pagos.router)
app.include_router(estadisticas.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
