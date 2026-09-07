from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/estadisticas", tags=["estadisticas"])


def _resumen(db: Session, desde: datetime, hasta: datetime) -> schemas.ResumenVentas:
    pagos = (
        db.query(models.Pago)
        .filter(models.Pago.fecha >= desde, models.Pago.fecha < hasta)
        .all()
    )
    total = sum(p.monto_total for p in pagos)
    efectivo = sum(p.monto_total for p in pagos if p.metodo == models.MetodoPago.efectivo)
    tarjeta = sum(p.monto_total for p in pagos if p.metodo == models.MetodoPago.tarjeta)
    return schemas.ResumenVentas(
        total=total, efectivo=efectivo, tarjeta=tarjeta, numero_cuentas=len(pagos)
    )


@router.get("/dia", response_model=schemas.ResumenVentas)
def ventas_del_dia(db: Session = Depends(get_db)):
    ahora = datetime.now()
    inicio = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
    fin = ahora.replace(hour=23, minute=59, second=59, microsecond=999999)
    return _resumen(db, inicio, fin)


@router.get("/mes", response_model=schemas.EstadisticasMes)
def ventas_del_mes(db: Session = Depends(get_db)):
    ahora = datetime.now()
    inicio_mes = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if ahora.month == 12:
        inicio_siguiente = inicio_mes.replace(year=ahora.year + 1, month=1)
    else:
        inicio_siguiente = inicio_mes.replace(month=ahora.month + 1)

    resumen = _resumen(db, inicio_mes, inicio_siguiente)

    filas = (
        db.query(
            func.strftime("%Y-%m-%d", models.Pago.fecha).label("fecha"),
            models.Pago.metodo,
            func.sum(models.Pago.monto_total).label("monto"),
        )
        .filter(models.Pago.fecha >= inicio_mes, models.Pago.fecha < inicio_siguiente)
        .group_by("fecha", models.Pago.metodo)
        .all()
    )

    por_dia: dict[str, schemas.VentaPorDia] = {}
    for fecha, metodo, monto in filas:
        if fecha not in por_dia:
            por_dia[fecha] = schemas.VentaPorDia(fecha=fecha, total=0, efectivo=0, tarjeta=0)
        por_dia[fecha].total += monto
        if metodo == models.MetodoPago.efectivo:
            por_dia[fecha].efectivo += monto
        else:
            por_dia[fecha].tarjeta += monto

    return schemas.EstadisticasMes(
        resumen=resumen, por_dia=sorted(por_dia.values(), key=lambda v: v.fecha)
    )
