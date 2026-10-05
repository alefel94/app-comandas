import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..models import utc_now
from ..websocket import manager

logger = logging.getLogger(__name__)

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
    resultado = []
    for p in pedidos:
        try:
            resultado.append(_con_total(p))
        except Exception:
            # Un pedido con datos inválidos no debe tirar todo el listado.
            logger.exception("No se pudo serializar el pedido %s", p.id)
    return resultado


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

    for item in datos.items:
        producto = db.query(models.Producto).filter(models.Producto.id == item.producto_id).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")

    pedido = models.Pedido(
        mesa_id=datos.mesa_id,
        cliente=datos.cliente.strip() if datos.cliente and datos.cliente.strip() else None,
        estado=models.EstadoPedido.abierto,
    )
    db.add(pedido)
    if mesa:
        mesa.estado = models.EstadoMesa.ocupada
    db.flush()

    for item in datos.items:
        producto = db.query(models.Producto).filter(models.Producto.id == item.producto_id).first()
        db.add(
            models.ItemPedido(
                pedido_id=pedido.id,
                producto_id=producto.id,
                cantidad=item.cantidad,
                precio_unitario=producto.precio,
                notas=item.notas,
                plato=item.plato,
            )
        )

    db.commit()
    db.refresh(pedido)
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido.id})
    if mesa:
        await manager.broadcast({"tipo": "mesas_actualizadas"})
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
        pedido.mesa.nombre = f"Mesa {pedido.mesa.id}"
    db.delete(pedido)
    db.commit()
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido_id})
    await manager.broadcast({"tipo": "mesas_actualizadas"})
    return {"ok": True}


@router.post("/{pedido_id}/servir", response_model=schemas.PedidoConTotal)
async def marcar_servido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    for item in pedido.items:
        item.cantidad_servida = item.cantidad
    pedido.ultimo_servido_en = utc_now()
    db.commit()
    db.refresh(pedido)
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido.id})
    return _con_total(pedido)


def _pedido_totalmente_servido(pedido: models.Pedido) -> bool:
    return all(item.cantidad_servida >= item.cantidad for item in pedido.items)


def _agregar_o_sumar_item(db: Session, pedido: models.Pedido, item: schemas.ItemPedidoCreate) -> models.Producto:
    producto = db.query(models.Producto).filter(models.Producto.id == item.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")

    # Si el mismo producto (sin notas especiales) ya está en el ticket para el
    # mismo plato, se suma la cantidad en vez de crear una línea duplicada.
    # Si es para un plato distinto, debe quedar como línea aparte aunque sea
    # el mismo producto.
    item_existente = (
        db.query(models.ItemPedido)
        .filter(
            models.ItemPedido.pedido_id == pedido.id,
            models.ItemPedido.producto_id == producto.id,
            models.ItemPedido.notas.is_(None),
            models.ItemPedido.plato == item.plato if item.plato is not None else models.ItemPedido.plato.is_(None),
        )
        .first()
        if not item.notas
        else None
    )

    if item_existente:
        item_existente.cantidad += item.cantidad
    else:
        db.add(
            models.ItemPedido(
                pedido_id=pedido.id,
                producto_id=producto.id,
                cantidad=item.cantidad,
                precio_unitario=producto.precio,
                notas=item.notas,
                plato=item.plato,
            )
        )
    return producto


@router.post("/{pedido_id}/items", response_model=schemas.PedidoConTotal)
async def agregar_item(pedido_id: int, item: schemas.ItemPedidoCreate, db: Session = Depends(get_db)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.estado != models.EstadoPedido.abierto:
        raise HTTPException(status_code=400, detail="El pedido ya está cerrado")

    ya_servido = _pedido_totalmente_servido(pedido)
    _agregar_o_sumar_item(db, pedido, item)
    if ya_servido:
        pedido.reloj_desde = utc_now()
    db.commit()
    db.refresh(pedido)
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido.id})
    return _con_total(pedido)


@router.post("/{pedido_id}/items/lote", response_model=schemas.PedidoConTotal)
async def agregar_items_lote(pedido_id: int, datos: schemas.ItemsPedidoLote, db: Session = Depends(get_db)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.estado != models.EstadoPedido.abierto:
        raise HTTPException(status_code=400, detail="El pedido ya está cerrado")
    if not datos.items:
        raise HTTPException(status_code=400, detail="No se enviaron productos")

    ya_servido = _pedido_totalmente_servido(pedido)
    for item in datos.items:
        _agregar_o_sumar_item(db, pedido, item)
    if ya_servido:
        pedido.reloj_desde = utc_now()

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
