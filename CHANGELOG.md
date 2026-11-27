# Changelog

Every release, in English and Turkish. The release notes on GitHub (and in the in-app update) are taken from the section of the version being released.

Her sürüm, İngilizce ve Türkçe. GitHub'daki (ve uygulama içi güncellemedeki) sürüm notları, çıkan sürümün bölümünden alınır.

## v0.4.0 — 2026-11-27

### New
- **Quick add in plain language.** Press **N** (or click the add box) and it grows into the middle of the screen. Type `Call Ali tomorrow 10.30pm 45m #work p1` and Cortex picks out the day, time, duration, label and priority, colouring each as you type. Relative days (`in 3 days`, `next friday`, `next week`), `#` label suggestions and repeats (`every day`, `weekdays`) work too, in English and Turkish.
- **Month view.** See the whole month: planned tasks, calendar events and due dates on each day. Click a day to show it in the timebox, double-click to open its week, drag tasks between days.
- **Plan my day.** One click fills the day's unscheduled tasks into free time between your calendar events, inside your work hours: higher priority first, shorter tasks first within a priority, a break between tasks and an optional short warm-up task. A second button empties the timebox to re-plan.
- **Smarter Eisenhower matrix.** Choose Today, This week or All. Tasks you haven't sorted are placed automatically from their priority and due date; drag one to keep it there. Clear the whole matrix in one click.
- **Repeating tasks.** Every day, weekdays or every week; the next one appears when you check one off.
- **Undo** with `⌘Z` for adds, edits, moves, completions and deletes.
- **Command palette** (`⌘K`) to search tasks, jump to a day and run any action.
- **Stats:** done vs. planned, time blocked, your streak, the last 7 days and how accurate your estimates are.
- **Reminders and menu bar.** A notification before each timebox starts and the current or next block next to the clock. Both can be turned off separately.
- Unfinished tasks from earlier days are offered to move to today.
- Calendar events now also appear in the week columns.

### Improved
- "Today" view is now called **Focus**; views are Week / Month / Focus (`V` cycles through them).
- New **Planning** settings: work hours, break between tasks, warm-up, reminders, menu bar.
- Animated settings controls and accent colour picker.
- Calendar events in the timebox are hatched so they never look like tasks.

### Fixed
- Dragging a task no longer selects text.
- Hovered and focused cards are no longer clipped at the top of lists.
- The window no longer scrolls or bounces as a whole.

---

### Yeni
- **Doğal dille hızlı ekleme.** **N**'ye bas (ya da ekleme kutusuna tıkla), kutu ekranın ortasına büyüsün. `Ali'yi ara yarın akşam 10.30 45dk #iş p1` yaz; Cortex günü, saati, süreyi, etiketi ve önceliği ayırıp yazarken her birini renklendirir. Göreli günler (`3 gün sonra`, `haftaya cuma`, `gelecek hafta`), `#` ile etiket önerileri ve tekrarlar (`her gün`, `hafta içi`) da çalışır; Türkçe ve İngilizce.
- **Ay görünümü.** Bütün ay tek ekranda: her günün planlanmış görevleri, takvim etkinlikleri ve bitiş tarihleri. Bir güne tıklayınca zaman çizelgesinde açılır, çift tıklayınca haftasına gidersin, görevleri günler arasında sürükleyebilirsin.
- **Günümü planla.** Tek tıkla, günün saati belirlenmemiş görevlerini takvim etkinliklerinin arasındaki boşluklara, çalışma saatlerinin içine yerleştirir: önce yüksek öncelik, aynı öncelikte önce kısa iş, görevler arasında mola ve isteğe bağlı kısa bir ısınma işi. İkinci bir düğme, yeniden planlamak için zaman çizelgesini boşaltır.
- **Daha akıllı Eisenhower matrisi.** Bugün, Bu hafta ya da Tümü seçilebilir. Yerleştirmediğin görevler öncelik ve bitiş tarihine göre otomatik konur; sürükleyince kalıcı olur. Tüm matris tek tıkla boşaltılabilir.
- **Tekrarlayan görevler.** Her gün, hafta içi ya da her hafta; birini tamamlayınca sıradaki oluşur.
- `⌘Z` ile **geri alma**: ekleme, düzenleme, taşıma, tamamlama ve silme.
- **Komut paleti** (`⌘K`): görev ara, bir güne git, her komutu çalıştır.
- **İstatistikler:** yapılan / planlanan, zaman blokları, seri, son 7 gün ve tahminlerinin ne kadar tuttuğu.
- **Hatırlatıcılar ve menü çubuğu.** Her zaman bloğundan önce bildirim, saatin yanında şu anki ya da sıradaki blok. İkisi ayrı ayrı kapatılabilir.
- Önceki günlerden kalan bitmemiş görevler bugüne taşınmak üzere önerilir.
- Takvim etkinlikleri artık haftalık sütunlarda da görünür.

### İyileştirmeler
- "Bugün" görünümünün adı artık **Odak**; görünümler Hafta / Ay / Odak (`V` aralarında geçer).
- Yeni **Planlama** ayarları: çalışma saatleri, görevler arası mola, ısınma işi, hatırlatıcılar, menü çubuğu.
- Ayarlardaki seçim düğmeleri ve vurgu rengi seçici animasyonlu.
- Zaman çizelgesindeki takvim etkinlikleri taralı; görevlerle karışmaz.

### Düzeltmeler
- Görev sürüklerken artık yazı seçilmiyor.
- Üzerine gelinen ya da seçilen kartlar listelerin üstünde artık kesilmiyor.
- Pencerenin tamamı artık kaymıyor ya da esnemiyor.

