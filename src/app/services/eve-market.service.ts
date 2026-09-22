import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, timeout } from 'rxjs/operators';
import { EveItem, EveCategory, MarketPrice, PriceHistoryPoint } from '../models/eve-market.model';

@Injectable({
  providedIn: 'root'
})
export class EveMarketService {
  private readonly JITA_REGION_ID = 10000002; // The Forge
  private readonly JITA_STATION_ID = 60003760; // Jita IV - Moon 4 - Caldari Navy Assembly Plant
  private readonly PLEX_TYPE_ID = 44992;

  // Catálogo integrado con categorías y grupos de mercado clásicos de EVE Online
  private readonly MARKET_CATALOG: EveCategory[] = [
    {
      name: 'Ships (Naves)',
      icon: 'rocket-outline',
      groups: [
        {
          name: 'Frigates (Fragatas)',
          items: [
            { typeId: 587, name: 'Rifter', categoryName: 'Ships', groupName: 'Frigates', description: 'Fragata de combate Minmatar rápida y artillera.' },
            { typeId: 603, name: 'Merlin', categoryName: 'Ships', groupName: 'Frigates', description: 'Fragata Caldari con escudo reforzado y cañones híbridos.' },
            { typeId: 597, name: 'Punisher', categoryName: 'Ships', groupName: 'Frigates', description: 'Fragata blindada Amarr con láseres de energía.' },
            { typeId: 608, name: 'Atron', categoryName: 'Ships', groupName: 'Frigates', description: 'Fragata de intercepción Gallente con gran velocidad.' },
            { typeId: 32880, name: 'Astero', categoryName: 'Ships', groupName: 'Frigates', description: 'Fragata de exploración y sigilo de Sisters of EVE.' }
          ]
        },
        {
          name: 'Cruisers (Cruceros)',
          items: [
            { typeId: 626, name: 'Vexor', categoryName: 'Ships', groupName: 'Cruisers', description: 'Crucero Gallente enfocado en combate de drones pesados.' },
            { typeId: 629, name: 'Rupture', categoryName: 'Ships', groupName: 'Cruisers', description: 'Crucero artillero Minmatar versátil.' },
            { typeId: 621, name: 'Caracal', categoryName: 'Ships', groupName: 'Cruisers', description: 'Crucero lanzamisiles Caldari de largo alcance.' },
            { typeId: 624, name: 'Omen', categoryName: 'Ships', groupName: 'Cruisers', description: 'Crucero láser Amarr de alta potencia.' },
            { typeId: 12005, name: 'Ishtar', categoryName: 'Ships', groupName: 'Cruisers', description: 'HAC (Heavy Assault Cruiser) Gallente rey del ratting.' },
            { typeId: 33468, name: 'Stratios', categoryName: 'Ships', groupName: 'Cruisers', description: 'Crucero de exploración furtiva y drones de SOE.' }
          ]
        },
        {
          name: 'Battleships (Acorazados)',
          items: [
            { typeId: 645, name: 'Dominix', categoryName: 'Ships', groupName: 'Battleships', description: 'Acorazado nodriza de drones Gallente.' },
            { typeId: 641, name: 'Raven', categoryName: 'Ships', groupName: 'Battleships', description: 'Acorazado lanzamisiles torpedo y crucero Caldari.' },
            { typeId: 643, name: 'Tempest', categoryName: 'Ships', groupName: 'Battleships', description: 'Acorazado artillero Minmatar de proyectiles pesados.' },
            { typeId: 642, name: 'Apocalypse', categoryName: 'Ships', groupName: 'Battleships', description: 'Acorazado Amarr con baterías láser de largo alcance.' },
            { typeId: 17740, name: 'Vindicator', categoryName: 'Ships', groupName: 'Battleships', description: 'Acorazado de facción Serpentis con demoledor daño bláster y webs al 90%.' },
            { typeId: 17736, name: 'Nightmare', categoryName: 'Ships', groupName: 'Battleships', description: 'Acorazado Sansha de alta velocidad y láseres de pulso/rayo.' }
          ]
        },
        {
          name: 'Industrial & Mining',
          items: [
            { typeId: 17478, name: 'Retriever', categoryName: 'Ships', groupName: 'Mining Barges', description: 'Barcaza de minería con gran bodega de mineral.' },
            { typeId: 17476, name: 'Covetor', categoryName: 'Ships', groupName: 'Mining Barges', description: 'Barcaza con máxima tasa de extracción de mineral.' },
            { typeId: 22544, name: 'Hulk', categoryName: 'Ships', groupName: 'Exhumers', description: 'Exhumer de tecnología T2 de alto rendimiento minero.' },
            { typeId: 650, name: 'Badger', categoryName: 'Ships', groupName: 'Industrials', description: 'Transporte industrial estándar Caldari.' }
          ]
        }
      ]
    },
    {
      name: 'Pilots & Services (Servicios y PLEX)',
      icon: 'diamond-outline',
      groups: [
        {
          name: 'Pilot Currency & Skills',
          items: [
            { typeId: 44992, name: 'PLEX', categoryName: 'Pilots & Services', groupName: 'Currency', description: 'Pilot Extension Token universal para Omega y compras en New Eden Store.' },
            { typeId: 40519, name: 'Large Skill Injector', categoryName: 'Pilots & Services', groupName: 'Skills', description: 'Otorga hasta 500,000 skill points instantáneos a tu piloto.' },
            { typeId: 40520, name: 'Skill Extractor', categoryName: 'Pilots & Services', groupName: 'Skills', description: 'Extrae 500,000 skill points para crear un Large Skill Injector.' },
            { typeId: 45635, name: 'Daily Alpha Injector', categoryName: 'Pilots & Services', groupName: 'Skills', description: 'Inyector diario de 50,000 skill points para clones Alpha.' }
          ]
        }
      ]
    },
    {
      name: 'Ammunition & Drones (Munición y Drones)',
      icon: 'disc-outline',
      groups: [
        {
          name: 'Combat Drones',
          items: [
            { typeId: 2185, name: 'Hobgoblin II', categoryName: 'Drones', groupName: 'Light Drones', description: 'Dron ligero T2 térmico de alto daño.' },
            { typeId: 2478, name: 'Hammerhead II', categoryName: 'Drones', groupName: 'Medium Drones', description: 'Dron mediano T2 térmico balanceado.' },
            { typeId: 2446, name: 'Ogre II', categoryName: 'Drones', groupName: 'Heavy Drones', description: 'Dron pesado T2 con daño colosal para acorazados y estructuras.' },
            { typeId: 23563, name: 'Gecko', categoryName: 'Drones', groupName: 'Heavy Drones', description: 'Superdron de facción con daño omni y escudo masivo.' },
            { typeId: 28215, name: 'Gila Drone Augment', categoryName: 'Drones', groupName: 'Faction Drones', description: 'Componente y variante de facción.' }
          ]
        },
        {
          name: 'Missiles & Torpedoes',
          items: [
            { typeId: 2621, name: 'Scourge Heavy Missile', categoryName: 'Ammunition', groupName: 'Missiles', description: 'Misil cinético mediano para cruceros.' },
            { typeId: 24523, name: 'Inferno Fury Cruise Missile', categoryName: 'Ammunition', groupName: 'Cruise Missiles', description: 'Misil crucero T2 térmico para acorazados.' },
            { typeId: 2613, name: 'Caldari Navy Scourge Light Missile', categoryName: 'Ammunition', groupName: 'Faction Missiles', description: 'Misil facción de alta precisión y daño extra.' }
          ]
        },
        {
          name: 'Hybrid & Laser Charges',
          items: [
            { typeId: 230, name: 'Antimatter Charge M', categoryName: 'Ammunition', groupName: 'Hybrid Charges', description: 'Munición híbrida de daño cinético/térmico masivo a corto alcance.' },
            { typeId: 24497, name: 'Void M', categoryName: 'Ammunition', groupName: 'Advanced Blaster', description: 'Carga T2 para blasters con máximo daño por segundo.' },
            { typeId: 12620, name: 'Imperial Navy Multifrequency L', categoryName: 'Ammunition', groupName: 'Frequency Crystals', description: 'Cristal láser de facción de alta radiación EM/Térmica.' }
          ]
        }
      ]
    },
    {
      name: 'Minerals & Materials (Minerales e Industria)',
      icon: 'cube-outline',
      groups: [
        {
          name: 'Basic Minerals',
          items: [
            { typeId: 34, name: 'Tritanium', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'El mineral base más abundante e indispensable para toda la construcción naval.' },
            { typeId: 35, name: 'Pyerite', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'Mineral refinado común usado en cascos de naves.' },
            { typeId: 36, name: 'Mexallon', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'Mineral fundamental para componentes industriales.' },
            { typeId: 37, name: 'Isogen', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'Mineral esencial de baja seguridad para naves avanzadas.' },
            { typeId: 38, name: 'Nocxium', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'Mineral raro extraído de menas de espacio peligroso.' },
            { typeId: 39, name: 'Zydrine', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'Mineral de alto valor utilizado en naves T2 y Capitales.' },
            { typeId: 40, name: 'Megacyte', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'Uno de los minerales más caros y escasos de Nullsec.' }
          ]
        },
        {
          name: 'Special Materials',
          items: [
            { typeId: 28668, name: 'Nanite Repair Paste', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'Pasta de reparación nanotecnológica para reparar módulos quemados por overheat.' },
            { typeId: 11399, name: 'Morphite', categoryName: 'Manufacture & Research', groupName: 'Materials', description: 'Mineral de Mercoxit indispensable para módulos Tech 2.' }
          ]
        }
      ]
    },
    {
      name: 'Ship Equipment & Modules (Módulos)',
      icon: 'shield-outline',
      groups: [
        {
          name: 'Shield & Armor Modules',
          items: [
            { typeId: 3831, name: 'Medium Shield Booster II', categoryName: 'Ship Equipment', groupName: 'Shield Boosters', description: 'Módulo T2 de regeneración activa de escudo.' },
            { typeId: 2048, name: 'Damage Control II', categoryName: 'Ship Equipment', groupName: 'Hull Upgrades', description: 'Módulo vital que otorga resistencias a escudo, blindaje y estructura.' },
            { typeId: 4405, name: 'Large Armor Repairer II', categoryName: 'Ship Equipment', groupName: 'Armor Repairers', description: 'Reparador de blindaje pesado T2 para acorazados.' },
            { typeId: 5443, name: '100MN Afterburner II', categoryName: 'Ship Equipment', groupName: 'Propulsion', description: 'Propulsor de gran potencia sin penalización de masa.' },
            { typeId: 12058, name: '500MN Microwarpdrive II', categoryName: 'Ship Equipment', groupName: 'Propulsion', description: 'Microwarpdrive masivo para aceleración explosiva de acorazados.' }
          ]
        },
        {
          name: 'Propulsion & Warp Disruption',
          items: [
            { typeId: 527, name: 'Warp Scrambler II', categoryName: 'Ship Equipment', groupName: 'Tackle', description: 'Desactiva el motor MWD y previene el salto warp del objetivo.' },
            { typeId: 526, name: 'Warp Disruptor II', categoryName: 'Ship Equipment', groupName: 'Tackle', description: 'Apunta a larga distancia para atrapar naves enemigas.' },
            { typeId: 4383, name: 'Large Shield Extender II', categoryName: 'Ship Equipment', groupName: 'Shield Extenders', description: 'Aumenta masivamente los puntos de vida pasivos de escudo.' }
          ]
        }
      ]
    }
  ];

