import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { UserProfile, StoredUser } from '../models/eve-market.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly ESI_IDS_URL = 'https://esi.evetech.net/latest/universe/ids/?datasource=tranquility&language=en';
  private readonly USERS_DB_KEY = 'eve_users_db';
  private readonly SESSION_KEY = 'eve_active_session';

  constructor(private http: HttpClient, private router: Router) {}

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
    if (characterId) {
      return `https://wsrv.nl/?url=images.evetech.net/characters/${characterId}/portrait&w=256&h=256`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'Pilot')}&background=0284c7&color=ffffff&size=256&bold=true`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTRO
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Registra un nuevo usuario:
   * 1. Verifica que el nombre de usuario no esté tomado.
   * 2. Resuelve el personaje en EVE ESI (opcional, si existe en el juego).
   * 3. Guarda en localStorage con contraseña hasheada.
   */
  register(username: string, password: string): Observable<{ success: boolean; message: string }> {
    const trimmedUser = username.trim();

    if (!trimmedUser || !password) {
      return of({ success: false, message: 'Usuario y contraseña son requeridos.' });
    }

    if (password.length < 4) {
      return of({ success: false, message: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    const users = this.loadUsersDB();
    const exists = users.some(u => u.username.toLowerCase() === trimmedUser.toLowerCase());
    if (exists) {
      return of({ success: false, message: `El nombre de piloto "${trimmedUser}" ya está registrado.` });
    }

    return this.http.post<any>(this.ESI_IDS_URL, [trimmedUser]).pipe(
      switchMap(async res => {
        let characterId: number | undefined;
        let charName = trimmedUser;

        if (res && res.characters && res.characters.length > 0) {
          characterId = res.characters[0].id;
          charName = res.characters[0].name;
        }

        const passwordHash = await this.hashPassword(password);
        const portraitUrl = this.buildPortraitUrl(characterId, charName);

        const newUser: StoredUser = {
          username: charName,
          passwordHash,
          characterId,
          portraitUrl,
          corporation: characterId ? 'Corporación Galáctica EVE' : 'Piloto Independiente',
          registeredAt: new Date().toISOString()
        };

        const allUsers = this.loadUsersDB();
        allUsers.push(newUser);
        this.saveUsersDB(allUsers);

        return { success: true, message: `¡Piloto ${charName} registrado correctamente! Ya puedes iniciar sesión.` };
      }),
      catchError(err => {
        console.warn('ESI lookup failed during register, continuing without characterId', err);
        return from(this.hashPassword(password)).pipe(
          map(passwordHash => {
            const portraitUrl = this.buildPortraitUrl(undefined, trimmedUser);
            const newUser: StoredUser = {
              username: trimmedUser,
              passwordHash,
              portraitUrl,
              corporation: 'Piloto Independiente',
              registeredAt: new Date().toISOString()
            };
            const allUsers = this.loadUsersDB();
            allUsers.push(newUser);
            this.saveUsersDB(allUsers);
            return { success: true, message: `¡Piloto ${trimmedUser} registrado! (Sin verificación ESI).` };
          })
        );
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Inicia sesión verificando el hash de contraseña.
   * La sesión se guarda en sessionStorage (se borra automáticamente al cerrar la app/pestaña).
   */
  login(username: string, password: string): Observable<{ success: boolean; user?: UserProfile; message?: string }> {
    const trimmedUser = username.trim();

    if (!trimmedUser || !password) {
      return of({ success: false, message: 'Por favor ingresa tu nombre de piloto y contraseña.' });
    }

    const users = this.loadUsersDB();
    const storedUser = users.find(u => u.username.toLowerCase() === trimmedUser.toLowerCase());

    if (!storedUser) {
      return of({ success: false, message: `El piloto "${trimmedUser}" no está registrado. ¿Deseas registrarte?` });
    }

    return from(this.hashPassword(password)).pipe(
      map(hash => {
        if (hash !== storedUser.passwordHash) {
          return { success: false, message: 'Contraseña incorrecta.' };
        }

        const userProfile: UserProfile = {
          username: storedUser.username,
          characterId: storedUser.characterId,
          portraitUrl: storedUser.portraitUrl,
          corporation: storedUser.corporation,
          securityStatus: 5.0
        };

        // Guardar en sessionStorage — se borra automáticamente al cerrar la app
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(userProfile));

        return { success: true, user: userProfile };
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SESIÓN
  // ─────────────────────────────────────────────────────────────────────────────

  /** Cierra sesión: borra sessionStorage pero NO los datos de usuarios ni favoritos */
  logout(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
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
      // Sanear portrait URL por si hay sesiones viejas con URL bloqueada
      if (user.characterId) {
        user.portraitUrl = this.buildPortraitUrl(user.characterId, user.username);
      }
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