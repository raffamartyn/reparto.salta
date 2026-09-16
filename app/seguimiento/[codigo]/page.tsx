"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/app/lib/supabase";

const MapaSeguimiento = dynamic(
  () => import("@/app/components/MapaSeguimiento"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[330px] flex items-center justify-center bg-gray-100 rounded-2xl text-gray-600">
        Cargando mapa...
      </div>
    ),
  }
);

// ======================================================
// 🏪 DATOS DEL LOCAL
// CAMBIAR ESTOS DATOS CUANDO TENGAMOS EL LOCAL REAL
// ======================================================

const NOMBRE_LOCAL = "Repuestos Cell";

const LOGO_LOCAL = "/logo-local.png";

const WHATSAPP_LOCAL = "5493870000000";

// Más adelante ponemos acá la web real del local
const WEB_LOCAL = "https://tusitio.com";

const PROMO_TITULO = "🔥 Oferta destacada";

const PROMO_TEXTO =
  "Consultá por promociones en repuestos y accesorios para celulares.";

const COLOR_PRINCIPAL = "#0f172a";
const COLOR_SECUNDARIO = "#22c55e";

// ======================================================

type Pedido = {
  codigo: string;
  cliente: string;
  direccion: string;

  cliente_lat: number | null;
  cliente_lng: number | null;

  repartidor_lat: number | null;
  repartidor_lng: number | null;

  estado: string;
  ultima_actualizacion: string | null;
};

