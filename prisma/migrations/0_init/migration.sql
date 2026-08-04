-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Ondernemingstype" AS ENUM ('EENMANSZAAK', 'BEDRIJF');

-- CreateEnum
CREATE TYPE "DeskcontroleStatus" AS ENUM ('GEEN', 'IN_OPMAAK', 'GEACTUALISEERD', 'AFGEROND');

-- CreateEnum
CREATE TYPE "DeskcontroleType" AS ENUM ('NIEUWE_CONTROLE', 'OPVOLGING');

-- CreateEnum
CREATE TYPE "TerreincontroleStatus" AS ENUM ('GEARCHIVEERD_ATTEST', 'ACTUEEL_ATTEST', 'IN_OPMAAK');

-- CreateEnum
CREATE TYPE "Gebruikersrol" AS ENUM ('BEHEERDER', 'ADMINISTRATIEF', 'AUDITEUR');

-- CreateTable
CREATE TABLE "leden" (
    "id" SERIAL NOT NULL,
    "naam_persoon" TEXT NOT NULL,
    "telefoonnummer" TEXT,
    "mailadres" TEXT,
    "ovam_id" TEXT NOT NULL,
    "certificaatnummer" TEXT NOT NULL,
    "uitgereikt_op" DATE,
    "bedrijf" TEXT,
    "aansluiting" TEXT,
    "opmerking" TEXT,
    "certificatie_platform" TEXT,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,
    "verwijderd_op" TIMESTAMP(3),

    CONSTRAINT "leden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procescertificaten" (
    "id" SERIAL NOT NULL,
    "naam_bedrijf" TEXT NOT NULL,
    "kbo_nummer" TEXT NOT NULL,
    "certificaatnummer" TEXT NOT NULL,
    "uitgereikt_op" DATE,
    "onedrive_url" TEXT,
    "opmerking" TEXT,
    "ondernemingstype" "Ondernemingstype" NOT NULL,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,
    "verwijderd_op" TIMESTAMP(3),

    CONSTRAINT "procescertificaten_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terreincontroles" (
    "id" SERIAL NOT NULL,
    "auditeur" VARCHAR(255),
    "auditeur_gebruiker_id" INTEGER,
    "factuur_verzonden" BOOLEAN NOT NULL DEFAULT false,
    "status" "TerreincontroleStatus",
    "inspectielocatie" VARCHAR(1000),
    "bouwjaar" INTEGER,
    "vloeroppervlakte_m2" DECIMAL(12,2),
    "datum_plaatsbezoek" DATE,
    "uur_plaatsbezoek" VARCHAR(5),
    "ovam_id" VARCHAR(100),
    "naam_adi" VARCHAR(255),
    "attest_url" VARCHAR(2000),
    "bedrijfsnaam" VARCHAR(255),
    "postcode" VARCHAR(20),
    "gemeente" VARCHAR(255),
    "straat" VARCHAR(255),
    "huisnummer" VARCHAR(50),
    "extra_adres_details" VARCHAR(500),
    "perceel_gemeente_code" VARCHAR(100),
    "perceel_afdelingscode" VARCHAR(100),
    "perceel_sectie_code" VARCHAR(100),
    "adres" VARCHAR(1000),
    "opmerkingen" TEXT,
    "attest_id" UUID NOT NULL,
    "bron_bestandsnaam" VARCHAR(255),
    "bron_excel_rij" INTEGER,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,
    "verwijderd_op" TIMESTAMP(3),

    CONSTRAINT "terreincontroles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terreincontrole_dossiers" (
    "id" SERIAL NOT NULL,
    "auditeur" VARCHAR(255) NOT NULL,
    "auditeur_gebruiker_id" INTEGER,
    "naam_adi" VARCHAR(255) NOT NULL,
    "link_attest" VARCHAR(2000) NOT NULL,
    "attest_id" UUID NOT NULL,
    "attestnummer" VARCHAR(255) NOT NULL,
    "status" "DeskcontroleStatus" NOT NULL DEFAULT 'GEEN',
    "certificatie_platform" VARCHAR(255),
    "opmerkingen" TEXT,
    "datum_controle" DATE NOT NULL,
    "adres" VARCHAR(1000),
    "persoons_id" VARCHAR(100) NOT NULL,
    "lid_id" INTEGER NOT NULL,
    "bedrijfsnaam" VARCHAR(500) NOT NULL,
    "ondernemingsnummer" VARCHAR(100) NOT NULL,
    "procescertificaat_id" INTEGER,
    "persoonscertificaat_nummer" VARCHAR(255) NOT NULL,
    "procescertificaat_nummer" VARCHAR(255) NOT NULL,
    "bron_bestandsnaam" VARCHAR(255),
    "bron_excel_rij" INTEGER,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,
    "verwijderd_op" TIMESTAMP(3),

    CONSTRAINT "terreincontrole_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terreincontrole_vaststellingen" (
    "id" SERIAL NOT NULL,
    "terreincontrole_dossier_id" INTEGER NOT NULL,
    "excel_rij" INTEGER NOT NULL,
    "parameter" TEXT,
    "nc_id" TEXT NOT NULL,
    "omschrijving" TEXT,
    "vastgesteld_door_ci" TEXT,
    "verduidelijking" TEXT,
    "grote_impact" TEXT,
    "categorie" TEXT,
    "motivatie_aanpassing" TEXT,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terreincontrole_vaststellingen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deskcontroles" (
    "id" SERIAL NOT NULL,
    "attest_id" UUID,
    "auditeur" TEXT,
    "auditeur_gebruiker_id" INTEGER,
    "link_attest" TEXT,
    "attestnummer" TEXT,
    "lid_id" INTEGER NOT NULL,
    "procescertificaat_id" INTEGER,
    "status" "DeskcontroleStatus" NOT NULL DEFAULT 'GEEN',
    "type_controle" "DeskcontroleType",
    "deadline_sanctie" DATE,
    "deadline_correctie" DATE,
    "mail_sanctie_verzonden" BOOLEAN DEFAULT false,
    "mail_correctie_verzonden" BOOLEAN DEFAULT false,
    "onedrive_url" TEXT,
    "voorwaardelijke_opheffing" BOOLEAN DEFAULT false,
    "opmerkingen" TEXT,
    "datum_controle" DATE NOT NULL,
    "adres" TEXT,
    "finalisatie_datum" DATE,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,
    "verwijderd_op" TIMESTAMP(3),

    CONSTRAINT "deskcontroles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deskcontrole_vaststellingen" (
    "id" SERIAL NOT NULL,
    "deskcontrole_id" INTEGER NOT NULL,
    "excel_rij" INTEGER NOT NULL,
    "parameter" TEXT,
    "nc_id" TEXT NOT NULL,
    "omschrijving" TEXT,
    "vastgesteld_door_ci" TEXT,
    "verduidelijking" TEXT,
    "grote_impact" TEXT,
    "categorie" TEXT,
    "motivatie_aanpassing" TEXT,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deskcontrole_vaststellingen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toegestane_gebruikers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "naam" TEXT,
    "voornaam" TEXT,
    "achternaam" TEXT,
    "profiel_voltooid_op" TIMESTAMP(3),
    "rol" "Gebruikersrol" NOT NULL DEFAULT 'AUDITEUR',
    "beheerder" BOOLEAN NOT NULL DEFAULT false,
    "actief" BOOLEAN NOT NULL DEFAULT true,
    "auth_user_id" TEXT,
    "uitgenodigd_op" TIMESTAMP(3),
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,
    "wachtwoordWijzigen" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "toegestane_gebruikers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meldingen" (
    "id" SERIAL NOT NULL,
    "gebruiker_id" INTEGER NOT NULL,
    "sleutel" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "titel" VARCHAR(255) NOT NULL,
    "bericht" TEXT NOT NULL,
    "href" VARCHAR(2000),
    "gelezen_op" TIMESTAMP(3),
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meldingen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditlogs" (
    "id" SERIAL NOT NULL,
    "gebruiker_id" INTEGER,
    "gebruiker_naam" VARCHAR(255),
    "gebruiker_email" VARCHAR(320),
    "actie" VARCHAR(100) NOT NULL,
    "entiteit" VARCHAR(100) NOT NULL,
    "entiteit_id" INTEGER,
    "omschrijving" TEXT,
    "oude_waarde" JSONB,
    "nieuwe_waarde" JSONB,
    "metadata" JSONB,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attest_persoon_statistieken" (
    "id" SERIAL NOT NULL,
    "persoons_id" VARCHAR(100) NOT NULL,
    "naam" VARCHAR(255) NOT NULL,
    "aantal_attesten" INTEGER NOT NULL,
    "bron_bestandsnaam" VARCHAR(255),
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attest_persoon_statistieken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attest_bedrijf_statistieken" (
    "id" SERIAL NOT NULL,
    "bedrijfsnaam" VARCHAR(500) NOT NULL,
    "bedrijfsnaam_sleutel" VARCHAR(500) NOT NULL,
    "aantal_attesten" INTEGER NOT NULL,
    "bron_bestandsnaam" VARCHAR(255),
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attest_bedrijf_statistieken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attest_correcties" (
    "id" SERIAL NOT NULL,
    "persoons_id" VARCHAR(100) NOT NULL,
    "bedrijfsnaam" VARCHAR(500) NOT NULL,
    "naam" VARCHAR(255) NOT NULL,
    "aantal_attesten" INTEGER NOT NULL,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attest_correcties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attest_statistiek_imports" (
    "id" INTEGER NOT NULL,
    "bron_bestandsnaam" VARCHAR(255) NOT NULL,
    "geimporteerd_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aantal_excel_rijen" INTEGER NOT NULL,
    "aantal_personen" INTEGER NOT NULL,
    "aantal_bedrijven" INTEGER NOT NULL,
    "correcties_toegepast_op" TIMESTAMP(3),

    CONSTRAINT "attest_statistiek_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leden_ovam_id_key" ON "leden"("ovam_id");

-- CreateIndex
CREATE UNIQUE INDEX "leden_certificaatnummer_key" ON "leden"("certificaatnummer");

-- CreateIndex
CREATE INDEX "leden_verwijderd_op_idx" ON "leden"("verwijderd_op");

-- CreateIndex
CREATE UNIQUE INDEX "procescertificaten_kbo_nummer_key" ON "procescertificaten"("kbo_nummer");

-- CreateIndex
CREATE UNIQUE INDEX "procescertificaten_certificaatnummer_key" ON "procescertificaten"("certificaatnummer");

-- CreateIndex
CREATE INDEX "procescertificaten_verwijderd_op_idx" ON "procescertificaten"("verwijderd_op");

-- CreateIndex
CREATE UNIQUE INDEX "terreincontroles_attest_id_key" ON "terreincontroles"("attest_id");

-- CreateIndex
CREATE INDEX "terreincontroles_ovam_id_idx" ON "terreincontroles"("ovam_id");

-- CreateIndex
CREATE INDEX "terreincontroles_status_idx" ON "terreincontroles"("status");

-- CreateIndex
CREATE INDEX "terreincontroles_auditeur_gebruiker_id_idx" ON "terreincontroles"("auditeur_gebruiker_id");

-- CreateIndex
CREATE INDEX "terreincontroles_datum_plaatsbezoek_idx" ON "terreincontroles"("datum_plaatsbezoek");

-- CreateIndex
CREATE INDEX "terreincontroles_verwijderd_op_idx" ON "terreincontroles"("verwijderd_op");

-- CreateIndex
CREATE INDEX "terreincontroles_postcode_idx" ON "terreincontroles"("postcode");

-- CreateIndex
CREATE INDEX "terreincontroles_gemeente_idx" ON "terreincontroles"("gemeente");

-- CreateIndex
CREATE UNIQUE INDEX "terreincontrole_dossiers_link_attest_key" ON "terreincontrole_dossiers"("link_attest");

-- CreateIndex
CREATE UNIQUE INDEX "terreincontrole_dossiers_attest_id_key" ON "terreincontrole_dossiers"("attest_id");

-- CreateIndex
CREATE UNIQUE INDEX "terreincontrole_dossiers_attestnummer_key" ON "terreincontrole_dossiers"("attestnummer");

-- CreateIndex
CREATE INDEX "terreincontrole_dossiers_auditeur_gebruiker_id_idx" ON "terreincontrole_dossiers"("auditeur_gebruiker_id");

-- CreateIndex
CREATE INDEX "terreincontrole_dossiers_lid_id_idx" ON "terreincontrole_dossiers"("lid_id");

-- CreateIndex
CREATE INDEX "terreincontrole_dossiers_procescertificaat_id_idx" ON "terreincontrole_dossiers"("procescertificaat_id");

-- CreateIndex
CREATE INDEX "terreincontrole_dossiers_persoons_id_idx" ON "terreincontrole_dossiers"("persoons_id");

-- CreateIndex
CREATE INDEX "terreincontrole_dossiers_ondernemingsnummer_idx" ON "terreincontrole_dossiers"("ondernemingsnummer");

-- CreateIndex
CREATE INDEX "terreincontrole_dossiers_status_idx" ON "terreincontrole_dossiers"("status");

-- CreateIndex
CREATE INDEX "terreincontrole_dossiers_datum_controle_idx" ON "terreincontrole_dossiers"("datum_controle");

-- CreateIndex
CREATE INDEX "terreincontrole_dossiers_verwijderd_op_idx" ON "terreincontrole_dossiers"("verwijderd_op");

-- CreateIndex
CREATE INDEX "terreincontrole_vaststellingen_terreincontrole_dossier_id_idx" ON "terreincontrole_vaststellingen"("terreincontrole_dossier_id");

-- CreateIndex
CREATE INDEX "terreincontrole_vaststellingen_nc_id_idx" ON "terreincontrole_vaststellingen"("nc_id");

-- CreateIndex
CREATE INDEX "terreincontrole_vaststellingen_categorie_idx" ON "terreincontrole_vaststellingen"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "deskcontroles_attest_id_key" ON "deskcontroles"("attest_id");

-- CreateIndex
CREATE UNIQUE INDEX "deskcontroles_link_attest_key" ON "deskcontroles"("link_attest");

-- CreateIndex
CREATE UNIQUE INDEX "deskcontroles_attestnummer_key" ON "deskcontroles"("attestnummer");

-- CreateIndex
CREATE INDEX "deskcontroles_lid_id_idx" ON "deskcontroles"("lid_id");

-- CreateIndex
CREATE INDEX "deskcontroles_procescertificaat_id_idx" ON "deskcontroles"("procescertificaat_id");

-- CreateIndex
CREATE INDEX "deskcontroles_auditeur_gebruiker_id_idx" ON "deskcontroles"("auditeur_gebruiker_id");

-- CreateIndex
CREATE INDEX "deskcontroles_status_idx" ON "deskcontroles"("status");

-- CreateIndex
CREATE INDEX "deskcontroles_type_controle_idx" ON "deskcontroles"("type_controle");

-- CreateIndex
CREATE INDEX "deskcontroles_datum_controle_idx" ON "deskcontroles"("datum_controle");

-- CreateIndex
CREATE INDEX "deskcontroles_deadline_sanctie_idx" ON "deskcontroles"("deadline_sanctie");

-- CreateIndex
CREATE INDEX "deskcontroles_deadline_correctie_idx" ON "deskcontroles"("deadline_correctie");

-- CreateIndex
CREATE INDEX "deskcontroles_finalisatie_datum_idx" ON "deskcontroles"("finalisatie_datum");

-- CreateIndex
CREATE INDEX "deskcontroles_verwijderd_op_idx" ON "deskcontroles"("verwijderd_op");

-- CreateIndex
CREATE INDEX "deskcontrole_vaststellingen_deskcontrole_id_idx" ON "deskcontrole_vaststellingen"("deskcontrole_id");

-- CreateIndex
CREATE INDEX "deskcontrole_vaststellingen_nc_id_idx" ON "deskcontrole_vaststellingen"("nc_id");

-- CreateIndex
CREATE INDEX "deskcontrole_vaststellingen_categorie_idx" ON "deskcontrole_vaststellingen"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "toegestane_gebruikers_email_key" ON "toegestane_gebruikers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "toegestane_gebruikers_auth_user_id_key" ON "toegestane_gebruikers"("auth_user_id");

-- CreateIndex
CREATE INDEX "toegestane_gebruikers_email_idx" ON "toegestane_gebruikers"("email");

-- CreateIndex
CREATE INDEX "toegestane_gebruikers_actief_idx" ON "toegestane_gebruikers"("actief");

-- CreateIndex
CREATE INDEX "toegestane_gebruikers_beheerder_idx" ON "toegestane_gebruikers"("beheerder");

-- CreateIndex
CREATE INDEX "toegestane_gebruikers_rol_idx" ON "toegestane_gebruikers"("rol");

-- CreateIndex
CREATE INDEX "meldingen_gebruiker_id_gelezen_op_idx" ON "meldingen"("gebruiker_id", "gelezen_op");

-- CreateIndex
CREATE INDEX "meldingen_gebruiker_id_aangemaakt_op_idx" ON "meldingen"("gebruiker_id", "aangemaakt_op");

-- CreateIndex
CREATE INDEX "meldingen_type_idx" ON "meldingen"("type");

-- CreateIndex
CREATE UNIQUE INDEX "meldingen_gebruiker_id_sleutel_key" ON "meldingen"("gebruiker_id", "sleutel");

-- CreateIndex
CREATE INDEX "auditlogs_gebruiker_id_aangemaakt_op_idx" ON "auditlogs"("gebruiker_id", "aangemaakt_op");

-- CreateIndex
CREATE INDEX "auditlogs_entiteit_entiteit_id_aangemaakt_op_idx" ON "auditlogs"("entiteit", "entiteit_id", "aangemaakt_op");

-- CreateIndex
CREATE INDEX "auditlogs_actie_idx" ON "auditlogs"("actie");

-- CreateIndex
CREATE INDEX "auditlogs_aangemaakt_op_idx" ON "auditlogs"("aangemaakt_op");

-- CreateIndex
CREATE UNIQUE INDEX "attest_persoon_statistieken_persoons_id_key" ON "attest_persoon_statistieken"("persoons_id");

-- CreateIndex
CREATE INDEX "attest_persoon_statistieken_naam_idx" ON "attest_persoon_statistieken"("naam");

-- CreateIndex
CREATE INDEX "attest_persoon_statistieken_aantal_attesten_idx" ON "attest_persoon_statistieken"("aantal_attesten");

-- CreateIndex
CREATE UNIQUE INDEX "attest_bedrijf_statistieken_bedrijfsnaam_sleutel_key" ON "attest_bedrijf_statistieken"("bedrijfsnaam_sleutel");

-- CreateIndex
CREATE INDEX "attest_bedrijf_statistieken_bedrijfsnaam_idx" ON "attest_bedrijf_statistieken"("bedrijfsnaam");

-- CreateIndex
CREATE INDEX "attest_bedrijf_statistieken_aantal_attesten_idx" ON "attest_bedrijf_statistieken"("aantal_attesten");

-- CreateIndex
CREATE INDEX "attest_correcties_persoons_id_idx" ON "attest_correcties"("persoons_id");

-- CreateIndex
CREATE INDEX "attest_correcties_bedrijfsnaam_idx" ON "attest_correcties"("bedrijfsnaam");

-- CreateIndex
CREATE INDEX "attest_correcties_naam_idx" ON "attest_correcties"("naam");

-- AddForeignKey
ALTER TABLE "terreincontroles" ADD CONSTRAINT "terreincontroles_auditeur_gebruiker_id_fkey" FOREIGN KEY ("auditeur_gebruiker_id") REFERENCES "toegestane_gebruikers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terreincontrole_dossiers" ADD CONSTRAINT "terreincontrole_dossiers_auditeur_gebruiker_id_fkey" FOREIGN KEY ("auditeur_gebruiker_id") REFERENCES "toegestane_gebruikers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terreincontrole_dossiers" ADD CONSTRAINT "terreincontrole_dossiers_lid_id_fkey" FOREIGN KEY ("lid_id") REFERENCES "leden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terreincontrole_dossiers" ADD CONSTRAINT "terreincontrole_dossiers_procescertificaat_id_fkey" FOREIGN KEY ("procescertificaat_id") REFERENCES "procescertificaten"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terreincontrole_vaststellingen" ADD CONSTRAINT "terreincontrole_vaststellingen_terreincontrole_dossier_id_fkey" FOREIGN KEY ("terreincontrole_dossier_id") REFERENCES "terreincontrole_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deskcontroles" ADD CONSTRAINT "deskcontroles_auditeur_gebruiker_id_fkey" FOREIGN KEY ("auditeur_gebruiker_id") REFERENCES "toegestane_gebruikers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deskcontroles" ADD CONSTRAINT "deskcontroles_lid_id_fkey" FOREIGN KEY ("lid_id") REFERENCES "leden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deskcontroles" ADD CONSTRAINT "deskcontroles_procescertificaat_id_fkey" FOREIGN KEY ("procescertificaat_id") REFERENCES "procescertificaten"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deskcontrole_vaststellingen" ADD CONSTRAINT "deskcontrole_vaststellingen_deskcontrole_id_fkey" FOREIGN KEY ("deskcontrole_id") REFERENCES "deskcontroles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meldingen" ADD CONSTRAINT "meldingen_gebruiker_id_fkey" FOREIGN KEY ("gebruiker_id") REFERENCES "toegestane_gebruikers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditlogs" ADD CONSTRAINT "auditlogs_gebruiker_id_fkey" FOREIGN KEY ("gebruiker_id") REFERENCES "toegestane_gebruikers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
