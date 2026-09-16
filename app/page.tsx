"use client";

import { useState } from "react";

export default function Home() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setMensaje("Tu navegador no permite obtener ubicación.");
      return;
    }

    setMensaje("Obteniendo ubicación...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setMensaje("✅ Ubicación obtenida");
      },
      (error) => {
        console.error(error);
        setMensaje("❌ No se pudo obtener la ubicación");
      }
    );
  };

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-6">
        Mi ubicación
      </h1>

      <button
        onClick={obtenerUbicacion}
        className="bg-blue-600 text-white px-5 py-3 rounded-lg"
      >
        📍 Obtener mi ubicación
      </button>

      <p className="mt-4">{mensaje}</p>

      {lat !== null && lng !== null && (
        <div className="mt-6 border rounded-xl p-4">
          <p>
            <strong>Latitud:</strong> {lat}
          </p>

          <p>
            <strong>Longitud:</strong> {lng}
          </p>
        </div>
      )}
    </main>
  );
}