import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonIcon,
  IonCard,
  IonSpinner,
  IonToast
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  star,
  starOutline,
  trendingUp,
  trendingUpOutline,
  chevronForwardOutline,
  rocketOutline,
  diamondOutline,
  discOutline,
  cubeOutline,
  shieldOutline,
  storefrontOutline,
  sparklesOutline,
  informationCircleOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { EveMarketService } from '../services/eve-market.service';
import { AuthService } from '../services/auth.service';
import { EveCategory, EveItem, MarketPrice } from '../models/eve-market.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    IonIcon,
    IonCard,
    IonSpinner,
    IonToast
  ]
})
export class Tab2Page implements OnInit {
  categories: EveCategory[] = [];
  searchQuery: string = '';
  searchResults: EveItem[] = [];
  selectedItem: EveItem | null = null;
  selectedPrice: MarketPrice | null = null;
  loadingPrice: boolean = false;

  toastMessage: string = '';
  showToast: boolean = false;

  constructor(
    private marketService: EveMarketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      searchOutline,
      star,
      starOutline,
      trendingUp,
      trendingUpOutline,
      chevronForwardOutline,
      rocketOutline,
      diamondOutline,
      discOutline,
      cubeOutline,
      shieldOutline,
      storefrontOutline,
      sparklesOutline,
      informationCircleOutline,
      checkmarkCircleOutline
    });
  }

  ngOnInit() {
    this.ensureUserData();
    this.categories = this.marketService.getCategories();
    // Seleccionar el primer ítem por defecto (PLEX) para visualización inicial
    const all = this.marketService.getAllItems();
    if (all.length > 0) {
      this.selectItem(all[0]);
    }
  }

  ionViewWillEnter() {
    this.ensureUserData();
  }

  private ensureUserData() {
    const user = this.authService.getUser();
    if (user?.username) {
      this.marketService.loadUserData(user.username);
    }
  }

  onSearch(event: any) {
    const val = event.target.value || '';
    this.searchQuery = val;
    if (val.trim() === '') {
      this.searchResults = [];
    } else {
      this.searchResults = this.marketService.searchItems(val);
    }
    this.cdr.detectChanges();
  }

  selectItem(item: EveItem) {
    this.selectedItem = item;
    this.selectedPrice = null;
    this.loadingPrice = true;
    this.cdr.detectChanges();

    this.marketService.getMarketPrice(item.typeId).subscribe({
      next: (price) => {
        this.selectedPrice = price;
        this.loadingPrice = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingPrice = false;
        this.cdr.detectChanges();
      }
    });
  }

  isFavorite(typeId?: number): boolean {
    if (!typeId) return false;
    return this.marketService.isFavorite(typeId);
  }

  toggleFavorite(item: EveItem) {
    this.marketService.toggleFavorite(item);
    const added = this.marketService.isFavorite(item.typeId);
    this.displayToast(
      added ? `⭐ "${item.name}" agregado a favoritos` : `"${item.name}" removido de favoritos`
    );
    this.cdr.detectChanges();
  }

  isInAnalyzer(typeId?: number): boolean {
    if (!typeId) return false;
    return this.marketService.isInAnalyzer(typeId);
  }

  toggleAnalyzer(item: EveItem) {
    this.marketService.toggleAnalyzer(item);
    const added = this.marketService.isInAnalyzer(item.typeId);
    this.displayToast(
      added ? `📈 "${item.name}" agregado al Analyzer` : `"${item.name}" removido del Analyzer`
    );
    this.cdr.detectChanges();
  }

  goToAnalyzer(item: EveItem) {
    if (!this.marketService.isInAnalyzer(item.typeId)) {
      this.marketService.toggleAnalyzer(item);
    }
    this.router.navigate(['/tabs/tab3'], { queryParams: { typeId: item.typeId } });
  }

  displayToast(msg: string) {
    this.toastMessage = msg;
    this.showToast = true;
    this.cdr.detectChanges();
  }

  formatIsk(amount?: number | null): string {
    if (amount === undefined || amount === null) return '0.00 ISK';
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(2) + ' B ISK';
    }
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + ' M ISK';
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + ' K ISK';
    }
    return amount.toFixed(2) + ' ISK';
  }
}