  private favoritesSubject = new BehaviorSubject<EveItem[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();

  private analyzerSubject = new BehaviorSubject<EveItem[]>([]);
  public analyzer$ = this.analyzerSubject.asObservable();

  private priceCache = new Map<number, { price: MarketPrice; timestamp: number }>();
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutos

  /** Usuario activo actualmente; se establece desde Tab1Page/AppComponent al hacer login */
  private currentUsername: string = '';

  constructor(private http: HttpClient) {
    // No cargamos datos en el constructor — se cargan cuando el usuario hace login
    // mediante loadUserData(username)
  }

  // ──────────────────────────────────────────────────────
  // Gestión de datos por usuario
  // ──────────────────────────────────────────────────────

  /**
   * Carga los favoritos y el analyzer del usuario que acaba de iniciar sesión.
   * Debe llamarse después de un login exitoso.
   */
  loadUserData(username: string): void {
    this.currentUsername = username.toLowerCase();
    try {
      const favKey = `eve_favorites_${this.currentUsername}`;
      const anaKey = `eve_analyzer_${this.currentUsername}`;

      const savedFavs = localStorage.getItem(favKey);
      this.favoritesSubject.next(savedFavs ? JSON.parse(savedFavs) : []);

      const savedAnalyzer = localStorage.getItem(anaKey);
      this.analyzerSubject.next(savedAnalyzer ? JSON.parse(savedAnalyzer) : []);
    } catch (e) {
      console.error('Error loading user data', e);
      this.favoritesSubject.next([]);
      this.analyzerSubject.next([]);
    }
  }

  /** Limpia el estado en memoria al cerrar sesión */
  clearUserData(): void {
    this.currentUsername = '';
    this.favoritesSubject.next([]);
    this.analyzerSubject.next([]);
    this.priceCache.clear();
  }

  // Obtener categorías completas
  getCategories(): EveCategory[] {
    return this.MARKET_CATALOG;
  }

  // Obtener todos los ítems planos
  getAllItems(): EveItem[] {
    const items: EveItem[] = [];
    for (const cat of this.MARKET_CATALOG) {
      for (const grp of cat.groups) {
        for (const it of grp.items) {
          items.push({
            ...it,
            iconUrl: this.getItemIconUrl(it.typeId)
          });
        }
      }
    }
    return items;
  }

  // URL del icono de EVE Image Server pasando por proxy CDN anti-bloqueo Fortinet (wsrv.nl)
  getItemIconUrl(typeId: number, size: number = 64): string {
    return `https://wsrv.nl/?url=https://images.evetech.net/types/${typeId}/icon?size=${size}&w=${size}`;
  }

  // URL del render 3D de naves pasando por proxy CDN anti-bloqueo
  getItemRenderUrl(typeId: number, size: number = 256): string {
    return `https://wsrv.nl/?url=https://images.evetech.net/types/${typeId}/render?size=${size}&w=${size}`;
  }

  // Búsqueda de ítems
  searchItems(query: string): EveItem[] {
    if (!query || query.trim() === '') {
      return this.getAllItems();
    }
    const clean = query.toLowerCase().trim();
    return this.getAllItems().filter(
      item =>
        item.name.toLowerCase().includes(clean) ||
        item.groupName.toLowerCase().includes(clean) ||
        item.categoryName.toLowerCase().includes(clean)
    );
  }

  private historyCache = new Map<string, { data: PriceHistoryPoint[]; timestamp: number }>();

  // Consultar cotización actual en Jita 4-4 con respuesta instantánea y timeout seguro
  getMarketPrice(typeId: number): Observable<MarketPrice> {
    const cached = this.priceCache.get(typeId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return of(cached.price);
    }

    const fallback = this.getFallbackPrice(typeId);
    const url = `https://esi.evetech.net/latest/markets/${this.JITA_REGION_ID}/orders/?datasource=tranquility&order_type=all&type_id=${typeId}`;

    return this.http.get<any[]>(url).pipe(
      timeout(1000), // Si tarda más de 1 segundo, usar precio base instantáneamente
      map(orders => {
        if (!orders || orders.length === 0) {
          return fallback;
        }

        let sellOrders = orders.filter(o => !o.is_buy_order);
        let buyOrders = orders.filter(o => o.is_buy_order);

        const jitaSellOrders = sellOrders.filter(o => o.location_id === this.JITA_STATION_ID);
        const jitaBuyOrders = buyOrders.filter(o => o.location_id === this.JITA_STATION_ID);

        const activeSell = jitaSellOrders.length > 0 ? jitaSellOrders : sellOrders;
        const activeBuy = jitaBuyOrders.length > 0 ? jitaBuyOrders : buyOrders;

        const sellPrices = activeSell.map(o => o.price);
        const buyPrices = activeBuy.map(o => o.price);

        const sellMin = sellPrices.length > 0 ? Math.min(...sellPrices) : fallback.sellMin;
        const buyMax = buyPrices.length > 0 ? Math.max(...buyPrices) : fallback.buyMax;
        const sellVolume = activeSell.reduce((acc, o) => acc + (o.volume_remain || 0), 0);
        const buyVolume = activeBuy.reduce((acc, o) => acc + (o.volume_remain || 0), 0);

        const priceData: MarketPrice = {
          typeId,
          sellMin: sellMin || buyMax,
          buyMax: buyMax || sellMin,
          sellVolume: sellVolume || 15000,
          buyVolume: buyVolume || 28000,
          averagePrice: sellMin && buyMax ? (sellMin + buyMax) / 2 : sellMin || buyMax,
          lastUpdated: new Date().toLocaleTimeString(),
          stationName: typeId === this.PLEX_TYPE_ID ? 'Regional / Hub (The Forge)' : 'Jita IV - Moon 4 (The Forge)'
        };

        this.priceCache.set(typeId, { price: priceData, timestamp: Date.now() });
        return priceData;
      }),
      catchError(() => {
        // En caso de timeout o bloqueo de red, devolver instantáneamente el precio estimado
        this.priceCache.set(typeId, { price: fallback, timestamp: Date.now() });
        return of(fallback);
      })
    );
  }

  // Precios estimados de respaldo en caso de desconexión o rate-limit
  private getFallbackPrice(typeId: number): MarketPrice {
    const defaults: Record<number, { sell: number; buy: number }> = {
      44992: { sell: 5250000, buy: 5120000 },     // PLEX
      40519: { sell: 910000000, buy: 890000000 }, // Large Skill Injector
      40520: { sell: 540000000, buy: 525000000 }, // Skill Extractor
      34: { sell: 6.85, buy: 6.62 },              // Tritanium
      35: { sell: 12.40, buy: 11.90 },            // Pyerite
      36: { sell: 52.10, buy: 49.80 },            // Mexallon
      37: { sell: 420.00, buy: 405.00 },          // Isogen
      38: { sell: 880.00, buy: 840.00 },          // Nocxium
      39: { sell: 4100.00, buy: 3950.00 },        // Zydrine
      40: { sell: 18500.00, buy: 17800.00 },      // Megacyte
      28668: { sell: 54000, buy: 51000 },         // Nanite Paste
      626: { sell: 16500000, buy: 15200000 },     // Vexor
      12005: { sell: 245000000, buy: 235000000 }, // Ishtar
      641: { sell: 310000000, buy: 295000000 },   // Raven
      645: { sell: 295000000, buy: 280000000 },   // Dominix
      17740: { sell: 850000000, buy: 810000000 }, // Vindicator
      2185: { sell: 850000, buy: 790000 },        // Hobgoblin II
      2478: { sell: 1450000, buy: 1350000 },      // Hammerhead II
      23563: { sell: 88000000, buy: 82000000 }    // Gecko
    };

    const est = defaults[typeId] || { sell: 1000000, buy: 950000 };
    return {
      typeId,
      sellMin: est.sell,
      buyMax: est.buy,
      averagePrice: (est.sell + est.buy) / 2,
      lastUpdated: new Date().toLocaleTimeString(),
      stationName: typeId === this.PLEX_TYPE_ID ? 'Regional / Hub (The Forge)' : 'Jita IV - Moon 4'
    };
  }

  // Obtener historial de precios para la gráfica del Analyzer con caché y timeout rápido
  getPriceHistory(typeId: number, days: number = 30): Observable<PriceHistoryPoint[]> {
    const cacheKey = `${typeId}_${days}`;
    const cached = this.historyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return of(cached.data);
    }

    const url = `https://esi.evetech.net/latest/markets/${this.JITA_REGION_ID}/history/?datasource=tranquility&type_id=${typeId}`;

    return this.http.get<any[]>(url).pipe(
      timeout(1200), // Si la API de ESI tarda más de 1.2s, entregar simulación histórica al instante
      map(data => {
        if (!data || data.length === 0) {
          const sim = this.generateSimulatedHistory(typeId, days);
          this.historyCache.set(cacheKey, { data: sim, timestamp: Date.now() });
          return sim;
        }
        const slice = data.slice(-days);
        const result = slice.map(item => ({
          date: item.date,
          average: item.average,
          highest: item.highest,
          lowest: item.lowest,
          volume: item.volume,
          orderCount: item.order_count
        }));
        this.historyCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }),
      catchError(() => {
        const sim = this.generateSimulatedHistory(typeId, days);
        this.historyCache.set(cacheKey, { data: sim, timestamp: Date.now() });
        return of(sim);
      })
    );
  }

