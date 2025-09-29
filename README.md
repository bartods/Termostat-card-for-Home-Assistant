# Termostat-card-for-Home-Assistant
**Custom Card dla Home Assistant**

**KlimatyzatorCard** to niestandardowa karta Web Component (custom element) do Home Assistant, umożliwiająca sterowanie klimatyzatorem przez interaktywny, okrągły suwak oraz szybką kontrolę trybów i prędkości wentylatora. W tej wersji dodano konfigurowalną przezroczystość sekcji "meta" (prędkość wentylatora, temperatura zmierzona, wilgotność) zapisywaną w localStorage.

**Najważniejsze funkcje**

Okrągły suwak do ustawiania temperatury (przeciąganie / kliknięcie).
Pokazywanie wartości: temperatura zadana, temperatura zmierzona, wilgotność, stan zasilania.
Sterowanie zasilaniem (toggle) i prędkością wentylatora (select_option).
Animowana wizualizacja falowania (wave) i efektów dla wentylatora.
Edytor wizualny (UI) w karcie (zębatka) z ustawieniami „live” i autosave do localStorage.
Nowe: ustawienie przezroczystości sekcji meta (metaOpacity) kontrolujące widoczność elementów: prędkość wentylatora, temperatura zmierzona i wilgotność.
Wiele dodatkowych ustawień UI: rozmiary, opacities, gapy, itp.
Automatyczne wykrywanie motywu (dark_mode = 'auto').

_**Dlaczego to przydatne**_

Karta daje estetyczny, responsywny interfejs do sterowania klimatyzatorem bez konieczności tworzenia zewnętrnego dashboardu. Możliwość ustawienia przezroczystości meta ułatwia dopasowanie wyglądu do tła dashboardu lub personalizację gustu użytkownika.

**Szybkie uruchomienie**

Skopiuj plik JS z definicją custom elementu (KlimatyzatorCard) do katalogu www w Home Assistant (np. www/klimatyzator-card.js).
Dodaj do configuration.yaml / zasobów Lovelace:
Lovelace (UI) → Ustawienia → Zasoby → Dodaj zasób: /local/klimatyzator-card.js typ: moduł (module).
Dodaj kartę do dashboardu, np. używając manual card:

    type: 'custom:klimatyzator-card'
    title: Klimatyzator Salon
    # Encje (dostosuj do swoich)
    entity_target: number.klimatyzator_klimatyzator_temperatura
    entity_current: sensor.klimatyzator_klimatyzator_temperatura_zmierzona
    entity_power: switch.klimatyzator_klimatyzator_zasilanie
    entity_fan: select.klimatyzator_klimatyzator_predkosc_wentylatora
    entity_mode: select.klimatyzator_klimatyzator_tryb
    entity_humidity: sensor.klimatyzator_klimatyzator_wilgotnosc
    
    # Suwak i zakresy
    step: 1              # krok zmiany temperatury
    min: 16              # minimalna wartość
    max: 30              # maksymalna wartość
    arcStart: 240        # kąt startu łuku (stopnie)
    arcEnd: 120          # kąt końca łuku (stopnie)
    
    # Dodatkowe opcje zachowania
    wave: true           # czy funkcja "wave" (falowanie) ma być dostępna
    wave_entity: sensor.klimatyzator_klimatyzator_falowanie   # encja sterująca falowaniem nadmuchu (opcjonalnie)
    dark_mode: 'auto'    # true | false | 'auto' (wykrywanie motywu)
    
    # --- Opcjonalne pola UI (mogą być ustawiane też w edytorze karty) ---
    # Te wartości są domyślne; edytor karty zapisuje je w localStorage (klucz klimatyzator_card_ui).
    # Możesz skopiować te ustawienia, by ustawić je jako domyślne w kodzie JS, jeśli chcesz.
    
    ui_defaults:
      sliderOpacity: 1.0      # przezroczystość pierścienia suwaka (0.0-1.0)
      tailThickness: 6        # grubość "ogona" (px)
      knobSize: 20            # rozmiar knob (px)
      dotSize: 10             # rozmiar kropki temperatury zmierzonej (px)
      fontSize: 72            # rozmiar dużej liczby temperatury (px)
      cardOpacity: 1.0        # ogólna przezroczystość karty (0.0-1.0)
      controlsGap: 50         # odstęp między przyciskami +/- (px)
      controlsOpacity: 0.9    # przezroczystość ikon przycisków (0.0-1.0)
      modesIconSize: 28       # rozmiar ikon trybów (px)
      targetOpacity: 1.0      # przezroczystość tekstu temperatury zadanej (0.0-1.0)
      metaOpacity: 1.0        # PRZED: nowe ustawienie — przezroczystość sekcji meta (prędkość / temp zmierzona / wilgotność)
    
    # Przykładowe ustawienia wyglądu/behawioru (opcjonalne)
    # Możesz je dodać do configu, jeśli rozszerzyłeś kod, by czytał config.meta itp.
    # meta:
    #   transparency: 0.8
    #   applyToAllCards: false
    #   blendMode: overlay