## v0.3.1 — 2026-11-26

### Fixed
- macOS no longer asks for your login password (Keychain) after every update. Calendar credentials are now stored in a file only your user can read. **Reconnect your calendar accounts once** after updating.

---

### Düzeltmeler
- macOS artık her güncellemeden sonra giriş parolanı (Anahtar Zinciri) sormuyor. Takvim bilgileri artık sadece senin kullanıcının okuyabildiği bir dosyada. Güncellemeden sonra **takvim hesaplarını bir kez yeniden bağla**.

## v0.3.0 — 2026-11-26

### New
- **Google Calendar** (read-only). Connect several Google accounts; up to 6 calendar accounts in total.
- **New design and logo**, with animations throughout: hovering, completing and dragging tasks, panels and settings.
- New weekly grid with centred day headers, and redesigned timebox blocks.

### Improved
- Calendar events are far more reliable: repeating events, time zones and daylight-saving changes, all-day events and events past midnight are handled. Events sit next to your timeboxed tasks instead of under them.
- Calendar passwords are no longer kept in the app's web storage.

---

### Yeni
- **Google Takvim** (salt okunur). Birden fazla Google hesabı bağlanabilir; toplamda en fazla 6 takvim hesabı.
- **Yeni tasarım ve logo**, her yerde animasyonlar: görevlerin üzerine gelme, tamamlama ve sürükleme, paneller ve ayarlar.
- Ortalanmış gün başlıklarıyla yeni haftalık ızgara ve yeniden tasarlanan zaman bloğu kutuları.

### İyileştirmeler
- Takvim etkinlikleri çok daha güvenilir: tekrarlayan etkinlikler, saat dilimleri ve yaz saati geçişleri, tüm gün etkinlikleri ve gece yarısını geçenler doğru gösteriliyor. Etkinlikler zaman bloklarının altında kalmak yerine yanlarına diziliyor.
- Takvim parolaları artık uygulamanın web deposunda tutulmuyor.

## v0.2.0 — 2026-06-17

### New
- **Apple Calendar (iCloud)**: see your events in the timebox, read-only. Choose which calendars to show and their colours.

---

### Yeni
- **Apple Takvim (iCloud)**: etkinliklerini zaman çizelgesinde gör (salt okunur). Hangi takvimlerin görüneceğini ve renklerini seçebilirsin.

## v0.1.10 — 2026-06-16

### Improved
- Cleaner timebox: solid lines only on the hour.
- Cortex checks for updates whenever you come back to the app.

---

### İyileştirmeler
- Daha sade zaman çizelgesi: sadece saat başlarında düz çizgi.
- Cortex, uygulamaya her döndüğünde güncellemeleri kontrol ediyor.

## v0.1.9 — 2026-06-16

### Improved
- Timebox slots are now 15 minutes.
- `Esc` leaves the task input.
- Releases come with notes listing the changes.

---

### İyileştirmeler
- Zaman çizelgesi dilimleri artık 15 dakika.
- `Esc` görev kutusundan çıkıyor.
- Sürümler, değişiklikleri listeleyen notlarla geliyor.

## v0.1.8 — 2026-06-16

### New
- **Update** section in Settings with a "Check for updates" button.

### Changed
- Shortcuts: `C` for a new task, `T` to toggle the timebox.

---

### Yeni
- Ayarlarda "Güncellemeleri kontrol et" düğmesiyle **Güncelleme** bölümü.

### Değişiklikler
- Kısayollar: yeni görev için `C`, zaman çizelgesini açıp kapatmak için `T`.

## v0.1.7 — 2026-06-15

### Fixed
- In-app updates are signed correctly and install (after the unreleased 0.1.4–0.1.6 attempts).

---

### Düzeltmeler
- Uygulama içi güncellemeler doğru imzalanıyor ve kuruluyor (yayınlanmayan 0.1.4–0.1.6 denemelerinden sonra).

## v0.1.3 — 2026-06-15

### New
- Single-key shortcuts and a **Shortcuts** page in Settings.

### Fixed
- Today and the current week refresh when you return to the app after midnight.

---

### Yeni
- Tek tuşlu kısayollar ve Ayarlarda **Kısayollar** sayfası.

### Düzeltmeler
- Gece yarısından sonra uygulamaya dönünce bugün ve bu hafta yenileniyor.

## v0.1.2 — 2026-06-15

### New
- **Automatic updates** from GitHub Releases.

---

### Yeni
- GitHub Releases üzerinden **otomatik güncelleme**.

## v0.1.1 — 2026-06-15

### New
- Choose your **date format** (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD).

### Fixed
- The window can be dragged by its top bar.

---

### Yeni
- **Tarih formatı** seçimi (GG/AA/YYYY, AA/GG/YYYY, YYYY-AA-GG).

### Düzeltmeler
- Pencere üst çubuğundan sürüklenebiliyor.

## v0.1.0 — 2026-06-11

### New
- First release: **Brain Dump**, **weekly view**, **Today view** with an **Eisenhower matrix** and a **timebox**.
- Task details: due date, estimate, priority, labels and notes.
- Light, dark and system themes with accent colours; English and Turkish; week start, default view and time format settings.

---

### Yeni
- İlk sürüm: **Aklındakileri Yazıya Dök**, **haftalık görünüm**, **Eisenhower matrisi** ve **zaman çizelgesi** ile **Bugün görünümü**.
- Görev detayları: bitiş tarihi, tahmini süre, öncelik, etiketler ve notlar.
- Vurgu renkleriyle açık, koyu ve sistem teması; İngilizce ve Türkçe; hafta başlangıcı, varsayılan ekran ve saat formatı ayarları.