  // Generar historial de simulación suave si falla la red
  private generateSimulatedHistory(typeId: number, days: number): PriceHistoryPoint[] {
    const base = this.getFallbackPrice(typeId).averagePrice || 1000000;
    const history: PriceHistoryPoint[] = [];
    let current = base * 0.95;

    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const variation = (Math.random() - 0.48) * 0.04; // pequeña fluctuación
      current = current * (1 + variation);
      const high = current * (1 + Math.random() * 0.02);
      const low = current * (1 - Math.random() * 0.02);

      history.push({
        date: dateStr,
        average: Math.round(current * 100) / 100,
        highest: Math.round(high * 100) / 100,
        lowest: Math.round(low * 100) / 100,
        volume: Math.floor(Math.random() * 50000 + 1000),
        orderCount: Math.floor(Math.random() * 300 + 20)
      });
    }
    return history;
  }

  // Métodos de Favoritos
  isFavorite(typeId: number): boolean {
    return this.favoritesSubject.getValue().some(i => i.typeId === typeId);
  }

  toggleFavorite(item: EveItem): void {
    const current = this.favoritesSubject.getValue();
    const exists = current.some(i => i.typeId === item.typeId);
    let updated: EveItem[];
    if (exists) {
      updated = current.filter(i => i.typeId !== item.typeId);
    } else {
      updated = [...current, { ...item, iconUrl: this.getItemIconUrl(item.typeId) }];
    }
    this.setFavorites(updated);
  }

  private setFavorites(items: EveItem[]): void {
    this.favoritesSubject.next(items);
    if (this.currentUsername) {
      localStorage.setItem(`eve_favorites_${this.currentUsername}`, JSON.stringify(items));
    }
  }

  // Métodos de Analyzer
  isInAnalyzer(typeId: number): boolean {
    return this.analyzerSubject.getValue().some(i => i.typeId === typeId);
  }

  toggleAnalyzer(item: EveItem): void {
    const current = this.analyzerSubject.getValue();
    const exists = current.some(i => i.typeId === item.typeId);
    let updated: EveItem[];
    if (exists) {
      updated = current.filter(i => i.typeId !== item.typeId);
    } else {
      updated = [...current, { ...item, iconUrl: this.getItemIconUrl(item.typeId) }];
    }
    this.setAnalyzer(updated);
  }

  private setAnalyzer(items: EveItem[]): void {
    this.analyzerSubject.next(items);
    if (this.currentUsername) {
      localStorage.setItem(`eve_analyzer_${this.currentUsername}`, JSON.stringify(items));
    }
  }
}
