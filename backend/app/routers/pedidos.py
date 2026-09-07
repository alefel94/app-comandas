from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..websocket import manager

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


def _con_total(pedido: models.Pedido) -> schemas.PedidoConTotal:
    total = sum(item.cantidad * item.precio_unitario for item in pedido.items)
    return schemas.PedidoConTotal.model_validate({**schemas.Pedido.model_validate(pedido).model_dump(), "total": total})


@router.get("", response_model=list[schemas.PedidoConTotal])
def listar_pedidos(estado: models.EstadoPedido | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Pedido)
    if estado:
        query = query.filter(models.Pedido.estado == estado)
    pedidos = query.order_by(models.Pedido.fecha_apertura.desc()).all()
    return [_con_total(p) for p in pedidos]


@router.get("/{pedido_id}", response_model=schemas.PedidoConTotal)
def obtener_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return _con_total(pedido)


@router.post("", response_model=schemas.PedidoConTotal)
async def crear_pedido(datos: schemas.PedidoCreate, db: Session = Depends(get_db)):
    mesa = None
    if datos.mesa_id is not None:
        mesa = db.query(models.Mesa).filter(models.Mesa.id == datos.mesa_id).first()
        if not mesa:
            raise HTTPException(status_code=404, detail="Mesa no encontrada")
        if mesa.estado == models.EstadoMesa.ocupada:
            raise HTTPException(status_code=400, detail="La mesa ya está ocupada")

    pedido = models.Pedido(mesa_id=datos.mesa_id, estado=models.EstadoPedido.abierto)
    db.add(pedido)
    if mesa:
        mesa.estado = models.EstadoMesa.ocupada
    db.commit()
    db.refresh(pedido)
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido.id})
    return _con_total(pedido)


@router.delete("/{pedido_id}")
async def cancelar_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.estado != models.EstadoPedido.abierto:
        raise HTTPException(status_code=400, detail="Solo se puede cancelar un pedido abierto")

    if pedido.mesa:
        pedido.mesa.estado = models.EstadoMesa.libre
    db.delete(pedido)
    db.commit()
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido_id})
    await manager.broadcast({"tipo": "mesas_actualizadas"})
    return {"ok": True}


@router.post("/{pedido_id}/items", response_model=schemas.PedidoConTotal)
async def agregar_item(pedido_id: int, item: schemas.ItemPedidoCreate, db: Session = Depends(get_db)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.estado != models.EstadoPedido.abierto:
        raise HTTPException(status_code=400, detail="El pedido ya está cerrado")

    producto = db.query(models.Producto).filter(models.Producto.id == item.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Si el mismo producto (sin notas especiales) ya está en el ticket, se suma
    # la cantidad en vez de crear una línea duplicada.
    item_existente = (
        db.query(models.ItemPedido)
        .filter(
            models.ItemPedido.pedido_id == pedido.id,
            models.ItemPedido.producto_id == producto.id,
            models.ItemPedido.notas.is_(None),
        )
        .first()
        if not item.notas
        else None
    )

    if item_existente:
        item_existente.cantidad += item.cantidad
    else:
        nuevo_item = models.ItemPedido(
            pedido_id=pedido.id,
            producto_id=producto.id,
            cantidad=item.cantidad,
            precio_unitario=producto.precio,
            notas=item.notas,
        )
        db.add(nuevo_item)
    db.commit()
    db.refresh(pedido)
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido.id})
    return _con_total(pedido)


@router.put("/{pedido_id}/items/{item_id}", response_model=schemas.PedidoConTotal)
async def actualizar_item(pedido_id: int, item_id: int, cambios: schemas.ItemPedidoUpdate, db: Session = Depends(get_db)):
    item = (
        db.query(models.ItemPedido)
        .filter(models.ItemPedido.id == item_id, models.ItemPedido.pedido_id == pedido_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    for campo, valor in cambios.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    db.commit()
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido_id})
    return _con_total(pedido)


@router.delete("/{pedido_id}/items/{item_id}", response_model=schemas.PedidoConTotal)
async def eliminar_item(pedido_id: int, item_id: int, db: Session = Depends(get_db)):
    item = (
        db.query(models.ItemPedido)
        .filter(models.ItemPedido.id == item_id, models.ItemPedido.pedido_id == pedido_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    db.delete(item)
    db.commit()
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido_id})
    return _con_total(pedido)
