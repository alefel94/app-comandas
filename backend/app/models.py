import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from .database import Base


def utc_now() -> datetime:
    # El servidor puede estar en cualquier zona horaria (este corre en
    # Europe/Berlin, los negocios que lo usan no) — todo se guarda en UTC,
    # sin tzinfo (SQLite no lo conserva bien), y el frontend le agrega el
    # sufijo "Z" al leerlo para interpretarlo como instante absoluto.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class EstadoMesa(str, enum.Enum):
    libre = "libre"
    ocupada = "ocupada"


class EstadoPedido(str, enum.Enum):
    abierto = "abierto"
    pagado = "pagado"


class MetodoPago(str, enum.Enum):
    efectivo = "efectivo"
    tarjeta = "tarjeta"


class Mesa(Base):
    __tablename__ = "mesas"

    id = Column(Integer, primary_key=True, index=True)
    # Sin unique=True a nivel de columna: el nombre solo debe ser único entre
    # mesas ocupadas (se valida en el router), una mesa libre es desechable y
    # su nombre se puede reutilizar sin problema.
    nombre = Column(String, nullable=False)
    estado = Column(SAEnum(EstadoMesa), nullable=False, default=EstadoMesa.libre)

    pedidos = relationship("Pedido", back_populates="mesa")


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False, unique=True)


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    categoria = Column(String, nullable=False, default="General")
    disponible = Column(Boolean, nullable=False, default=True)


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    mesa_id = Column(Integer, ForeignKey("mesas.id"), nullable=True)
    cliente = Column(String, nullable=True)
    estado = Column(SAEnum(EstadoPedido), nullable=False, default=EstadoPedido.abierto)
    fecha_apertura = Column(DateTime, nullable=False, default=utc_now)
    fecha_cierre = Column(DateTime, nullable=True)
    reloj_desde = Column(DateTime, nullable=False, default=utc_now)
    ultimo_servido_en = Column(DateTime, nullable=True)

    mesa = relationship("Mesa", back_populates="pedidos")
    items = relationship(
        "ItemPedido", back_populates="pedido", cascade="all, delete-orphan"
    )
    pago = relationship(
        "Pago", back_populates="pedido", uselist=False, cascade="all, delete-orphan"
    )


class ItemPedido(Base):
    __tablename__ = "items_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    cantidad_servida = Column(Integer, nullable=False, default=0)
    precio_unitario = Column(Float, nullable=False)
    notas = Column(String, nullable=True)
    plato = Column(Integer, nullable=True)

    pedido = relationship("Pedido", back_populates="items")
    producto = relationship("Producto")


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False, unique=True)
    metodo = Column(SAEnum(MetodoPago), nullable=False)
    monto_total = Column(Float, nullable=False)
    propina = Column(Float, nullable=False, default=0.0)
    fecha = Column(DateTime, nullable=False, default=utc_now)

    pedido = relationship("Pedido", back_populates="pago")