**Użyj edytora karty (ikona zębatki) aby zmienić wartości UI na żywo. Zmiany zapisywane są lokalnie (localStorage).**
    

## Konfiguracja i dostępne opcje (setConfig)
Dostępne pola konfiguracyjne (przykładowo ustawiane przy hoście karty):

    title — tytuł karty.
    entity_target — encja licznik/number do ustawiania temperatury.
    entity_current — sensor z wartością zmierzoną temperatury.
    entity_power — switch do włączania/wyłączania klimatyzatora.
    entity_fan — select do zmiany prędkości wentylatora.
    entity_mode — select do zmiany trybu (Grzanie/Chłodzenie/Wentylator/Osuszanie).
    entity_humidity — sensor wilgotności.
    step, min, max — parametry suwaka temperatury.
    arcStart, arcEnd — kąt łuku suwaka.
    wave, wave_entity — kontrola animacji falowania.
    dark_mode — true | false | 'auto' (automatyczne wykrywanie motywu).
    UI (persistowane w localStorage pod kluczem klimatyzator_card_ui):

    sliderOpacity: przezroczystość całego pierścienia suwaka.
    tailThickness: grubość "ogona" (tail) łuku.
    knobSize: rozmiar punktu sterującego (knob) temperatury zadanej.
    dotSize: rozmiar punktu temperatury zmierzonej.
    fontSize: rozmiar fontu wartości temperatury.
    cardOpacity: ogólna przezroczystość karty.
    controlsGap: odstęp między przyciskami + / -.
    controlsOpacity: przezroczystość ikon przycisków.
    modesIconSize: rozmiar ikon trybów.
    targetOpacity: przezroczystość liczby temperatury zadanej.
    metaOpacity: przezroczystość sekcji meta (PRĘDKOŚĆ / TEMP ZMIERZONA / WILGOTNOŚĆ) — DODANE.
  
Uwaga: wszystkie powyższe ustawienia można zmieniać w edytorze karty (ikonka zębatki). Zmiany są automatycznie zapisywane i natychmiast widoczne.

**Jak działa metaOpacity**

Pole metaOpacity (0.0–1.0) kontroluje opacity elementu .meta oraz indywidualnie tekstów cur, fanText, hum.
Możesz dopasować widoczność dolnego paska informacyjnego bez wpływu na resztę karty.
Ustawienie zapisuje się w localStorage razem z innymi ustawieniami UI (klucz klimatyzator_card_ui).
Przykładowe użycie edytora (w UI)
Kliknij ikonę zębatki w prawym dolnym rogu karty.
W sekcji "Ustawienia meta" przesuwaj suwak "Przezroczystość meta" — zmiana zapisywana jest lokalnie.
Możesz również ustawić: przezroczystość karty, suwaka, ikonek, rozmiar czcionki, itd.

**Zgodność i ograniczenia**

Karta przeznaczona dla Lovelace w Home Assistant z obsługą custom elements i ha-icon.
Przy integracjach, które nie udostępniają standardowych usług (increment/decrement/set_value), karta może nie być w stanie zmienić wartości — kod obsługuje popularne domeny (number, input_number, select, switch).
metaOpacity jest lokalnym ustawieniem zapisywanym per przeglądarka (localStorage) — jeśli chcesz ustawienia współdzielić, trzeba rozszerzyć zapis do repo (np. integracja lub storage).

**Deweloperskie uwagi**

Kod używa Shadow DOM, inline CSS i dynamicznego renderowania przy pomocy template stringów.
Logika rysowania łuku suwaka (describeArc, polarToCartesian) jest zoptymalizowana do czytelności i precyzji pozycji punktów.
Wartość suwaka jest "steppowana" zgodnie z parametrem step.
Obsługa dark_mode ma kilka warstw: preferencja systemowa, heurystyka Home Assistant (nazwa motywu), wykrywanie luminancji tła.
Pliki w repo
klimatyzator-card.js — definicja custom elementu (ten plik wkleić do /www).
README.md — ten plik: opis instalacji, konfiguracji i użycia.

Rozszerzenia / pomysły na rozwój
Persist metaOpacity per-instance (w konfiguracji karty) zamiast localStorage.
Dodanie globalnego ustawienia meta (applyToAllCards / blendMode) — integracja z innymi kartami.
Zapis ustawień w Home Assistant Storage API (jeśli wymagane współdzielenie między urządzeniami).
Dodanie testów E2E dla interakcji suwaka i przycisków.

### **Przykłady dashboardów poniżej.**###

![Image](https://github.com/user-attachments/assets/492851be-fc45-4cc8-a856-76afc0e2ea9a)

![Image](https://github.com/user-attachments/assets/0bea7171-84f5-4dfa-9b6f-96bdafe1f868)

![Image](https://github.com/user-attachments/assets/6f2bc366-03cf-4571-92bd-f6b148f0c659)

[![Buy Me A Coffee](https://img.shields.io/badge/-Buy%20me%20a%20coffee-yellow?logo=buymeacoffee&logoColor=white)](https://buymeacoffee.com/bartods)

Bartosz Damian Scencelek

