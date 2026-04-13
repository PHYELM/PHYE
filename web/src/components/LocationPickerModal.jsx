import React, { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import {
  TbMapPin,
  TbSearch,
  TbX,
  TbCheck,
  TbCurrentLocation,
} from "react-icons/tb";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "./LocationPickerModal.css";

const redMarkerIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToLocation({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView(position, 16, { animate: true });
  }, [map, position]);

  return null;
}

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return null;
}

function guessCity(address = {}) {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    ""
  );
}

export default function LocationPickerModal({
  open,
  initialQuery = "",
  initialLat = null,
  initialLng = null,
  onClose,
  onConfirm,
}) {
  const defaultCenter = useMemo(() => {
    if (initialLat && initialLng) return [Number(initialLat), Number(initialLng)];
    return [25.7905, -108.9923];
  }, [initialLat, initialLng]);

  const [query, setQuery] = useState(initialQuery || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [picked, setPicked] = useState(() => {
    if (initialLat && initialLng) {
      return {
        lat: Number(initialLat),
        lng: Number(initialLng),
        label: initialQuery || "",
        city: "",
      };
    }
    return null;
  });

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery || "");
    if (initialLat && initialLng) {
      setPicked({
        lat: Number(initialLat),
        lng: Number(initialLng),
        label: initialQuery || "",
        city: "",
      });
    } else {
      setPicked(null);
    }
    setResults([]);
  }, [open, initialQuery, initialLat, initialLng]);

  async function handleSearch() {
    const clean = String(query || "").trim();
    if (!clean) return;

    setLoading(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: clean,
          format: "jsonv2",
          addressdetails: "1",
          limit: "8",
          countrycodes: "mx",
        }).toString();

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handlePickFromResult(item) {
    setPicked({
      lat: Number(item.lat),
      lng: Number(item.lon),
      label: item.display_name || "",
      city: guessCity(item.address),
    });
  }

  function handleMapPick(coords) {
    setPicked((prev) => ({
      lat: coords.lat,
      lng: coords.lng,
      label: prev?.label || query || "",
      city: prev?.city || "",
    }));
  }

  function handleConfirm() {
    if (!picked?.lat || !picked?.lng) return;

    onConfirm?.({
      location: picked.label || query || "",
      city: picked.city || "",
      lat: picked.lat,
      lng: picked.lng,
    });
  }

  if (!open) return null;

  return (
    <div className="lpmBack" onMouseDown={onClose}>
      <div className="lpmModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lpmTop">
          <div className="lpmTitle">
            <TbMapPin />
            Seleccionar ubicación
          </div>

          <button
            type="button"
            className="lpmIconBtn"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <TbX />
          </button>
        </div>

        <div className="lpmBody">
          <div className="lpmSidebar">
            <div className="lpmSearchBox">
              <div className="lpmSearchInputWrap">
                <TbSearch />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar dirección, colonia, calle..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                className="lpmBtn lpmBtnPrimary"
                onClick={handleSearch}
              >
                Buscar
              </button>
            </div>

            <div className="lpmPickedCard">
              <div className="lpmPickedTitle">
                <TbCurrentLocation />
                Ubicación seleccionada
              </div>

              <div className="lpmPickedText">
                {picked?.label || "Todavía no has seleccionado una ubicación"}
              </div>

              {picked?.lat && picked?.lng && (
                <div className="lpmCoords">
                  Lat: {picked.lat.toFixed(6)} · Lng: {picked.lng.toFixed(6)}
                </div>
              )}
            </div>

            <div className="lpmResults">
              {loading ? (
                <div className="lpmState">Buscando ubicaciones...</div>
              ) : results.length === 0 ? (
                <div className="lpmState">
                  Busca una dirección o da clic directamente en el mapa.
                </div>
              ) : (
                results.map((item, idx) => (
                  <button
                    key={`${item.place_id}-${idx}`}
                    type="button"
                    className="lpmResult"
                    onClick={() => handlePickFromResult(item)}
                  >
                    <div className="lpmResultTitle">{item.display_name}</div>
                    <div className="lpmResultMeta">
                      {Number(item.lat).toFixed(5)}, {Number(item.lon).toFixed(5)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lpmMapWrap">
            <MapContainer
              center={defaultCenter}
              zoom={13}
              className="lpmMap"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <ClickToPick onPick={handleMapPick} />

              {picked?.lat && picked?.lng && (
                <>
                  <Marker
                    position={[picked.lat, picked.lng]}
                    icon={redMarkerIcon}
                  />
                  <FlyToLocation position={[picked.lat, picked.lng]} />
                </>
              )}
            </MapContainer>
          </div>
        </div>

        <div className="lpmActions">
          <button type="button" className="lpmBtn lpmBtnGhost" onClick={onClose}>
            Cerrar
          </button>

          <button
            type="button"
            className="lpmBtn lpmBtnPrimary"
            onClick={handleConfirm}
            disabled={!picked?.lat || !picked?.lng}
          >
            <TbCheck />
            Usar esta ubicación
          </button>
        </div>
      </div>
    </div>
  );
}