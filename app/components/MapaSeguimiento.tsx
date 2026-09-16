"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  repartidorLat: number;
  repartidorLng: number;
  clienteLat: number;
  clienteLng: number;
};

const iconoMotoGLH = L.divIcon({
  html: `
    <div class="glh-marker">
      <div class="glh-pulse"></div>
      <div class="glh-bubble">
        <span class="glh-emoji">🏍️</span>
        <span class="glh-text"></span>
      </div>
    </div>
  `,
  className: "",
  iconSize: [70, 70],
  iconAnchor: [35, 35],
  popupAnchor: [0, -25],
});

const iconoCasa = L.divIcon({
  html: `
    <div class="casa-marker">
      <div class="casa-bubble">
        <span class="casa-emoji">🏠</span>
      </div>
    </div>
  `,
  className: "",
  iconSize: [54, 54],
  iconAnchor: [27, 27],
  popupAnchor: [0, -20],
});

function AjustarMapa({
  ruta,
  repartidorLat,
  repartidorLng,
  clienteLat,
  clienteLng,
}: {
  ruta: [number, number][];
  repartidorLat: number;
  repartidorLng: number;
  clienteLat: number;
  clienteLng: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (ruta.length > 1) {
      const bounds = L.latLngBounds(ruta);
      map.fitBounds(bounds, {
        padding: [35, 35],
      });
      return;
    }

    const bounds = L.latLngBounds([
      [repartidorLat, repartidorLng],
      [clienteLat, clienteLng],
    ]);

    map.fitBounds(bounds, {
      padding: [35, 35],
    });
  }, [map, ruta, repartidorLat, repartidorLng, clienteLat, clienteLng]);

  return null;
}

export default function MapaSeguimiento({
  repartidorLat,
  repartidorLng,
  clienteLat,
  clienteLng,
}: Props) {
  const [ruta, setRuta] = useState<[number, number][]>([]);
  const [distanciaKm, setDistanciaKm] = useState<number | null>(null);
  const [duracionMin, setDuracionMin] = useState<number | null>(null);

  useEffect(() => {
    const cargarRuta = async () => {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${repartidorLng},${repartidorLat};` +
          `${clienteLng},${clienteLat}` +
          `?overview=full&geometries=geojson`;

        const respuesta = await fetch(url);
        const data = await respuesta.json();

        if (!data.routes || data.routes.length === 0) {
          return;
        }

        const primeraRuta = data.routes[0];

        const coordenadas: [number, number][] =
          primeraRuta.geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]]
          );

        setRuta(coordenadas);
        setDistanciaKm(primeraRuta.distance / 1000);
        setDuracionMin(primeraRuta.duration / 60);
      } catch (error) {
        console.error("Error cargando ruta:", error);
      }
    };

    cargarRuta();
  }, [repartidorLat, repartidorLng, clienteLat, clienteLng]);

  const posicionRepartidor: [number, number] = [
    repartidorLat,
    repartidorLng,
  ];

  const posicionCliente: [number, number] = [
    clienteLat,
    clienteLng,
  ];

  return (
    <div className="space-y-3">
      <style jsx global>{`
        .glh-marker {
          position: relative;
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .glh-pulse {
          position: absolute;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.3);
          animation: glhPulse 1.8s infinite;
          z-index: 1;
        }

        .glh-bubble {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #111827;
          color: white;
          border: 2px solid #22c55e;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
          font-weight: 700;
        }

        .glh-emoji {
          font-size: 18px;
          line-height: 1;
        }

        .glh-text {
          font-size: 12px;
          letter-spacing: 0.5px;
        }

        .casa-marker {
          width: 54px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .casa-bubble {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: white;
          border: 2px solid #2563eb;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
        }

        .casa-emoji {
          font-size: 18px;
          line-height: 1;
        }

        @keyframes glhPulse {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          70% {
            transform: scale(2);
            opacity: 0;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .leaflet-popup-content-wrapper {
          border-radius: 14px;
        }

        .leaflet-popup-content {
          font-weight: 600;
        }
      `}</style>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Distancia
          </p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {distanciaKm !== null
              ? `${distanciaKm.toFixed(2)} km`
              : "--"}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Tiempo estimado
          </p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {duracionMin !== null
              ? `${Math.ceil(duracionMin)} min`
              : "--"}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <MapContainer
          center={posicionRepartidor}
          zoom={14}
          style={{
            width: "100%",
            height: "360px",
          }}
        >
          <TileLayer
  attribution='&copy; OpenStreetMap contributors'
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

          <AjustarMapa
            ruta={ruta}
            repartidorLat={repartidorLat}
            repartidorLng={repartidorLng}
            clienteLat={clienteLat}
            clienteLng={clienteLng}
          />

          {ruta.length > 0 && (
            <>
              {/* base blanca para dar efecto de ruta prolija */}
              <Polyline
                positions={ruta}
                pathOptions={{
                  color: "#ffffff",
                  weight: 10,
                  opacity: 0.95,
                }}
              />

              {/* línea principal */}
              <Polyline
                positions={ruta}
                pathOptions={{
                  color: "#2563eb",
                  weight: 5,
                  opacity: 1,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </>
          )}

          <Marker
            position={posicionRepartidor}
            icon={iconoMotoGLH}
          >
            <Popup>🏍️ Tu pedido viene en la GLH</Popup>
          </Marker>

          <Marker
            position={posicionCliente}
            icon={iconoCasa}
          >
            <Popup>🏠 Destino del cliente</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}