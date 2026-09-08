from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..websocket import manager

router = APIRouter(prefix="/mesas", tags=["mesas"])


@router.get("", response_model=list[schemas.Mesa])
def listar_mesas(db: Session = Depends(get_db)):
    return db.query(models.Mesa).order_by(models.Mesa.nombre).all()


@router.post("", response_model=schemas.Mesa)
async def crear_mesa(mesa: schemas.MesaCreate, db: Session = Depends(get_db)):
    existente = db.query(models.Mesa).filter(models.Mesa.nombre == mesa.nombre).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una mesa con ese nombre")
    nueva_mesa = models.Mesa(nombre=mesa.nombre, estado=models.EstadoMesa.libre)
    db.add(nueva_mesa)
    db.commit()
    db.refresh(nueva_mesa)
    await manager.broadcast({"tipo": "mesas_actualizadas"})
    return nueva_mesa


@router.put("/{mesa_id}", response_model=schemas.Mesa)
async def actualizar_mesa(mesa_id: int, datos: schemas.MesaUpdate, db: Session = Depends(get_db)):
    mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    existente = (
        db.query(models.Mesa)
        .filter(models.Mesa.nombre == datos.nombre, models.Mesa.id != mesa_id)
        .first()
    )
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una mesa con ese nombre")
    mesa.nombre = datos.nombre
    db.commit()
    db.refresh(mesa)
    await manager.broadcast({"tipo": "mesas_actualizadas"})
    return mesa


@router.delete("/{mesa_id}")
async def eliminar_mesa(mesa_id: int, db: Session = Depends(get_db)):
    mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    if mesa.estado == models.EstadoMesa.ocupada:
        raise HTTPException(status_code=400, detail="No se puede eliminar una mesa ocupada")
    db.delete(mesa)
    db.commit()
    await manager.broadcast({"tipo": "mesas_actualizadas"})
    return {"ok": True}
