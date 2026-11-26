-- cuántas veces se ha corregido el nombre y el chip (máximo 2 cada uno)
ALTER TABLE "animales" ADD COLUMN "cambioNombre" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "animales" ADD COLUMN "cambioChip" INTEGER NOT NULL DEFAULT 0;