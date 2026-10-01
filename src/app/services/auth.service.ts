import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { UserProfile, StoredUser } from '../models/eve-market.model';
import { EveMarketService } from './eve-market.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly ESI_IDS_URL = 'https://esi.evetech.net/latest/universe/ids/?datasource=tranquility&language=en';
  private readonly USERS_DB_KEY = 'eve_users_db';
  private readonly SESSION_KEY = 'eve_active_session';

  constructor(private http: HttpClient, private router: Router, private marketService: EveMarketService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────────────────────

  /** Hash SHA-256 de la contraseña usando Web Crypto API nativa del navegador */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Carga todos los usuarios registrados desde localStorage */
  private loadUsersDB(): StoredUser[] {
    try {
      const raw = localStorage.getItem(this.USERS_DB_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Guarda el array de usuarios en localStorage */
  private saveUsersDB(users: StoredUser[]): void {
    localStorage.setItem(this.USERS_DB_KEY, JSON.stringify(users));
  }

  /** Construye la URL del portrait usando el proxy Cloudflare (wsrv.nl) */
  private buildPortraitUrl(characterId?: number, username?: string): string {
    if (characterId && characterId > 10000) {
      return `https://wsrv.nl/?url=images.evetech.net/characters/${characterId}/portrait&w=256&h=256`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'Pilot')}&background=0284c7&color=ffffff&size=256&bold=true`;
  }

  /** Consulta a la API de ESI de EVE Online para obtener el ID real del personaje a partir de su nombre */
  getEveCharacterId(username: string): Observable<number | undefined> {
    return this.http.post<any>(this.ESI_IDS_URL, [username]).pipe(
      map(res => {
        if (res && res.characters && res.characters.length > 0) {
          return res.characters[0].id;
        }
        return undefined;
      }),
      catchError(() => of(undefined))
    );
  }

  /** Obtiene datos de Corporación, Alianza y Security Status desde la API de ESI */
  fetchCharacterDetails(characterId: number): Observable<{
    corporation?: string;
    corporationId?: number;
    corporationLogoUrl?: string;
    alliance?: string;
    allianceId?: number;
    allianceLogoUrl?: string;
    securityStatus?: number;
  }> {
    return this.http.get<any>(`https://esi.evetech.net/latest/characters/${characterId}/?datasource=tranquility`).pipe(
      switchMap(charInfo => {
        const secStatus = charInfo.security_status !== undefined ? Number(charInfo.security_status.toFixed(1)) : 5.0;
        const corpId = charInfo.corporation_id;
        const allianceId = charInfo.alliance_id;

        const corp$ = corpId
          ? this.http.get<any>(`https://esi.evetech.net/latest/corporations/${corpId}/?datasource=tranquility`).pipe(
              map(c => ({ name: c.name as string, id: corpId })),
              catchError(() => of(undefined))
            )
          : of(undefined);

        const alliance$ = allianceId
          ? this.http.get<any>(`https://esi.evetech.net/latest/alliances/${allianceId}/?datasource=tranquility`).pipe(
              map(a => ({ name: a.name as string, id: allianceId })),
              catchError(() => of(undefined))
            )
          : of(undefined);

        return forkJoin([corp$, alliance$]).pipe(
          map(([corp, alliance]) => {
            return {
              securityStatus: secStatus,
              corporation: corp?.name,
              corporationId: corp?.id,
              corporationLogoUrl: corp?.id ? `https://wsrv.nl/?url=images.evetech.net/corporations/${corp.id}/logo&w=64&h=64` : undefined,
              alliance: alliance?.name,
              allianceId: alliance?.id,
              allianceLogoUrl: alliance?.id ? `https://wsrv.nl/?url=images.evetech.net/alliances/${alliance.id}/logo&w=64&h=64` : undefined,
            };
          })
        );
      }),
      catchError(() => of({}))
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTRO
  // ─────────────────────────────────────────────────────────────────────────────

  // o tu IP local para probar en XAMPP (ej: http://192.168.1.15/api-backend)
  get API_URL(): string {
    const ip = this.getServerIp();
    return `http://${ip}/api`;
  }

  getServerIp(): string {
    return localStorage.getItem('server_ip') || 'localhost';
  }

  setServerIp(ip: string): void {
    if (ip) {
      localStorage.setItem('server_ip', ip);
    } else {
      localStorage.removeItem('server_ip');
    }
  }


  /**
   * Registra un nuevo usuario en la base de datos PHP:
   */
  register(username: string, password: string): Observable<{ success: boolean; message: string }> {
    const trimmedUser = username.trim();

    if (!trimmedUser || !password) {
      return of({ success: false, message: 'Usuario y contraseña son requeridos.' });
    }

    if (password.length < 4) {
      return of({ success: false, message: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    // Enviamos directamente el nombre de piloto y contraseña al backend
    const payload = { username: trimmedUser, password: password };

    return this.http.post<any>(`${this.API_URL}/register.php`, payload).pipe(
      map(res => {
        if (res.status === 'success') {
          return { success: true, message: `¡Piloto ${trimmedUser} registrado correctamente en la base de datos!` };
        }
        return { success: false, message: res.message || 'Error al registrar.' };
      }),
      catchError(err => {
        console.error('Error en registro PHP:', err);
        return of({ success: false, message: 'Error de conexión con el servidor de la base de datos.' });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Inicia sesión verificando en la base de datos PHP.
   */
  login(username: string, password: string): Observable<{ success: boolean; user?: UserProfile; message?: string }> {
    const trimmedUser = username.trim();

    if (!trimmedUser || !password) {
      return of({ success: false, message: 'Por favor ingresa tu nombre de piloto y contraseña.' });
    }

    const payload = { username: trimmedUser, password: password };

    return this.http.post<any>(`${this.API_URL}/login.php`, payload).pipe(
      switchMap(res => {
        if (res.status === 'success' && res.user) {
          return this.getEveCharacterId(trimmedUser).pipe(
            switchMap(charId => {
              if (charId) {
                return this.fetchCharacterDetails(charId).pipe(
                  map(details => {
                    const userProfile: UserProfile = {
                      username: res.user.username || trimmedUser,
                      characterId: charId,
                      portraitUrl: this.buildPortraitUrl(charId, trimmedUser),
                      corporation: details.corporation,
                      corporationId: details.corporationId,
                      corporationLogoUrl: details.corporationLogoUrl,
                      alliance: details.alliance,
                      allianceId: details.allianceId,
                      allianceLogoUrl: details.allianceLogoUrl,
                      securityStatus: details.securityStatus ?? 5.0
                    };
                    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(userProfile));
                    return { success: true, user: userProfile, message: 'Login exitoso.' };
                  })
                );
              } else {
                const userProfile: UserProfile = {
                  username: res.user.username || trimmedUser,
                  portraitUrl: this.buildPortraitUrl(undefined, trimmedUser),
                  corporation: 'Piloto Independiente',
                  securityStatus: 5.0
                };
                sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(userProfile));
                return of({ success: true, user: userProfile, message: 'Login exitoso.' });
              }
            })
          );
        }
        return of({ success: false, message: res.message || 'Credenciales incorrectas.' });
      }),
      catchError(err => {
        console.error('Error en login PHP:', err);
        return of({ success: false, message: 'Error de conexión con el servidor de la base de datos.' });
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SESIÓN
  // ─────────────────────────────────────────────────────────────────────────────

  /** Cierra sesión: elimina la sesión y limpia datos del usuario */
  logout(): void {
    // obtener nombre de usuario actual para limpiar datos locales
    const username = this.getCurrentUsername();
    // eliminar sesión del storage
    sessionStorage.removeItem(this.SESSION_KEY);
    // limpiar favoritos y analyzer del usuario actual en localStorage
    if (username) {
      localStorage.removeItem(`eve_favorites_${username}`);
      localStorage.removeItem(`eve_analyzer_${username}`);
    }
    // resetear estado interno del market service
    this.marketService.clearUserData();
    // redirigir a login
    this.router.navigate(['/login']);
  }

  /** Verifica si hay una sesión activa (solo en sessionStorage) */
  isLoggedIn(): boolean {
    return !!sessionStorage.getItem(this.SESSION_KEY);
  }

  /** Obtiene el perfil del usuario de la sesión activa */
  getUser(): UserProfile | null {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      if (!raw) return null;
      const user: UserProfile = JSON.parse(raw);
      if (user.characterId && user.characterId <= 10000) {
        delete user.characterId;
      }
      user.portraitUrl = this.buildPortraitUrl(user.characterId, user.username);
      return user;
    } catch {
      return null;
    }
  }

  /** Retorna el nombre de usuario de la sesión activa (para claves de datos) */
  getCurrentUsername(): string {
    const user = this.getUser();
    return user ? user.username.toLowerCase() : '';
  }

  /** Retorna todos los usuarios registrados (sin contraseñas) */
  getRegisteredUsers(): { username: string; registeredAt: string }[] {
    return this.loadUsersDB().map(u => ({
      username: u.username,
      registeredAt: u.registeredAt
    }));
  }
}