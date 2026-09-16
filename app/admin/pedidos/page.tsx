"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/app/lib/supabase";

const MapaUbicacionCliente = dynamic(
  () => import("@/app/components/MapaUbicacionCliente"),
  {
    ssr: false,
    loading: () => <p>Cargando mapa...</p>,
  }
);

type Pedido = {
  id: string;
  codigo: string;
  cliente: string;
  telefono: string;
  direccion: string;
  cliente_lat: number | null;
  cliente_lng: number | null;
  estado: string;
};

export default function AdminPedidosPage() {
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [linkUbicacion, setLinkUbicacion] = useState("");

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const [mensaje, setMensaje] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);

  useEffect(() => {
    cargarPedidos();
  }, []);

  const generarCodigo = () => {
    return `PED-${Date.now().toString().slice(-6)}`;
  };

  const cargarPedidos = async () => {
    setCargandoPedidos(true);

    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        codigo,
        cliente,
        telefono,
        direccion,
        cliente_lat,
        cliente_lng,
        estado
      `)
      .eq("estado", "pendiente")
      .order("codigo", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setMensaje("❌ Error cargando pedidos");
      setCargandoPedidos(false);
      return;
    }

    setPedidos(data ?? []);
    setCargandoPedidos(false);
  };

  const buscarDireccion = async () => {
    if (!direccion.trim()) {
      setMensaje("Escribí una dirección.");
      return;
    }

    setBuscando(true);
    setMensaje("");

    try {
      const consulta = `${direccion}, Salta, Argentina`;

      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?format=json` +
        `&limit=1` +
        `&q=${encodeURIComponent(consulta)}`;

      const respuesta = await fetch(url);
      const data = await respuesta.json();

      if (!data || data.length === 0) {
        setMensaje("❌ No encontré esa dirección.");
        setLat(null);
        setLng(null);
        return;
      }

      const nuevaLat = Number(data[0].lat);
      const nuevaLng = Number(data[0].lon);

      setLat(nuevaLat);
      setLng(nuevaLng);

      setMensaje("✅ Dirección encontrada");
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error buscando la dirección.");
    } finally {
      setBuscando(false);
    }
  };

  const usarLinkUbicacion = () => {
    if (!linkUbicacion.trim()) {
      setMensaje("Pegá primero el link de ubicación.");
      return;
    }

    const patrones = [
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];

    for (const patron of patrones) {
      const match = linkUbicacion.match(patron);

      if (match) {
        const nuevaLat = Number(match[1]);
        const nuevaLng = Number(match[2]);

        setLat(nuevaLat);
        setLng(nuevaLng);

        setMensaje("✅ Ubicación del link detectada");
        return;
      }
    }

    setMensaje("❌ No pude extraer coordenadas de ese link.");
  };

  const guardarPedido = async () => {
    if (!cliente.trim()) {
      setMensaje("Ingresá el nombre del cliente.");
      return;
    }

    if (!telefono.trim()) {
      setMensaje("Ingresá el WhatsApp del cliente.");
      return;
    }

    if (lat === null || lng === null) {
      setMensaje("Primero cargá la ubicación del cliente.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    const codigo = generarCodigo();

    const { error } = await supabase
      .from("pedidos")
      .insert({
        codigo,
        cliente: cliente.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        cliente_lat: lat,
        cliente_lng: lng,
        estado: "pendiente",
      });

    if (error) {
      console.error(error);
      setMensaje("❌ No se pudo guardar el pedido");
      setGuardando(false);
      return;
    }

    setCliente("");
    setTelefono("");
    setDireccion("");
    setLinkUbicacion("");
    setLat(null);
    setLng(null);

    setMensaje(`✅ Pedido ${codigo} creado`);

    await cargarPedidos();

    setGuardando(false);
  };

  const eliminarPedido = async (id: string) => {
    const confirmar = window.confirm(
      "¿Querés eliminar este pedido?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("pedidos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      setMensaje("❌ No se pudo eliminar el pedido");
      return;
    }

    setPedidos((anteriores) =>
      anteriores.filter((pedido) => pedido.id !== id)
    );

    setMensaje("✅ Pedido eliminado");
  };

  return (
    <main className="min-h-screen p-5">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          Pedidos
        </h1>

        <p className="opacity-70 mb-6">
          Cargá los pedidos antes de salir a repartir.
        </p>

        <div className="border rounded-2xl p-5 space-y-4 mb-8">
          <h2 className="text-xl font-bold">
            ➕ Nuevo pedido
          </h2>

          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nombre del cliente"
            className="w-full border rounded-xl p-3"
          />

          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="WhatsApp"
            className="w-full border rounded-xl p-3"
          />

          <div className="border-t pt-4">
            <p className="font-semibold mb-3">
              📍 Opción 1: dirección
            </p>

            <input
              value={direccion}
              onChange={(e) => {
                setDireccion(e.target.value);
                setLat(null);
                setLng(null);
              }}
              placeholder="Ej: Av. Belgrano 1200"
              className="w-full border rounded-xl p-3"
            />

            <button
              onClick={buscarDireccion}
              disabled={buscando}
              className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold mt-3 disabled:opacity-50"
            >
              {buscando
                ? "Buscando..."
                : "🔎 Buscar dirección"}
            </button>
          </div>

          <div className="border-t pt-4">
            <p className="font-semibold mb-3">
              📲 Opción 2: ubicación de WhatsApp
            </p>

            <textarea
              value={linkUbicacion}
              onChange={(e) =>
                setLinkUbicacion(e.target.value)
              }
              placeholder="Pegá el link de ubicación"
              className="w-full border rounded-xl p-3 min-h-24"
            />

            <button
              onClick={usarLinkUbicacion}
              className="w-full bg-purple-600 text-white p-4 rounded-xl font-bold mt-3"
            >
              📍 Usar ubicación
            </button>
          </div>

          {lat !== null && lng !== null && (
            <div className="border rounded-xl p-4 space-y-4">
              <div>
                <p className="font-bold">
                  ✅ Ubicación seleccionada
                </p>

                <p className="text-sm">
                  {lat}, {lng}
                </p>
              </div>

              <MapaUbicacionCliente
                lat={lat}
                lng={lng}
              />

              <p className="text-sm opacity-70">
                Revisá que el marcador esté en el lugar correcto.
              </p>
            </div>
          )}

          <button
            onClick={guardarPedido}
            disabled={guardando}
            className="w-full bg-green-600 text-white p-4 rounded-xl font-bold disabled:opacity-50"
          >
            {guardando
              ? "Guardando..."
              : "✅ Crear pedido"}
          </button>

          {mensaje && (
            <p className="text-center">
              {mensaje}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              Pedidos pendientes
            </h2>

            <p className="text-sm opacity-70">
              {pedidos.length} pedidos
            </p>
          </div>

          <button
            onClick={cargarPedidos}
            className="border px-3 py-2 rounded-lg"
          >
            🔄
          </button>
        </div>

        {cargandoPedidos ? (
          <p>Cargando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <div className="border rounded-xl p-5 text-center">
            <p>No hay pedidos pendientes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((pedido) => (
              <div
                key={pedido.id}
                className="border rounded-xl p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg">
                      {pedido.cliente}
                    </p>

                    <p className="text-sm opacity-70">
                      {pedido.codigo}
                    </p>
                  </div>

                  <span className="text-sm">
                    🟡 Pendiente
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <p>
                    📞 {pedido.telefono}
                  </p>

                  <p>
                    📍{" "}
                    {pedido.direccion ||
                      "Ubicación compartida"}
                  </p>
                </div>

                <button
                  onClick={() =>
                    eliminarPedido(pedido.id)
                  }
                  className="mt-4 border border-red-500 text-red-500 px-3 py-2 rounded-lg text-sm"
                >
                  🗑️ Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        <a
          href="/repartidor"
          className="block w-full text-center bg-black text-white p-4 rounded-xl font-bold mt-8"
        >
          🏍️ Ir a organizar reparto
        </a>
      </div>
    </main>
  );
}