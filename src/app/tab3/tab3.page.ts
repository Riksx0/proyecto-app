import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonButton,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  trendingDownOutline,
  removeOutline,
  analyticsOutline,
  cartOutline,
  trashOutline,
  arrowUpOutline,
  arrowDownOutline,
  calendarOutline,
  statsChartOutline,
  shieldCheckmarkOutline,
  star,
  starOutline
} from 'ionicons/icons';
import { EveMarketService } from '../services/eve-market.service';
import { AuthService } from '../services/auth.service';
import { EveItem, PriceHistoryPoint } from '../models/eve-market.model';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonLabel
  ]
})
export class Tab3Page implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendCanvas') trendCanvas!: ElementRef<HTMLCanvasElement>;

  analyzerItems: EveItem[] = [];
  selectedItem: EveItem | null = null;
  historyData: PriceHistoryPoint[] = [];
  timeframeDays: number = 30;
  loadingChart: boolean = false;

  // Métricas de análisis
  priceChangePercent: number = 0;
  currentAveragePrice: number = 0;
  highestPeriodPrice: number = 0;
  lowestPeriodPrice: number = 0;
  trendVerdict: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  trendMessage: string = '';

  private chartInstance: Chart | null = null;
  private sub = new Subscription();

  constructor(
    private marketService: EveMarketService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      trendingUpOutline,
      trendingDownOutline,
      removeOutline,
      analyticsOutline,
      cartOutline,
      trashOutline,
      arrowUpOutline,
      arrowDownOutline,
      calendarOutline,
      statsChartOutline,
      shieldCheckmarkOutline,
      star,
      starOutline
    });
  }

  ngOnInit() {
    this.ensureUserData();

    this.sub.add(
      this.marketService.analyzer$.subscribe(items => {
        this.analyzerItems = items;
        if (!this.selectedItem && items.length > 0) {
          this.selectItem(items[0]);
        } else if (this.selectedItem && !items.some(i => i.typeId === this.selectedItem?.typeId)) {
          this.selectItem(items.length > 0 ? items[0] : null);
        }
        this.cdr.detectChanges();
      })
    );

    // Revisar si viene un typeId por query params
    this.sub.add(
      this.route.queryParams.subscribe(params => {
        if (params['typeId']) {
          const tid = Number(params['typeId']);
          const target = this.analyzerItems.find(i => i.typeId === tid) ||
                         this.marketService.getAllItems().find(i => i.typeId === tid);
          if (target) {
            this.selectItem(target);
          }
        }
      })
    );
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

  ngAfterViewInit() {
    if (this.selectedItem) {
      this.loadHistoryAndRenderChart();
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.destroyChart();
  }

  selectItem(item: EveItem | null) {
    this.selectedItem = item;
    if (item) {
      this.loadHistoryAndRenderChart();
    } else {
      this.destroyChart();
    }
    this.cdr.detectChanges();
  }

  onTimeframeChange(event: any) {
    this.timeframeDays = Number(event.detail.value);
    this.loadHistoryAndRenderChart();
  }

  loadHistoryAndRenderChart() {
    if (!this.selectedItem) return;

    this.loadingChart = true;
    this.cdr.detectChanges();

    this.marketService.getPriceHistory(this.selectedItem.typeId, this.timeframeDays).subscribe({
      next: (data) => {
        this.historyData = data;
        this.calculateMetrics(data);
        this.loadingChart = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderChart(data), 50);
      },
      error: () => {
        this.loadingChart = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateMetrics(data: PriceHistoryPoint[]) {
    if (!data || data.length === 0) {
      this.priceChangePercent = 0;
      this.trendVerdict = 'neutral';
      this.trendMessage = 'Sin suficientes datos históricos.';
      return;
    }

    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];

    this.currentAveragePrice = lastPoint.average;

    const highs = data.map(d => d.highest || d.average);
    const lows = data.map(d => d.lowest || d.average);
    this.highestPeriodPrice = Math.max(...highs);
    this.lowestPeriodPrice = Math.min(...lows);

    if (firstPoint.average > 0) {
      this.priceChangePercent = ((lastPoint.average - firstPoint.average) / firstPoint.average) * 100;
    } else {
      this.priceChangePercent = 0;
    }

    if (this.priceChangePercent > 1.5) {
      this.trendVerdict = 'bullish';
      this.trendMessage = `Tendencia ALCISTA (+${this.priceChangePercent.toFixed(1)}%). La demanda en Jita supera la oferta. Probabilidad de que el precio continúe subiendo.`;
    } else if (this.priceChangePercent < -1.5) {
      this.trendVerdict = 'bearish';
      this.trendMessage = `Tendencia BAJISTA (${this.priceChangePercent.toFixed(1)}%). Presión vendedora en The Forge. Probable caída o estabilización de precios.`;
    } else {
      this.trendVerdict = 'neutral';
      this.trendMessage = `Tendencia ESTABLE (${this.priceChangePercent.toFixed(1)}%). Mercado lateral en equilibrio de compra y venta.`;
    }
  }

  renderChart(data: PriceHistoryPoint[]) {
    if (!this.trendCanvas || !this.trendCanvas.nativeElement) return;

    this.destroyChart();

    const ctx = this.trendCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = data.map(d => {
      const parts = d.date.split('-');
      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d.date;
    });
    const avgPrices = data.map(d => d.average);
    const highPrices = data.map(d => d.highest || d.average);
    const lowPrices = data.map(d => d.lowest || d.average);

    const isPositive = this.priceChangePercent >= 0;
    const primaryLineColor = isPositive ? '#38bdf8' : '#f87171';
    const gradientFill = ctx.createLinearGradient(0, 0, 0, 240);
    if (isPositive) {
      gradientFill.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      gradientFill.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    } else {
      gradientFill.addColorStop(0, 'rgba(248, 113, 113, 0.35)');
      gradientFill.addColorStop(1, 'rgba(248, 113, 113, 0.0)');
    }

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Precio Promedio ISK',
            data: avgPrices,
            borderColor: primaryLineColor,
            backgroundColor: gradientFill,
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
            pointRadius: data.length > 20 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: primaryLineColor
          },
          {
            label: 'Máximo',
            data: highPrices,
            borderColor: 'rgba(52, 211, 153, 0.4)',
            borderDash: [4, 4],
            borderWidth: 1,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Mínimo',
            data: lowPrices,
            borderColor: 'rgba(251, 146, 60, 0.4)',
            borderDash: [4, 4],
            borderWidth: 1,
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#94a3b8',
              font: { size: 10 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#38bdf8',
            bodyColor: '#ffffff',
            borderColor: 'rgba(56, 189, 248, 0.3)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = context.parsed.y;
                return ` ${context.dataset.label}: ${this.formatIsk(val !== null ? val : 0)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(51, 65, 85, 0.3)'
            },
            ticks: {
              color: '#64748b',
              font: { size: 9 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7
            }
          },
          y: {
            grid: {
              color: 'rgba(51, 65, 85, 0.3)'
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 9 },
              callback: (value: any) => this.formatIskShort(Number(value))
            }
          }
        }
      }
    });
  }

  private destroyChart() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }

  removeFromAnalyzer(item: EveItem, event: Event) {
    event.stopPropagation();
    this.marketService.toggleAnalyzer(item);
    this.cdr.detectChanges();
  }

  isFavorite(typeId?: number): boolean {
    if (!typeId) return false;
    return this.marketService.isFavorite(typeId);
  }

  toggleFavorite(item: EveItem) {
    this.marketService.toggleFavorite(item);
    this.cdr.detectChanges();
  }

  goToMarket() {
    this.router.navigate(['/tabs/tab2']);
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

  formatIskShort(amount: number): string {
    if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'B';
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
    return amount.toString();
  }
}
