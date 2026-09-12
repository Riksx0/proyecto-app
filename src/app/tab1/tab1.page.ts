import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personCircle, mail, person, camera, logOut } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel
  ]
})
export class Tab1Page implements OnInit {
  user: any = null;
  displayName: string = '';
  username: string = '';

  constructor(private authService: AuthService, private router: Router) {
    addIcons({ personCircle, mail, person, camera, logOut });
  }

  ngOnInit() {
    this.loadUserData();
  }

  ionViewWillEnter() {
    this.loadUserData();
  }

  loadUserData() {
    this.user = this.authService.getUser();

    if (this.user) {
      // Si existe email, usamos la parte previa al @ como nombre de usuario por defecto
      this.username = this.user.email ? this.user.email.split('@')[0] : 'usuario';

      const fname = (this.user.fname || '').trim();
      const rawLname = (this.user.lname || '').trim();
      // Primer apellido si tiene varios
      const firstLname = rawLname ? rawLname.split(/\s+/)[0] : '';

      // Si fname existe en la base de datos, mostramos: nombre y primer apellido
      if (fname) {
        this.displayName = firstLname ? `${fname} ${firstLname}` : fname;
      } else {
        // De lo contrario, se muestra su nombre de usuario / correo
        this.displayName = this.username;
      }
    } else {
      this.displayName = 'Invitado';
      this.username = '';
    }
  }

  goToGallery() {
    this.router.navigate(['/tabs/tab2']);
  }

  logout() {
    this.authService.logout();
  }
}