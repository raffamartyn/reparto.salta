"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/app/lib/supabase";

const MapaSeguimiento = dynamic(
  () => import("@/app/components/MapaSeguimiento"),
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
  estado: string;

  cliente_lat: number | null;
  cliente_lng: number | null;

  repartidor_lat: number | null;
  repartidor_lng: number | null;

  ultima_actualizacion: string | null;
};

export default function EntregaPage() {
  const params = useParams();
  const codigo = params.codigo as string;

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [activo, setActivo] = useState(false);
  const [cargando, setCargando] = useState(true);

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!codigo) return;

    const cargarPedido = async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id,
          codigo,
          cliente,
          telefono,
          direccion,
          estado,
          cliente_lat,
          cliente_lng,
          repartidor_lat,
          repartidor_lng,
          ultima_actualizacion
        `)
        .eq("codigo", codigo)
        .single();

      if (error) {
        console.error(error);
        setMensaje("❌ No se encontró el pedido");
        setCargando(false);
        return;
      }

      setPedido(data);
      setCargando(false);
    };

    cargarPedido();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }
    };
  }, [codigo]);

  const iniciarGPS = () => {
    if (!navigator.geolocation) {
      setMensaje(
        "❌ Tu dispositivo no permite obtener ubicación."
      );
      return;
    }

    if (activo) {
      return;
    }

    setMensaje("📍 Iniciando GPS...");

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const ahora = new Date().toISOString();

        const { error } = await supabase
          .from("pedidos")
          .update({
            repartidor_lat: lat,
            repartidor_lng: lng,
            estado: "en_camino",
            ultima_actualizacion: ahora,
          })
          .eq("codigo", codigo);

        if (error) {
          console.error(error);
          setMensaje(
            "❌ Error actualizando la ubicación"
          );
          return;
        }

        setPedido((anterior) => {
          if (!anterior) return anterior;

          return {
            ...anterior,
            repartidor_lat: lat,
            repartidor_lng: lng,
            estado: "en_camino",
            ultima_actualizacion: ahora,
          };
        });

        setMensaje(
          "✅ Compartiendo ubicación en tiempo real"
        );
      },
      (error) => {
        console.error(error);

        setMensaje(
          "❌ No se pudo obtener tu ubicación"
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;
    setActivo(true);
  };

  const detenerGPS = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    setActivo(false);

    setMensaje(
      "⏸️ Seguimiento GPS pausado"
    );
  };

  const marcarEntregado = async () => {
    detenerGPS();

    const ahora = new Date().toISOString();

    const { error } = await supabase
      .from("pedidos")
      .update({
        estado: "entregado",
        repartidor_lat: null,
        repartidor_lng: null,
        ultima_actualizacion: ahora,
      })
      .eq("codigo", codigo);

    if (error) {
      console.error(error);

      setMensaje(
        "❌ No se pudo marcar el pedido como entregado"
      );

      return;
    }

    setPedido((anterior) => {
      if (!anterior) return anterior;

      return {
        ...anterior,
        estado: "entregado",
        repartidor_lat: null,
        repartidor_lng: null,
        ultima_actualizacion: ahora,
      };
    });

    setMensaje("✅ Pedido entregado");
  };

  const enviarWhatsApp = () => {
    if (!pedido) return;

    const link =
      `${window.location.origin}` +
      `/seguimiento/${pedido.codigo}`;

    const texto =
      `🚚 Tu pedido está en camino\n\n` +
      `📍 Podés seguirlo en tiempo real acá:\n` +
      `${link}`;

    let telefono = pedido.telefono.replace(
      /\D/g,
      ""
    );

    if (
      telefono.startsWith("387") &&
      !telefono.startsWith("54")
    ) {
      telefono = `54${telefono}`;
    }

    const whatsapp =
      `https://wa.me/${telefono}` +
      `?text=${encodeURIComponent(texto)}`;

    window.open(whatsapp, "_blank");
  };

  const abrirNavegacion = () => {
    if (!pedido) return;

    if (
      pedido.cliente_lat === null ||
      pedido.cliente_lng === null
    ) {
      setMensaje(
        "❌ El pedido no tiene ubicación del cliente."
      );

      return;
    }

    const destino =
      `${pedido.cliente_lat},` +
      `${pedido.cliente_lng}`;

    const url =
      `https://www.google.com/maps/dir/` +
      `?api=1` +
      `&destination=${destino}`;

    window.open(url, "_blank");
  };

  if (cargando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Cargando entrega...</p>
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="min-h-screen flex items-center justify-center p-5">
        <p>
          {mensaje || "Pedido no encontrado"}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-5">
      <div className="max-w-xl mx-auto space-y-5">

        <div>
          <h1 className="text-3xl font-bold">
            🏍️ Entrega activa
          </h1>

          <p className="opacity-70 mt-1">
            Pedido {pedido.codigo}
          </p>
        </div>

        <div className="border rounded-2xl p-5 space-y-2">
          <p>
            <strong>Cliente:</strong>{" "}
            {pedido.cliente}
          </p>

          <p>
            <strong>WhatsApp:</strong>{" "}
            {pedido.telefono}
          </p>

          <p>
            <strong>Dirección:</strong>{" "}
            {pedido.direccion ||
              "Ubicación compartida"}
          </p>

          <p>
            <strong>Estado:</strong>{" "}
            {pedido.estado}
          </p>

          {pedido.ultima_actualizacion && (
            <p className="text-sm opacity-70">
              Última actualización:{" "}
              {new Date(
                pedido.ultima_actualizacion
              ).toLocaleString()}
            </p>
          )}
        </div>

        {pedido.repartidor_lat !== null &&
          pedido.repartidor_lng !== null &&
          pedido.cliente_lat !== null &&
          pedido.cliente_lng !== null &&
          pedido.estado !== "entregado" && (
            <div className="border rounded-2xl p-3">
              <MapaSeguimiento
                repartidorLat={
                  pedido.repartidor_lat
                }
                repartidorLng={
                  pedido.repartidor_lng
                }
                clienteLat={
                  pedido.cliente_lat
                }
                clienteLng={
                  pedido.cliente_lng
                }
              />
            </div>
          )}

        {pedido.estado !== "entregado" && (
          <div className="space-y-3">

            {!activo ? (
              <button
                onClick={iniciarGPS}
                className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold"
              >
                📍 Iniciar seguimiento GPS
              </button>
            ) : (
              <button
                onClick={detenerGPS}
                className="w-full bg-orange-600 text-white p-4 rounded-xl font-bold"
              >
                ⏸️ Pausar GPS
              </button>
            )}

            <button
              onClick={abrirNavegacion}
              className="w-full bg-purple-600 text-white p-4 rounded-xl font-bold"
            >
              🧭 Abrir navegación
            </button>

            <button
              onClick={enviarWhatsApp}
              className="w-full bg-green-600 text-white p-4 rounded-xl font-bold"
            >
              📲 Enviar seguimiento por WhatsApp
            </button>

            <button
              onClick={marcarEntregado}
              className="w-full bg-black text-white p-4 rounded-xl font-bold"
            >
              ✅ Marcar entregado
            </button>

          </div>
        )}

        {pedido.estado === "entregado" && (
          <div className="border rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">
              ✅
            </p>

            <p className="text-2xl font-bold">
              Pedido entregado
            </p>

            <p className="opacity-70 mt-2">
              La ubicación ya no se está compartiendo.
            </p>

            <a
              href="/repartidor"
              className="block mt-5 bg-black text-white p-4 rounded-xl font-bold"
            >
              🏍️ Volver a repartos
            </a>
          </div>
        )}

        {mensaje && (
          <div className="border rounded-xl p-3 text-center">
            {mensaje}
          </div>
        )}

      </div>
    </main>
  );
}