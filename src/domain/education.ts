import { EducationalGuide } from './types';

export const EDUCATIONAL_GUIDES: Record<string, EducationalGuide> = {
  descriptive: {
    id: 'descriptive',
    title: 'Tanımlayıcı İstatistikler ve Dağılım Analizi',
    neZamanKullanilir:
      'Yeni bir proses verisi yüklendiğinde verinin merkezini, yayılımını, çarpıklığını ve olası uç değerlerini hızlıca görmek için kullanılır.',
    hangiVeriGerekir:
      'En az bir sürekli sayısal değişken (ör. sıcaklık, %Si, çekme dayanımı). İsteğe bağlı olarak gruplama için kategorik değişken (ör. vardiya).',
    varsayimlar:
      'Gözlemlerin ölçüm hatasından arındırılmış ve ilgili proses koşullarını temsil ediyor olması gerekir; ortalama parametresi aşırı aykırı değerlerden etkilenebilir.',
    nasilYorumlanir:
      'Ortalama ve medyan birbirine yakınsa dağılım simetriktir. Standart sapma (SD) proses değişkenliğini, %95 Güven Aralığı ise gerçek ana kütle ortalamasının sınırlarını gösterir.',
    yuksekFiriniOrnegi:
      'Yüksek Fırın #2 sıcak metal [Si] yüzdesinin vardiya bazında ortalama %0,52 ± 0,04 ve medyan %0,51 olması, fırın termal dengesinin simetrik seyrettiğini gösterir.',
  },
  hypothesis: {
    id: 'hypothesis',
    title: 'Parametrik ve Parametrik Olmayan Hipotez Testleri',
    neZamanKullanilir:
      'İki vardiya, iki hammadde tedarikçisi veya bir proses değişikliği öncesi ve sonrası arasında istatistiksel olarak anlamlı bir fark olup olmadığını kanıtlamak için kullanılır.',
    hangiVeriGerekir:
      'Test türüne göre 1 veya 2+ sayısal sütun, eşleştirilmiş ölçümler ya da frekans sayımları (Ki-Kare için kategorik çapraz tablo).',
    varsayimlar:
      'T-Testi ve F-Testi normallik ile bağımsızlık varsayar. Normallik sağlanmazsa Mann-Whitney, Wilcoxon, Kruskal-Wallis veya Mood Medyan testleri tercih edilmelidir.',
    nasilYorumlanir:
      'p-değeri < 0,05 ise yokluk hipotezi (H₀) reddedilir ve gözlenen farkın tesadüfi olmadığı sonucuna varılır. Etki büyüklüğü ile pratik önem mutlaka birlikte incelenir.',
    yuksekFiriniOrnegi:
      'PCI kömür enjeksiyon oranı artırıldıktan sonraki 30 döküm ile önceki 30 dökümün sıcak metal sıcaklığı Two-Sample T-Test ile karşılaştırılır; p = 0,012 ise sıcaklık değişimi anlamlıdır.',
  },
  regression: {
    id: 'regression',
    title: 'Regresyon ve Düzenlileştirilmiş Modelleme',
    neZamanKullanilir:
      'Bir kalite çıktısını (Y) etkileyen proses parametrelerini (X₁, X₂, ...) matematiksel denkleme dökmek ve ileriye dönük tahmin yapmak için kullanılır.',
    hangiVeriGerekir:
      'Sürekli (veya Lojistik için ikili 0/1, Poisson için sayım) hedef değişken ile bir veya birden fazla sayısal açıklayıcı değişken.',
    varsayimlar:
      'Artıkların (residuals) normal dağılması, sabit varyans (homoscedasticity) ve çoklu doğrusal bağlantı olmaması (VIF < 5). Aşırı aykırı değerlerde Robust, çoklu bağlantıda Ridge/Lasso seçilir.',
    nasilYorumlanir:
      'R² ve Düzeltilmiş R² modelin açıkladığı varyans oranını (%0–100) gösterir. Katsayı p-değeri < 0,05 olan girdiler çıktı üzerinde anlamlı etkiye sahiptir.',
    yuksekFiriniOrnegi:
      'Sıcak metal [Si] = f(Kok Oranı, Rüzgar Sıcaklığı, Cüruf Bazikliği) çoklu regresyonunda R² = %81,4 bulunması, silisyum kontrolünün bu üç parametreyle yönetilebileceğini kanıtlar.',
  },
  anova: {
    id: 'anova',
    title: 'Varyans Analizi (ANOVA & GLM)',
    neZamanKullanilir:
      'Üç veya daha fazla grup (ör. A/B/C vardiyaları, 4 farklı fırın veya çoklu faktör etkileşimleri) ortalamaları arasındaki farkları test etmek için kullanılır.',
    hangiVeriGerekir:
      'Sürekli bir yanıt değişkeni ile bir veya daha fazla kategorik faktör (GLM için ek sürekli kovaryatlar).',
    varsayimlar:
      'Grup içi artıkların normal dağılması, gruplar arası varyans homojenliği ve gözlem bağımsızlığı.',
    nasilYorumlanir:
      'F-istatistiğine ait p < 0,05 ise en az bir grup ortalaması diğerlerinden farklıdır. Hangi grupların ayrıştığı Tukey HSD ikili karşılaştırma tablosundan okunur.',
    yuksekFiriniOrnegi:
      '3 farklı demir cevheri harmanının ve 2 farklı nem seviyesinin sinter tambur dayanımına etkisi Two-Way ANOVA ile incelenir; etkileşim p = 0,021 ise harman seçimi nem düzeyine bağlıdır.',
  },
  spc: {
    id: 'spc',
    title: 'İstatistiksel Proses Kontrol (SPC) Merkezi',
    neZamanKullanilir:
      'Bir prosesin zaman içinde istatistiksel kontrol altında olup olmadığını izlemek ve özel nedenli sapmaları (kayma, trend, salınım) erken yakalamak için kullanılır.',
    hangiVeriGerekir:
      'Zaman sıralı ölçümler (I-MR için tekil, Xbar-R/Xbar-S için alt gruplar) veya kusur sayımları/oranları (C, U, P, NP grafikleri).',
    varsayimlar:
      'Kontrol sınırları (UCL/LCL) prosesin doğal değişiminden (3σ) hesaplanır; spesifikasyon sınırlarıyla karıştırılmamalıdır. Küçük kaymalar için EWMA ve CUSUM tercih edilir.',
    nasilYorumlanir:
      'Kırmızı işaretlenen noktalar UCL/LCL dışına çıkışı veya Western Electric kurallarının (ör. ardışık 7 nokta merkez hattın aynı tarafında) ihlalini gösterir ve kök neden incelemesi gerektirir.',
    yuksekFiriniOrnegi:
      'Yüksek Fırın sıcak metal kükürt (%S) değerleri I-MR ve EWMA grafiğinde izlenir; ardışık 8 dökümün merkez hattının üzerinde seyretmesi kükürt giderme veriminde kaymaya işaret eder.',
  },
  capability: {
    id: 'capability',
    title: 'Proses Yeterlilik Analizi (Cp, Cpk, Pp, Ppk, Cpm & Sixpack)',
    neZamanKullanilir:
      'İstatistiksel kontrol altındaki bir prosesin müşteri veya standart spesifikasyon sınırları (LSL–USL) içinde üretim yapma kabiliyetini ölçmek için kullanılır.',
    hangiVeriGerekir:
      'Sürekli ölçüm verisi, Alt Spesifikasyon Limiti (LSL), Üst Spesifikasyon Limiti (USL) ve tercihen Hedef Değer (Target).',
    varsayimlar:
      'Proses stabil olmalı (kontrol dışı özel neden olmamalı) ve veri normal dağılmalıdır. Dağılım çarpık ise dönüştürme veya normallik dışı yeterlilik gerekir.',
    nasilYorumlanir:
      'Cp potansiyel yeterliliği, Cpk ise ortalama merkezlemesini hesaba katan gerçek kısa dönem yeterliliği ölçer. Cpk ≥ 1,33 endüstriyel yeterlilik eşiğidir; Cpk < 1,00 yüksek hurda/yeniden işleme riski taşır.',
    yuksekFiriniOrnegi:
      'Sürekli dökümde çıkış sıcak metal [Si] için LSL = %0,35 ve USL = %0,65 tanımlandığında Cpk = 1,42 elde edilmesi, prosesin 4,26 Sigma düzeyinde yeterli olduğunu gösterir.',
  },
  doe: {
    id: 'doe',
    title: 'Deney Tasarımı (DOE — Faktöriyel, RSM, Karışım ve Taguchi)',
    neZamanKullanilir:
      'Minimum sayıda deney koşusu ile maksimum proses bilgisi toplamak, faktör etkileşimlerini ortaya çıkarmak ve optimum çalışma penceresini belirlemek için kullanılır.',
    hangiVeriGerekir:
      'Kontrol edilebilir girdi faktörleri (düşük/yüksek seviyeler) ve her deney koşusunda ölçülen sayısal kalite yanıtı.',
    varsayimlar:
      'Deney koşularının rastgele sırada yürütülmesi (randomizasyon), ölçüm sisteminin güvenilir olması ve tekrarların hata kestirimi için yeterli olması.',
    nasilYorumlanir:
      'Standardize Etki Pareto grafiğinde eşik çizgisini aşan faktörler istatistiksel olarak anlamlıdır. Taguchi analizinde en yüksek S/N (Sinyal/Gürültü) oranını veren seviye gürbüz optimumdur.',
    yuksekFiriniOrnegi:
      'Sinter makinesinde kok oranı, su yüzdesi ve yatak yüksekliği L9 Taguchi ortogonal dizisiyle denenir; S/N oranı en yüksek kombinasyon tambur dayanımını %3,8 artırır.',
  },
  reliability: {
    id: 'reliability',
    title: 'Güvenilirlik ve Ömür Analizi (Weibull, Survival, Crow-AMSAA)',
    neZamanKullanilir:
      'Ekipman arıza sürelerini modellemek, B10/B50 ömür tahminleri yapmak, sansürlü bakım verilerini analiz etmek ve güvenilirlik büyümesini izlemek için kullanılır.',
    hangiVeriGerekir:
      'Arıza süresi veya çevrim sayısı verisi; sağdan sansürlü (henüz arızalanmamış) ekipmanlar için durum göstergesi (1=Arıza, 0=Sansürlü).',
    varsayimlar:
      'Gözlemler benzer çalışma rejimi altında toplanmış olmalı; Weibull şekil parametresi β > 1 ise aşınma, β < 1 ise erken çocukluk arızası, β ≈ 1 ise rastgele arıza hakimdir.',
    nasilYorumlanir:
      'Weibull β (şekil) ve η (karakteristik ömür, %63,2 arıza noktası) önleyici bakım periyodunu belirler. B10 değeri birimlerin %10’unun arızalanacağı kritik süreyi verir.',
    yuksekFiriniOrnegi:
      'Yüksek Fırın tüyer soğutma plakalarının çalışma saati Weibull analizi ile incelenir; β = 2,45 ve B10 = 14.200 saat bulunması planlı değişim aralığını netleştirir.',
  },
  sixsigma: {
    id: 'sixsigma',
    title: 'Altı Sigma Problem Çözme ve Kalite Araçları (DMAIC)',
    neZamanKullanilir:
      'Kronik kalite kayıplarını ve süreç dar boğazlarını sistematik (Tanımlama–Ölçme–Analiz–İyileştirme–Kontrol) yöntemle kalıcı olarak çözmek için kullanılır.',
    hangiVeriGerekir:
      'Süreç adımları (SIPOC), müşteri sesi (VOC/CTQ), hata sıklıkları (Pareto), 6M kök nedenleri (Ishikawa) ve Şiddet-Olasılık-Saptanabilirlik puanları (FMEA).',
    varsayimlar:
      'Çapraz fonksiyonlu ekip katılımı ve FMEA puanlamasında standart derecelendirme ölçeğinin (1–10) tutarlı uygulanması.',
    nasilYorumlanir:
      'Pareto analizinde kümülatif %80 etkiyi oluşturan ilk birkaç hata tipine odaklanılır. FMEA’da RPN = Şiddet × Olasılık × Saptanabilirlik değeri ≥ 100 olan riskler için acil aksiyon açılır.',
    yuksekFiriniOrnegi:
      'BOF konvertörde yüksek fosfor hataları Pareto ile sınıflandırılır, Ishikawa 6M diyagramında kireç kalitesi kök neden olarak belirlenir ve FMEA RPN değeri 168’den 42’ye düşürülür.',
  },
  ml: {
    id: 'ml',
    title: 'Mühendislik Makine Öğrenmesi ve AutoML',
    neZamanKullanilir:
      'Doğrusal olmayan karmaşık proses ilişkilerini yakalamak, kalite sınıfı tahmin etmek, çalışma rejimlerini kümelemek veya zaman serisi öngörüsü yapmak için kullanılır.',
    hangiVeriGerekir:
      'Çok değişkenli sayısal ve kategorik proses veri seti (sınıflandırma için hedef sınıf, tahminleme için zaman sıralı seri).',
    varsayimlar:
      'Eğitim verisinin gelecekteki çalışma koşullarını temsil etmesi, aşırı öğrenmeyi önlemek için çapraz doğrulama (CV) uygulanması.',
    nasilYorumlanir:
      'AutoML modülünde modeller RMSE / Doğruluk / F1 skoruna göre sıralanır. Anomali tespitinde Z > 3,0 veya çok değişkenli uzaklık eşiği aşan dökümler incelenir.',
    yuksekFiriniOrnegi:
      'Yüksek fırın son 60 döküm verisinde K-Means kümeleme ile "Düşük Kok / Yüksek Verim" ve "Yüksek Silisyum / Aşırı Termal" çalışma rejimleri otomatik ayrıştırılır.',
  },
  steel: {
    id: 'steel',
    title: 'Demir Çelik Proses Mühendisliği Paketleri',
    neZamanKullanilir:
      'Yüksek Fırın, Sinter, BOF Konvertör, Sürekli Döküm, Haddehane ve Enerji Verimliliği hatlarına özgü termodinamik ve metalürjik indeksleri hesaplamak için kullanılır.',
    hangiVeriGerekir:
      'Metalürjik proses değişkenleri (cüruf CaO/SiO2 bazikliği, sıcak metal sıcaklığı, O2 üfleme debisi, süperheat, hadde kalınlığı, enerji GJ/ton).',
    varsayimlar:
      'Birimlerin standart metrik metalürji birimlerinde (°C, %, kg/t, Nm³/h, MPa, mm) girilmiş olması.',
    nasilYorumlanir:
      'Hesaplanan metalürjik göstergeler (RAFT teorik alev sıcaklığı, baziklik B2, süperheat penceresi, spesifik enerji yoğunluğu) hedef işletme aralıklarıyla karşılaştırılır.',
    yuksekFiriniOrnegi:
      'Yüksek Fırın paketinde rüzgar sıcaklığı 1180 °C, nem 18 g/Nm³ ve PCI 165 kg/t girildiğinde RAFT = 2145 °C hesaplanır; ideal 2050–2250 °C penceresindedir.',
  },
};
