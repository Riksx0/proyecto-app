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

  // ⚠️ IMPORTANTE: Cambia esta URL por la que te dio Railway (ej: https://tu-app.up.railway.app/api-backend)
  // o tu IP local para probar en XAMPP (ej: http://192.168.1.15/api-backend)
  private readonly API_URL = 'http://localhost/api';

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
      map(res => {
        if (res.status === 'success' && res.user) {
          const userProfile: UserProfile = {
            username: res.user.username || trimmedUser,
            characterId: res.user.id,
            portraitUrl: this.buildPortraitUrl(undefined, trimmedUser),
            corporation: 'Piloto Independiente',
            securityStatus: 5.0
          };
          
          // Guardar sesión localmente (solo la sesión, no la base de datos de usuarios)
          sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(userProfile));
          return { success: true, user: userProfile, message: 'Login exitoso.' };
        }
        return { success: false, message: res.message || 'Credenciales incorrectas.' };
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