export default function SeguimientoPage() {
  const params = useParams();
  const codigo = params.codigo as string;

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!codigo) return;

    const cargarPedido = async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          codigo,
          cliente,
          direccion,
          cliente_lat,
          cliente_lng,
          repartidor_lat,
          repartidor_lng,
          estado,
          ultima_actualizacion
        `)
        .eq("codigo", codigo)
        .single();

      if (error) {
        console.error(error);
        setError("No pudimos encontrar este pedido.");
        setCargando(false);
        return;
      }

      setPedido(data);
      setCargando(false);
    };

    cargarPedido();

    const canal = supabase
      .channel(`seguimiento-${codigo}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
        },
        (payload) => {
          const nuevoPedido = payload.new as Pedido;

          if (nuevoPedido.codigo === codigo) {
            setPedido((anterior) => {
              if (!anterior) return nuevoPedido;

              return {
                ...anterior,
                ...nuevoPedido,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [codigo]);

  const abrirWhatsApp = () => {
    const mensaje =
      `Hola ${NOMBRE_LOCAL}, quiero hacer una consulta ` +
      `sobre mi pedido ${codigo}.`;

    const url =
      `https://wa.me/${WHATSAPP_LOCAL}` +
      `?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank");
  };

  const abrirWeb = () => {
    window.open(WEB_LOCAL, "_blank");
  };

  if (cargando) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-900">
        <p className="font-medium">
          Cargando seguimiento...
        </p>
      </main>
    );
  }

  if (error || !pedido) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-5 text-gray-900">
        <div className="text-center">
          <div className="text-5xl mb-4">
            📦
          </div>

          <h1 className="text-2xl font-bold">
            Pedido no encontrado
          </h1>

          <p className="text-gray-500 mt-2">
            {error}
          </p>
        </div>
      </main>
    );
  }

  const entregado = pedido.estado === "entregado";
  const enCamino = pedido.estado === "en_camino";

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">

      {/* ================================================= */}
      {/* CABECERA */}
      {/* ================================================= */}

      <header
        className="text-white px-4 pt-5 pb-12 sm:pt-7"
        style={{
          backgroundColor: COLOR_PRINCIPAL,
        }}
      >
        <div className="w-full max-w-md mx-auto">

          {/* LOCAL */}

          <div className="flex items-center gap-3 mb-7">

            <div className="w-16 h-16 sm:w-18 sm:h-18 bg-white rounded-2xl overflow-hidden shadow-md flex-shrink-0">
              <img
                src={LOGO_LOCAL}
                alt={NOMBRE_LOCAL}
                className="w-full h-full object-contain p-1"
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-gray-300">
                Seguimiento de pedido
              </p>

              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                {NOMBRE_LOCAL}
              </h1>
            </div>

          </div>

          {/* ESTADO GRANDE */}

          {!entregado ? (
            <div>
              <div className="text-4xl mb-3">
                🏍️
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                Tu pedido está en camino
              </h2>

              <p className="text-gray-300 mt-2 text-sm sm:text-base">
                Seguí al repartidor en tiempo real.
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">
                ✅
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold">
                Pedido entregado
              </h2>

              <p className="text-gray-300 mt-2">
                ¡Gracias por elegirnos!
              </p>
            </div>
          )}

        </div>
      </header>

      {/* ================================================= */}
      {/* CONTENIDO */}
      {/* ================================================= */}

      <div className="w-full max-w-md mx-auto px-3 -mt-6 pb-10 space-y-4">

        {/* PEDIDO */}

        <section className="bg-white text-gray-900 rounded-2xl shadow-sm border border-gray-200 p-5">

          <div className="flex justify-between items-start gap-3">

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Pedido
              </p>

              <p className="font-bold text-xl mt-1 text-gray-900">
                {pedido.codigo}
              </p>
            </div>

            <span
              className="px-3 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap"
              style={{
                backgroundColor: entregado
                  ? "#dcfce7"
                  : enCamino
                  ? "#dcfce7"
                  : "#fef3c7",

                color: entregado
                  ? "#166534"
                  : enCamino
                  ? "#166534"
                  : "#92400e",
              }}
            >
              {entregado
                ? "✅ Entregado"
                : enCamino
                ? "🏍️ En camino"
                : "⏳ Preparando"}
            </span>

          </div>

          <div className="border-t border-gray-200 mt-4 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Cliente
            </p>

            <p className="font-semibold text-lg text-gray-900 mt-1">
              {pedido.cliente}
            </p>
          </div>

        </section>

        {/* MAPA */}

        {!entregado &&
          pedido.repartidor_lat !== null &&
          pedido.repartidor_lng !== null &&
          pedido.cliente_lat !== null &&
          pedido.cliente_lng !== null && (

            <section className="bg-white text-gray-900 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

              <div className="p-4 pb-2">
                <h3 className="font-bold text-xl text-gray-900">
                  📍 Seguimiento en vivo
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  La moto muestra dónde viene tu pedido.
                </p>
              </div>

              <div className="p-2">
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

              {pedido.ultima_actualizacion && (
                <p className="text-xs text-gray-500 px-4 pb-4">
                  Actualizado a las{" "}
                  {new Date(
                    pedido.ultima_actualizacion
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}

            </section>
          )}

        {/* TODAVÍA NO SALIÓ */}

        {!entregado &&
          (
            pedido.repartidor_lat === null ||
            pedido.repartidor_lng === null
          ) && (

            <section className="bg-white text-gray-900 border border-gray-200 rounded-2xl shadow-sm p-6 text-center">

              <div className="text-5xl">
                📦
              </div>

              <h3 className="font-bold text-xl mt-3">
                Estamos preparando tu envío
              </h3>

              <p className="text-gray-500 text-sm mt-2">
                Cuando el repartidor salga, vas a poder verlo en el mapa.
              </p>

            </section>
          )}

        {/* PROMOCIÓN */}

        <section
          className="rounded-2xl p-5 text-white shadow-sm"
          style={{
            backgroundColor: COLOR_PRINCIPAL,
          }}
        >

          <p className="text-xs uppercase tracking-wide text-gray-300">
            Mientras esperás
          </p>

          <h3 className="text-xl font-bold mt-2">
            {PROMO_TITULO}
          </h3>

          <p className="mt-2 text-sm text-gray-200 leading-relaxed">
            {PROMO_TEXTO}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">

            <button
              onClick={abrirWhatsApp}
              className="w-full min-h-12 rounded-xl font-bold text-white"
              style={{
                backgroundColor: COLOR_SECUNDARIO,
              }}
            >
              💬 WhatsApp
            </button>

            <button
              onClick={abrirWeb}
              className="w-full min-h-12 rounded-xl font-bold bg-white text-gray-900"
            >
              🛒 Ver tienda
            </button>

          </div>

        </section>

        {/* ENTREGADO */}

        {entregado && (
          <section className="bg-white text-gray-900 border border-gray-200 rounded-2xl shadow-sm p-7 text-center">

            <div className="text-5xl">
              🎉
            </div>

            <h3 className="text-2xl font-bold mt-3">
              ¡Pedido entregado!
            </h3>

            <p className="text-gray-500 mt-2 text-sm">
              La ubicación del repartidor ya no se está compartiendo.
            </p>

          </section>
        )}

        {/* FOOTER */}

        <footer className="text-center py-4">
          <img
            src={LOGO_LOCAL}
            alt={NOMBRE_LOCAL}
            className="w-12 h-12 object-contain mx-auto mb-2"
          />

          <p className="font-bold text-gray-900">
            {NOMBRE_LOCAL}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Gracias por confiar en nosotros.
          </p>
        </footer>

      </div>
    </main>
  );
}