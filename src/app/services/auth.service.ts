import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost/api';

  constructor(private http: HttpClient, private router: Router) { }

  login(email: string, pass: string) {
    return this.http.post(`${this.apiUrl}/login.php`, { email, pass }).pipe(
      tap((response: any) => {
        if (response.status === 'success') {
          // Guardamos el estado de sesión y los datos del usuario
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('isAuthenticated') === 'true';
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  updateUserData(updatedFields: { fname?: string; lname?: string; email?: string }): any {
    const currentUser = this.getUser() || {};
    const newUser = { ...currentUser, ...updatedFields };
    localStorage.setItem('user', JSON.stringify(newUser));
    return newUser;
  }
}