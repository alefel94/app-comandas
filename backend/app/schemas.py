from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from .models import EstadoMesa, EstadoPedido, MetodoPago


# ---------- Mesa ----------
class MesaBase(BaseModel):
    nombre: str


class MesaCreate(MesaBase):
    pass


class MesaUpdate(BaseModel):
    nombre: str


class Mesa(MesaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    estado: EstadoMesa


# ---------- Producto ----------
class ProductoBase(BaseModel):
    nombre: str
    precio: float
    categoria: str = "General"
    disponible: bool = True


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[float] = None
    categoria: Optional[str] = None
    disponible: Optional[bool] = None


class Producto(ProductoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------- ItemPedido ----------
class ItemPedidoCreate(BaseModel):
    producto_id: int
    cantidad: int = 1
    notas: Optional[str] = None


class ItemPedidoUpdate(BaseModel):
    cantidad: Optional[int] = None
    notas: Optional[str] = None


class ItemsPedidoLote(BaseModel):
    items: list[ItemPedidoCreate]


class ItemPedido(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_id: int
    producto: Producto
    cantidad: int
    cantidad_servida: int
    precio_unitario: float
    notas: Optional[str] = None


# ---------- Pago ----------
class PagoCreate(BaseModel):
    metodo: MetodoPago
    propina: float = 0.0


class Pago(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metodo: MetodoPago
    monto_total: float
    propina: float
    fecha: datetime


# ---------- Pedido ----------
class PedidoCreate(BaseModel):
    mesa_id: Optional[int] = None
    cliente: Optional[str] = None
    items: list[ItemPedidoCreate] = []


class Pedido(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mesa_id: Optional[int] = None
    cliente: Optional[str] = None
    estado: EstadoPedido
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime] = None
    reloj_desde: datetime
    ultimo_servido_en: Optional[datetime] = None
    items: list[ItemPedido] = []
    pago: Optional[Pago] = None


class PedidoConTotal(Pedido):
    total: float


# ---------- Estadisticas ----------
class ResumenVentas(BaseModel):
    total: float
    efectivo: float
    tarjeta: float
    propinas: float
    numero_cuentas: int


class VentaPorDia(BaseModel):
    fecha: str
    total: float
    efectivo: float
    tarjeta: float


class EstadisticasMes(BaseModel):
    resumen: ResumenVentas
    por_dia: list[VentaPorDia]
