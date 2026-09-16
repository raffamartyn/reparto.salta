"use client";

import { useState } from "react";

type Vista =
  | "pedidos"
  | "ruta"
  | "entrega";

export default function PanelPage() {
  const [vista, setVista] =
    useState<Vista>("pedidos");

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-xl mx-auto min-h-screen bg-white">

        <header className="bg-slate-950 text-white p-5">
          <p className="text-sm text-gray-400">
            Delivery
          </p>

          <h1 className="text-2xl font-bold">
            🏍️ Panel de reparto
          </h1>
        </header>

        <nav className="grid grid-cols-3 border-b sticky top-0 bg-white z-50">
          <button
            onClick={() => setVista("pedidos")}
            className={`p-4 text-sm font-bold ${
              vista === "pedidos"
                ? "bg-slate-900 text-white"
                : ""
            }`}
          >
            📦 Pedidos
          </button>

          <button
            onClick={() => setVista("ruta")}
            className={`p-4 text-sm font-bold ${
              vista === "ruta"
                ? "bg-slate-900 text-white"
                : ""
            }`}
          >
            🗺️ Ruta
          </button>

          <button
            onClick={() => setVista("entrega")}
            className={`p-4 text-sm font-bold ${
              vista === "entrega"
                ? "bg-slate-900 text-white"
                : ""
            }`}
          >
            🏍️ Actual
          </button>
        </nav>

        <div className="w-full">
          {vista === "pedidos" && (
            <iframe
              src="/admin/pedidos"
              className="w-full min-h-[85vh] border-0"
            />
          )}

          {vista === "ruta" && (
            <iframe
              src="/repartidor"
              className="w-full min-h-[85vh] border-0"
            />
          )}

          {vista === "entrega" && (
            <div className="p-5">
              <h2 className="text-2xl font-bold mb-3">
                🏍️ Entrega actual
              </h2>

              <p className="text-gray-500">
                Acá después vamos a mostrar automáticamente el pedido que esté en estado <strong>en_camino</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}