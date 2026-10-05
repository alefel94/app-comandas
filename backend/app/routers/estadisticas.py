from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..models import utc_now

router = APIRouter(prefix="/estadisticas", tags=["estadisticas"])

# El "día" y "mes" del negocio se definen en su zona horaria local, no en la
# del servidor (que corre en Europe/Berlin) ni en UTC (que es como se guarda
# todo en la base de datos) — si no, un corte de caja a medianoche local
# quedaría partido entre dos días de UTC.
ZONA_NEGOCIO = ZoneInfo("America/Mexico_City")


def _a_utc_naive(momento_local: datetime) -> datetime:
    return momento_local.astimezone(timezone.utc).replace(tzinfo=None)


def _tacos_vendidos(db: Session, desde: datetime, hasta: datetime) -> int:
    # Se cuenta al momento del cobro (Pago.fecha), no de la creación del
    # pedido, para que el corte de "hoy" coincida exactamente con el de las
    # demás cifras (total, efectivo, etc.) — todas se basan en cuándo se pagó.
    total = (
        db.query(func.sum(models.ItemPedido.cantidad))
        .join(models.Pedido, models.ItemPedido.pedido_id == models.Pedido.id)
        .join(models.Pago, models.Pago.pedido_id == models.Pedido.id)
        .join(models.Producto, models.ItemPedido.producto_id == models.Producto.id)
        .filter(
            models.Pago.fecha >= desde,
            models.Pago.fecha < hasta,
            func.lower(models.Producto.categoria) == "tacos",
        )
        .scalar()
    )
    return total or 0


def _resumen(db: Session, desde: datetime, hasta: datetime) -> schemas.ResumenVentas:
    pagos = (
        db.query(models.Pago)
        .filter(models.Pago.fecha >= desde, models.Pago.fecha < hasta)
        .all()
    )
    total = sum(p.monto_total for p in pagos)
    efectivo = sum(p.monto_total for p in pagos if p.metodo == models.MetodoPago.efectivo)
    tarjeta = sum(p.monto_total for p in pagos if p.metodo == models.MetodoPago.tarjeta)
    propinas = sum(p.propina for p in pagos)
    return schemas.ResumenVentas(
        total=total,
        efectivo=efectivo,
        tarjeta=tarjeta,
        propinas=propinas,
        numero_cuentas=len(pagos),
        tacos_vendidos=_tacos_vendidos(db, desde, hasta),
    )


def _por_dia(db: Session, desde: datetime, hasta: datetime) -> list[schemas.VentaPorDia]:
    filas = (
        db.query(models.Pago.fecha, models.Pago.metodo, models.Pago.monto_total)
        .filter(models.Pago.fecha >= desde, models.Pago.fecha < hasta)
        .all()
    )

    por_dia: dict[str, schemas.VentaPorDia] = {}
    for fecha_utc, metodo, monto in filas:
        # Agrupamos por fecha en la zona horaria del negocio, no en UTC —
        # mismo motivo que el corte de "hoy": una venta a las 11pm local no
        # debe contarse en el día siguiente solo porque en UTC ya lo es.
        fecha = fecha_utc.replace(tzinfo=timezone.utc).astimezone(ZONA_NEGOCIO).strftime("%Y-%m-%d")
        if fecha not in por_dia:
            por_dia[fecha] = schemas.VentaPorDia(fecha=fecha, total=0, efectivo=0, tarjeta=0, tacos=0)
        por_dia[fecha].total += monto
        if metodo == models.MetodoPago.efectivo:
            por_dia[fecha].efectivo += monto
        else:
            por_dia[fecha].tarjeta += monto

    filas_tacos = (
        db.query(models.Pago.fecha, models.ItemPedido.cantidad)
        .join(models.Pedido, models.Pago.pedido_id == models.Pedido.id)
        .join(models.ItemPedido, models.ItemPedido.pedido_id == models.Pedido.id)
        .join(models.Producto, models.ItemPedido.producto_id == models.Producto.id)
        .filter(
            models.Pago.fecha >= desde,
            models.Pago.fecha < hasta,
            func.lower(models.Producto.categoria) == "tacos",
        )
        .all()
    )
    for fecha_utc, cantidad in filas_tacos:
        fecha = fecha_utc.replace(tzinfo=timezone.utc).astimezone(ZONA_NEGOCIO).strftime("%Y-%m-%d")
        if fecha not in por_dia:
            por_dia[fecha] = schemas.VentaPorDia(fecha=fecha, total=0, efectivo=0, tarjeta=0, tacos=0)
        por_dia[fecha].tacos += cantidad

    return sorted(por_dia.values(), key=lambda v: v.fecha)


@router.get("/dia", response_model=schemas.ResumenVentas)
def ventas_del_dia(db: Session = Depends(get_db)):
    ahora_local = utc_now().replace(tzinfo=timezone.utc).astimezone(ZONA_NEGOCIO)
    inicio = _a_utc_naive(ahora_local.replace(hour=0, minute=0, second=0, microsecond=0))
    fin = _a_utc_naive(ahora_local.replace(hour=23, minute=59, second=59, microsecond=999999))
    return _resumen(db, inicio, fin)


@router.get("/semana", response_model=schemas.EstadisticasMes)
def ventas_de_la_semana(db: Session = Depends(get_db)):
    ahora_local = utc_now().replace(tzinfo=timezone.utc).astimezone(ZONA_NEGOCIO)
    inicio_semana_local = (ahora_local - timedelta(days=ahora_local.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    fin_semana_local = inicio_semana_local + timedelta(days=7)

    inicio = _a_utc_naive(inicio_semana_local)
    fin = _a_utc_naive(fin_semana_local)

    return schemas.EstadisticasMes(resumen=_resumen(db, inicio, fin), por_dia=_por_dia(db, inicio, fin))


@router.get("/mes", response_model=schemas.EstadisticasMes)
def ventas_del_mes(db: Session = Depends(get_db)):
    ahora_local = utc_now().replace(tzinfo=timezone.utc).astimezone(ZONA_NEGOCIO)
    inicio_mes_local = ahora_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if ahora_local.month == 12:
        inicio_siguiente_local = inicio_mes_local.replace(year=ahora_local.year + 1, month=1)
    else:
        inicio_siguiente_local = inicio_mes_local.replace(month=ahora_local.month + 1)

    inicio_mes = _a_utc_naive(inicio_mes_local)
    inicio_siguiente = _a_utc_naive(inicio_siguiente_local)

    return schemas.EstadisticasMes(
        resumen=_resumen(db, inicio_mes, inicio_siguiente),
        por_dia=_por_dia(db, inicio_mes, inicio_siguiente),
    )
