"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type Pedido = {
  id: string;
  codigo: string;
  cliente: string;
  telefono: string;
  direccion: string;
  cliente_lat: number | null;
  cliente_lng: number | null;
  repartidor_lat: number | null;
  repartidor_lng: number | null;
  estado: string;
};

type PedidoConDistancia = Pedido & {
  distanciaKm: number;
};

function calcularDistancia(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}

export default function RepartidorPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosOrdenados, setPedidosOrdenados] =
    useState<PedidoConDistancia[]>([]);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [organizando, setOrganizando] = useState(false);

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    setCargando(true);
    setMensaje("");

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
        repartidor_lat,
        repartidor_lng,
        estado
      `)
      .in("estado", ["pendiente", "en_camino"]);

    if (error) {
      console.error(error);
      setMensaje("❌ Error cargando pedidos");
      setCargando(false);
      return;
    }

    setPedidos(data ?? []);
    setCargando(false);
  };

  const entregaActual = useMemo(() => {
    return (
      pedidos.find(
        (pedido) => pedido.estado === "en_camino"
      ) ?? null
    );
  }, [pedidos]);

  const pendientes = useMemo(() => {
    return pedidos.filter(
      (pedido) => pedido.estado === "pendiente"
    );
  }, [pedidos]);

  const obtenerMiUbicacion = () => {
    if (!navigator.geolocation) {
      setMensaje(
        "❌ Tu dispositivo no permite obtener ubicación."
      );
      return;
    }

    setOrganizando(true);
    setMensaje("📍 Obteniendo ubicación actual...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nuevaLat =
          position.coords.latitude;

        const nuevaLng =
          position.coords.longitude;

        setLat(nuevaLat);
        setLng(nuevaLng);

        ordenarPedidos(
          nuevaLat,
          nuevaLng,
          pendientes
        );

        setMensaje("✅ Ruta organizada");
        setOrganizando(false);
      },
      (error) => {
        console.error(error);

        setMensaje(
          "❌ No se pudo obtener tu ubicación."
        );

        setOrganizando(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  };

  const ordenarPedidos = (
    repartidorLat: number,
    repartidorLng: number,
    lista: Pedido[]
  ) => {
    const pendientesValidos = lista
      .filter(
        (pedido) =>
          pedido.cliente_lat !== null &&
          pedido.cliente_lng !== null
      )
      .map((pedido) => ({
        ...pedido,
        distanciaKm: 0,
      }));

    const ordenados: PedidoConDistancia[] = [];

    let latActual = repartidorLat;
    let lngActual = repartidorLng;

    while (pendientesValidos.length > 0) {
      let indiceMasCercano = 0;
      let menorDistancia = Infinity;

      pendientesValidos.forEach(
        (pedido, index) => {
          const distancia = calcularDistancia(
            latActual,
            lngActual,
            pedido.cliente_lat!,
            pedido.cliente_lng!
          );

          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            indiceMasCercano = index;
          }
        }
      );

      const siguiente =
        pendientesValidos[indiceMasCercano];

      ordenados.push({
        ...siguiente,
        distanciaKm: menorDistancia,
      });

      latActual = siguiente.cliente_lat!;
      lngActual = siguiente.cliente_lng!;

      pendientesValidos.splice(
        indiceMasCercano,
        1
      );
    }

    setPedidosOrdenados(ordenados);
  };

  const iniciarEntrega = async (
    pedido: PedidoConDistancia
  ) => {
    if (entregaActual) {
      setMensaje(
        "⚠️ Ya tenés una entrega activa. Primero completala."
      );
      return;
    }

    if (
      pedido.cliente_lat === null ||
      pedido.cliente_lng === null
    ) {
      setMensaje(
        "❌ Ese pedido no tiene ubicación válida."
      );
      return;
    }

    if (!navigator.geolocation) {
      setMensaje(
        "❌ Tu dispositivo no permite usar ubicación."
      );
      return;
    }

    setMensaje(
      `📍 Iniciando entrega de ${pedido.cliente}...`
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nuevaLat =
          position.coords.latitude;

        const nuevaLng =
          position.coords.longitude;

        const { error } = await supabase
          .from("pedidos")
          .update({
            estado: "en_camino",
            repartidor_lat: nuevaLat,
            repartidor_lng: nuevaLng,
            ultima_actualizacion:
              new Date().toISOString(),
          })
          .eq("id", pedido.id);

        if (error) {
          console.error(error);

          setMensaje(
            "❌ No se pudo iniciar la entrega"
          );

          return;
        }

        window.location.href =
          `/repartidor/${pedido.codigo}`;
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
  };

  const distanciaTotal = useMemo(() => {
    return pedidosOrdenados.reduce(
      (total, pedido) =>
        total + pedido.distanciaKm,
      0
    );
  }, [pedidosOrdenados]);

  return (
    <main className="min-h-screen p-5">
      <div className="max-w-xl mx-auto space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              🏍️ Repartos
            </h1>

            <p className="opacity-70 mt-1">
              {pendientes.length} pedidos pendientes
            </p>
          </div>

          <button
            onClick={cargarPedidos}
            className="border px-3 py-2 rounded-xl"
          >
            🔄
          </button>
        </div>

        {mensaje && (
          <div className="border rounded-xl p-3 text-center">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <p>Cargando pedidos...</p>
        ) : (
          <>
            {entregaActual && (
              <section className="border-2 rounded-2xl p-5">
                <p className="text-sm font-semibold opacity-70">
                  🚚 ENTREGA ACTUAL
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  {entregaActual.cliente}
                </h2>

                <p className="mt-2">
                  📍{" "}
                  {entregaActual.direccion ||
                    "Ubicación compartida"}
                </p>

                <p className="text-sm opacity-70 mt-1">
                  {entregaActual.codigo}
                </p>

                <a
                  href={`/repartidor/${entregaActual.codigo}`}
                  className="block text-center bg-green-600 text-white p-4 rounded-xl font-bold mt-4"
                >
                  ▶️ Continuar entrega
                </a>
              </section>
            )}

            {!entregaActual && (
              <section className="border rounded-2xl p-5">
                <h2 className="text-xl font-bold">
                  📍 Organizar ruta
                </h2>

                <p className="text-sm opacity-70 mt-1 mb-4">
                  Usa tu ubicación actual para ordenar
                  las próximas entregas.
                </p>

                <button
                  onClick={obtenerMiUbicacion}
                  disabled={
                    organizando ||
                    pendientes.length === 0
                  }
                  className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold disabled:opacity-50"
                >
                  {organizando
                    ? "Organizando..."
                    : "📍 Organizar ruta"}
                </button>

                {lat !== null &&
                  lng !== null && (
                    <p className="text-xs opacity-60 mt-3">
                      Ubicación actual:{" "}
                      {lat.toFixed(5)},{" "}
                      {lng.toFixed(5)}
                    </p>
                  )}
              </section>
            )}

            {pedidosOrdenados.length > 0 && (
              <section className="border rounded-2xl p-5">
                <div className="flex justify-between items-end gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Ruta preparada
                    </h2>

                    <p className="text-sm opacity-70">
                      {pedidosOrdenados.length} paradas
                    </p>
                  </div>

                  <p className="font-bold">
                    ≈ {distanciaTotal.toFixed(2)} km
                  </p>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-bold mb-4">
                📦 Siguientes paradas
              </h2>

              {pendientes.length === 0 ? (
                <div className="border rounded-xl p-5 text-center">
                  <p>
                    🎉 No quedan pedidos pendientes.
                  </p>
                </div>
              ) : pedidosOrdenados.length === 0 ? (
                <div className="border rounded-xl p-5 text-center">
                  <p>
                    Tocá “Organizar ruta” para ordenar
                    los pedidos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pedidosOrdenados.map(
                    (pedido, index) => (
                      <div
                        key={pedido.id}
                        className="border rounded-2xl p-5"
                      >
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-full border flex items-center justify-center font-bold text-lg shrink-0">
                            {index + 1}
                          </div>

                          <div className="flex-1">
                            <p className="font-bold text-lg">
                              {pedido.cliente}
                            </p>

                            <p className="text-sm opacity-70">
                              {pedido.codigo}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <p>
                            📍{" "}
                            {pedido.direccion ||
                              "Ubicación compartida"}
                          </p>

                          <p>
                            📞 {pedido.telefono}
                          </p>

                          <p className="font-semibold">
                            📏 Desde la parada anterior:{" "}
                            {pedido.distanciaKm.toFixed(
                              2
                            )}{" "}
                            km
                          </p>
                        </div>

                        {!entregaActual &&
                          index === 0 && (
                            <button
                              onClick={() =>
                                iniciarEntrega(
                                  pedido
                                )
                              }
                              className="w-full bg-green-600 text-white p-4 rounded-xl font-bold mt-4"
                            >
                              🏍️ Iniciar esta entrega
                            </button>
                          )}

                        {index > 0 && (
                          <p className="text-sm opacity-60 mt-4">
                            Próxima parada #{index + 1}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            <a
              href="/admin/pedidos"
              className="block w-full text-center border p-4 rounded-xl font-bold"
            >
              ➕ Administrar pedidos
            </a>
          </>
        )}
      </div>
    </main>
  );
}