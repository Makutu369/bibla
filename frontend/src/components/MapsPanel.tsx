import { useState, useEffect } from "react";
import * as Maps from "../../bindings/changeme/mapsservice";
import type { MapEntry } from "../types/maps";
import { Input } from "./ui/Input";
import { Search, ChevronLeft } from "lucide-react";
import ImageModal from "./ImageModal";

interface MapsPanelProps {
  onVerseClick?: (book: string, chapter: number, verse: number) => void;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function extractImageId(html: string): string | null {
  const match = html.match(/<!-- INCLUDE\(([^)]+)\) -->/);
  return match ? match[1] : null;
}

function cleanTopicName(topic: string): string {
  return topic.replace(/^#\d+\.\s*/, "");
}

export default function MapsPanel({ onVerseClick }: MapsPanelProps) {
  const [query, setQuery] = useState("");
  const [maps, setMaps] = useState<MapEntry[]>([]);
  const [selectedMap, setSelectedMap] = useState<MapEntry | null>(null);
  const [mapImage, setMapImage] = useState<string>("");
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(new Set());
  const [locations, setLocations] = useState<MapEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"maps" | "locations">("maps");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalImageSrc, setModalImageSrc] = useState("");

  useEffect(() => {
    loadAllMaps();
    loadAllLocations();
  }, []);

  const loadAllMaps = async () => {
    try {
      const allMaps = await Maps.GetAllMaps();
      setMaps(allMaps);
    } catch (err) {
      console.error("Failed to load maps:", err);
    }
  };

  const loadAllLocations = async () => {
    try {
      const allLocations = await Maps.GetLocationEntries();
      setLocations(allLocations);
    } catch (err) {
      console.error("Failed to load locations:", err);
    }
  };

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        await loadAllMaps();
        await loadAllLocations();
        return;
      }
      try {
        if (activeTab === "maps") {
          const results = await Maps.SearchMaps(query);
          setMaps(results);
        } else {
          const results = await Maps.SearchLocations(query);
          setLocations(results);
        }
      } catch (err) {
        console.error("Search failed:", err);
      }
    };
    search();
  }, [query, activeTab]);

  const handleMapClick = async (map: MapEntry) => {
    setSelectedMap(map);
    const imgId = extractImageId(map.definition);
    if (imgId) {
      const content = await Maps.GetMapImage(imgId);
      setMapImage(content);
    } else {
      setMapImage("");
    }
  };

  const openModal = (title: string, imageSrc: string) => {
    setModalTitle(title);
    setModalImageSrc(imageSrc);
    setModalOpen(true);
  };

  const toggleLocation = (index: number) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const renderVerseRef = (definition: string) => {
    if (!definition || !onVerseClick) return null;
    const verseRefRegex = /\d+\s+[A-Z][a-z]+\s+\d+:\d+(?:\s*-\s*\d+)?/g;
    const matches = definition.match(verseRefRegex);
    if (!matches) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {matches.map((ref, idx) => {
          const parts = ref.split(/\s+/);
          if (parts.length >= 3) {
            const verseRef = parts[2].split(":");
            return (
              <button
                key={idx}
                onClick={() => {
                  if (verseRef.length === 2) {
                    const chapter = parseInt(verseRef[0]);
                    const verse = parseInt(verseRef[1].split("-")[0]);
                    onVerseClick(parts[1], chapter, verse);
                  }
                }}
                className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full hover:bg-accent/20 transition-colors"
              >
                {ref}
              </button>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border px-2 pt-2">
        <button
          onClick={() => setActiveTab("maps")}
          className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
            activeTab === "maps"
              ? "bg-accent/10 text-accent border-b-2 border-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Maps
        </button>
        <button
          onClick={() => setActiveTab("locations")}
          className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
            activeTab === "locations"
              ? "bg-accent/10 text-accent border-b-2 border-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Locations ({locations.length})
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {selectedMap ? (
          <div className="space-y-3">
            <button
              onClick={() => {
                setSelectedMap(null);
                setMapImage("");
              }}
              className="flex items-center gap-1 text-accent hover:underline text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to list
            </button>
            <h3 className="font-bold text-base">{cleanTopicName(selectedMap.topic)}</h3>
            {mapImage && (
              <button
                onClick={() => openModal(cleanTopicName(selectedMap.topic), `data:image/png;base64,${mapImage}`)}
                className="rounded-lg overflow-hidden cursor-zoom-in block w-full"
              >
                <img
                  src={`data:image/png;base64,${mapImage}`}
                  alt={selectedMap.topic}
                  className="w-full h-auto hover:opacity-90 transition-opacity"
                />
              </button>
            )}
            <div className="text-sm leading-relaxed text-muted-foreground">
              {stripHtml(selectedMap.definition)}
            </div>
            {renderVerseRef(selectedMap.definition)}
          </div>
        ) : activeTab === "maps" ? (
          maps.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">No maps found</div>
          ) : (
            <div className="space-y-1.5">
              {maps.map((map, i) => (
                <button
                  key={i}
                  onClick={() => handleMapClick(map)}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent/10 transition-all"
                >
                  <span className="font-medium text-sm">{cleanTopicName(map.topic)}</span>
                </button>
              ))}
            </div>
          )
        ) : locations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">No locations found</div>
        ) : (
          <div className="space-y-1">
            {locations.map((loc, i) => (
              <div key={i}>
                <button
                  onClick={() => toggleLocation(i)}
                  className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded-lg transition-colors"
                >
                  <h3 className="font-medium text-sm">{loc.topic}</h3>
                </button>
                {expandedLocations.has(i) && (
                  <div className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed pt-1">
                    {stripHtml(loc.definition)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        imageSrc={modalImageSrc}
      />
    </div>
  );
}
