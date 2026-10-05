from datetime import datetime, timezone
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, PlainSerializer

from .models import EstadoMesa, EstadoPedido, MetodoPago

# Los datetime se guardan en la base de datos como UTC sin tzinfo (ver
# models.utc_now). Al serializarlos hay que marcarlos como UTC explícitamente
# ("Z" al final) — si no, el frontend los interpreta como hora local del
# navegador y el reloj de cocina queda descuadrado por varias horas.
UTCDateTime = Annotated[
    datetime,
    PlainSerializer(lambda dt: dt.replace(tzinfo=timezone.utc).isoformat(), return_type=str),
]


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


# ---------- Categoria ----------
class CategoriaCreate(BaseModel):
    nombre: str


class Categoria(CategoriaCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


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
    plato: Optional[int] = None


class ItemPedidoUpdate(BaseModel):
    cantidad: Optional[int] = None
    notas: Optional[str] = None
    plato: Optional[int] = None


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
    plato: Optional[int] = None


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
    fecha: UTCDateTime


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
    fecha_apertura: UTCDateTime
    fecha_cierre: Optional[UTCDateTime] = None
    reloj_desde: UTCDateTime
    ultimo_servido_en: Optional[UTCDateTime] = None
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
    tacos_vendidos: int = 0


class VentaPorDia(BaseModel):
    fecha: str
    total: float
    efectivo: float
    tarjeta: float
    tacos: int = 0


class EstadisticasMes(BaseModel):
    resumen: ResumenVentas
    por_dia: list[VentaPorDia]
