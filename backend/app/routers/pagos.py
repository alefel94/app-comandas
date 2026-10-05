from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..models import utc_now
from ..websocket import manager

router = APIRouter(prefix="/pedidos", tags=["pagos"])


@router.post("/{pedido_id}/pagar", response_model=schemas.Pedido)
async def cobrar_pedido(pedido_id: int, datos: schemas.PagoCreate, db: Session = Depends(get_db)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.estado != models.EstadoPedido.abierto:
        raise HTTPException(status_code=400, detail="El pedido ya fue cobrado")
    if not pedido.items:
        raise HTTPException(status_code=400, detail="El pedido no tiene productos")

    total = sum(item.cantidad * item.precio_unitario for item in pedido.items)
    propina = max(0.0, datos.propina)

    pago = models.Pago(pedido_id=pedido.id, metodo=datos.metodo, monto_total=total, propina=propina)
    db.add(pago)
    pedido.estado = models.EstadoPedido.pagado
    pedido.fecha_cierre = utc_now()
    if pedido.mesa:
        pedido.mesa.estado = models.EstadoMesa.libre
        pedido.mesa.nombre = f"Mesa {pedido.mesa.id}"
    db.commit()
    db.refresh(pedido)
    await manager.broadcast({"tipo": "pedido_actualizado", "pedido_id": pedido.id})
    await manager.broadcast({"tipo": "mesas_actualizadas"})
    return pedido
