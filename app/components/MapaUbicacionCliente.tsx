"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  lat: number;
  lng: number;
};

const iconoCasa = L.divIcon({
  html: `
    <div style="
      font-size: 30px;
      line-height: 30px;
    ">
      🏠
    </div>
  `,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function CentrarMapa({ lat, lng }: Props) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], 17);
  }, [map, lat, lng]);

  return null;
}

export default function MapaUbicacionCliente({
  lat,
  lng,
}: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      style={{
        width: "100%",
        height: "260px",
        borderRadius: "16px",
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CentrarMapa lat={lat} lng={lng} />

      <Marker
        position={[lat, lng]}
        icon={iconoCasa}
      >
        <Popup>
          🏠 Ubicación del cliente
        </Popup>
      </Marker>
    </MapContainer>
  );
}