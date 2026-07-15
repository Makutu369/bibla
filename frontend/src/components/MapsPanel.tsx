import { useState, useEffect } from "react";
import * as Maps from "../../bindings/changeme/mapsservice";
import type { MapEntry } from "../types/maps";
import { Input } from "./ui/Input";
import { Map, Search, ChevronLeft, X } from "lucide-react";
import ImageModal from "./ImageModal";

interface MapsPanelProps {
  onVerseClick?: (bookNumber: number, chapter: number, verse: number) => void;
  onClose: () => void;
}

const BOOK_NAME_TO_NUM: Record<string, number> = {
  'Gen': 10, 'Exo': 20, 'Lev': 30, 'Num': 40, 'Deu': 50, 'Jos': 60, 'Jdg': 70,
  'Rth': 80, '1Sa': 90, '2Sa': 100, '1Ki': 110, '2Ki': 120, '1Ch': 130, '2Ch': 140,
  'Ezr': 150, 'Neh': 160, 'Est': 190, 'Job': 220, 'Psa': 230, 'Pro': 240, 'Ecc': 250,
  'Son': 260, 'Isa': 290, 'Jer': 300, 'Lam': 310, 'Eze': 330, 'Dan': 340, 'Hos': 350,
  'Joe': 360, 'Amo': 370, 'Oba': 380, 'Jon': 390, 'Mic': 400, 'Nah': 410, 'Hab': 420,
  'Zep': 430, 'Hag': 440, 'Zec': 450, 'Mal': 460, 'Mat': 470, 'Mar': 480, 'Luk': 490,
  'Joh': 500, 'Act': 510, 'Rom': 520, '1Co': 530, '2Co': 540, 'Gal': 550, 'Eph': 560,
  'Phi': 570, 'Col': 580, '1Th': 590, '2Th': 600, '1Ti': 610, '2Ti': 620, 'Tit': 630,
  'Phm': 640, 'Heb': 650, 'Jas': 660, '1Pe': 670, '2Pe': 680, '1Jn': 690, '2Jn': 700,
  '3Jn': 710, 'Rev': 730,
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractImageId(html: string): string | null {
  const match = html.match(/<!-- INCLUDE\(([^)]+)\) -->/);
  return match ? match[1] : null;
}

function cleanTopicName(topic: string): string {
  return topic.replace(/^#\d+\.\s*/, "");
}

export function MapsPanel({ onVerseClick, onClose }: MapsPanelProps) {
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
    } catch {}
  };

  const loadAllLocations = async () => {
    try {
      const allLocations = await Maps.GetLocationEntries();
      setLocations(allLocations);
    } catch {}
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
      } catch {}
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
      if (next.has(index)) next.delete(index);
      else next.add(index);
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
            if (parts.length < 3) return null;
            const verseRef = parts[2].split(":");
            const bn = BOOK_NAME_TO_NUM[parts[1]];
            if (bn && verseRef.length === 2) {
              const chapter = parseInt(verseRef[0]);
              const verse = parseInt(verseRef[1].split("-")[0]);
              return (
                <button
                  key={idx}
                  onClick={() => onVerseClick(bn, chapter, verse)}
                className="text-[10px] font-mono text-fg-muted hover:text-accent bg-surface/50 px-1.5 py-0.5 rounded transition-colors">
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Maps</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-1.5">
        <button
          onClick={() => setActiveTab("maps")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
            activeTab === "maps"
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-transparent text-fg-muted hover:text-fg hover:bg-surface-hover"
          }`}>
          Maps
        </button>
        <button
          onClick={() => setActiveTab("locations")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
            activeTab === "locations"
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-transparent text-fg-muted hover:text-fg hover:bg-surface-hover"
          }`}>
          Locations
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <Input
            placeholder={`Search ${activeTab}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {selectedMap ? (
          <div className="space-y-3">
            <button
              onClick={() => { setSelectedMap(null); setMapImage(""); }}
              className="flex items-center gap-1 text-xs text-accent hover:underline">
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to list
            </button>
            <h3 className="text-sm font-semibold text-fg">{cleanTopicName(selectedMap.topic)}</h3>
            {mapImage && (
              <button
                onClick={() => openModal(cleanTopicName(selectedMap.topic), `data:image/png;base64,${mapImage}`)}
                className="rounded-lg overflow-hidden cursor-zoom-in block w-full">
                <img
                  src={`data:image/png;base64,${mapImage}`}
                  alt={selectedMap.topic}
                  className="w-full h-auto hover:opacity-90 transition-opacity"
                />
              </button>
            )}
            <div className="text-xs text-fg-secondary leading-relaxed">
              {stripHtml(selectedMap.definition)}
            </div>
            {renderVerseRef(selectedMap.definition)}
          </div>
        ) : activeTab === "maps" ? (
          maps.length === 0 ? (
            <div className="text-center py-16 text-sm text-fg-muted">
              <Map className="w-7 h-7 mx-auto mb-3 opacity-20" />
              <p>No maps found</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {maps.map((map, i) => (
                <button
                  key={i}
                  onClick={() => handleMapClick(map)}
                  className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-hover transition-colors">
                  <span className="text-xs font-medium text-fg">{cleanTopicName(map.topic)}</span>
                </button>
              ))}
            </div>
          )
        ) : locations.length === 0 ? (
          <div className="text-center py-16 text-sm text-fg-muted">
            <Map className="w-7 h-7 mx-auto mb-3 opacity-20" />
            <p>No locations found</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {locations.map((loc, i) => (
              <div key={i}>
                <button
                  onClick={() => toggleLocation(i)}
                  className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-hover transition-colors">
                  <span className="text-xs font-medium text-fg">{loc.topic}</span>
                </button>
                {expandedLocations.has(i) && (
                  <div className="px-2 pb-2 text-[11px] text-fg-secondary leading-relaxed">
                    {stripHtml(loc.definition)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ImageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        imageSrc={modalImageSrc}
      />
    </div>
  );
}
