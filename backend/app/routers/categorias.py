from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/categorias", tags=["categorias"])


@router.get("", response_model=list[schemas.Categoria])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(models.Categoria).order_by(models.Categoria.nombre).all()


@router.post("", response_model=schemas.Categoria)
def crear_categoria(datos: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    nombre = datos.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")

    existente = db.query(models.Categoria).filter(models.Categoria.nombre == nombre).first()
    if existente:
        return existente

    categoria = models.Categoria(nombre=nombre)
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria
