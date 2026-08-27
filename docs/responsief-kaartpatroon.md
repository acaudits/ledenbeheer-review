# Responsief kaartpatroon

## Doel

Dit document beschrijft het standaard kaartpatroon voor de overzichtspaginas van Ledenbeheer. Persoonscertificaten is de belangrijkste referentie.

Het patroon wordt gebruikt voor Persoonscertificaten, Procescertificaten, Deskcontroles, Terreincontroles, Terreincontroles inplannen en Na finalisatie.

## 1. Layout

- Brede tabellen worden vervangen door compacte kaarten.
- Primaire gegevens staan op de gesloten kaart.
- Aanvullende gegevens staan onder **Overige gegevens**.
- Mobiel gebruikt één kolom.
- Tablet gebruikt meestal twee kolommen.
- Desktop gebruikt meerdere compacte kolommen.
- Padding en gaps blijven beperkt.
- Lange waarden breken af zonder horizontale pagina-scroll.

## 2. Openen en sluiten

- Er kan maximaal één kaart tegelijk openstaan.
- Een andere kaart openen sluit de vorige.
- Muis, Enter en spatiebalk worden ondersteund.
- Gebruik `aria-expanded`, `aria-controls` en een zichtbare focusring.
- Knoppen, links en invoervelden mogen de kaart niet toggelen.

## 3. Veldindeling

- Essentiële informatie staat buiten de kaart.
- Secundaire informatie staat in de geopende kaart.
- De exacte veldverdeling is moduleafhankelijk.
- Acties staan onderaan binnen de geopende kaart.

## 4. Acties en kopieerknoppen

- De primaire actie staat links en **Meer** staat rechts.
- Acties worden alleen getoond wanneer ze beschikbaar en toegestaan zijn.
- Machtigingen voor bewerken, verwijderen en herstellen blijven behouden.
- Externe links gebruiken `target="_blank"` en `rel="noopener noreferrer"`.
- Kopieerknoppen kopiëren alleen de oorspronkelijke waarde.
- Lege waarden krijgen geen nutteloze kopieerknop.
- Kopiëren mag de kaart niet openen of sluiten.
- Bij Na finalisatie zijn Geregistreerd, Datum na finalisatie en Plaatsbezoek uitgezonderd.

## 5. Zoeken en filters

- Boven de kaarten staat een breed algemeen zoekveld.
- Zoeken gebruikt een korte debounce om onnodige aanvragen te voorkomen.
- Iedere kolom kan een eigen filtermenu hebben.
- Filterwaarden worden server-side uit de volledige dataset opgehaald.
- Meerdere waarden kunnen tegelijk geselecteerd worden.
- Lege cellen zijn een afzonderlijke filteroptie.
- Filterwaarden kunnen binnen het menu doorzocht worden.
- Actieve filters zijn visueel herkenbaar.
- Alle filters kunnen in één keer gewist worden.

## 6. Datumfilters

- Datumfilters gebruiken een boom met jaar, maand en dag.
- Een volledig jaar of een volledige maand kan geselecteerd worden.
- Afzonderlijke dagen kunnen geselecteerd worden.
- Gedeeltelijke selecties krijgen een tussenstatus.
- Lege datumwaarden kunnen afzonderlijk geselecteerd worden.

## 7. Sortering

- Oplopende en aflopende sortering worden ondersteund.
- Waar vereist kunnen meerdere kolommen tegelijk gesorteerd worden.
- Sorteerprioriteiten zijn zichtbaar en verplaatsbaar.
- Lege waarden blijven onderaan.
- Een uniek ID wordt als stabiele tiebreaker gebruikt.

## 8. Serverwerking en paginering

- Zoeken, filteren en sorteren gebeuren server-side.
- Cursorpaginering voorkomt dat de volledige dataset geladen wordt.
- **Meer resultaten laden** voegt de volgende pagina toe.
- Reeds geladen kaarten blijven zichtbaar.
- Dubbele resultaten worden op ID verwijderd.
- Filter- en sorteerwijzigingen starten opnieuw vanaf pagina één.
- Het totale aantal resultaten blijft zichtbaar.

## 9. Laad-, fout- en leegtoestanden

- Eerste laadbeurt heeft een eigen laadstatus.
- Volgende pagina laden behoudt de bestaande kaarten.
- Serverfouten krijgen een begrijpelijke melding.
- Een lege database en nul filterresultaten krijgen verschillende meldingen.

## 10. Referentiebestanden

### Persoonscertificaten

- `components/CertificatenTabel.tsx`
- `components/PersoonscertificaatKaartKolombalk.tsx`
- `components/PersoonscertificaatDatumFilterBoom.tsx`
- `hooks/usePersoonscertificatenQuery.ts`
- `lib/persoonscertificaat-lijstcontract.ts`
- `lib/persoonscertificaat-selectie.ts`
- `app/api/persoonscertificaten/lijst/route.ts`

### Na finalisatie

- `components/NaFinalisatieTabel.tsx`
- `components/NaFinalisatieKaartKolombalk.tsx`
- `hooks/useNaFinalisatieQuery.ts`
- `lib/na-finalisatie-lijstcontract.ts`
- `lib/na-finalisatie-selectie.ts`
- `app/api/na-finalisatie/lijst/route.ts`

## 11. Acceptatiechecklist

- [ ] Compacte en responsieve layout.
- [ ] Primaire velden buiten en overige velden binnen.
- [ ] Maximaal één geopende kaart.
- [ ] Muis, Enter en spatiebalk werken.
- [ ] Acties en kopieerknoppen toggelen de kaart niet.
- [ ] Filters werken over de volledige dataset.
- [ ] Lege waarden kunnen gefilterd worden.
- [ ] Datumfilterboom werkt.
- [ ] Sortering blijft behouden bij meer resultaten laden.
- [ ] Geen dubbele resultaten.
- [ ] Machtigingen blijven behouden.
- [ ] Verwijderde registraties en herstellen blijven werken.
- [ ] Dashboardtellingen blijven correct.

## 12. Technische controles

Voer na wijzigingen uit:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `git diff --check`

Gebruik dit document samen met de actuele Persoonscertificaatimplementatie als referentie.
